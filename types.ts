export enum Language {
  Burmese = 'Burmese',
  Chinese = 'Chinese',
}

export interface FileInput {
  mimeType: string;
  data: string; // Base64 string
  name: string; // Original filename for UI display
}

export interface TranslationResult {
  original: string; // This stores user input text
  fileName?: string;
  source_content?: string; // This stores AI extracted text (OCR/ASR)
  translation: string;
  pronunciation: string;
  details?: string;
  sourceLang: Language;
  targetLang: Language;
  timestamp: number;
}

export interface TranslationResponseSchema {
  source_content: string;
  translation: string;
  pronunciation: string;
  details: string;
}

export type HistoryItem = TranslationResult;
