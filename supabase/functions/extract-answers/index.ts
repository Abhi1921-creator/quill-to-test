import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfContent, totalQuestions } = await req.json();

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

    // Validate size (200KB max for answer keys)
    const maxSize = 200_000;
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

    // Validate totalQuestions if provided
    if (totalQuestions !== undefined) {
      const num = typeof totalQuestions === 'number' ? totalQuestions : parseInt(totalQuestions);
      if (isNaN(num) || num < 1 || num > 500) {
        return new Response(
          JSON.stringify({ error: "totalQuestions must be between 1 and 500" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Sanitize content - remove potential prompt injection patterns
    const sanitizedContent = pdfContent
      .replace(/ignore previous instructions/gi, '')
      .replace(/system:/gi, '')
      .replace(/assistant:/gi, '')
      .slice(0, maxSize);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert answer key extractor. Your task is to extract answers from answer key PDFs/documents with high accuracy.

You will analyze the provided answer key content and extract answers for each question.

Common answer key formats to detect:
1. "Q1: A" or "1. A" or "1) A" - Single letter answers
2. "Q1: A,C" or "1. AC" or "1) A, C" - Multiple correct answers
3. "Q1: 42.5" or "1. 3.14" - Numerical answers
4. Tables with question numbers and answers
5. Grid formats with Q.No and Answer columns
6. "Ans: A" or "Answer: B" patterns

Important rules:
- Detect question numbers accurately (1-${totalQuestions || 200})
- Convert option formats: (a) -> A, 1) -> A (first option), etc.
- Handle multiple correct answers as comma-separated values
- Numerical answers should be exact numbers
- For True/False, convert to "True" or "False"
- If answer is unclear, set as null

Return the response in this exact JSON format:
{
  "answers": [
    { "questionNumber": 1, "answer": "A" },
    { "questionNumber": 2, "answer": "B,C" },
    { "questionNumber": 3, "answer": "42.5" },
    { "questionNumber": 4, "answer": "True" }
  ],
  "metadata": {
    "totalExtracted": 100,
    "format": "grid|list|table",
    "confidence": "high|medium|low"
  }
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Please extract all answers from this answer key document. The exam has approximately ${totalQuestions || 'unknown'} questions:\n\n${sanitizedContent}` 
          },
        ],
        temperature: 0.1,
        max_tokens: 16000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON from the AI response
    let extractedData;
    try {
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
      
      extractedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("Failed to parse extracted answers. Please try again.");
    }

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in extract-answers:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to extract answers" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
