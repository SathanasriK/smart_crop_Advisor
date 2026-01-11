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
    const { message, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing chat request:", { message, language });

    const systemPrompt = `You are an expert agricultural advisor helping farmers in India. 
You provide advice on:
- Crop selection and planting schedules
- Soil management and fertilizers
- Pest and disease control
- Weather-based farming decisions
- Market prices and selling strategies
- Irrigation and water management

CRITICAL LANGUAGE INSTRUCTION: You MUST respond ONLY in ${language || 'English'} language. 
- If the language is Hindi, respond entirely in Hindi (हिंदी में जवाब दें)
- If the language is Tamil, respond entirely in Tamil (தமிழில் பதிலளிக்கவும்)
- If the language is Telugu, respond entirely in Telugu (తెలుగులో సమాధానం ఇవ్వండి)
- If the language is Marathi, respond entirely in Marathi (मराठीत उत्तर द्या)
- If the language is Gujarati, respond entirely in Gujarati (ગુજરાતીમાં જવાબ આપો)
- If the language is Kannada, respond entirely in Kannada (ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಿ)
- If the language is Punjabi, respond entirely in Punjabi (ਪੰਜਾਬੀ ਵਿੱਚ ਜਵਾਬ ਦਿਓ)
- If the language is Bengali, respond entirely in Bengali (বাংলায় উত্তর দিন)

Keep responses concise, practical, and easy to understand.
Use simple language suitable for farmers. Include specific actionable advice when possible.`;

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
          { role: "user", content: message },
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
    const aiResponse = data.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.";

    console.log("AI response generated successfully");

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Chat function error:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
