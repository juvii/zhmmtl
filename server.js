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
  Globe
} from 'lucide-react';
import { translateText, extractTextFromImage } from './services/geminiService';
import { Language, TranslationResult, TranslationProvider } from './types';

// --- Sub-components ---

const LanguageSelector: React.FC<{
  label: string;
  selected: Language;
  onChange: (lang: Language) => void;
  disabled?: boolean;
}> = ({ label, selected, onChange, disabled }) => (
  <div className="flex flex-col gap-1.5 w-full sm:w-auto">
    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider pl-1">{label}</span>
    <div className="relative">
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value as Language)}
        disabled={disabled}
        className="appearance-none w-full sm:w-48 bg-white border border-slate-200 text-slate-700 py-2.5 px-4 pr-8 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        <option value={Language.Burmese}>🇲🇲 Burmese</option>
        <option value={Language.Chinese}>🇨🇳 Chinese (Simplified)</option>
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
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
}> = ({ selected, onChange, disabled }) => (
  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
    <button
      onClick={() => onChange('gemini')}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
        selected === 'gemini' 
          ? 'bg-white text-brand-600 shadow-sm' 
          : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      <Bot size={16} />
      <span>Gemini 2.5</span>
    </button>
    <button
      onClick={() => onChange('google')}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
        selected === 'google' 
          ? 'bg-white text-blue-600 shadow-sm' 
          : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      <Globe size={16} />
      <span>Google</span>
    </button>
  </div>
);

const HistoryItemCard: React.FC<{ item: TranslationResult; onClick: () => void }> = ({ item, onClick }) => (
  <div 
    onClick={onClick}
    className="group relative bg-white border border-slate-100 hover:border-brand-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
  >
    <div className="flex justify-between items-start mb-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-400">
          {item.sourceLang === Language.Burmese ? '🇲🇲' : '🇨🇳'} → {item.targetLang === Language.Burmese ? '🇲🇲' : '🇨🇳'}
        </span>
        {item.provider === 'google' ? (
          <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">Google</span>
        ) : (
          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">Gemini</span>
        )}
      </div>
      <span className="text-xs text-slate-300 group-hover:text-brand-400 transition-colors">
        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
    <p className={`text-slate-800 line-clamp-1 mb-1 ${item.sourceLang === Language.Burmese ? 'font-burmese' : 'font-chinese'}`}>
      {item.original}
    </p>
    <p className={`text-brand-600 line-clamp-1 ${item.targetLang === Language.Burmese ? 'font-burmese' : 'font-chinese'}`}>
      {item.translation}
    </p>
  </div>
);

// --- Main App Component ---

