import React from 'react';
import { Zap, Bot, Cpu, Globe } from 'lucide-react';
import { TranslationProvider } from '../types';

interface ModelSelectorProps {
    selected: TranslationProvider;
    onChange: (provider: TranslationProvider) => void;
    disabled?: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ selected, onChange, disabled }) => {
    const getStyle = (id: TranslationProvider, activeColor: string) => `
    flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all flex-1 sm:flex-none whitespace-nowrap
    ${selected === id
            ? `bg-white text-${activeColor}-600 shadow-sm ring-1 ring-slate-200`
            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}
  `;

    return (
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1 bg-slate-100 p-1 rounded-lg w-full sm:w-auto overflow-x-auto no-scrollbar">
            {/* Renamed to Model 1, 2, 3 as requested */}
            <button onClick={() => onChange('model1')} disabled={disabled} className={getStyle('model1', 'emerald')}>
                <Zap size={14} />
                <span>Model 1</span>
            </button>
            <button onClick={() => onChange('model2')} disabled={disabled} className={getStyle('model2', 'brand')}>
                <Bot size={14} />
                <span>Model 2</span>
            </button>
            <button onClick={() => onChange('model3')} disabled={disabled} className={getStyle('model3', 'orange')}>
                <Cpu size={14} />
                <span>Model 3</span>
            </button>
            <button onClick={() => onChange('google')} disabled={disabled} className={getStyle('google', 'blue')}>
                <Globe size={14} />
                <span>Google</span>
            </button>
        </div>
    );
};

export default ModelSelector;
