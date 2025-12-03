import { Language, TranslationResponseSchema } from '../types';

// The URL for our Cloudflare Function
const API_ENDPOINT = '/api/translate';

export const translateText = async (
  text: string,
  sourceLang: Language,
  targetLang: Language
): Promise<TranslationResponseSchema> => {
  try {
    // We now fetch from our own backend instead of calling Google directly
    const response = await fetch(API_ENDPOINT, {
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
    console.error("Translation Service Error:", error);
    throw error;
  }
};