const App: React.FC = () => {
  const [sourceLang, setSourceLang] = useState<Language>(Language.Burmese);
  const [targetLang, setTargetLang] = useState<Language>(Language.Chinese);
  const [provider, setProvider] = useState<TranslationProvider>('gemini');
  
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<TranslationResult | null>(null);
  
  // States for Translation
  const [isTranslating, setIsTranslating] = useState(false);
  
  // States for OCR
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<TranslationResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Focus ref for input
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
      setHistory(prev => [newResult, ...prev].slice(0, 50)); // Keep last 50
    } catch (err) {
      setError('Translation failed. Please try again or check your connection.');
    } finally {
      setIsTranslating(false);
    }
  }, [inputText, sourceLang, targetLang, provider]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsOcrLoading(true);
    setError(null);
    setResult(null); // Clear previous results

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          const text = await extractTextFromImage(base64String);
          if (text) {
            setInputText(text);
          } else {
            setError("No text could be found in this image.");
          }
        } catch (err) {
          setError("Failed to process image. Ensure OCR credentials are set on server.");
        } finally {
          setIsOcrLoading(false);
          // Clear input so same file can be selected again if needed
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("Failed to read file.");
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

  const isLoading = isTranslating || isOcrLoading;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-brand-600 p-2 rounded-lg text-white shadow-lg shadow-brand-500/30">
              <Languages size={20} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
              Juvi's <span className="text-brand-600">翻译</span>
            </h1>
          </div>
          
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`p-2 rounded-full transition-all ${showHistory ? 'bg-brand-100 text-brand-700' : 'hover:bg-slate-100 text-slate-600'}`}
            title="History"
          >
            <History size={20} />
          </button>
        </div>
      </header>

      <main className="flex-grow w-full max-w-5xl mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-6">
        
        {/* Main Translation Area */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* Controls */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center gap-4">
            
            {/* Language Row */}
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
              <LanguageSelector 
                label="Translate from" 
                selected={sourceLang} 
                onChange={setSourceLang} 
              />
              
              <button 
                onClick={swapLanguages}
                className="p-2.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-brand-600 transition-colors mt-4 sm:mt-0"
                title="Swap Languages"
              >
                <ArrowRightLeft size={20} />
              </button>

              <LanguageSelector 
                label="Translate to" 
                selected={targetLang} 
                onChange={setTargetLang} 
              />
            </div>

            {/* Model Selector Row */}
             <div className="w-full flex justify-end border-t border-slate-100 pt-3">
               <div className="flex items-center gap-2">
                 <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Engine:</span>
                 <ModelSelector selected={provider} onChange={setProvider} disabled={isLoading} />
               </div>
             </div>
          </div>

          {/* Input/Output Container */}
          <div className="flex flex-col gap-4">
            
            {/* Input Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-brand-500/50 focus-within:border-brand-500 transition-all">
              <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Input</span>
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
                    title="Upload Image for OCR"
                  >
                    <ImageIcon size={16} />
                    <span className="hidden sm:inline">Upload Image</span>
                  </button>
                  {inputText && (
                    <button onClick={clearInput} className="text-slate-400 hover:text-red-500 transition-colors ml-2">
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
              <div className="relative group">
                {isOcrLoading && (
                  <div className="absolute inset-0 z-10 bg-white/80 flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                    <Loader2 size={32} className="animate-spin text-brand-500" />
                    <span className="text-sm font-medium text-slate-600">Reading image text...</span>
                  </div>
                )}
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Enter text or upload image...`}
                  className={`w-full h-40 p-4 resize-none outline-none text-lg leading-relaxed bg-transparent ${sourceLang === Language.Burmese ? 'font-burmese' : 'font-chinese'}`}
                  spellCheck="false"
                />
              </div>
              <div className="p-3 bg-white flex justify-end border-t border-slate-100">
                <button
                  onClick={handleTranslate}
                  disabled={!inputText.trim() || isLoading}
                  className={`flex items-center gap-2 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-md active:scale-95 ${
                    provider === 'google' 
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' 
                    : 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/20'
                  } disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed`}
                >
                  {isTranslating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Translating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      <span>Translate</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                 <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                 {error}
              </div>
            )}

            {/* Output Card */}
            {result && (
              <div className={`bg-white rounded-2xl shadow-lg border overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 ${
                result.provider === 'google' ? 'border-blue-100' : 'border-brand-100'
              }`}>
                <div className={`p-4 border-b flex justify-between items-center ${
                  result.provider === 'google' ? 'bg-blue-50/30 border-blue-50' : 'bg-brand-50/30 border-slate-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      result.provider === 'google' ? 'text-blue-600' : 'text-brand-600'
                    }`}>
                      {result.provider === 'google' ? 'Google Translate' : 'Gemini Result'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => copyToClipboard(result.translation)}
                      className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-white rounded-md transition-colors"
                      title="Copy"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <p className={`text-2xl leading-relaxed text-slate-800 ${targetLang === Language.Burmese ? 'font-burmese' : 'font-chinese'}`}>
                      {result.translation}
                    </p>
                    {result.pronunciation && result.pronunciation !== "N/A (Google Translate)" && (
                      <p className="mt-2 text-slate-500 font-mono text-sm bg-slate-50 inline-block px-2 py-1 rounded border border-slate-100">
                        {result.pronunciation}
                      </p>
                    )}
                  </div>

                  {result.details && (
                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Details & Context</h4>
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

            {/* Empty State / Placeholder */}
            {!result && !isLoading && !error && (
               <div className="flex flex-col items-center justify-center p-12 text-slate-300 border-2 border-dashed border-slate-200 rounded-2xl">
                  <Languages size={48} strokeWidth={1} className="mb-4 text-slate-200" />
                  <p className="text-sm font-medium">Ready to translate</p>
               </div>
            )}
          </div>
        </div>

        {/* Sidebar History (Desktop) or Modal (Mobile) */}
        {showHistory && (
          <div className="w-full lg:w-80 bg-white lg:bg-transparent rounded-2xl shadow-xl lg:shadow-none border lg:border-none border-slate-200 absolute lg:static top-20 right-4 left-4 lg:left-auto z-20 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="lg:hidden p-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="font-bold text-slate-800">History</h3>
              <button onClick={() => setShowHistory(false)}><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-1 space-y-2 lg:pr-2 custom-scrollbar">
              <div className="hidden lg:flex items-center gap-2 mb-4 text-slate-400 px-1">
                <History size={16} />
                <span className="text-sm font-medium uppercase tracking-wider">Recent</span>
              </div>
              
              {history.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No history yet</div>
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
      <footer className="mt-auto py-6 text-center text-slate-400 text-sm border-t border-slate-200 bg-white">
        <p>© {new Date().getFullYear()} Juvi's 翻译. Powered by Gemini AI & Google Cloud.</p>
      </footer>
    </div>
  );
};

export default App;
