export enum Language {
  Burmese = 'Burmese',
  Chinese = 'Chinese',
  English = 'English',
}

export type TranslationProvider = 
  | 'gemini-2.5-flash' 
  | 'gemini-2.5-flash-lite' 
  | 'gemini-2.5-flash-2'
  | 'google';

export interface TranslationResult {
  original: string;
  translation: string;
  pronunciation: string;
  details?: string;
  sourceLang: Language;
  targetLang: Language;
  provider: TranslationProvider;
  timestamp: number;
}

export interface TranslationResponseSchema {
  translation: string;
  pronunciation: string;
  details: string;
}

export type HistoryItem = TranslationResult;

// --- New OCR Types ---

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OCRBlock {
  text: string;
  box: BoundingBox;
}

export interface OCRResult {
  fullText: string;
  blocks: OCRBlock[];
}