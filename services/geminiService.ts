// src/services/geminiService.ts
import { Language, TranslationResponseSchema } from '../types';

// Detect if we are in a mobile app or web environment
// If VITE_API_URL is set (in .env), use it. Otherwise, default to relative path.
const BASE_URL = import.meta.env.VITE_API_URL || '';

export const translateText = async (
  text: string,
  sourceLang: Language,
  targetLang: Language
): Promise<TranslationResponseSchema> => {
  try {
    // Use BASE_URL + endpoint
    const response = await fetch(`${BASE_URL}/api/translate`, {
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

export const extractTextFromImage = async (base64Image: string): Promise<string> => {
  try {
    const response = await fetch(`${BASE_URL}/api/ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `OCR failed: ${response.status}`);
    }

    const data = await response.json();
    return data.text || "";
  } catch (error) {
    console.error("OCR Service error:", error);
    throw error;
  }
};
