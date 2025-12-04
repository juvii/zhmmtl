import React, { useState, useCallback, useRef } from 'react';
import { 
  ArrowRightLeft, 
  Sparkles, 
  Copy, 
  History, 
  X,
  Languages,
  Loader2,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Music,
  Trash2,
  ScanText
} from 'lucide-react';
import { translateText } from './services/geminiService';
import { Language, TranslationResult, FileInput } from './types';

// --- Helper: Convert File to Base64 ---
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

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
        <Languages size={16} />
      </div>
    </div>
  </div>
);

const HistoryItemCard: React.FC<{ item: TranslationResult; onClick: () => void }> = ({ item, onClick }) => (
  <div 
    onClick={onClick}
    className="group relative bg-white border border-slate-100 hover:border-brand-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
  >
    <div className="flex justify-between items-start mb-2">
      <span className="text-xs font-medium text-slate-400">
        {item.sourceLang === Language.Burmese ? '🇲🇲' : '🇨🇳'} → {item.targetLang === Language.Burmese ? '🇲🇲' : '🇨🇳'}
      </span>
      <span className="text-xs text-slate-300 group-hover:text-brand-400 transition-colors">
        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
    <div className="flex items-center gap-2 mb-1">
      {item.fileName && <Paperclip size={12} className="text-brand-500" />}
      <p className={`text-slate-800 line-clamp-1 ${item.sourceLang === Language.Burmese ? 'font-burmese' : 'font-chinese'}`}>
        {item.fileName ? item.fileName : (item.source_content || item.original)}
      </p>
    </div>
    <p className={`text-brand-600 line-clamp-1 ${item.targetLang === Language.Burmese ? 'font-burmese' : 'font-chinese'}`}>
      {item.translation}
    </p>
  </div>
);

// --- Main App Component ---

