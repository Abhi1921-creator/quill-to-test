import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractedQuestion {
  question_text: string;
  question_type: string;
  options: string[];
  marks: number;
  negative_marks: number;
  has_diagram?: boolean;
  diagram_description?: string;
  page_number?: number;
  page_image_url?: string;
}

function repairTruncatedJSON(jsonStr: string): string {
  let repaired = jsonStr.trim();
  
  // Count open brackets
  let openBraces = (repaired.match(/{/g) || []).length;
  let closeBraces = (repaired.match(/}/g) || []).length;
  let openBrackets = (repaired.match(/\[/g) || []).length;
  let closeBrackets = (repaired.match(/\]/g) || []).length;
  
  // Remove trailing incomplete content
  const patterns = [
    /,\s*"[^"]*$/,  // Incomplete key
    /,\s*$/,        // Trailing comma
    /:\s*"[^"]*$/,  // Incomplete string value
    /:\s*$/,        // Missing value
  ];
  
  for (const pattern of patterns) {
    repaired = repaired.replace(pattern, '');
  }
  
  // Close any open strings
  const quoteCount = (repaired.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    repaired += '"';
  }
  
  // Recount after cleanup
  openBraces = (repaired.match(/{/g) || []).length;
  closeBraces = (repaired.match(/}/g) || []).length;
  openBrackets = (repaired.match(/\[/g) || []).length;
  closeBrackets = (repaired.match(/\]/g) || []).length;
  
  // Close brackets and braces
  while (closeBrackets < openBrackets) {
    repaired += ']';
    closeBrackets++;
  }
  while (closeBraces < openBraces) {
    repaired += '}';
    closeBraces++;
  }
  
  return repaired;
}

function parseAIResponse(content: string): any {
  let jsonStr = content;
  
  // Remove markdown code block wrapper if present
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1];
  }
  
  // Find the JSON object start
  const jsonStartIndex = jsonStr.indexOf('{');
  if (jsonStartIndex === -1) {
    throw new Error("No JSON object found in response");
  }
  jsonStr = jsonStr.substring(jsonStartIndex);
  
  // Try to find the complete JSON by matching braces
  let braceCount = 0;
  let jsonEndIndex = -1;
  let inString = false;
  let escapeNext = false;
  
  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (braceCount === 0) {
        jsonEndIndex = i + 1;
        break;
      }
    }
  }
  
  if (jsonEndIndex > 0) {
    jsonStr = jsonStr.substring(0, jsonEndIndex);
  }
  
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.log("Attempting to repair truncated JSON...");
    const repaired = repairTruncatedJSON(jsonStr);
    try {
      return JSON.parse(repaired);
    } catch (e2) {
      console.error("JSON repair failed:", e2);
      // Return empty structure rather than failing
      return { sections: [] };
    }
  }
}

function cleanOptionText(option: string): string {
  // Remove leading option markers like "A.", "A)", "1.", "1)", etc.
  return option.replace(/^[\s]*(?:[A-Da-d1-4][\.\)\:][\s]*)?/, '').trim();
}

function validateAndCleanQuestions(questions: any[]): ExtractedQuestion[] {
  return questions
    .filter(q => {
      // Must have question text and it should be more than just an option
      if (!q.question_text || typeof q.question_text !== 'string') return false;
      const text = q.question_text.trim();
      // Skip if it looks like just an option (single letter or number with text)
      if (/^[A-Da-d1-4][\.\)\:]/.test(text) && text.length < 200) return false;
      // Skip very short text that's likely not a question
      if (text.length < 10) return false;
      return true;
    })
    .map(q => ({
      question_text: q.question_text.trim(),
      question_type: q.question_type || 'single_correct',
      options: Array.isArray(q.options) 
        ? q.options.map((o: any) => typeof o === 'string' ? o.trim() : String(o))
        : [],
      marks: typeof q.marks === 'number' ? q.marks : 1,
      negative_marks: typeof q.negative_marks === 'number' ? q.negative_marks : 0.25,
      has_diagram: q.has_diagram === true,
      diagram_description: q.diagram_description || null,
      page_number: typeof q.page_number === 'number' ? q.page_number : null,
      page_image_url: q.page_image_url || null,
    }));
}

