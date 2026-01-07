import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  ArrowRightLeft, 
  Sparkles, 
  Copy, 
  History, 
  X,
  Languages,
  Loader2,
  Image as ImageIcon,
  Bot,
  Zap,
  Globe
} from 'lucide-react';
import { translateText, extractTextFromImage } from './services/geminiService';
import { Language, TranslationResult, TranslationProvider } from './types';

// --- Localization Config ---

type UiLanguage = 'zh' | 'en';

const UI_STRINGS = {
  zh: {
    appTitle: "Juvis 翻译",
    history: "历史记录",
    recent: "最近",
    noHistory: "暂无记录",
    translateFrom: "源语言",
    translateTo: "目标语言",
    engine: "引擎",
    inputLabel: "输入内容",
    uploadImage: "上传图片",
    readingImage: "正在识别图片...",
    placeholder: "请输入文字或上传图片...",
    translateBtn: "翻译",
    translatingBtn: "翻译中...",
    clear: "清空",
    copy: "复制",
    details: "详解与语境",
    errorOCR: "未能在图片中找到文字。",
    errorFile: "文件读取失败。",
    errorTrans: "翻译失败，请检查网络或稍后重试。",
    footer: "© 2024 Juvi 翻译. 基于 Gemini AI & Google Cloud.",
    emptyState: "准备翻译",
    burmese: "🇲🇲 缅甸语",
    chinese: "🇨🇳 中文 (简体)",
    english: "🇺🇸 英语"
  },
  en: {
    appTitle: "Juvi's Translate",
    history: "History",
    recent: "Recent",
    noHistory: "No history yet",
    translateFrom: "From",
    translateTo: "To",
    engine: "Engine",
    inputLabel: "Input",
    uploadImage: "Upload Image",
    readingImage: "Reading image...",
    placeholder: "Enter text or upload image...",
    translateBtn: "Translate",
    translatingBtn: "Translating...",
    clear: "Clear",
    copy: "Copy",
    details: "Details & Context",
    errorOCR: "No text could be found in this image.",
    errorFile: "Failed to read file.",
    errorTrans: "Translation failed. Please try again.",
    footer: "© 2024 Juvi's Translate. Powered by Gemini AI & Google Cloud.",
    emptyState: "Ready to translate",
    burmese: "🇲🇲 Burmese",
    chinese: "🇨🇳 Chinese",
    english: "🇺🇸 English"
  }
};

// --- Sub-components ---

const LanguageSelector: React.FC<{
  label: string;
  selected: Language;
  onChange: (lang: Language) => void;
  disabled?: boolean;
  t: typeof UI_STRINGS['zh'];
}> = ({ label, selected, onChange, disabled, t }) => (
  <div className="flex flex-col gap-1 w-full">
    <span className="hidden sm:block text-xs font-semibold text-slate-500 uppercase tracking-wider pl-1">{label}</span>
    <div className="relative">
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value as Language)}
        disabled={disabled}
        className="appearance-none w-full bg-white border border-slate-200 text-slate-700 text-sm sm:text-base py-2 sm:py-2.5 px-3 sm:px-4 pr-8 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm truncate"
      >
        <option value={Language.Burmese}>{t.burmese}</option>
        <option value={Language.Chinese}>{t.chinese}</option>
        <option value={Language.English}>{t.english}</option>
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
        <svg className="fill-current h-3 w-3 sm:h-4 sm:w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
    </div>
  </div>
);

