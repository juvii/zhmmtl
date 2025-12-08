import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ArrowRightLeft, Sparkles, Copy, History, X, Languages, Loader2,
  Image as ImageIcon, ScanLine,
} from 'lucide-react';
import { translateText, extractTextFromImage } from './services/geminiService';
import { Language, TranslationResult, TranslationProvider } from './types';
import { UI_STRINGS, UiLanguage } from './constants/translations';

import LanguageSelector from './components/LanguageSelector';
import ModelSelector from './components/ModelSelector';
import HistoryItemCard from './components/HistoryItemCard';
import ScanPage from './components/ScanPage';

const App: React.FC = () => {
  const [uiLang, setUiLang] = useState<UiLanguage>('zh');
  const t = UI_STRINGS[uiLang];

  const [view, setView] = useState<'home' | 'scan'>('home');

  const [sourceLang, setSourceLang] = useState<Language>(Language.Burmese);
  const [targetLang, setTargetLang] = useState<Language>(Language.Chinese);
  const [provider, setProvider] = useState<TranslationProvider>('model1');

  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<TranslationResult[]>(() => {
    const saved = localStorage.getItem('translation_history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('translation_history', JSON.stringify(history));
  }, [history]);

  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const homeFileInputRef = useRef<HTMLInputElement>(null);

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setInputText(result?.translation || '');
    setResult(null);
  };

  const handleTranslate = useCallback(async () => {
    if (!inputText.trim()) return;

    setIsTranslating(true);
    setError(null);

    try {
      const data = await translateText(inputText, sourceLang, targetLang, provider);

      const newResult: TranslationResult = {
        original: inputText,
        translation: data.translation,
        pronunciation: data.pronunciation,
        details: data.details,
        sourceLang,
        targetLang,
        provider,
        timestamp: Date.now(),
      };

      setResult(newResult);
      setHistory(prev => [newResult, ...prev].slice(0, 50));
    } catch (err) {
      setError(t.errorTrans);
    } finally {
      setIsTranslating(false);
    }
  }, [inputText, sourceLang, targetLang, provider, t]);

  const handleLegacyImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsOcrLoading(true);
    setError(null);
    setResult(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          const text = await extractTextFromImage(base64String);
          if (text) {
            setInputText(text);
          } else {
            setError(t.errorOCR);
          }
        } catch (err) {
          setError(t.errorFile);
        } finally {
          setIsOcrLoading(false);
          if (homeFileInputRef.current) homeFileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(t.errorFile);
      setIsOcrLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleHistoryClick = (item: TranslationResult) => {
    setSourceLang(item.sourceLang);
    setTargetLang(item.targetLang);
    setProvider(item.provider);
    setInputText(item.original);
    setResult(item);
    setShowHistory(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearInput = () => {
    setInputText('');
    setResult(null);
    inputRef.current?.focus();
  };

  const toggleUiLang = () => {
    setUiLang(prev => prev === 'zh' ? 'en' : 'zh');
  };

  const isLoading = isTranslating || isOcrLoading;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-2.5 cursor-pointer" onClick={() => setView('home')}>
            <div className="bg-brand-600 p-1.5 sm:p-2 rounded-lg text-white shadow-lg shadow-brand-500/30">
              <Languages size={18} className="sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
              {t.appTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleUiLang}
              className="px-2 py-1 text-xs font-bold bg-slate-100 text-slate-600 rounded border border-slate-200 hover:bg-slate-200 transition-colors"
              aria-label={`Switch interface language to ${uiLang === 'zh' ? 'English' : 'Chinese'}`}
              title={`Language: ${uiLang === 'zh' ? 'English' : 'Chinese'}`}
            >
              {uiLang === 'zh' ? 'EN' : '中文'}
            </button>

            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2 rounded-full transition-all ${showHistory ? 'bg-brand-100 text-brand-700' : 'hover:bg-slate-100 text-slate-600'}`}
              title={t.history}
              aria-label={t.history}
              aria-expanded={showHistory}
              aria-controls="history-panel"
            >
              <History size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-5xl mx-auto p-3 sm:p-6 flex flex-col lg:flex-row gap-4 sm:gap-6">

        {view === 'scan' ? (
          <div className="flex-1 w-full h-[calc(100vh-8rem)]">
            <ScanPage
              t={t}
              onBack={() => setView('home')}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4 sm:gap-6">

            <div className="bg-gradient-to-r from-brand-500 to-brand-600 rounded-xl p-4 text-white flex items-center justify-between shadow-lg shadow-brand-500/20">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg"><ScanLine size={20} /></div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">{t.scanTitle}</h3>
                  <p className="text-xs text-brand-100 opacity-90">{t.scanInstruct}</p>
                </div>
              </div>
              <button
                onClick={() => setView('scan')}
                className="bg-white text-brand-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-50 transition shadow-sm"
              >
                {t.scanTab}
              </button>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center gap-3 sm:gap-4">

              <div className="w-full flex flex-row items-end justify-between gap-2 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <LanguageSelector
                    label={t.translateFrom}
                    selected={sourceLang}
                    onChange={setSourceLang}
                    t={t}
                  />
                </div>

                <button
                  onClick={swapLanguages}
                  className="p-2 sm:p-2.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-brand-600 transition-colors mb-[1px] sm:mb-0 shrink-0"
                  title="Swap"
                >
                  <ArrowRightLeft size={18} className="sm:w-5 sm:h-5" />
                </button>

                <div className="flex-1 min-w-0">
                  <LanguageSelector
                    label={t.translateTo}
                    selected={targetLang}
                    onChange={setTargetLang}
                    t={t}
                  />
                </div>
              </div>

              <div className="w-full flex flex-col sm:flex-row justify-between items-center border-t border-slate-100 pt-3 gap-2">
                <span className="hidden sm:inline text-xs font-semibold text-slate-400 uppercase tracking-wider self-start sm:self-center mt-1 sm:mt-0">{t.engine}:</span>
                <ModelSelector selected={provider} onChange={setProvider} disabled={isLoading} />
              </div>
            </div>

            <div className="flex flex-col gap-4">

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-brand-500/50 focus-within:border-brand-500 transition-all">
                <div className="p-3 sm:p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.inputLabel}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={homeFileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleLegacyImageUpload}
                      aria-label="Upload image for OCR"
                    />
                    <button
                      onClick={() => homeFileInputRef.current?.click()}
                      disabled={isLoading}
                      className="flex items-center gap-1 text-slate-500 hover:text-brand-600 transition-colors text-xs font-medium px-2 py-1 rounded-md hover:bg-slate-100"
                      aria-label={t.uploadImage}
                    >
                      <ImageIcon size={16} aria-hidden="true" />
                      <span className="hidden sm:inline">{t.uploadImage}</span>
                    </button>
                    {inputText && (
                      <button
                        onClick={clearInput}
                        className="text-slate-400 hover:text-red-500 transition-colors ml-2"
                        title={t.clear}
                        aria-label={t.clear}
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="relative group">
                  {isOcrLoading && (
                    <div className="absolute inset-0 z-10 bg-white/80 flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                      <Loader2 size={32} className="animate-spin text-brand-500" />
                      <span className="text-sm font-medium text-slate-600">{t.readingImage}</span>
                    </div>
                  )}
                  <textarea
                    ref={inputRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={t.placeholder}
                    className={`w-full h-32 sm:h-40 p-3 sm:p-4 resize-none outline-none text-base sm:text-lg leading-relaxed bg-transparent ${sourceLang === Language.Burmese ? 'font-burmese' : 'font-chinese'}`}
                    spellCheck="false"
                    aria-label={t.inputLabel}
                    aria-describedby="input-hint"
                  />
                  <span id="input-hint" className="sr-only">Enter text to translate or upload an image for OCR</span>
                </div>
                <div className="p-3 bg-white flex justify-end border-t border-slate-100">
                  <button
                    onClick={handleTranslate}
                    disabled={!inputText.trim() || isLoading}
                    className={`flex items-center gap-2 text-white px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl font-medium text-sm sm:text-base transition-all shadow-md active:scale-95 ${provider === 'google'
                      ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                      : 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/20'
                      } disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed`}
                    aria-busy={isTranslating}
                    aria-label={isTranslating ? t.translatingBtn : t.translateBtn}
                  >
                    {isTranslating ? (
                      <>
                        <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                        <span>{t.translatingBtn}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} aria-hidden="true" />
                        <span>{t.translateBtn}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  className="bg-red-50 text-red-600 p-3 sm:p-4 rounded-xl border border-red-100 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2"
                  role="alert"
                  aria-live="assertive"
                  aria-atomic="true"
                >
                  <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" aria-hidden="true" />
                  {error}
                </div>
              )}

              {result && (
                <div className={`bg-white rounded-2xl shadow-lg border overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 ${result.provider === 'google' ? 'border-blue-100' : 'border-brand-100'
                  }`}>
                  <div className={`p-3 sm:p-4 border-b flex justify-between items-center ${result.provider === 'google' ? 'bg-blue-50/30 border-blue-50' : 'bg-brand-50/30 border-slate-50'
                    }`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold uppercase tracking-wider ${result.provider === 'google' ? 'text-blue-600' : 'text-brand-600'
                        }`}>
                        {result.provider}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard(result.translation)}
                        className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-white rounded-md transition-colors"
                        title={t.copy}
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 sm:p-6 space-y-4">
                    <div>
                      <p className={`text-xl sm:text-2xl leading-relaxed text-slate-800 ${targetLang === Language.Burmese ? 'font-burmese' : 'font-chinese'}`}>
                        {result.translation}
                      </p>
                      {result.pronunciation && result.pronunciation !== "N/A (Google Translate)" && (
                        <p className="mt-2 text-slate-500 font-mono text-xs sm:text-sm bg-slate-50 inline-block px-2 py-1 rounded border border-slate-100">
                          {result.pronunciation}
                        </p>
                      )}
                    </div>

                    {result.details && (
                      <div className="pt-4 border-t border-slate-100">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">{t.details}</h4>
                        <p className={`text-sm text-slate-600 leading-relaxed p-3 rounded-lg border ${result.provider === 'google'
                          ? 'bg-blue-50/50 border-blue-50/50 text-blue-700'
                          : 'bg-brand-50/50 border-brand-50/50'
                          }`}>
                          {result.details}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!result && !isLoading && !error && (
                <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-slate-300 border-2 border-dashed border-slate-200 rounded-2xl">
                  <Languages size={40} strokeWidth={1} className="mb-4 text-slate-200 sm:w-12 sm:h-12" />
                  <p className="text-sm font-medium">{t.emptyState}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {showHistory && view === 'home' && (
          <aside
            id="history-panel"
            className="fixed lg:static inset-0 z-50 bg-white lg:bg-transparent lg:w-80 lg:block flex flex-col lg:border-none"
            role="region"
            aria-label={t.history}
          >
            <div className="lg:hidden p-4 border-b border-slate-100 flex justify-between items-center bg-white shadow-sm">
              <h3 className="font-bold text-slate-800 text-lg">{t.history}</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="p-2 bg-slate-100 rounded-full text-slate-600"
                aria-label="Close history panel"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 lg:p-1 space-y-3 lg:space-y-2 custom-scrollbar">
              <div className="hidden lg:flex items-center gap-2 mb-4 text-slate-400 px-1">
                <History size={16} aria-hidden="true" />
                <span className="text-sm font-medium uppercase tracking-wider">{t.recent}</span>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-12 lg:py-8 text-slate-400 text-sm" aria-live="polite">{t.noHistory}</div>
              ) : (
                <ul>
                  {history.map((item, idx) => (
                    <li key={item.timestamp + idx}>
                      <HistoryItemCard item={item} onClick={() => handleHistoryClick(item)} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        )}
      </main>

      <footer className="mt-auto py-6 text-center text-slate-400 text-xs sm:text-sm border-t border-slate-200 bg-white px-4">
        <p>{t.footer}</p>
      </footer>
    </div>
  );
};

export default App;