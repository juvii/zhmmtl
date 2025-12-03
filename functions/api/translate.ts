import { GoogleGenAI, Type, Schema } from "@google/genai";

// We redefine types here to avoid complex relative imports during the Cloudflare build
enum Language {
  Burmese = 'Burmese',
  Chinese = 'Chinese',
}

interface RequestBody {
  text: string;
  sourceLang: Language;
  targetLang: Language;
}

// Define the schema for the Gemini output
const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    translation: {
      type: Type.STRING,
      description: "The translated text in the target language.",
    },
    pronunciation: {
      type: Type.STRING,
      description: "Phonetic pronunciation (Pinyin for Chinese, Romanization for Burmese).",
    },
    details: {
      type: Type.STRING,
      description: "Brief notes on context, tone, or alternate meanings if applicable.",
    },
  },
  required: ["translation", "pronunciation"],
};

export const onRequestPost = async (context) => {
  try {
    // 1. Get the API Key securely from Cloudflare Environment Variables
    const apiKey = context.env.API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Server misconfiguration: API_KEY missing" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Parse the incoming request body from the frontend
    const { text, sourceLang, targetLang } = await context.request.json() as RequestBody;

    if (!text) {
      return new Response(JSON.stringify({ error: "Missing text to translate" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Initialize Gemini API (Server-side)
    const ai = new GoogleGenAI({ apiKey });
    const modelName = "gemini-2.5-flash";

    const prompt = `
      Translate the following text from ${sourceLang} to ${targetLang}.
      Ensure the translation is natural and accurate. 
      For Burmese to Chinese, use Simplified Chinese.
      For Chinese to Burmese, use standard Burmese script.
      Provide the pronunciation guide (Pinyin for Chinese output, Romanization for Burmese output).
      
      Input text: "${text}"
    `;

    // 4. Call Gemini
    const result = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "You are a professional translator specializing in Burmese (Myanmar) and Chinese (Mandarin) languages. You provide precise translations with helpful phonetic guides.",
      },
    });

    const jsonText = result.text;
    if (!jsonText) {
      throw new Error("Empty response from AI");
    }

    // 5. Return the result to the frontend
    return new Response(jsonText, {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Cloudflare Function Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
