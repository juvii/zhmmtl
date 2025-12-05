export enum Language {
  Burmese = 'Burmese',
  Chinese = 'Chinese',
  English = 'English',
}

export type TranslationProvider = 
  | 'gemini-2.5-flash' 
  | 'gemini-2.5-flash-lite' 
  | 'gemini-2.5-flash-2' // Changed from Pro to Flash 2
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