// Path: frontend/src/components/svg/TransformTemplate.jsx
import React, { useState, useEffect } from 'react';

export default function TransformTemplate({ story, currentStep, onNext }) {
  const [animating, setAnimating] = useState(false);
  const totalSteps = story?.steps?.length || 6;

  useEffect(() => {
    setAnimating(true);
    const timer = setTimeout(() => setAnimating(false), 500);
    return () => clearTimeout(timer);
  }, [currentStep]);

  const step = currentStep || 0;

  const renderPanels = () => {
    const panels = [];
    const positions = [
      { x: 80, y: 60, w: 120, h: 80 },
      { x: 220, y: 60, w: 120, h: 80 },
      { x: 360, y: 60, w: 120, h: 80 },
    ];

    positions.forEach((pos, i) => {
      const isActive = i === step;
      const isPast = i < step;
      const colors = ['#7C3AED', '#F59E0B', '#10B981'];

      panels.push(
        <g key={i}>
          <rect
            x={pos.x}
            y={pos.y}
            width={pos.w}
            height={pos.h}
            rx={12}
            fill={isActive ? colors[i] : isPast ? '#E5E7EB' : '#F3F4F6'}
            fillOpacity={isActive ? 0.2 : 1}
            stroke={isActive ? colors[i] : '#D1D5DB'}
            strokeWidth={isActive ? 3 : 1}
            className={isActive && animating ? 'animate-pop' : ''}
          />
          <text
            x={pos.x + pos.w / 2}
            y={pos.y + pos.h / 2}
            textAnchor="middle"
            fill={isActive ? colors[i] : '#9CA3AF'}
            fontSize="14"
            fontWeight="bold"
          >
            Step {i + 1}
          </text>
          {i < positions.length - 1 && (
            <g>
              <line
                x1={pos.x + pos.w}
                y1={pos.y + pos.h / 2}
                x2={positions[i + 1].x}
                y2={positions[i + 1].y + positions[i + 1].h / 2}
                stroke={isPast ? '#9CA3AF' : '#D1D5DB'}
                strokeWidth={2}
                strokeDasharray="6 3"
              />
              <polygon
                points={`${positions[i + 1].x - 5},${positions[i + 1].y + positions[i + 1].h / 2 - 5} ${positions[i + 1].x - 5},${positions[i + 1].y + positions[i + 1].h / 2 + 5} ${positions[i + 1].x + 2},${positions[i + 1].y + positions[i + 1].h / 2}`}
                fill={isPast ? '#9CA3AF' : '#D1D5DB'}
              />
            </g>
          )}
        </g>
      );
    });

    return panels;
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
          {renderPanels()}
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
