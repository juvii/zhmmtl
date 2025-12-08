import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ScanLine, Camera, Loader2, X } from 'lucide-react';
import { OCRBlock } from '../types';
import { extractTextWithOverlay } from '../services/geminiService';
import { UI_STRINGS } from '../constants/translations';
import OCRLoadingSkeleton from './OCRLoadingSkeleton';

interface ScanPageProps {
    t: typeof UI_STRINGS['zh'];
    onBack: () => void;
}

const ScanPage: React.FC<ScanPageProps> = ({ t, onBack }) => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [blocks, setBlocks] = useState<OCRBlock[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const imgRef = useRef<HTMLImageElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [scale, setScale] = useState({ x: 1, y: 1 });

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setBlocks([]);

        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = reader.result as string;
            setImageSrc(base64);
            try {
                const result = await extractTextWithOverlay(base64);
                setBlocks(result.blocks);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        reader.readAsDataURL(file);
    };

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

    const calculateOptimalFontSize = (boxHeight: number, textLength: number) => {
        const size = boxHeight * 0.7;
        const lengthFactor = Math.min(1, 50 / Math.max(1, textLength));
        return size * lengthFactor;
    };

    return (
        <div className="flex flex-col h-full gap-4" role="main" aria-label="OCR scanning interface">
            <div className="flex justify-between items-center px-1">
                <button onClick={onBack} className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors">
                    <ChevronLeft size={20} />
                    <span className="text-sm font-medium">{t.homeTab}</span>
                </button>
                <span className="font-bold text-slate-700 flex items-center gap-2">
                    <ScanLine size={18} /> {t.scanTab}
                </span>
                <div className="w-8" />
            </div>

            <div className="flex-1 bg-slate-900/5 rounded-2xl border-2 border-dashed border-slate-300 relative overflow-hidden flex flex-col items-center justify-center">
                {!imageSrc ? (
                    <div className="text-center p-6">
                        <Camera size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-500 mb-4">{t.scanInstruct}</p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-brand-600 text-white px-6 py-2 rounded-full font-medium hover:bg-brand-700 transition shadow-lg shadow-brand-500/20"
                        >
                            {t.uploadBtn}
                        </button>
                    </div>
                ) : (
                    <div className="relative w-full h-full flex items-center justify-center overflow-auto bg-slate-900">
                        {isLoading && (
                            <div
                                className="absolute inset-0 z-30 bg-black/50 flex flex-col items-center justify-center backdrop-blur-sm text-white"
                                aria-live="polite"
                                aria-label="Processing image"
                            >
                                <Loader2 size={40} className="animate-spin mb-3" aria-hidden="true" />
                                <p className="font-medium mb-4">{t.processing}</p>
                                <div className="bg-black/40 rounded-lg p-4">
                                    <OCRLoadingSkeleton />
                                </div>
                            </div>
                        )}

                        <div className="relative inline-block group">
                            <img
                                ref={imgRef}
                                src={imageSrc}
                                className="max-w-full max-h-[70vh] object-contain select-none"
                                onLoad={updateScale}
                                alt="Document with extracted text"
                                role="img"
                            />

                            {!isLoading && blocks.map((block, idx) => {
                                const scaledWidth = block.box.width * scale.x;
                                const scaledHeight = block.box.height * scale.y;
                                const fontSize = calculateOptimalFontSize(scaledHeight, block.text.length);

                                return (
                                    <div
                                        key={idx}
                                        className="absolute select-text cursor-text group/block hover:bg-blue-400/10 transition-colors"
                                        title={`Text: ${block.text}`}
                                        aria-label={`Extracted text: ${block.text}`}
                                        style={{
                                            left: `${block.box.x * scale.x}px`,
                                            top: `${block.box.y * scale.y}px`,
                                            width: `${scaledWidth}px`,
                                            height: `${scaledHeight}px`,
                                            fontSize: `${fontSize}px`,
                                            lineHeight: `${scaledHeight}px`,
                                            fontFamily: 'sans-serif, system-ui',
                                            fontWeight: '400',
                                            zIndex: 10,
                                            color: 'rgba(0,0,0,0.01)',
                                            padding: '2px 4px',
                                            boxSizing: 'border-box',
                                            overflow: 'hidden',
                                            whiteSpace: 'pre-wrap',
                                            wordWrap: 'break-word',
                                            textAlign: 'left',
                                            verticalAlign: 'top',
                                        }}
                                    >
                                        {block.text}
                                    </div>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => { setImageSrc(null); setBlocks([]); }}
                            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm z-30 transition-all"
                            aria-label="Close image"
                            title="Close and reset"
                        >
                            <X size={20} aria-hidden="true" />
                        </button>
                    </div>
                )}
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFile}
                    aria-label="Select image for OCR"
                />
            </div>
        </div>
    );
};

export default ScanPage;
