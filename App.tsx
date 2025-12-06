import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  ArrowRightLeft, Sparkles, Copy, History, X, Languages, Loader2, 
  Image as ImageIcon, Bot, Zap, Globe, ScanLine, Camera, ChevronLeft
} from 'lucide-react';
import { translateText, extractTextFromImage, extractTextWithOverlay } from './services/geminiService';
import { Language, TranslationResult, TranslationProvider, OCRBlock } from './types';

// --- Localization Config ---
// (Kept original logic, added new strings for Scan mode)
type UiLanguage = 'zh' | 'en';
const UI_STRINGS = {
  zh: {
    appTitle: "Juvi 翻译",
    // ... existing ...
    scanTab: "智能扫描",
    homeTab: "文本翻译",
    scanTitle: "图片文字识别",
    scanInstruct: "上传图片，点击文字即可翻译",
    noTextFound: "未检测到文字",
    processing: "正在分析图片...",
    uploadBtn: "选择图片",
    tapToTrans: "点击文字块进行翻译",
    // ... existing ...
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
    scanTab: "Smart Scan",
    homeTab: "Text Translate",
    scanTitle: "Image Text Recognition",
    scanInstruct: "Upload image and tap text to translate",
    noTextFound: "No text detected",
    processing: "Analyzing image...",
    uploadBtn: "Select Image",
    tapToTrans: "Tap text block to translate",
    // ... existing ...
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

// --- Shared Components ---
const LanguageSelector: React.FC<any> = ({ label, selected, onChange, disabled, t }) => (
  <div className="flex flex-col gap-1 w-full">
    <span className="hidden sm:block text-xs font-semibold text-slate-500 uppercase tracking-wider pl-1">{label}</span>
    <div className="relative">
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value as Language)}
        disabled={disabled}
        className="appearance-none w-full bg-white border border-slate-200 text-slate-700 text-sm sm:text-base py-2 sm:py-2.5 px-3 sm:px-4 pr-8 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-sm"
      >
        <option value={Language.Burmese}>{t.burmese}</option>
        <option value={Language.Chinese}>{t.chinese}</option>
        <option value={Language.English}>{t.english}</option>
      </select>
    </div>
  </div>
);

