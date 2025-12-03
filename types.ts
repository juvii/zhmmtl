export enum Language {
  Burmese = 'Burmese',
  Chinese = 'Chinese',
}

export interface TranslationResult {
  original: string;
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