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
  original: string;
  fileName?: string; // Optional: display filename if translation came from a file
  translation: string;
  pronunciation: string;
  details?: string;
  sourceLang: Language;
  targetLang: Language;
  timestamp: number;
}

export interface TranslationResponseSchema {
  translation: string;
  pronunciation: string;
  details: string;
}

export type HistoryItem = TranslationResult;
