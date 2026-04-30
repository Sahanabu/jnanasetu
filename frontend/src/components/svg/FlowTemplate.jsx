// Path: frontend/src/components/svg/FlowTemplate.jsx
import React, { useState, useEffect } from 'react';

export default function FlowTemplate({ story, currentStep, onNext }) {
  const [animating, setAnimating] = useState(false);
  const totalSteps = story?.steps?.length || 6;

  useEffect(() => {
    setAnimating(true);
    const timer = setTimeout(() => setAnimating(false), 500);
    return () => clearTimeout(timer);
  }, [currentStep]);

  const step = currentStep || 0;
  const colors = ['#7C3AED', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6'];

  const renderStepPanel = (index, color) => {
    const isActive = index === step;
    const isPast = index < step;
    const panelY = 20 + index * 40;

    return (
      <g key={index}>
        <rect
          x={60}
          y={panelY}
          width={440}
          height={32}
          rx={16}
          fill={isActive ? color : isPast ? '#E5E7EB' : '#F3F4F6'}
          stroke={isActive ? color : '#D1D5DB'}
          strokeWidth={isActive ? 2 : 1}
          className={isActive && animating ? 'animate-pop' : ''}
        />
        <circle
          cx={40}
          cy={panelY + 16}
          r={12}
          fill={isActive ? color : isPast ? '#9CA3AF' : '#D1D5DB'}
          className={isActive && animating ? 'animate-pop' : ''}
        />
        <text
          x={40}
          y={panelY + 21}
          textAnchor="middle"
          fill="white"
          fontSize="12"
          fontWeight="bold"
        >
          {index + 1}
        </text>
        {index < totalSteps - 1 && (
          <line
            x1={40}
            y1={panelY + 28}
            x2={40}
            y2={panelY + 40}
            stroke={isPast ? '#9CA3AF' : '#D1D5DB'}
            strokeWidth={2}
            strokeDasharray="4 2"
          />
        )}
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
          viewBox="0 0 560 280"
          className="w-full h-auto"
          style={{ minHeight: '200px' }}
          preserveAspectRatio="xMidYMid meet"
        >
          {colors.map((color, i) => renderStepPanel(i, color))}
        </svg>

        <div className="mt-4 px-2 min-h-[60px]">
          <p className="text-gray-700 text-base font-medium text-center animate-slideUp">
            {story?.steps?.[step] || ''}
          </p>
        </div>

        {onNext && (
          <button onClick={onNext} className="btn-primary w-full mt-4">
            {step < totalSteps - 1 ? 'Next →' : 'Got it! ✓'}
          </button>
        )}
      </div>
    </div>
  );
}
