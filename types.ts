export enum Language {
  Burmese = 'Burmese',
  Chinese = 'Chinese',
  English = 'English',
}

// Updated to generic model names
export type TranslationProvider =
  | 'model1'
  | 'model2'
  | 'model3'
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