const ModelSelector: React.FC<{
  selected: TranslationProvider;
  onChange: (provider: TranslationProvider) => void;
  disabled?: boolean;
}> = ({ selected, onChange, disabled }) => {
  // Helper to determine styling
  const getStyle = (id: TranslationProvider, activeColor: string) => `
    flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all flex-1 sm:flex-none
    ${selected === id 
      ? `bg-white text-${activeColor}-600 shadow-sm ring-1 ring-slate-200` 
      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}
  `;

  return (
    <div className="flex flex-wrap sm:flex-nowrap items-center gap-1 bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
      <button onClick={() => onChange('gemini-2.5-flash-lite')} disabled={disabled} className={getStyle('gemini-2.5-flash-lite', 'emerald')}>
        <Zap size={14} />
        <span>Lite</span>
      </button>
      <button onClick={() => onChange('gemini-2.5-flash')} disabled={disabled} className={getStyle('gemini-2.5-flash', 'brand')}>
        <Bot size={14} />
        <span>Flash</span>
      </button>
      {/* Flash 2 Button (Replaces Pro) */}
      <button onClick={() => onChange('gemini-2.5-flash-2')} disabled={disabled} className={getStyle('gemini-2.5-flash-2', 'orange')}>
        <Zap size={14} className="fill-orange-100" />
        <span>Flash 2</span>
      </button>
      <button onClick={() => onChange('google')} disabled={disabled} className={getStyle('google', 'blue')}>
        <Globe size={14} />
        <span>Google</span>
      </button>
    </div>
  );
};

