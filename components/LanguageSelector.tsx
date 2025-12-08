import React from 'react';
import { Language } from '../types';
import { UI_STRINGS } from '../constants/translations';

interface LanguageSelectorProps {
    label: string;
    selected: Language;
    onChange: (lang: Language) => void;
    disabled?: boolean;
    t: typeof UI_STRINGS['zh'];
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ label, selected, onChange, disabled, t }) => (
    <div className="flex flex-col gap-1 w-full">
        <label id={`lang-${label}`} className="hidden sm:block text-xs font-semibold text-slate-500 uppercase tracking-wider pl-1">{label}</label>
        <div className="relative">
            <select
                value={selected}
                onChange={(e) => onChange(e.target.value as Language)}
                disabled={disabled}
                aria-labelledby={`lang-${label}`}
                aria-label={label}
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

export default LanguageSelector;
