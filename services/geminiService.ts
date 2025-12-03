// src/services/geminiService.ts
import { Language, TranslationResponseSchema } from '../types';

// NOTE: The GoogleGenAI import is removed. The browser no longer needs the SDK.

export const translateText = async (
  text: string,
  sourceLang: Language,
  targetLang: Language
): Promise<TranslationResponseSchema> => {
  try {
    // We now fetch from our own backend proxy
    // In production, this URL might be different (e.g., https://api.yourapp.com)
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        sourceLang,
        targetLang,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    return data as TranslationResponseSchema;
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
};
