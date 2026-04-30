// Path: frontend/src/components/learning/ExplanationPanel.jsx
import React, { useState } from 'react';
import { getTemplateComponent } from '../svg/templateMap.js';
import ConfidenceBadge from './ConfidenceBadge.jsx';
import InsightAfterAnswer from './InsightAfterAnswer.jsx';
import VisualStoryCard from './VisualStoryCard.jsx';
import AutoTranslate from '../common/AutoTranslate.jsx';
import ConceptVisualizer from './ConceptVisualizer.jsx';

export default function ExplanationPanel({
  gapResult,
  calibration,
  story,
  question,
  studentAnswer,
  onContinue,
  sessionStats,
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showInsight, setShowInsight] = useState(false);
  const isCorrect = gapResult?.gapType === null;

  const TemplateComponent = story?.template
    ? getTemplateComponent(story.template)
    : null;

  const handleNext = () => {
    if (story && currentStep < (story.steps?.length || 1) - 1) {
      setCurrentStep((prev) => prev + 1);
    } else if (story && currentStep >= (story.steps?.length || 1) - 1) {
      // After story is complete, show insight
      setShowInsight(true);
    } else {
      onContinue();
    }
  };

  // Show insight after explanation
  if (showInsight) {
    return (
      <InsightAfterAnswer
        gapResult={gapResult}
        calibration={calibration}
        question={question}
        studentAnswer={studentAnswer}
        sessionStats={sessionStats}
        onContinue={onContinue}
      />
    );
  }

  return (
    <div className="space-y-4 animate-slideUp">
      {/* Result banner */}
      <div
        className={`card border-2 ${
          isCorrect
            ? 'bg-emerald-50 border-emerald-300'
            : 'bg-red-50 border-red-300'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">{isCorrect ? '✅' : '❌'}</span>
          <div>
            <AutoTranslate as="h3" className="font-bold text-gray-800">
              {isCorrect ? 'Correct!' : 'Not quite right'}
            </AutoTranslate>
            <p className="text-sm text-gray-600">
              <AutoTranslate as="span">Your answer:</AutoTranslate> <span className="font-semibold">{studentAnswer}</span>
              {!isCorrect && (
                <>
                  {' | '}<AutoTranslate as="span">Correct answer:</AutoTranslate>{' '}
                  <span className="font-semibold text-emerald-600">
                    <AutoTranslate>{question?.correctAnswer}</AutoTranslate>
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Confidence badge */}
      {calibration && (
        <div className="flex justify-center">
          <ConfidenceBadge calibration={calibration} />
        </div>
      )}

      {/* Gap analysis */}
      {gapResult?.gapType && (
        <div className="card">
          <AutoTranslate as="h4" className="font-semibold text-gray-700 mb-2">What went wrong:</AutoTranslate>
          <AutoTranslate as="p" className="text-gray-600">{gapResult.reasoning}</AutoTranslate>
          <div className="mt-2">
            <span className="inline-block bg-violet-100 text-violet-700 text-xs font-semibold px-3 py-1 rounded-full capitalize">
              <AutoTranslate as="span">{gapResult.gapType}</AutoTranslate> <AutoTranslate as="span">gap</AutoTranslate>
            </span>
          </div>
        </div>
      )}

      {/* Concept Visualizer - The "Wow" Factor */}
      {!isCorrect && question?.correctAnswer && (
        <ConceptVisualizer 
          topic={question.concept || module?.topic} 
          value={question.correctAnswer} 
          visualSvg={gapResult.visualSvg}
        />
      )}

      {/* Visual Storytelling Explanation */}
      {story && (
        <VisualStoryCard 
          story={story} 
          currentStep={currentStep} 
          totalSteps={story.steps?.length || 6} 
        />
      )}

      {/* SVG Template (Optional secondary visual) */}
      {story && TemplateComponent && (
        <div className="mt-6 opacity-80 scale-95 origin-top">
          <TemplateComponent
            story={story}
            currentStep={currentStep}
            onNext={null} // We handle navigation with the main button
          />
        </div>
      )}

      {/* Navigation Button */}
      <button onClick={handleNext} className="btn-primary w-full mt-6">
        <AutoTranslate>
          {story && currentStep < (story.steps?.length || 1) - 1 ? 'Next Step →' : 'See Insights →'}
        </AutoTranslate>
      </button>
    </div>
  );
}