// --- New OCR Page Component ---
const ScanPage: React.FC<{
  t: any;
  onBack: () => void;
  sourceLang: Language;
  targetLang: Language;
  provider: TranslationProvider;
}> = ({ t, onBack, sourceLang, targetLang, provider }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<OCRBlock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<OCRBlock | null>(null);
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scale, setScale] = useState({ x: 1, y: 1 });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setBlocks([]);
    setTranslation(null);
    setSelectedBlock(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setImageSrc(base64);
      try {
        const result = await extractTextWithOverlay(base64);
        setBlocks(result.blocks);
      } catch (err) {
        console.error(err);
        alert(t.errorOCR);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Recalculate overlay scale when image loads or resizes
  const updateScale = () => {
    if (imgRef.current) {
      const { naturalWidth, naturalHeight, clientWidth, clientHeight } = imgRef.current;
      if (naturalWidth && naturalHeight) {
        setScale({
          x: clientWidth / naturalWidth,
          y: clientHeight / naturalHeight
        });
      }
    }
  };

  useEffect(() => {
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const handleBlockClick = async (block: OCRBlock) => {
    setSelectedBlock(block);
    setIsTranslating(true);
    try {
      const data = await translateText(block.text, sourceLang, targetLang, provider);
      setTranslation({
        original: block.text,
        translation: data.translation,
        pronunciation: data.pronunciation,
        details: data.details,
        sourceLang,
        targetLang,
        provider,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Top Bar for Scan Page */}
      <div className="flex justify-between items-center px-1">
        <button onClick={onBack} className="flex items-center gap-1 text-slate-500 hover:text-slate-800">
          <ChevronLeft size={20} />
          <span className="text-sm font-medium">{t.homeTab}</span>
        </button>
        <span className="font-bold text-slate-700 flex items-center gap-2">
          <ScanLine size={18} /> {t.scanTab}
        </span>
        <div className="w-8" /> {/* Spacer */}
      </div>

      <div className="flex-1 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 relative overflow-hidden flex flex-col items-center justify-center">
        {!imageSrc ? (
          <div className="text-center p-6">
            <Camera size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 mb-4">{t.scanInstruct}</p>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-brand-600 text-white px-6 py-2 rounded-full font-medium hover:bg-brand-700 transition"
            >
              {t.uploadBtn}
            </button>
          </div>
        ) : (
          <div className="relative w-full h-full bg-black/5 flex items-center justify-center overflow-auto">
             {isLoading && (
               <div className="absolute inset-0 z-20 bg-white/80 flex flex-col items-center justify-center backdrop-blur-sm">
                 <Loader2 size={40} className="animate-spin text-brand-600 mb-2" />
                 <p className="text-brand-800 font-medium">{t.processing}</p>
               </div>
             )}
             
             <div className="relative inline-block max-w-full">
               <img 
                 ref={imgRef}
                 src={imageSrc} 
                 className="max-w-full max-h-[70vh] object-contain shadow-lg"
                 onLoad={updateScale}
                 alt="Scan target"
               />
               {/* Overlay Layer */}
               {!isLoading && blocks.map((block, idx) => (
                 <div
                   key={idx}
                   onClick={(e) => { e.stopPropagation(); handleBlockClick(block); }}
                   className={`absolute cursor-pointer border-2 transition-all hover:bg-brand-500/20 hover:border-brand-400 ${
                     selectedBlock === block ? 'bg-brand-500/30 border-brand-500 z-10 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'border-transparent'
                   }`}
                   style={{
                     left: block.box.x * scale.x,
                     top: block.box.y * scale.y,
                     width: block.box.width * scale.x,
                     height: block.box.height * scale.y,
                   }}
                 />
               ))}
             </div>
             
             {/* Retake Button Floating */}
             <button 
                onClick={() => { setImageSrc(null); setBlocks([]); }}
                className="absolute top-4 right-4 bg-white/90 p-2 rounded-full shadow-md text-slate-600 hover:text-red-500 z-20"
             >
                <X size={20} />
             </button>
          </div>
        )}
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFile} />
      </div>

      {/* Translation Bottom Sheet / Panel */}
      {selectedBlock && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="flex justify-between items-start mb-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.details}</h4>
            <button onClick={() => setSelectedBlock(null)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
          </div>
          
          <div className="mb-3">
             <p className="text-sm text-slate-500 mb-1">{t.translateFrom}:</p>
             <p className="font-medium text-slate-800 border-l-2 border-slate-300 pl-2 text-sm line-clamp-2">{selectedBlock.text}</p>
          </div>

          <div className="pt-3 border-t border-slate-100">
             <p className="text-sm text-slate-500 mb-1">{t.translateTo}:</p>
             {isTranslating ? (
               <div className="flex items-center gap-2 text-brand-600 text-sm">
                 <Loader2 size={14} className="animate-spin" /> {t.translatingBtn}
               </div>
             ) : translation ? (
               <div>
                  <p className="text-lg text-brand-700 font-medium mb-1">{translation.translation}</p>
                  <p className="text-xs text-slate-400 font-mono">{translation.pronunciation}</p>
               </div>
             ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [uiLang, setUiLang] = useState<UiLanguage>('zh');
  const t = UI_STRINGS[uiLang];

  const [view, setView] = useState<'home' | 'scan'>('home');
  
  // Shared State
  const [sourceLang, setSourceLang] = useState<Language>(Language.Burmese);
  const [targetLang, setTargetLang] = useState<Language>(Language.Chinese);
  const [provider, setProvider] = useState<TranslationProvider>('gemini-2.5-flash');
  
  // Home State
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [history, setHistory] = useState<TranslationResult[]>(() => {
    const saved = localStorage.getItem('translation_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  useEffect(() => {
    localStorage.setItem('translation_history', JSON.stringify(history));
  }, [history]);

  const [showHistory, setShowHistory] = useState(false);
  
  // ... (Keep existing simple handlers) ...
  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setInputText(result?.translation || '');
    setResult(null);
  };

  const handleTranslate = async () => {
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
    } catch (err) { setError(t.errorTrans); } 
    finally { setIsTranslating(false); }
  };

  // Simplified existing Upload for Home Page (Legacy/Simple OCR)
  const handleSimpleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsTranslating(true); 
    const reader = new FileReader();
    reader.onloadend = async () => {
       try {
         const text = await extractTextFromImage(reader.result as string);
         if(text) setInputText(text);
         else setError(t.errorOCR);
       } catch(err) { setError(t.errorFile); }
       finally { setIsTranslating(false); }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
            <div className="bg-brand-600 p-1.5 sm:p-2 rounded-lg text-white shadow-lg shadow-brand-500/30">
              <Languages size={18} className="sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
              {t.appTitle}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => setUiLang(l => l === 'zh' ? 'en' : 'zh')} className="px-2 py-1 text-xs font-bold bg-slate-100 rounded border border-slate-200">
              {uiLang === 'zh' ? 'EN' : '中文'}
            </button>
            <button onClick={() => setShowHistory(!showHistory)} className={`p-2 rounded-full ${showHistory ? 'bg-brand-100 text-brand-700' : 'hover:bg-slate-100 text-slate-600'}`}>
              <History size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow w-full max-w-5xl mx-auto p-3 sm:p-6 flex flex-col lg:flex-row gap-4 sm:gap-6">
        
        {view === 'scan' ? (
          <div className="flex-1">
             <ScanPage 
               t={t} 
               onBack={() => setView('home')} 
               sourceLang={sourceLang} 
               targetLang={targetLang} 
               provider={provider}
             />
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4 sm:gap-6">
            
            {/* View Switcher Banner */}
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

            {/* Language Controls */}
            <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center gap-3">
              <div className="w-full flex flex-row items-end justify-between gap-2">
                <div className="flex-1 min-w-0"><LanguageSelector label={t.translateFrom} selected={sourceLang} onChange={setSourceLang} t={t} /></div>
                <button onClick={swapLanguages} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 mb-[1px]"><ArrowRightLeft size={18} /></button>
                <div className="flex-1 min-w-0"><LanguageSelector label={t.translateTo} selected={targetLang} onChange={setTargetLang} t={t} /></div>
              </div>
              <div className="w-full flex items-center gap-2 border-t border-slate-100 pt-3">
                 <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.engine}:</span>
                 {/* Simplified Model Selector for brevity */}
                 <select value={provider} onChange={(e) => setProvider(e.target.value as TranslationProvider)} className="bg-slate-50 border border-slate-200 text-xs rounded p-1.5 flex-1">
                    <option value="gemini-2.5-flash">Gemini Flash (Fast)</option>
                    <option value="gemini-2.5-flash-2">Gemini Flash 2 (Smart)</option>
                    <option value="google">Google Translate</option>
                 </select>
              </div>
            </div>

            {/* Input Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-3 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.inputLabel}</span>
                 <div className="flex items-center gap-2">
                    <label className="cursor-pointer flex items-center gap-1 text-slate-500 hover:text-brand-600 transition-colors text-xs font-medium px-2 py-1 rounded-md hover:bg-slate-100">
                       <ImageIcon size={16} /> <span className="hidden sm:inline">{t.uploadImage}</span>
                       <input type="file" className="hidden" accept="image/*" onChange={handleSimpleUpload} />
                    </label>
                    {inputText && <button onClick={() => {setInputText(''); setResult(null);}}><X size={16} className="text-slate-400 hover:text-red-500"/></button>}
                 </div>
               </div>
               <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={t.placeholder}
                  className={`w-full h-32 p-4 resize-none outline-none text-lg bg-transparent ${sourceLang === Language.Burmese ? 'font-burmese' : 'font-chinese'}`}
               />
               <div className="p-3 bg-white flex justify-end border-t border-slate-100">
                  <button onClick={handleTranslate} disabled={!inputText.trim() || isTranslating} className="bg-brand-600 text-white px-6 py-2 rounded-xl font-medium text-sm hover:bg-brand-700 disabled:bg-slate-300 transition flex items-center gap-2">
                     {isTranslating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                     {isTranslating ? t.translatingBtn : t.translateBtn}
                  </button>
               </div>
            </div>

            {/* Error & Results (Simplified for brevity as they are largely same as original) */}
            {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm">{error}</div>}
            
            {result && (
              <div className="bg-white rounded-2xl shadow-lg border border-brand-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                 <div className="p-4 border-b bg-brand-50/30 flex justify-between items-center">
                    <span className="text-brand-600 text-xs font-bold uppercase">{result.provider}</span>
                    <button onClick={() => navigator.clipboard.writeText(result.translation)}><Copy size={16} className="text-slate-400 hover:text-brand-600"/></button>
                 </div>
                 <div className="p-6">
                    <p className="text-2xl text-slate-800 leading-relaxed mb-2">{result.translation}</p>
                    <p className="text-sm font-mono text-slate-500 bg-slate-50 inline-block px-2 py-1 rounded border">{result.pronunciation}</p>
                    {result.details && <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-600">{result.details}</div>}
                 </div>
              </div>
            )}
          </div>
        )}

        {/* Sidebar History - Only show on Home view */}
        {showHistory && view === 'home' && (
          <div className="fixed lg:static inset-0 z-50 bg-white lg:bg-transparent lg:w-80 flex flex-col lg:border-none">
            <div className="lg:hidden p-4 border-b flex justify-between items-center"><h3 className="font-bold">{t.history}</h3><button onClick={() => setShowHistory(false)}><X size={20}/></button></div>
            <div className="flex-1 overflow-y-auto p-4 lg:p-1 space-y-3">
               {history.map((item, i) => (
                 <div key={i} onClick={() => { setInputText(item.original); setResult(item); setShowHistory(false); }} className="bg-white p-3 rounded-xl border border-slate-100 hover:border-brand-200 shadow-sm cursor-pointer">
                    <div className="flex justify-between text-xs text-slate-400 mb-1"><span>{item.sourceLang} → {item.targetLang}</span></div>
                    <p className="line-clamp-1 text-sm text-slate-800">{item.original}</p>
                    <p className="line-clamp-1 text-sm text-brand-600">{item.translation}</p>
                 </div>
               ))}
            </div>
          </div>
        )}
      </main>
      
      {view === 'scan' && (
        <footer className="py-4 text-center text-slate-400 text-xs border-t">
          Google Vision API • Gemini 2.5 Flash
        </footer>
      )}
    </div>
  );
};

export default App;