const App: React.FC = () => {
  const [sourceLang, setSourceLang] = useState<Language>(Language.Burmese);
  const [targetLang, setTargetLang] = useState<Language>(Language.Chinese);
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileInput | null>(null);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<TranslationResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    if (!selectedFile) {
        setInputText(result?.translation || '');
    }
    setResult(null);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 9 * 1024 * 1024) {
      setError("File is too large. Please select a file under 9MB.");
      return;
    }

    try {
      const base64Data = await fileToBase64(file);
      setSelectedFile({
        name: file.name,
        mimeType: file.type,
        data: base64Data
      });
      setError(null);
    } catch (err) {
      setError("Failed to process file.");
    }
    
    event.target.value = '';
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('image')) return <ImageIcon size={20} className="text-purple-500" />;
    if (mimeType.includes('audio')) return <Music size={20} className="text-pink-500" />;
    if (mimeType.includes('pdf')) return <FileText size={20} className="text-red-500" />;
    return <Paperclip size={20} className="text-slate-500" />;
  };

  const handleTranslate = useCallback(async () => {
    if (!inputText.trim() && !selectedFile) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await translateText(inputText, selectedFile, sourceLang, targetLang);
      
      const newResult: TranslationResult = {
        original: inputText,
        fileName: selectedFile?.name,
        source_content: data.source_content, // Extracted OCR/ASR text
        translation: data.translation,
        pronunciation: data.pronunciation,
        details: data.details,
        sourceLang,
        targetLang,
        timestamp: Date.now(),
      };

      setResult(newResult);
      setHistory(prev => [newResult, ...prev].slice(0, 50)); 
    } catch (err: any) {
      setError(err.message || 'Translation failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [inputText, selectedFile, sourceLang, targetLang]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleHistoryClick = (item: TranslationResult) => {
    setSourceLang(item.sourceLang);
    setTargetLang(item.targetLang);
    if (item.fileName) {
      setInputText('');
      setError(`Loaded translation for file: ${item.fileName}`);
    } else {
      setInputText(item.original);
    }
    setResult(item);
    setShowHistory(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearInput = () => {
    setInputText('');
    setSelectedFile(null);
    setResult(null);
    inputRef.current?.focus();
  };

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
              Juvi's Slop <span className="text-brand-600">翻译</span>
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
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
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

          {/* Input/Output Container */}
          <div className="flex flex-col gap-4">
            
            {/* Input Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-brand-500/50 focus-within:border-brand-500 transition-all">
              <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Input</span>
                <div className="flex gap-2">
                   {/* File Upload Button */}
                   <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-full transition-colors"
                   >
                     <Paperclip size={14} />
                     Attach File
                   </button>
                   <input 
                     type="file"
                     ref={fileInputRef}
                     onChange={handleFileSelect}
                     className="hidden"
                     accept="image/*,audio/*,application/pdf"
                   />
                   
                   {(inputText || selectedFile) && (
                    <button onClick={clearInput} className="text-slate-400 hover:text-red-500 transition-colors ml-2">
                      <X size={16} />
                    </button>
                   )}
                </div>
              </div>

              <div className="relative">
                {/* File Preview Area */}
                {selectedFile && (
                  <div className="px-4 pt-4 pb-0">
                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                          {getFileIcon(selectedFile.mimeType)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-slate-700 truncate">{selectedFile.name}</span>
                          <span className="text-xs text-slate-400 uppercase">{selectedFile.mimeType.split('/')[1]}</span>
                        </div>
                      </div>
                      <button onClick={clearFile} className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}

                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={selectedFile ? "Add optional context about the file..." : `Enter ${sourceLang} text here...`}
                  className={`w-full ${selectedFile ? 'h-24' : 'h-40'} p-4 resize-none outline-none text-lg leading-relaxed bg-transparent ${sourceLang === Language.Burmese ? 'font-burmese' : 'font-chinese'}`}
                  spellCheck="false"
                />
              </div>
              <div className="p-3 bg-white flex justify-end border-t border-slate-100">
                <button
                  onClick={handleTranslate}
                  disabled={(!inputText.trim() && !selectedFile) || isLoading}
                  className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-md shadow-brand-500/20 active:scale-95"
                >
                  {isLoading ? (
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
              <div className="bg-white rounded-2xl shadow-lg border border-brand-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-brand-50/30">
                  <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">Result</span>
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
                
                <div className="p-6 space-y-6">
                  {/* OCR/Detected Text Section */}
                  {result.source_content && (
                     <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <div className="flex items-center gap-2 mb-2 text-slate-400">
                           <ScanText size={14} />
                           <span className="text-xs font-bold uppercase tracking-wider">Detected Source Text</span>
                        </div>
                        <p className={`text-slate-700 leading-relaxed ${sourceLang === Language.Burmese ? 'font-burmese' : 'font-chinese'}`}>
                           {result.source_content}
                        </p>
                     </div>
                  )}

                  <div>
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Translation</h3>
                    <p className={`text-2xl leading-relaxed text-slate-800 ${targetLang === Language.Burmese ? 'font-burmese' : 'font-chinese'}`}>
                      {result.translation}
                    </p>
                    <p className="mt-2 text-slate-500 font-mono text-sm bg-slate-50 inline-block px-2 py-1 rounded border border-slate-100">
                      {result.pronunciation}
                    </p>
                  </div>

                  {result.details && (
                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Details & Context</h4>
                      <p className="text-sm text-slate-600 leading-relaxed bg-brand-50/50 p-3 rounded-lg border border-brand-50/50">
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
                  {selectedFile ? (
                     <div className="flex flex-col items-center">
                        <Sparkles size={32} className="text-brand-300 mb-2" />
                        <p className="text-sm font-medium">File ready for OCR & Translation</p>
                     </div>
                  ) : (
                    <>
                      <Languages size={48} strokeWidth={1} className="mb-4 text-slate-200" />
                      <p className="text-sm font-medium">Ready to translate text, images, or audio</p>
                    </>
                  )}
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
        <p>© {new Date().getFullYear()} Juvi's 翻译. Powered by Gemini AI.</p>
      </footer>
    </div>
  );
};

export default App;
