import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Split content into chunks based on approximate question count
function splitContentIntoChunks(content: string, maxChunkSize: number = 30000): string[] {
  const chunks: string[] = [];
  
  // If content is small enough, return as single chunk
  if (content.length <= maxChunkSize) {
    return [content];
  }
  
  // Split by common question patterns to avoid breaking mid-question
  const questionPatterns = /(?=(?:^|\n)\s*(?:Q\s*\.?\s*\d+|Question\s+\d+|\d+\s*[.):]\s*[A-Z]))/gi;
  const parts = content.split(questionPatterns).filter(p => p.trim());
  
  let currentChunk = "";
  for (const part of parts) {
    if ((currentChunk + part).length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = part;
    } else {
      currentChunk += part;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk);
  }
  
  // If splitting by questions didn't work, fall back to simple splitting
  if (chunks.length === 0) {
    for (let i = 0; i < content.length; i += maxChunkSize) {
      chunks.push(content.substring(i, i + maxChunkSize));
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
  
  // Find the JSON object
  const jsonStartIndex = jsonStr.indexOf('{');
  if (jsonStartIndex !== -1) {
    jsonStr = jsonStr.substring(jsonStartIndex);
  }
  
  // Try to find the complete JSON by matching braces
  let braceCount = 0;
  let jsonEndIndex = -1;
  for (let i = 0; i < jsonStr.length; i++) {
    if (jsonStr[i] === '{') braceCount++;
    if (jsonStr[i] === '}') braceCount--;
    if (braceCount === 0 && jsonStr[i] === '}') {
      jsonEndIndex = i + 1;
      break;
    }
  }
  
  if (jsonEndIndex > 0) {
    jsonStr = jsonStr.substring(0, jsonEndIndex);
  }
  
  return JSON.parse(jsonStr);
}

// Extract questions from a single chunk
async function extractFromChunk(
  chunk: string, 
  chunkIndex: number, 
  totalChunks: number,
  examType: string,
  apiKey: string
): Promise<any> {
  const systemPrompt = `You are an expert exam paper analyzer. Extract questions from this exam paper chunk.

CRITICAL: You MUST complete the entire JSON response. Do not stop mid-response.

Extract:
1. All questions with exact text
2. All options (A/B/C/D or 1/2/3/4 format)
3. Section info if present
4. Question type (single_correct, multiple_correct, true_false, numeric)
5. Marks info if available

Rules:
- Detect question patterns: "Q1.", "1.", "Question 1:", etc.
- Detect option patterns: "A)", "(A)", "a.", "1)", etc.
- For True/False: options = ["True", "False"]
- For numeric: options = []
- Keep responses concise but complete

Return ONLY this JSON (no extra text):
{
  "sections": [
    {
      "name": "Section name or null",
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
          content: `This is chunk ${chunkIndex + 1} of ${totalChunks}. Exam type: ${examType}.\n\nExtract all questions from this content:\n\n${chunk}` 
        },
      ],
      temperature: 0.1,
      max_tokens: 16000,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("RATE_LIMIT");
    }
    if (response.status === 402) {
      throw new Error("CREDITS_EXHAUSTED");
    }
    throw new Error(`AI error: ${response.status}`);
  }

  const aiResponse = await response.json();
  const content = aiResponse.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No AI response");
  }

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

    // Validate type
    if (typeof pdfContent !== 'string') {
      return new Response(
        JSON.stringify({ error: "PDF content must be a string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increased size limit for chunked processing (1MB max)
    const maxSize = 1_000_000;
    if (pdfContent.length > maxSize) {
      return new Response(
        JSON.stringify({ error: `PDF content too large. Maximum ${maxSize / 1000}KB allowed.` }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate not empty
    if (pdfContent.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "PDF content is empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate examType enum if provided
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

    // Split content into manageable chunks
    const chunks = splitContentIntoChunks(sanitizedContent, 25000);
    console.log(`Processing ${chunks.length} chunk(s) for extraction`);

    const results: any[] = [];
    
    // Process chunks sequentially to avoid rate limits
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
        results.push(chunkResult);
        console.log(`Chunk ${i + 1} extracted: ${chunkResult?.sections?.[0]?.questions?.length || 0} questions`);
      } catch (chunkError) {
        console.error(`Error processing chunk ${i + 1}:`, chunkError);
        
        if (chunkError instanceof Error) {
          if (chunkError.message === "RATE_LIMIT") {
            return new Response(
              JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          if (chunkError.message === "CREDITS_EXHAUSTED") {
            return new Response(
              JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
              { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
        
        // Continue with other chunks if one fails
        console.log(`Continuing despite chunk ${i + 1} failure`);
      }
      
      // Small delay between chunks to avoid rate limits
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (results.length === 0) {
      throw new Error("Failed to extract any questions. Please try with a smaller PDF.");
    }

    // Merge all chunk results
    const mergedData = mergeResults(results, examType || 'custom');
    console.log(`Total extracted: ${mergedData.metadata.total_questions} questions`);

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
