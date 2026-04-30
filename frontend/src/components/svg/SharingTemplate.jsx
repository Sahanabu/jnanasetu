// Path: frontend/src/components/svg/SharingTemplate.jsx
import React, { useState, useEffect } from 'react';
import AutoTranslate from '../common/AutoTranslate.jsx';

export default function SharingTemplate({ story, currentStep, onNext }) {
  const [animating, setAnimating] = useState(false);
  const totalSteps = story?.steps?.length || 6;

  useEffect(() => {
    setAnimating(true);
    const timer = setTimeout(() => setAnimating(false), 500);
    return () => clearTimeout(timer);
  }, [currentStep]);

  const step = currentStep || 0;
  const item = story?.entities?.item || 'roti';
  const colorLeft = '#7C3AED';
  const colorRight = '#F59E0B';
  const colorCombined = '#10B981';

  const renderCircle = (cx, cy, r, color, fillOpacity = 0.3, divisionLines = 0, shaded = 0) => {
    const lines = [];
    for (let i = 1; i < divisionLines; i++) {
      const angle = (i * 2 * Math.PI) / divisionLines - Math.PI / 2;
      const x2 = cx + r * Math.cos(angle);
      const y2 = cy + r * Math.sin(angle);
      lines.push(
        <line
          key={`line-${i}`}
          x1={cx}
          y1={cy}
          x2={x2}
          y2={y2}
          stroke={color}
          strokeWidth="2"
          className={animating ? 'animate-pop' : ''}
          style={{
            strokeDasharray: animating ? '0 200' : '200 0',
            transition: 'stroke-dasharray 0.5s ease-out',
          }}
        />
      );
    }

    // Shaded portion
    let shadePath = null;
    if (shaded > 0 && divisionLines > 0) {
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (shaded / divisionLines) * 2 * Math.PI;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = shaded > divisionLines / 2 ? 1 : 0;
      shadePath = (
        <path
          d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z`}
          fill={color}
          fillOpacity="0.5"
          className={animating ? 'animate-pop' : ''}
        />
      );
    }

    return (
      <g>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="3" />
        {shadePath}
        {lines}
      </g>
    );
  };

  const renderStepContent = () => {
    switch (step) {
      case 0: // Show whole item
        return (
          <g>
            {renderCircle(160, 120, 80, colorLeft, 0.3, 0, 0)}
            {renderCircle(400, 120, 80, colorRight, 0.3, 0, 0)}
            <AutoTranslate as="text" x="160" y="220" textAnchor="middle" fill={colorLeft} fontSize="16" fontWeight="bold">
              Whole {item}
            </AutoTranslate>
            <AutoTranslate as="text" x="400" y="220" textAnchor="middle" fill={colorRight} fontSize="16" fontWeight="bold">
              Whole {item}
            </AutoTranslate>
          </g>
        );
      case 1: // Split into denominator-sized pieces
        return (
          <g>
            {renderCircle(160, 120, 80, colorLeft, 0.3, 2, 0)}
            {renderCircle(400, 120, 80, colorRight, 0.3, 3, 0)}
            <AutoTranslate as="text" x="160" y="220" textAnchor="middle" fill={colorLeft} fontSize="16" fontWeight="bold">
              Cut into 2 pieces
            </AutoTranslate>
            <AutoTranslate as="text" x="400" y="220" textAnchor="middle" fill={colorRight} fontSize="16" fontWeight="bold">
              Cut into 3 pieces
            </AutoTranslate>
          </g>
        );
      case 2: // Shade numerator portion
        return (
          <g>
            {renderCircle(160, 120, 80, colorLeft, 0.3, 2, 1)}
            {renderCircle(400, 120, 80, colorRight, 0.3, 3, 1)}
            <AutoTranslate as="text" x="160" y="220" textAnchor="middle" fill={colorLeft} fontSize="16" fontWeight="bold">
              1/2 shaded
            </AutoTranslate>
            <AutoTranslate as="text" x="400" y="220" textAnchor="middle" fill={colorRight} fontSize="16" fontWeight="bold">
              1/3 shaded
            </AutoTranslate>
          </g>
        );
      case 3: // Show both fractions side by side
        return (
          <g>
            {renderCircle(160, 120, 80, colorLeft, 0.3, 2, 1)}
            {renderCircle(400, 120, 80, colorRight, 0.3, 3, 1)}
            <text x="160" y="220" textAnchor="middle" fill={colorLeft} fontSize="18" fontWeight="bold">
              1/2
            </text>
            <text x="400" y="220" textAnchor="middle" fill={colorRight} fontSize="18" fontWeight="bold">
              1/3
            </text>
            <AutoTranslate as="text" x="280" y="240" textAnchor="middle" fill="#6B7280" fontSize="14">
              Different sized pieces!
            </AutoTranslate>
          </g>
        );
      case 4: // Show common denominator - pieces resize
        return (
          <g>
            {renderCircle(160, 120, 80, colorLeft, 0.3, 6, 3)}
            {renderCircle(400, 120, 80, colorRight, 0.3, 6, 2)}
            <text x="160" y="220" textAnchor="middle" fill={colorLeft} fontSize="18" fontWeight="bold">
              3/6
            </text>
            <text x="400" y="220" textAnchor="middle" fill={colorRight} fontSize="18" fontWeight="bold">
              2/6
            </text>
            <AutoTranslate as="text" x="280" y="240" textAnchor="middle" fill="#10B981" fontSize="14" fontWeight="bold">
              Same size pieces now!
            </AutoTranslate>
          </g>
        );
      case 5: // Combine - shaded pieces merge
        return (
          <g>
            {renderCircle(280, 120, 100, colorCombined, 0.3, 6, 5)}
            <text x="280" y="240" textAnchor="middle" fill={colorCombined} fontSize="20" fontWeight="bold">
              3/6 + 2/6 = 5/6
            </text>
            <AutoTranslate as="text" x="280" y="260" textAnchor="middle" fill="#6B7280" fontSize="14">
              Together they have 5/6
            </AutoTranslate>
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative bg-white rounded-3xl border-2 border-violet-50 shadow-card p-4">
        {/* Step counter */}
        <div className="absolute top-3 right-3 bg-violet-100 text-violet-700 rounded-full px-3 py-1 text-sm font-semibold">
          {step + 1}/{totalSteps}
        </div>

        {/* SVG Canvas */}
        <svg
          viewBox="0 0 560 280"
          className="w-full h-auto"
          style={{ minHeight: '200px' }}
          preserveAspectRatio="xMidYMid meet"
        >
          {renderStepContent()}
        </svg>

        {/* Step text */}
        <div className="mt-4 px-2 min-h-[60px]">
          <AutoTranslate as="p" className="text-gray-700 text-base font-medium text-center animate-slideUp">
            {story?.steps?.[step] || ''}
          </AutoTranslate>
        </div>

        {/* Next button */}
        {onNext && (
          <button
            onClick={onNext}
            className="btn-primary w-full mt-4"
          >
            <AutoTranslate>
              {step < totalSteps - 1 ? 'Next →' : 'Got it! ✓'}
            </AutoTranslate>
          </button>
        )}
      </div>
    </div>
  );
}
