// Path: frontend/src/components/learning/ExplanationRemix.jsx
import React from 'react';
import { getTemplateComponent } from '../svg/templateMap.js';

export default function ExplanationRemix({ story, currentStep, onNext, onModalityChange }) {
  const TemplateComponent = story?.template
    ? getTemplateComponent(story.template)
    : null;

  const modalities = [
    { id: 'analogy', label: 'Analogy', icon: '🔗' },
    { id: 'visual', label: 'Visual', icon: '🎨' },
    { id: 'step-by-step', label: 'Step by Step', icon: '📝' },
    { id: 'counterexample', label: 'Counter Example', icon: '🚫' },
  ];

  return (
    <div className="space-y-4">
      {/* Modality switcher */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {modalities.map((m) => (
          <button
            key={m.id}
            onClick={() => onModalityChange?.(m.id)}
            className="flex-shrink-0 px-3 py-2 rounded-full border-2 border-violet-200 bg-white text-sm font-medium text-gray-600 hover:bg-violet-50 hover:border-violet-400 transition-all"
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* Story template */}
      {TemplateComponent && (
        <TemplateComponent
          story={story}
          currentStep={currentStep}
          onNext={onNext}
        />
      )}
    </div>
  );
}