const HistoryItemCard: React.FC<{ item: TranslationResult; onClick: () => void }> = ({ item, onClick }) => {
  const getFlag = (lang: Language) => {
    switch(lang) {
      case Language.Burmese: return '🇲🇲';
      case Language.Chinese: return '🇨🇳';
      case Language.English: return '🇺🇸';
      default: return '🏳️';
    }
  };

  const getProviderBadge = (provider: TranslationProvider) => {
    if (provider === 'google') return <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">Google</span>;
    if (provider.includes('lite')) return <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100">Lite</span>;
    if (provider === 'gemini-2.5-flash-2') return <span className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded border border-orange-100">Flash 2</span>;
    return <span className="text-[10px] bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded border border-brand-100">Flash</span>;
  };

  return (
    <div 
      onClick={onClick}
      className="group relative bg-white border border-slate-100 hover:border-brand-200 p-3 sm:p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">
            {getFlag(item.sourceLang)} → {getFlag(item.targetLang)}
          </span>
          {getProviderBadge(item.provider)}
        </div>
        <span className="text-xs text-slate-300 group-hover:text-brand-400 transition-colors">
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <p className="text-slate-800 line-clamp-1 mb-1 text-sm sm:text-base">
        {item.original}
      </p>
      <p className="text-brand-600 line-clamp-1 text-sm sm:text-base">
        {item.translation}
      </p>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [uiLang, setUiLang] = useState<UiLanguage>('zh');
  const t = UI_STRINGS[uiLang];

  const [sourceLang, setSourceLang] = useState<Language>(Language.Burmese);
  const [targetLang, setTargetLang] = useState<Language>(Language.Chinese);
  const [provider, setProvider] = useState<TranslationProvider>('gemini-2.5-flash');
  
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(t.errorFile);
      setIsOcrLoading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
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
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-2.5">
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
            >
              {uiLang === 'zh' ? 'EN' : '中文'}
            </button>

            <button 
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2 rounded-full transition-all ${showHistory ? 'bg-brand-100 text-brand-700' : 'hover:bg-slate-100 text-slate-600'}`}
              title={t.history}
            >
              <History size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-5xl mx-auto p-3 sm:p-6 flex flex-col lg:flex-row gap-4 sm:gap-6">
        
        {/* Main Translation Area */}
        <div className="flex-1 flex flex-col gap-4 sm:gap-6">
          
          {/* Controls */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center gap-3 sm:gap-4">
            
            {/* Language Row */}
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

            {/* Model Selector Row */}
             <div className="w-full flex flex-col sm:flex-row justify-between items-center border-t border-slate-100 pt-3 gap-2">
               <span className="hidden sm:inline text-xs font-semibold text-slate-400 uppercase tracking-wider self-start sm:self-center mt-1 sm:mt-0">{t.engine}:</span>
               <ModelSelector selected={provider} onChange={setProvider} disabled={isLoading} />
             </div>
          </div>

          {/* Input/Output Container */}
          <div className="flex flex-col gap-4">
            
            {/* Input Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-brand-500/50 focus-within:border-brand-500 transition-all">
              <div className="p-3 sm:p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.inputLabel}</span>
                <div className="flex items-center gap-2">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                  <button 
                    onClick={triggerFileInput}
                    disabled={isLoading}
                    className="flex items-center gap-1 text-slate-500 hover:text-brand-600 transition-colors text-xs font-medium px-2 py-1 rounded-md hover:bg-slate-100"
                  >
                    <ImageIcon size={16} />
                    <span className="hidden sm:inline">{t.uploadImage}</span>
                  </button>
                  {inputText && (
                    <button onClick={clearInput} className="text-slate-400 hover:text-red-500 transition-colors ml-2" title={t.clear}>
                      <X size={16} />
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
                />
              </div>
              <div className="p-3 bg-white flex justify-end border-t border-slate-100">
                <button
                  onClick={handleTranslate}
                  disabled={!inputText.trim() || isLoading}
                  className={`flex items-center gap-2 text-white px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl font-medium text-sm sm:text-base transition-all shadow-md active:scale-95 ${
                    provider === 'google' 
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' 
                    : 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/20'
                  } disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed`}
                >
                  {isTranslating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>{t.translatingBtn}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      <span>{t.translateBtn}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 text-red-600 p-3 sm:p-4 rounded-xl border border-red-100 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                 <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                 {error}
              </div>
            )}

            {/* Output Card */}
            {result && (
              <div className={`bg-white rounded-2xl shadow-lg border overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 ${
                result.provider === 'google' ? 'border-blue-100' : 'border-brand-100'
              }`}>
                <div className={`p-3 sm:p-4 border-b flex justify-between items-center ${
                  result.provider === 'google' ? 'bg-blue-50/30 border-blue-50' : 'bg-brand-50/30 border-slate-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      result.provider === 'google' ? 'text-blue-600' : 'text-brand-600'
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
                      <p className={`text-sm text-slate-600 leading-relaxed p-3 rounded-lg border ${
                        result.provider === 'google' 
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

            {/* Empty State */}
            {!result && !isLoading && !error && (
               <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-slate-300 border-2 border-dashed border-slate-200 rounded-2xl">
                  <Languages size={40} strokeWidth={1} className="mb-4 text-slate-200 sm:w-12 sm:h-12" />
                  <p className="text-sm font-medium">{t.emptyState}</p>
               </div>
            )}
          </div>
        </div>

        {/* Sidebar History */}
        {showHistory && (
          <div className="fixed lg:static inset-0 z-50 bg-white lg:bg-transparent lg:w-80 lg:block flex flex-col lg:border-none">
            <div className="lg:hidden p-4 border-b border-slate-100 flex justify-between items-center bg-white shadow-sm">
              <h3 className="font-bold text-slate-800 text-lg">{t.history}</h3>
              <button 
                onClick={() => setShowHistory(false)}
                className="p-2 bg-slate-100 rounded-full text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 lg:p-1 space-y-3 lg:space-y-2 custom-scrollbar">
              <div className="hidden lg:flex items-center gap-2 mb-4 text-slate-400 px-1">
                <History size={16} />
                <span className="text-sm font-medium uppercase tracking-wider">{t.recent}</span>
              </div>
              
              {history.length === 0 ? (
                <div className="text-center py-12 lg:py-8 text-slate-400 text-sm">{t.noHistory}</div>
              ) : (
                history.map((item, idx) => (
                  <HistoryItemCard key={item.timestamp + idx} item={item} onClick={() => handleHistoryClick(item)} />
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 text-center text-slate-400 text-xs sm:text-sm border-t border-slate-200 bg-white px-4">
        <p>{t.footer}</p>
      </footer>
    </div>
  );
};

export default App;