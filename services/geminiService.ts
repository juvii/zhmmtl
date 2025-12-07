import { Language, TranslationResponseSchema, TranslationProvider, OCRResult } from '../types';
import { API_BASE_URL } from '../config';

export const translateText = async (
  text: string,
  sourceLang: Language,
  targetLang: Language,
  provider: TranslationProvider
): Promise<TranslationResponseSchema> => {
  try {
    const url = `${API_BASE_URL}/api/translate`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sourceLang, targetLang, provider }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
};

export const extractTextFromImage = async (base64Image: string): Promise<string> => {
  try {
    const url = `${API_BASE_URL}/api/ocr`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image }),
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

export const extractTextWithOverlay = async (base64Image: string): Promise<OCRResult> => {
  try {
    const url = `${API_BASE_URL}/api/ocr-overlay`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `OCR Overlay failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("OCR Overlay Service error:", error);
    throw error;
  }
};