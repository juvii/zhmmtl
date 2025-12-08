import React from 'react';

const OCRLoadingSkeleton: React.FC = () => (
    <div className="space-y-3 w-full max-w-md">
        {[...Array(4)].map((_, i) => (
            <div
                key={i}
                className="h-6 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-lg animate-pulse"
                style={{
                    animationDelay: `${i * 0.1}s`,
                    width: `${Math.random() * 40 + 60}%`
                }}
            />
        ))}
    </div>
);

export default OCRLoadingSkeleton;