async function extractFromImages(
  imageUrls: string[],
  examType: string,
  apiKey: string
): Promise<any> {
  console.log(`Extracting from ${imageUrls.length} page images using vision...`);
  
  const allQuestions: ExtractedQuestion[] = [];
  const batchSize = 3; // Smaller batch for better accuracy
  
  for (let i = 0; i < imageUrls.length; i += batchSize) {
    const batch = imageUrls.slice(i, i + batchSize);
    const startPage = i + 1;
    const endPage = Math.min(i + batchSize, imageUrls.length);
    
    console.log(`Processing pages ${startPage}-${endPage}...`);
    
    const imageContent = batch.map((url, idx) => ({
      type: "image_url" as const,
      image_url: { url }
    }));
    
    // Build page URL mapping for this batch
    const pageImageMap = batch.map((url, idx) => `Page ${startPage + idx}: ${url}`).join('\n');
    
    const systemPrompt = `You are an expert exam paper analyzer. Your task is to extract QUESTIONS from exam paper images.

CRITICAL RULES - READ CAREFULLY:

1. A QUESTION is something that asks for an answer. It usually:
   - Ends with a question mark (?)
   - Starts with words like "What", "Which", "How", "Find", "Calculate", "If...then", "The value of"
   - Has a question number (Q.1, 1., Q1, etc.)
   - Is followed by OPTIONS (A, B, C, D or 1, 2, 3, 4)

2. OPTIONS are the choices given for a question. They:
   - Start with A), B), C), D) OR (A), (B), (C), (D) OR 1), 2), 3), 4) OR (1), (2), (3), (4)
   - Are listed below/after the question
   - ARE NOT QUESTIONS THEMSELVES - Never treat an option as a question!

3. For EACH question you extract:
   - "question_text": The full question text (WITHOUT the option labels)
   - "options": Array of exactly 4 options (just the option text, you can keep or remove labels like "A)")
   - "question_type": "single_correct" (most common), "multiple_correct", "true_false", or "numeric"
   - "marks": Usually 1-4 marks per question
   - "negative_marks": Usually 0.25-0.33 times the marks
   - "has_diagram": true if the question has ANY image, figure, diagram, graph, chart, table, or visual
   - "diagram_description": Brief description of what the diagram shows (if has_diagram is true)
   - "page_number": Which page this question appears on (${startPage} to ${endPage})

4. DIAGRAM DETECTION - Mark has_diagram: true for:
   - Circuit diagrams, graphs, charts, tables
   - Geometric figures, triangles, circles
   - Maps, flowcharts, data tables
   - Any image or visual element related to the question

Page image URLs for reference:
${pageImageMap}

OUTPUT FORMAT - Return ONLY this JSON structure:
{
  "questions": [
    {
      "question_text": "What is the capital of France?",
      "question_type": "single_correct",
      "options": ["A) London", "B) Paris", "C) Berlin", "D) Madrid"],
      "marks": 1,
      "negative_marks": 0.25,
      "has_diagram": false,
      "diagram_description": null,
      "page_number": 1,
      "page_image_url": "https://..."
    }
  ]
}

IMPORTANT: 
- Only output valid JSON, no other text
- Every question MUST have exactly 4 options (unless it's numeric type which has 0 options)
- Include the page_image_url for questions that have diagrams so the image can be displayed`;

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { 
              role: "user", 
              content: [
                {
                  type: "text",
                  text: `These are pages ${startPage}-${endPage} from a ${examType || 'competitive'} exam paper. Extract ALL questions with their options. Remember: options are NOT questions. Look carefully for diagrams and images.`
                },
                ...imageContent
              ]
            }
          ],
          max_tokens: 16000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error for pages ${startPage}-${endPage}:`, response.status, errorText);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        console.error(`No content for pages ${startPage}-${endPage}`);
        continue;
      }
      
      console.log(`Pages ${startPage}-${endPage} response length: ${content.length}`);
      
      const parsed = parseAIResponse(content);
      
      if (parsed.questions && Array.isArray(parsed.questions)) {
        // Add page image URLs to questions that have diagrams
        const questionsWithUrls = parsed.questions.map((q: any) => {
          if (q.has_diagram && q.page_number) {
            const pageIdx = q.page_number - 1;
            if (pageIdx >= 0 && pageIdx < imageUrls.length) {
              q.page_image_url = imageUrls[pageIdx];
            }
          }
          return q;
        });
        
        const validQuestions = validateAndCleanQuestions(questionsWithUrls);
        allQuestions.push(...validQuestions);
        console.log(`Extracted ${validQuestions.length} valid questions from pages ${startPage}-${endPage}`);
      }
      
      // Delay between batches to avoid rate limits
      if (i + batchSize < imageUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    } catch (error) {
      console.error(`Failed to process pages ${startPage}-${endPage}:`, error);
    }
  }
  
  const hasDiagrams = allQuestions.some(q => q.has_diagram);
  console.log(`Total extracted: ${allQuestions.length} questions, has_diagrams: ${hasDiagrams}`);
  
  return {
    sections: [{ name: null, questions: allQuestions }],
    metadata: {
      total_questions: allQuestions.length,
      has_diagrams: hasDiagrams,
      extraction_method: 'vision'
    }
  };
}

async function extractFromText(
  content: string,
  examType: string,
  apiKey: string
): Promise<any> {
  console.log(`Extracting from text content (${content.length} chars)...`);
  
  // For very long content, chunk it
  const maxChunkSize = 15000;
  const chunks: string[] = [];
  
  if (content.length > maxChunkSize) {
    let start = 0;
    while (start < content.length) {
      let end = start + maxChunkSize;
      // Try to break at a question boundary
      if (end < content.length) {
        const searchArea = content.substring(end - 500, end + 500);
        const questionMatch = searchArea.search(/\n\s*(?:Q\.?\s*\d+|\d+[\.\)])/);
        if (questionMatch > 0) {
          end = end - 500 + questionMatch;
        }
      }
      chunks.push(content.substring(start, end));
      start = end;
    }
  } else {
    chunks.push(content);
  }
  
  const allQuestions: ExtractedQuestion[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Processing chunk ${i + 1}/${chunks.length}...`);
    
    const systemPrompt = `You are an expert exam paper analyzer. Extract ALL questions from the provided exam text.

CRITICAL RULES:
1. A QUESTION asks for an answer and has OPTIONS below it
2. OPTIONS (A, B, C, D) are NOT questions - they are choices for a question
3. Never create a question from option text

For each question, extract:
- question_text: The full question
- question_type: "single_correct", "multiple_correct", "true_false", or "numeric"
- options: Array of 4 options (for MCQ) or empty array (for numeric)
- marks: Points for correct answer (default 1)
- negative_marks: Negative points (default 0.25)

OUTPUT FORMAT:
{
  "questions": [
    {
      "question_text": "Question text here",
      "question_type": "single_correct",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "marks": 1,
      "negative_marks": 0.25
    }
  ]
}`;

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Extract questions from this ${examType || 'competitive'} exam text:\n\n${chunks[i]}` }
          ],
          max_tokens: 16000,
        }),
      });

      if (!response.ok) {
        console.error(`API error for chunk ${i + 1}:`, await response.text());
        continue;
      }

      const data = await response.json();
      const responseContent = data.choices?.[0]?.message?.content;
      
      if (responseContent) {
        const parsed = parseAIResponse(responseContent);
        if (parsed.questions && Array.isArray(parsed.questions)) {
          const validQuestions = validateAndCleanQuestions(parsed.questions);
          allQuestions.push(...validQuestions);
        }
      }
      
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Failed to process chunk ${i + 1}:`, error);
    }
  }
  
  return {
    sections: [{ name: null, questions: allQuestions }],
    metadata: {
      total_questions: allQuestions.length,
      has_diagrams: false,
      extraction_method: 'text'
    }
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfContent, imageUrls, examType } = await req.json();

    // Validate input
    if (!pdfContent && (!imageUrls || imageUrls.length === 0)) {
      return new Response(
        JSON.stringify({ success: false, error: "No content provided" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "API key not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    let result;
    
    // Prefer image-based extraction if images are available
    if (imageUrls && imageUrls.length > 0) {
      console.log(`Using vision extraction with ${imageUrls.length} images`);
      result = await extractFromImages(imageUrls, examType, apiKey);
    } else {
      console.log(`Using text extraction`);
      result = await extractFromText(pdfContent, examType, apiKey);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Extract questions error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
