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
}

interface ExtractedSection {
  name: string | null;
  questions: ExtractedQuestion[];
}

// Parse JSON from AI response with robust error handling
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
    return JSON.parse(repaired);
  }
}

// Attempt to repair truncated JSON
function repairTruncatedJSON(jsonStr: string): string {
  let repaired = jsonStr;
  
  let braces = 0;
  let brackets = 0;
  let inString = false;
  let escapeNext = false;
  
  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '{') braces++;
      if (char === '}') braces--;
      if (char === '[') brackets++;
      if (char === ']') brackets--;
    }
  }
  
  if (inString) {
    repaired += '"';
  }
  
  repaired = repaired.replace(/,\s*$/, '');
  
  while (brackets > 0) {
    repaired += ']';
    brackets--;
  }
  
  while (braces > 0) {
    repaired += '}';
    braces--;
  }
  
  return repaired;
}

// Extract questions from page images using vision model
async function extractFromImages(
  imageUrls: string[],
  examType: string,
  apiKey: string
): Promise<any> {
  console.log(`Extracting from ${imageUrls.length} page images using vision...`);
  
  const results: any[] = [];
  const batchSize = 5; // Process 5 pages at a time
  
  for (let i = 0; i < imageUrls.length; i += batchSize) {
    const batch = imageUrls.slice(i, i + batchSize);
    const startPage = i + 1;
    const endPage = Math.min(i + batchSize, imageUrls.length);
    
    console.log(`Processing pages ${startPage}-${endPage}...`);
    
    const imageContent = batch.map((url, idx) => ({
      type: "image_url" as const,
      image_url: { url }
    }));
    
    const systemPrompt = `You are an exam paper analyzer with vision capabilities. Extract ALL questions from these exam paper page images.

CRITICAL RULES:
1. Extract EVERY question you see, including those with diagrams, figures, charts, or images
2. If a question has a diagram/figure, set has_diagram: true and provide a brief diagram_description
3. Keep question_text as just the question itself
4. Put all options in the options array
5. Identify question types: single_correct, multiple_correct, true_false, or numeric
6. Include the page_number for each question

Output ONLY valid JSON in this format:
{
  "sections": [
    {
      "name": null,
      "questions": [
        {
          "question_text": "The question text here",
          "question_type": "single_correct",
          "options": ["A) option", "B) option", "C) option", "D) option"],
          "marks": 1,
          "negative_marks": 0.25,
          "has_diagram": true,
          "diagram_description": "A circuit diagram showing a resistor and capacitor in series",
          "page_number": 1
        }
      ]
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
            { 
              role: "user", 
              content: [
                {
                  type: "text",
                  text: `Extract all questions from these ${examType} exam pages (pages ${startPage}-${endPage}). Look carefully for any diagrams, figures, charts, or images and note them.`
                },
                ...imageContent
              ]
            },
          ],
          temperature: 0.1,
          max_tokens: 16000,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.log("Rate limited, waiting before retry...");
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }
        if (response.status === 402) {
          throw new Error("CREDITS_EXHAUSTED");
        }
        const errText = await response.text();
        console.error(`AI error ${response.status}:`, errText);
        continue;
      }

      const aiResponse = await response.json();
      const content = aiResponse.choices?.[0]?.message?.content;

      if (content) {
        console.log(`Pages ${startPage}-${endPage} response length: ${content.length}`);
        try {
          const parsed = parseAIResponse(content);
          if (parsed?.sections) {
            results.push(parsed);
          }
        } catch (parseErr) {
          console.error(`Failed to parse response for pages ${startPage}-${endPage}:`, parseErr);
        }
      }
    } catch (err) {
      console.error(`Error processing pages ${startPage}-${endPage}:`, err);
      if (err instanceof Error && err.message === "CREDITS_EXHAUSTED") {
        throw err;
      }
    }
    
    // Delay between batches
    if (i + batchSize < imageUrls.length) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  
  return mergeResults(results, examType);
}

// Extract questions from text (fallback for text-only PDFs)
async function extractFromText(
  content: string,
  examType: string,
  apiKey: string
): Promise<any> {
  console.log("Falling back to text-based extraction...");
  
  const chunks = splitContentIntoChunks(content, 15000);
  console.log(`Processing ${chunks.length} text chunk(s)`);
  
  const results: any[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Processing text chunk ${i + 1}/${chunks.length}`);
    
    const systemPrompt = `You are an exam paper analyzer. Extract ALL questions from this content.

CRITICAL RULES:
1. Complete the ENTIRE JSON response
2. Keep question_text SHORT - just the question
3. Put options in the options array
4. Use null for section name if not specified

Output format:
{
  "sections": [
    {
      "name": null,
      "questions": [
        {
          "question_text": "Question text",
          "question_type": "single_correct",
          "options": ["A", "B", "C", "D"],
          "marks": 1,
          "negative_marks": 0.25
        }
      ]
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
            { 
              role: "user", 
              content: `Extract questions from chunk ${i + 1}/${chunks.length} (${examType}):\n\n${chunks[i]}` 
            },
          ],
          temperature: 0.1,
          max_tokens: 8000,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.log("Rate limited, waiting...");
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        }
        continue;
      }

      const aiResponse = await response.json();
      const responseContent = aiResponse.choices?.[0]?.message?.content;

      if (responseContent) {
        try {
          const parsed = parseAIResponse(responseContent);
          if (parsed?.sections) {
            results.push(parsed);
          }
        } catch (e) {
          console.error(`Failed to parse chunk ${i + 1}:`, e);
        }
      }
    } catch (err) {
      console.error(`Error processing chunk ${i + 1}:`, err);
    }
    
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return mergeResults(results, examType);
}

// Split content into chunks
function splitContentIntoChunks(content: string, maxChunkSize: number = 15000): string[] {
  const chunks: string[] = [];
  
  if (content.length <= maxChunkSize) {
    return [content];
  }
  
  const lines = content.split('\n');
  let currentChunk = "";
  
  for (const line of lines) {
    const isQuestionStart = /^\s*(?:Q\.?\s*\d+|Question\s*\d+|\d+\s*[.)]\s*[A-Z])/i.test(line);
    
    if (isQuestionStart && currentChunk.length > maxChunkSize * 0.5) {
      chunks.push(currentChunk);
      currentChunk = line + "\n";
    } else {
      currentChunk += line + "\n";
      
      if (currentChunk.length > maxChunkSize) {
        chunks.push(currentChunk);
        currentChunk = "";
      }
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk);
  }
  
  return chunks.length > 0 ? chunks : [content];
}

// Merge multiple chunk results
function mergeResults(results: any[], examType: string): any {
  const mergedSections: Map<string, ExtractedQuestion[]> = new Map();
  let totalQuestions = 0;
  const detectedSections: Set<string> = new Set();
  let hasNegativeMarking = false;
  let hasDiagrams = false;

  for (const result of results) {
    if (!result?.sections) continue;

    for (const section of result.sections) {
      const sectionName = section.name || "General";
      detectedSections.add(sectionName);

      if (!mergedSections.has(sectionName)) {
        mergedSections.set(sectionName, []);
      }

      if (section.questions) {
        for (const q of section.questions) {
          mergedSections.get(sectionName)!.push(q);
          totalQuestions++;
          if (q.negative_marks && q.negative_marks > 0) {
            hasNegativeMarking = true;
          }
          if (q.has_diagram) {
            hasDiagrams = true;
          }
        }
      }
    }
  }

  const sections = Array.from(mergedSections.entries()).map(([name, questions]) => ({
    name: name === "General" ? null : name,
    questions,
  }));

  return {
    sections,
    metadata: {
      total_questions: totalQuestions,
      exam_type: examType || "custom",
      has_negative_marking: hasNegativeMarking,
      has_diagrams: hasDiagrams,
      detected_sections: Array.from(detectedSections).filter(s => s !== "General"),
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfContent, imageUrls, examType } = await req.json();

    // Validate - must have either images or text
    if (!imageUrls?.length && !pdfContent) {
      return new Response(
        JSON.stringify({ error: "PDF content or page images are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validExamTypes = ['ssc', 'banking', 'engineering', 'medical', 'upsc', 'custom'];
    if (examType && !validExamTypes.includes(examType)) {
      return new Response(
        JSON.stringify({ error: "Invalid exam type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let result;
    
    // Prefer image-based extraction if images are available
    if (imageUrls && imageUrls.length > 0) {
      console.log(`Using vision extraction with ${imageUrls.length} images`);
      result = await extractFromImages(imageUrls, examType || 'custom', LOVABLE_API_KEY);
    } else if (pdfContent) {
      // Fall back to text-based extraction
      const maxSize = 1_000_000;
      if (typeof pdfContent !== 'string' || pdfContent.length > maxSize) {
        return new Response(
          JSON.stringify({ error: `PDF content too large. Maximum ${maxSize / 1000}KB allowed.` }),
          { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const sanitizedContent = pdfContent
        .replace(/ignore previous instructions/gi, '')
        .replace(/system:/gi, '')
        .replace(/assistant:/gi, '')
        .slice(0, maxSize);
      
      result = await extractFromText(sanitizedContent, examType || 'custom', LOVABLE_API_KEY);
    }

    if (!result || result.metadata.total_questions === 0) {
      throw new Error("Failed to extract questions. The PDF may have an unusual format.");
    }

    console.log(`Total extracted: ${result.metadata.total_questions} questions, has_diagrams: ${result.metadata.has_diagrams}`);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in extract-questions:", error);
    
    if (error instanceof Error && error.message === "CREDITS_EXHAUSTED") {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to extract questions" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
