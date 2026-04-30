// Path: frontend/src/components/svg/AreaTemplate.jsx
import React, { useState, useEffect } from 'react';
import AutoTranslate from '../common/AutoTranslate.jsx';

export default function AreaTemplate({ story, currentStep, onNext }) {
  const [animating, setAnimating] = useState(false);
  const totalSteps = story?.steps?.length || 6;

  useEffect(() => {
    setAnimating(true);
    const timer = setTimeout(() => setAnimating(false), 500);
    return () => clearTimeout(timer);
  }, [currentStep]);

  const step = currentStep || 0;

  const renderArea = () => {
    const colors = ['#7C3AED', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6'];
    const color = colors[step % colors.length];
    const isActive = true;

    // Grid dimensions
    const gridX = 80;
    const gridY = 30;
    const gridW = 400;
    const gridH = 160;
    const cols = 4;
    const rows = 3;
    const cellW = gridW / cols;
    const cellH = gridH / rows;

    const cells = [];
    const shadedCount = Math.min(step + 1, cols * rows);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const isShaded = idx < shadedCount;
        cells.push(
          <rect
            key={idx}
            x={gridX + c * cellW}
            y={gridY + r * cellH}
            width={cellW}
            height={cellH}
            fill={isShaded ? color : '#F3F4F6'}
            fillOpacity={isShaded ? 0.4 : 1}
            stroke={isShaded ? color : '#D1D5DB'}
            strokeWidth={isShaded ? 2 : 1}
            className={isShaded && animating ? 'animate-pop' : ''}
          />
        );
      }
    }

    return (
      <g>
        {cells}
        <AutoTranslate as="text"
          x={280}
          y={210}
          textAnchor="middle"
          fill={color}
          fontSize="16"
          fontWeight="bold"
        >
          {shadedCount}/{cols * rows} shaded
        </AutoTranslate>
      </g>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative bg-white rounded-3xl border-2 border-violet-50 shadow-card p-4">
        <div className="absolute top-3 right-3 bg-violet-100 text-violet-700 rounded-full px-3 py-1 text-sm font-semibold">
          {step + 1}/{totalSteps}
        </div>

        <svg
          viewBox="0 0 560 240"
          className="w-full h-auto"
          style={{ minHeight: '180px' }}
          preserveAspectRatio="xMidYMid meet"
        >
          {renderArea()}
        </svg>

        <div className="mt-4 px-2 min-h-[60px]">
          <AutoTranslate as="p" className="text-gray-700 text-base font-medium text-center animate-slideUp">
            {story?.steps?.[step] || ''}
          </AutoTranslate>
        </div>

        {onNext && (
          <button onClick={onNext} className="btn-primary w-full mt-4">
            <AutoTranslate>
              {step < totalSteps - 1 ? 'Next →' : 'Got it! ✓'}
            </AutoTranslate>
          </button>
        )}
      </div>
    </div>
  );
}
