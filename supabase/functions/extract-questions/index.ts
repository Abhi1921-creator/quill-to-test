import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Split content into chunks - more aggressive splitting for large content
function splitContentIntoChunks(content: string, maxChunkSize: number = 15000): string[] {
  const chunks: string[] = [];
  
  // If content is small enough, return as single chunk
  if (content.length <= maxChunkSize) {
    return [content];
  }
  
  // First, try to split by sections or major headings
  const sectionPatterns = /(?=\n\s*(?:SECTION|Section|PART|Part|PHYSICS|CHEMISTRY|BIOLOGY|MATHEMATICS|QUANTITATIVE|REASONING|ENGLISH|GENERAL)\s*[A-Z\-:]*)/gi;
  let parts = content.split(sectionPatterns).filter(p => p.trim().length > 100);
  
  // If no sections found, split by question patterns
  if (parts.length <= 1) {
    // Match common question number patterns - more flexible
    const lines = content.split('\n');
    let currentChunk = "";
    
    for (const line of lines) {
      // Check if this line starts a new question
      const isQuestionStart = /^\s*(?:Q\.?\s*\d+|Question\s*\d+|\d+\s*[.)]\s*[A-Z])/i.test(line);
      
      if (isQuestionStart && currentChunk.length > maxChunkSize * 0.5) {
        // We have enough content and found a question boundary
        chunks.push(currentChunk);
        currentChunk = line + "\n";
      } else {
        currentChunk += line + "\n";
        
        // Force split if chunk gets too large
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
  
  // Process section-based parts
  for (const part of parts) {
    if (part.length <= maxChunkSize) {
      chunks.push(part);
    } else {
      // Recursively split large sections
      const subChunks = splitContentIntoChunks(part, maxChunkSize);
      chunks.push(...subChunks);
    }
  }
  
  return chunks;
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
    // Try to repair truncated JSON
    console.log("Attempting to repair truncated JSON...");
    const repaired = repairTruncatedJSON(jsonStr);
    return JSON.parse(repaired);
  }
}

// Attempt to repair truncated JSON
function repairTruncatedJSON(jsonStr: string): string {
  let repaired = jsonStr;
  
  // Count open braces and brackets
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
  
  // If we're in a string, close it
  if (inString) {
    repaired += '"';
  }
  
  // Remove trailing comma if present
  repaired = repaired.replace(/,\s*$/, '');
  
  // Close any open brackets and braces
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

// Extract questions from a single chunk
async function extractFromChunk(
  chunk: string, 
  chunkIndex: number, 
  totalChunks: number,
  examType: string,
  apiKey: string
): Promise<any> {
  const systemPrompt = `You are an exam paper analyzer. Extract ALL questions from this content.

CRITICAL RULES:
1. You MUST complete the ENTIRE JSON response
2. Keep question_text SHORT - just the question, not options
3. Put options in the options array
4. Use null for section name if not specified

Output format:
{
  "sections": [
    {
      "name": null,
      "questions": [
        {
          "question_text": "Question without options",
          "question_type": "single_correct",
          "options": ["A", "B", "C", "D"],
          "marks": 1,
          "negative_marks": 0
        }
      ]
    }
  ]
}`;

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
          content: `Extract questions from chunk ${chunkIndex + 1}/${totalChunks} (${examType}):\n\n${chunk}` 
        },
      ],
      temperature: 0.1,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("RATE_LIMIT");
    }
    if (response.status === 402) {
      throw new Error("CREDITS_EXHAUSTED");
    }
    const errText = await response.text();
    console.error(`AI error ${response.status}:`, errText);
    throw new Error(`AI error: ${response.status}`);
  }

  const aiResponse = await response.json();
  const content = aiResponse.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No AI response");
  }

  console.log(`Chunk ${chunkIndex + 1} response length: ${content.length}`);
  return parseAIResponse(content);
}

// Merge multiple chunk results into one
function mergeResults(results: any[], examType: string): any {
  const mergedSections: Map<string, any[]> = new Map();
  let totalQuestions = 0;
  const detectedSections: Set<string> = new Set();
  let hasNegativeMarking = false;

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
      detected_sections: Array.from(detectedSections).filter(s => s !== "General"),
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfContent, examType } = await req.json();

    // Validate presence
    if (!pdfContent) {
      return new Response(
        JSON.stringify({ error: "PDF content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof pdfContent !== 'string') {
      return new Response(
        JSON.stringify({ error: "PDF content must be a string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const maxSize = 1_000_000;
    if (pdfContent.length > maxSize) {
      return new Response(
        JSON.stringify({ error: `PDF content too large. Maximum ${maxSize / 1000}KB allowed.` }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (pdfContent.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "PDF content is empty" }),
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

    // Sanitize content
    const sanitizedContent = pdfContent
      .replace(/ignore previous instructions/gi, '')
      .replace(/system:/gi, '')
      .replace(/assistant:/gi, '')
      .slice(0, maxSize);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Split content into smaller chunks (15KB each for safety)
    const chunks = splitContentIntoChunks(sanitizedContent, 15000);
    console.log(`Processing ${chunks.length} chunk(s), sizes: ${chunks.map(c => c.length).join(', ')}`);

    const results: any[] = [];
    const errors: string[] = [];
    
    // Process chunks sequentially
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);
      
      try {
        const chunkResult = await extractFromChunk(
          chunks[i],
          i,
          chunks.length,
          examType || 'custom',
          LOVABLE_API_KEY
        );
        
        const questionCount = chunkResult?.sections?.reduce(
          (sum: number, s: any) => sum + (s.questions?.length || 0), 0
        ) || 0;
        
        console.log(`Chunk ${i + 1} extracted: ${questionCount} questions`);
        
        if (questionCount > 0) {
          results.push(chunkResult);
        }
      } catch (chunkError) {
        const errorMsg = chunkError instanceof Error ? chunkError.message : String(chunkError);
        console.error(`Error processing chunk ${i + 1}:`, errorMsg);
        errors.push(`Chunk ${i + 1}: ${errorMsg}`);
        
        if (errorMsg === "RATE_LIMIT") {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (errorMsg === "CREDITS_EXHAUSTED") {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      
      // Delay between chunks to avoid rate limits
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (results.length === 0) {
      console.error("All chunks failed:", errors);
      throw new Error("Failed to extract questions. The PDF may have an unusual format. Try a different file.");
    }

    // Merge all chunk results
    const mergedData = mergeResults(results, examType || 'custom');
    console.log(`Total extracted: ${mergedData.metadata.total_questions} questions from ${results.length}/${chunks.length} chunks`);

    return new Response(
      JSON.stringify({ success: true, data: mergedData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in extract-questions:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to extract questions" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
