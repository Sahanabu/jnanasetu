// Path: frontend/src/components/svg/CompareTemplate.jsx
import React, { useState, useEffect } from 'react';
import AutoTranslate from '../common/AutoTranslate.jsx';

export default function CompareTemplate({ story, currentStep, onNext }) {
  const [animating, setAnimating] = useState(false);
  const totalSteps = story?.steps?.length || 6;

  useEffect(() => {
    setAnimating(true);
    const timer = setTimeout(() => setAnimating(false), 500);
    return () => clearTimeout(timer);
  }, [currentStep]);

  const step = currentStep || 0;

  const renderComparison = () => {
    const isActive = step < 3;
    const leftColor = '#7C3AED';
    const rightColor = '#F59E0B';

    return (
      <g>
        {/* Left item */}
        <rect
          x={60}
          y={40}
          width={180}
          height={120}
          rx={16}
          fill={isActive ? '#EDE9FE' : '#F3F4F6'}
          stroke={isActive ? leftColor : '#D1D5DB'}
          strokeWidth={isActive ? 3 : 1}
          className={animating && isActive ? 'animate-pop' : ''}
        />
        <AutoTranslate
          as="text"
          x={150}
          y={80}
          textAnchor="middle"
          fill={leftColor}
          fontSize="16"
          fontWeight="bold"
        >
          Left Side
        </AutoTranslate>
        <text
          x={150}
          y={110}
          textAnchor="middle"
          fill="#6B7280"
          fontSize="13"
        >
          {story?.entities?.item || 'Item'} A
        </text>

        {/* VS */}
        <text
          x={280}
          y={100}
          textAnchor="middle"
          fill="#EF4444"
          fontSize="20"
          fontWeight="bold"
        >
          VS
        </text>

        {/* Right item */}
        <rect
          x={320}
          y={40}
          width={180}
          height={120}
          rx={16}
          fill={!isActive ? '#FEF3C7' : '#F3F4F6'}
          stroke={!isActive ? rightColor : '#D1D5DB'}
          strokeWidth={!isActive ? 3 : 1}
          className={animating && !isActive ? 'animate-pop' : ''}
        />
        <AutoTranslate
          as="text"
          x={410}
          y={80}
          textAnchor="middle"
          fill={rightColor}
          fontSize="16"
          fontWeight="bold"
        >
          Right Side
        </AutoTranslate>
        <text
          x={410}
          y={110}
          textAnchor="middle"
          fill="#6B7280"
          fontSize="13"
        >
          {story?.entities?.item || 'Item'} B
        </text>
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
          viewBox="0 0 560 200"
          className="w-full h-auto"
          style={{ minHeight: '160px' }}
          preserveAspectRatio="xMidYMid meet"
        >
          {renderComparison()}
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
