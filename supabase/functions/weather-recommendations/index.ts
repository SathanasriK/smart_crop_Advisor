import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { weatherData, language } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const languageNames: Record<string, string> = {
      en: 'English',
      hi: 'Hindi',
      ta: 'Tamil',
      te: 'Telugu',
      kn: 'Kannada',
      mr: 'Marathi',
      bn: 'Bengali',
      gu: 'Gujarati',
      pa: 'Punjabi',
      ml: 'Malayalam',
    };

    const targetLanguage = languageNames[language] || 'English';

    const systemPrompt = `You are an expert agricultural advisor helping Indian farmers make weather-based farming decisions.
    
CRITICAL LANGUAGE INSTRUCTION: You MUST respond ENTIRELY in ${targetLanguage}. 
- If ${targetLanguage} is Hindi, write in Hindi (Devanagari script).
- If ${targetLanguage} is Tamil, write in Tamil script.
- If ${targetLanguage} is Telugu, write in Telugu script.
- Every single word, title, and explanation must be in ${targetLanguage}.

Analyze the weather data and provide 3-4 short, practical farming recommendations.
Keep each recommendation concise (1-2 sentences).
Focus on actionable advice for crops, irrigation, pest prevention, and field work timing.`;

    const userPrompt = `Current weather conditions:
- Location: ${weatherData.location}
- Temperature: ${weatherData.temperature}°C
- Humidity: ${weatherData.humidity}%
- Rainfall: ${weatherData.rainfall}mm
- Wind Speed: ${weatherData.windSpeed} km/h
- Condition: ${weatherData.condition}
- Description: ${weatherData.description}

Provide 3-4 practical farming recommendations based on this weather. Respond ONLY in ${targetLanguage}.`;

    console.log('Requesting weather recommendations in:', targetLanguage);

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
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const recommendations = data.choices?.[0]?.message?.content || "";

    console.log('Weather recommendations generated successfully');

    return new Response(JSON.stringify({ recommendations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Weather recommendations error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
