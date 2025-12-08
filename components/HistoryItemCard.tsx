import React from 'react';
import { TranslationResult, Language } from '../types';

interface HistoryItemCardProps {
    item: TranslationResult;
    onClick: () => void;
}

const HistoryItemCard: React.FC<HistoryItemCardProps> = ({ item, onClick }) => {
    const getFlag = (lang: Language) => {
        switch (lang) {
            case Language.Burmese: return '🇲🇲';
            case Language.Chinese: return '🇨🇳';
            case Language.English: return '🇺🇸';
            default: return '🏳️';
        }
    };

    const getProviderBadge = (provider: string) => {
        if (provider === 'google') return <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">Google</span>;
        if (provider === 'model1') return <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100">Model 1</span>;
        if (provider === 'model3') return <span className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded border border-orange-100">Model 3</span>;
        // Default / Model 2
        return <span className="text-[10px] bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded border border-brand-100">Model 2</span>;
    };

    return (
        <button
            onClick={onClick}
            className="w-full group relative bg-white border border-slate-100 hover:border-brand-200 p-3 sm:p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer text-left"
            aria-label={`History item: translate from ${item.sourceLang} to ${item.targetLang}. Original: ${item.original}. Translation: ${item.translation}`}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-400" aria-hidden="true">
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
        </button>
    );
};

export default HistoryItemCard;
