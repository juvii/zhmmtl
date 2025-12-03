import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Language, TranslationResponseSchema } from '../types';

// Initialize the API client
// CRITICAL: process.env.API_KEY is guaranteed to be present in this environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelName = "gemini-3-pro";

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
      description: "Brief notes on context, tone, or alternate meanings if applicable. ",
    },
  },
  required: ["translation", "pronunciation"],
};

export const translateText = async (
  text: string,
  sourceLang: Language,
  targetLang: Language
): Promise<TranslationResponseSchema> => {
  try {
    const prompt = `
      Translate the following text from ${sourceLang} to ${targetLang}.
      Ensure the translation is natural and accurate. 
      For Burmese to Chinese, use Simplified Chinese.
      For Chinese to Burmese, use standard Burmese script.
      Provide the pronunciation guide (Pinyin for Chinese output, Romanization for Burmese output).
      **details: must be in ${targetLang}
      
      Input text: "${text}"
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "You are a professional translator specializing in Burmese (Myanmar) and Chinese (Mandarin) languages. You provide precise translations with helpful phonetic guides.",
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Empty response from AI");
    }

    return JSON.parse(jsonText) as TranslationResponseSchema;
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
};
