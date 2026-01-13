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
    const { pdfContent, examType } = await req.json();

    if (!pdfContent) {
      return new Response(
        JSON.stringify({ error: "PDF content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert exam paper analyzer. Your task is to extract questions from exam papers with high accuracy.

You will analyze the provided exam PDF content and extract:
1. All questions with their exact text
2. All options (A, B, C, D or 1, 2, 3, 4 format)
3. Section information if present (like Quantitative Aptitude, Reasoning, English, etc.)
4. Question type (single_correct, multiple_correct, true_false, numeric)
5. Any marks/negative marks information

Important rules:
- Detect question patterns like "Q1.", "1.", "Question 1:", etc.
- Detect option patterns like "A)", "(A)", "a.", "1)", etc.
- Identify sections from headings like "Section A", "QUANTITATIVE APTITUDE", etc.
- For True/False questions, options should be ["True", "False"]
- For numeric questions, options array should be empty
- Preserve mathematical equations and special characters

Return the response in this exact JSON format:
{
  "sections": [
    {
      "name": "Section name or null if no sections",
      "questions": [
        {
          "question_text": "The complete question text",
          "question_type": "single_correct|multiple_correct|true_false|numeric",
          "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
          "marks": 1,
          "negative_marks": 0.25
        }
      ]
    }
  ],
  "metadata": {
    "total_questions": 100,
    "exam_type": "${examType || 'custom'}",
    "has_negative_marking": true,
    "detected_sections": ["Section A", "Section B"]
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
            content: `Please analyze this exam paper content and extract all questions, options, and sections:\n\n${pdfContent}` 
          },
        ],
        temperature: 0.1,
        max_tokens: 32000,
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
      // Try to find JSON in the response (might be wrapped in markdown code blocks)
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
      console.error("Failed to parse AI response. Content length:", content.length);
      console.error("Parse error:", parseError);
      console.error("First 500 chars:", content.substring(0, 500));
      console.error("Last 500 chars:", content.substring(content.length - 500));
      throw new Error("Failed to parse extracted questions. The response may have been truncated. Try with a smaller PDF or fewer pages.");
    }

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
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
