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
    const { ph, nitrogen, phosphorus, potassium, moisture, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing soil analysis request:", { ph, nitrogen, phosphorus, potassium, moisture });

    const systemPrompt = `You are an expert soil scientist and agricultural advisor specializing in Indian farming conditions.
Analyze the provided soil parameters and give recommendations.

Provide your response in the following JSON format:
{
  "soilHealth": "good/moderate/poor",
  "fertilizer": {
    "name": "Recommended fertilizer name",
    "npkRatio": "N-P-K ratio",
    "amount": "Amount per acre",
    "applicationMethod": "How to apply"
  },
  "crops": [
    {"name": "Crop name", "suitability": "high/medium/low", "reason": "Why suitable"}
  ],
  "improvements": ["improvement1", "improvement2"],
  "advice": "Detailed farming advice based on soil conditions",
  "warnings": ["Any warnings or concerns"]
}

Consider Indian farming conditions, common crops, and locally available fertilizers.
Respond in ${language || 'English'} language for all text fields.`;

    const userMessage = `Please analyze this soil and provide recommendations:
- pH Level: ${ph}
- Nitrogen (N): ${nitrogen} kg/ha
- Phosphorus (P): ${phosphorus} kg/ha  
- Potassium (K): ${potassium} kg/ha
- Moisture Content: ${moisture}%

Provide fertilizer recommendations, suitable crops, and advice for Indian farmers.`;

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
          { role: "user", content: userMessage },
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

    console.log("AI soil analysis response received");

    // Try to parse JSON from response
    let analysis;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      // Return a structured fallback with the AI text
      analysis = {
        soilHealth: "unknown",
        fertilizer: {
          name: "NPK 20-20-20",
          npkRatio: "20-20-20",
          amount: "50 kg/acre",
          applicationMethod: "Broadcast before sowing"
        },
        crops: [
          { name: "General crops", suitability: "medium", reason: "Based on provided parameters" }
        ],
        improvements: [],
        advice: aiResponse,
        warnings: []
      };
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Soil analysis function error:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
