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
    const { crops, location, language, date, startDate, endDate, coordinates } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const hasDateRange = startDate && endDate;
    const queryDate = date || startDate || new Date().toISOString().split('T')[0];

    console.log("Processing market prices request:", { crops, location, language, queryDate, hasDateRange });

    const systemPrompt = `You are an expert agricultural market analyst specializing in Indian crop markets (APMC mandis).
Provide current market price information for crops in India based on national agricultural market prices.

You MUST respond with a valid JSON object in this EXACT format (no markdown, no code blocks, just pure JSON):
{
  "prices": [
    {
      "crop": "Crop Name",
      "currentPrice": 2350,
      "previousPrice": 2280,
      "unit": "quintal",
      "trend": "up",
      "markets": [
        { 
          "name": "Market Name (Mandi)", 
          "price": 2350, 
          "distance": "5 km",
          "address": "Full address of the market"
        }
      ],
      "priceTrend": [
        { "day": "Mon", "date": "2024-01-15", "price": 2280 }
      ],
      "predictions": [
        { "day": "Day 1", "date": "2024-01-20", "predictedPrice": 2400, "confidence": "High" }
      ],
      "recommendation": "Brief recommendation about when to sell based on current trends and predictions"
    }
  ],
  "summary": "Brief overall market summary",
  "queriedDate": "${queryDate}",
  "location": "${location || 'India'}"
}

IMPORTANT REQUIREMENTS:
1. Include realistic prices based on current Indian APMC mandi rates
2. Include 3-5 nearby markets (mandis) with varying prices and their approximate distances from the location
3. Include market addresses so users can navigate to them
4. ${hasDateRange ? `Include price trend data from ${startDate} to ${endDate} with daily prices` : 'Include 7-day price trend data'}
5. ALWAYS include 5-day price predictions from the query date with confidence levels (High/Medium/Low)
6. Base predictions on seasonal trends, market demand, and historical patterns
7. Provide actionable sell recommendations based on price predictions

CRITICAL LANGUAGE INSTRUCTION: ALL text fields in your JSON response MUST be in ${language || 'English'} language ONLY.
- If Hindi: write ALL text in Hindi (हिंदी में लिखें)
- If Tamil: write ALL text in Tamil (தமிழில் எழுதவும்)
- If Telugu: write ALL text in Telugu (తెలుగులో రాయండి)
- If Marathi: write ALL text in Marathi (मराठीत लिहा)
- If Gujarati: write ALL text in Gujarati (ગુજરાતીમાં લખો)
- If Kannada: write ALL text in Kannada (ಕನ್ನಡದಲ್ಲಿ ಬರೆಯಿರಿ)
- If Punjabi: write ALL text in Punjabi (ਪੰਜਾਬੀ ਵਿੱਚ ਲਿਖੋ)
- If Bengali: write ALL text in Bengali (বাংলায় লিখুন)

Use simple language suitable for farmers.`;

    const userMessage = `Get current market prices for these crops: ${crops?.join(', ') || 'Wheat, Rice, Maize'}. 
Location: ${location || 'India'}
Query Date: ${queryDate}
${hasDateRange ? `Date Range: ${startDate} to ${endDate}` : ''}
${coordinates ? `Coordinates: ${coordinates.lat}, ${coordinates.lng}` : ''}

Provide:
1. Current prices at nearby APMC mandis
2. ${hasDateRange ? 'Daily price trend for the date range' : 'Weekly price trend'}
3. 5-day price predictions starting from the query date
4. Market addresses for navigation
5. Selling recommendations based on predictions`;

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

    console.log("AI market prices response received");

    // Try to parse JSON from response
    let marketData;
    try {
      // Remove any markdown code blocks if present
      let cleanedResponse = aiResponse.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.slice(7);
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3);
      }
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(0, -3);
      }
      cleanedResponse = cleanedResponse.trim();

      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        marketData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      console.error("Raw response:", aiResponse);
      return new Response(JSON.stringify({ error: "Failed to parse market data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(marketData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Market prices function error:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
