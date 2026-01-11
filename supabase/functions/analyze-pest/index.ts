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
    const { imageBase64, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!imageBase64) {
      throw new Error("No image provided");
    }

    console.log("Processing pest detection request");

    const systemPrompt = `You are an expert plant pathologist and agricultural pest specialist helping farmers in India. 
Analyze the provided image of a plant/crop leaf and identify any pests, diseases, or health issues.

Provide your response in the following JSON format:
{
  "detected": true/false,
  "name": "Name of pest/disease",
  "confidence": 85,
  "severity": "low/medium/high",
  "symptoms": ["symptom1", "symptom2"],
  "treatment": ["treatment1", "treatment2"],
  "prevention": ["prevention1", "prevention2"],
  "additionalInfo": "Any other relevant information"
}

If the image doesn't show a plant or you cannot detect any issues, set detected to false.

CRITICAL LANGUAGE INSTRUCTION: ALL text fields in your JSON response MUST be in ${language || 'English'} language ONLY.
- If the language is Hindi, write ALL text in Hindi (हिंदी में लिखें)
- If the language is Tamil, write ALL text in Tamil (தமிழில் எழுதவும்)
- If the language is Telugu, write ALL text in Telugu (తెలుగులో రాయండి)
- If the language is Marathi, write ALL text in Marathi (मराठीत लिहा)
- If the language is Gujarati, write ALL text in Gujarati (ગુજરાતીમાં લખો)
- If the language is Kannada, write ALL text in Kannada (ಕನ್ನಡದಲ್ಲಿ ಬರೆಯಿರಿ)
- If the language is Punjabi, write ALL text in Punjabi (ਪੰਜਾਬੀ ਵਿੱਚ ਲਿਖੋ)
- If the language is Bengali, write ALL text in Bengali (বাংলায় লিখুন)

Use simple, practical language suitable for farmers.`;

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
            content: [
              { type: "text", text: "Please analyze this plant image for pests or diseases:" },
              { type: "image_url", image_url: { url: imageBase64 } }
            ]
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add more credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "";

    console.log("AI pest analysis response:", aiResponse);

    // Try to parse JSON from response
    let detection;
    try {
      // Extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        detection = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      // Return a structured fallback
      detection = {
        detected: false,
        name: "Analysis Incomplete",
        confidence: 0,
        severity: "unknown",
        symptoms: [],
        treatment: [],
        prevention: [],
        additionalInfo: aiResponse
      };
    }

    return new Response(JSON.stringify({ detection }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Pest analysis function error:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
