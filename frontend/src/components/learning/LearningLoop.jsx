// Path: frontend/src/components/learning/LearningLoop.jsx
import React, { useReducer, useCallback, useContext, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { StudentContext } from '../../context/StudentContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { detectGap, generateFollowUpQuestion } from '../../engine/detector.js';
import { calibrateConfidence } from '../../engine/calibrator.js';
import { schedule, deriveQuality } from '../../engine/sm2.js';
import { generateStory } from '../../engine/storyEngine.js';
import { saveEvent } from '../../db/events.js';
import { saveCard, getCardsByTopic } from '../../db/cards.js';
import confetti from 'canvas-confetti';
import QuestionCard from './QuestionCard.jsx';
import ConfidenceRating from './ConfidenceRating.jsx';
import ConfidenceBadge from './ConfidenceBadge.jsx';
import SocraticNudge from './SocraticNudge.jsx';
import ExplanationPanel from './ExplanationPanel.jsx';
import InsightAfterAnswer from './InsightAfterAnswer.jsx';
import PeerPrompt from './PeerPrompt.jsx';
import StudentInsights from './StudentInsights.jsx';
import AutoTranslate from '../common/AutoTranslate.jsx';

const STATES = {
  QUESTION: 'question',
  ANSWERING: 'answering',
  CONFIDENCE: 'confidence',
  DETECTING: 'detecting',
  NUDGE: 'nudge',
  EXPLANATION: 'explanation',
  INSIGHT: 'insight',
  PEER_PROMPT: 'peer_prompt',
  SCHEDULED: 'scheduled',
};

const ACTIONS = {
  SUBMIT_ANSWER: 'SUBMIT_ANSWER',
  RATE_CONFIDENCE: 'RATE_CONFIDENCE',
  GAP_DETECTED: 'GAP_DETECTED',
  SELF_FIXED: 'SELF_FIXED',
  STILL_STUCK: 'STILL_STUCK',
  CHANGE_MODALITY: 'CHANGE_MODALITY',
  SHOW_INSIGHT: 'SHOW_INSIGHT',
  PEER_SUBMITTED: 'PEER_SUBMITTED',
  NEXT_QUESTION: 'NEXT_QUESTION',
  UPDATE_STORY: 'UPDATE_STORY',
};

const initialState = {
  state: STATES.QUESTION,
  question: null,
  studentAnswer: '',
  correctAnswer: '',
  selfRating: 0,
  gapResult: null,
  calibration: null,
  story: null,
  selfFixed: false,
  showNudge: false,
  error: null,
  questionIndex: 0,
  sessionEvents: [],
  consecutiveErrors: 0,
  personality: 'encouraging', // 'encouraging' | 'analytical' | 'empathetic'
};

function learningReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SUBMIT_ANSWER:
      return {
        ...state,
        state: STATES.CONFIDENCE,
        studentAnswer: action.payload.answer,
        correctAnswer: action.payload.correctAnswer,
      };

    case ACTIONS.RATE_CONFIDENCE:
      return {
        ...state,
        state: STATES.DETECTING,
        selfRating: action.payload.rating,
      };

    case ACTIONS.GAP_DETECTED: {
      const gapResult = action.payload;
      const correct = gapResult.gapType === null;
      const calibration = calibrateConfidence(correct, state.selfRating);
      const showNudge = !correct && Math.random() < 0.4;
      
      const newConsecutiveErrors = correct ? 0 : state.consecutiveErrors + 1;
      let newPersonality = 'encouraging';
      if (newConsecutiveErrors >= 3) newPersonality = 'empathetic';
      else if (newConsecutiveErrors >= 2) newPersonality = 'analytical';

      return {
        ...state,
        state: showNudge ? STATES.NUDGE : STATES.EXPLANATION,
        gapResult,
        calibration,
        showNudge,
        consecutiveErrors: newConsecutiveErrors,
        personality: newPersonality,
      };
    }

    case ACTIONS.UPDATE_STORY:
      return {
        ...state,
        story: action.payload
      };

    case ACTIONS.SELF_FIXED:
      return {
        ...state,
        state: STATES.EXPLANATION,
        selfFixed: true,
        showNudge: false,
      };

    case ACTIONS.STILL_STUCK:
      return {
        ...state,
        state: STATES.EXPLANATION,
        selfFixed: false,
        showNudge: false,
      };

    case ACTIONS.CHANGE_MODALITY:
      return {
        ...state,
        state: STATES.EXPLANATION,
      };

    case ACTIONS.SHOW_INSIGHT:
      return {
        ...state,
        state: STATES.INSIGHT,
      };

    case ACTIONS.PEER_SUBMITTED:
      return {
        ...state,
        state: STATES.SCHEDULED,
      };

    case ACTIONS.NEXT_QUESTION:
      return {
        ...initialState,
        questionIndex: state.questionIndex + 1,
        sessionEvents: state.sessionEvents,
      };

    default:
      return state;
  }
}

export default function LearningLoop({ module, onComplete }) {
  const { student } = useContext(StudentContext);
  const { token } = useAuth();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(learningReducer, initialState);
  const [loading, setLoading] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    totalAnswered: 0,
    correctCount: 0,
    conceptStats: {},
    gapHistory: [],
  });

  const currentQuestion = module?.questions?.[state.questionIndex];

  const handleSubmitAnswer = useCallback(async (answer) => {
    if (!currentQuestion) return;

    dispatch({
      type: ACTIONS.SUBMIT_ANSWER,
      payload: { answer, correctAnswer: currentQuestion.correctAnswer },
    });
  }, [currentQuestion]);

  const handleRateConfidence = useCallback(async (rating) => {
    if (!currentQuestion) return;

    dispatch({ type: ACTIONS.RATE_CONFIDENCE, payload: { rating } });
    setLoading(true);

    try {
      const gapResult = await detectGap({
        topic: module?.topic || 'fractions',
        question: currentQuestion, // Pass the whole object
        correctAnswer: currentQuestion.correctAnswer,
        studentAnswer: state.studentAnswer,
        grade: student?.grade || 7,
        subject: module?.subject || 'mathematics',
      });

      dispatch({ type: ACTIONS.GAP_DETECTED, payload: gapResult });

      // Update session stats
      const isCorrect = gapResult.gapType === null;
      const concept = currentQuestion.concept || 'general';
      setSessionStats(prev => {
        const conceptStats = { ...prev.conceptStats };
        if (!conceptStats[concept]) {
          conceptStats[concept] = { total: 0, correct: 0 };
        }
        conceptStats[concept] = {
          total: conceptStats[concept].total + 1,
          correct: conceptStats[concept].correct + (isCorrect ? 1 : 0),
        };
        return {
          totalAnswered: prev.totalAnswered + 1,
          correctCount: prev.correctCount + (isCorrect ? 1 : 0),
          conceptStats,
          gapHistory: [...prev.gapHistory, {
            questionId: currentQuestion.id,
            concept,
            gapType: gapResult.gapType,
            correct: isCorrect,
            confidence: rating,
          }],
        };
      });

      // Award XP
      let xpEarned = 0;
      if (isCorrect) {
        xpEarned = 10; // Base XP for correct answer
        // Bonus for high confidence
        if (rating > 0.7) xpEarned += 5;
      } else if (gapResult.gapType === 'careless') {
        xpEarned = 2; // Minor participation XP
      }

      if (xpEarned > 0 && token) {
        fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/gamification/xp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ amount: xpEarned })
        }).catch(err => console.error('Failed to award XP:', err));
      }

      // Save event to IndexedDB
      const event = {
        eventId: `${student?.studentId || 'unknown'}-${Date.now()}`,
        studentId: student?.studentId || 'unknown',
        sessionId: `session-${Date.now()}`,
        date: new Date().toISOString(),
        topic: module?.topic || 'fractions',
        subtopic: currentQuestion.concept || '',
        questionId: currentQuestion.id,
        studentAnswer: state.studentAnswer,
        correctAnswer: currentQuestion.correctAnswer,
        gapType: gapResult.gapType,
        confidence: rating,
        correct: isCorrect,
        selfFixed: false,
        modality: 'text',
        synced: false,
      };

      await saveEvent(event);

      // Generate story if there's a gap
      if (gapResult.gapType) {
        if (gapResult.story) {
          // Use pre-defined story from dataset if available
          dispatch({ type: ACTIONS.UPDATE_STORY, payload: gapResult.story });
        } else {
          // Otherwise generate dynamic story
          const getEntities = (topic) => {
            const t = topic?.toLowerCase() || '';
            if (t.includes('fraction')) return { item: 'roti', people: 2, container: 'plate' };
            if (t.includes('plant') || t.includes('nutrition')) return { item: 'leaf', people: 1, container: 'plant' };
            if (t.includes('decimal') || t.includes('money')) return { item: 'rupee', people: 1, container: 'pocket' };
            return { item: 'concept', people: 1, container: 'scenario' };
          };

          generateStory(
            gapResult.gapType,
            module?.topic || 'fractions',
            getEntities(module?.topic || 'fractions'),
            student?.language || 'en'
          ).then(story => {
            dispatch({ type: ACTIONS.UPDATE_STORY, payload: story });
          });
        }

        // Background task: Generate dynamic follow-up question
        generateFollowUpQuestion(currentQuestion, gapResult.gapType, state.studentAnswer, module?.topic || 'fractions')
          .then(followup => {
            if (followup && module?.questions) {
              // Check for duplicates before inserting
              const isDuplicate = module.questions.some(q => 
                q.question.toLowerCase().trim() === followup.question.toLowerCase().trim()
              );
              if (!isDuplicate) {
                console.log("[LearningLoop] Inserting follow-up question:", followup.question);
                module.questions.splice(state.questionIndex + 1, 0, followup);
              } else {
                console.log("[LearningLoop] Skipped duplicate follow-up question");
              }
            }
          })
          .catch(err => console.error("Failed to generate follow-up", err));
      }
    } catch (error) {
      console.error('Error in gap detection:', error);
      dispatch({
        type: ACTIONS.GAP_DETECTED,
        payload: {
          gapType: 'unknown',
          confidence: 0.5,
          reasoning: 'Error during detection.',
          hint: null,
        },
      });
    } finally {
      setLoading(false);
    }
  }, [currentQuestion, module, state.studentAnswer, student, token]);

  const handleSelfFixed = useCallback(() => {
    dispatch({ type: ACTIONS.SELF_FIXED });
  }, []);

  const handleStillStuck = useCallback(() => {
    dispatch({ type: ACTIONS.STILL_STUCK });
  }, []);

  // After explanation, show the insight card
  const handleExplanationContinue = useCallback(() => {
    dispatch({ type: ACTIONS.SHOW_INSIGHT });
  }, []);

  // After insight, proceed to peer prompt
  const handleInsightContinue = useCallback(async () => {
    // Update SM-2 card before moving to scheduled state
    try {
      const correct = state.gapResult?.gapType === null;
      const quality = deriveQuality(correct, state.selfRating, state.selfFixed);

      const existingCards = await getCardsByTopic(
        student?.studentId || 'unknown',
        module?.topic || 'fractions'
      );

      let card;
      if (existingCards.length > 0) {
        card = existingCards[0];
        const result = schedule(quality, card.n, card.ef, card.interval);
        card.n = result.n;
        card.ef = result.ef;
        card.interval = result.interval;
        card.nextReview = result.nextReview;
        card.lastReview = new Date().toISOString();
      } else {
        const result = schedule(quality, 0, 2.5, 0);
        card = {
          cardId: `${student?.studentId || 'unknown'}-${currentQuestion?.id || Date.now()}`,
          studentId: student?.studentId || 'unknown',
          topic: module?.topic || 'fractions',
          subtopic: currentQuestion?.concept || '',
          questionId: currentQuestion?.id || '',
          n: result.n,
          ef: result.ef,
          interval: result.interval,
          nextReview: result.nextReview,
          lastReview: new Date().toISOString(),
        };
      }

      await saveCard(card);
    } catch (error) {
      console.error('Error updating SM-2 card:', error);
    }

    dispatch({ type: ACTIONS.PEER_SUBMITTED }); // This moves it to SCHEDULED state
  }, [state, student, module, currentQuestion]);

  const handlePeerSubmitted = useCallback(async () => {
    dispatch({ type: ACTIONS.PEER_SUBMITTED });
  }, []);

  const handleNextQuestion = useCallback(() => {
    if (state.questionIndex >= (module?.questions?.length || 1) - 1) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#8b5cf6', '#d946ef', '#ffffff']
      });
      setShowInsights(true);
    } else {
      dispatch({ type: ACTIONS.NEXT_QUESTION });
    }
  }, [state.questionIndex, module]);

  if (!currentQuestion) {
    return (
      <div className="card text-center p-8">
        <AutoTranslate as="p" className="text-gray-500 text-lg">No questions available for this module.</AutoTranslate>
      </div>
    );
  }

  const renderState = () => {
    switch (state.state) {
      case STATES.QUESTION:
      case STATES.ANSWERING:
        return (
          <QuestionCard
            question={currentQuestion}
            onSubmit={handleSubmitAnswer}
            disabled={state.state === STATES.ANSWERING}
          />
        );

      case STATES.CONFIDENCE:
        return (
          <ConfidenceRating
            question={currentQuestion}
            studentAnswer={state.studentAnswer}
            onRate={handleRateConfidence}
            loading={loading}
          />
        );

      case STATES.DETECTING:
        return (
          <div className="card text-center p-8 animate-pop">
            <div className="text-4xl mb-4">🔍</div>
            <AutoTranslate as="p" className="text-gray-600 text-lg">Analyzing your answer...</AutoTranslate>
            <div className="mt-4 flex justify-center">
              <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        );

      case STATES.NUDGE:
        return (
          <SocraticNudge
            hint={state.hint}
            onSelfFixed={handleSelfFixed}
            onStillStuck={handleStillStuck}
          />
        );

      case STATES.EXPLANATION:
        return (
          <ExplanationPanel
            gapResult={state.gapResult}
            calibration={state.calibration}
            story={state.story}
            question={currentQuestion}
            studentAnswer={state.studentAnswer}
            sessionStats={sessionStats}
            onContinue={handleExplanationContinue}
          />
        );

      case STATES.INSIGHT:
        return (
          <InsightAfterAnswer
            gapResult={state.gapResult}
            calibration={state.calibration}
            question={currentQuestion}
            studentAnswer={state.studentAnswer}
            sessionStats={sessionStats}
            onContinue={handleInsightContinue}
          />
        );

      case STATES.PEER_PROMPT:
        return (
          <PeerPrompt
            topic={module?.topic || 'fractions'}
            onSubmit={handlePeerSubmitted}
          />
        );

      case STATES.SCHEDULED:
        if (showInsights) {
          return (
            <div className="animate-pop space-y-4">
              <div className="card text-center p-6">
                <div className="text-5xl mb-4">🎉</div>
                <AutoTranslate as="h3" className="text-xl font-bold text-gray-800 mb-2">Module Complete!</AutoTranslate>
                <AutoTranslate as="p" className="text-gray-500 text-sm">
                  You've completed all questions in {module?.chapter || 'this module'}.
                </AutoTranslate>
              </div>
              <StudentInsights student={student} module={module} sessionStats={sessionStats} />
              
              {sessionStats.gapHistory.some(h => h.gapType) && (
                <div className="bg-violet-600 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform duration-1000" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl">
                        🤝
                      </div>
                      <div>
                        <h4 className="text-xl font-bold">Collaborative Learning</h4>
                        <p className="text-violet-100 text-sm opacity-90">Stuck on a concept? Learn with a friend!</p>
                      </div>
                    </div>
                    <p className="text-violet-50 mb-6 leading-relaxed">
                      We noticed you had some challenges with <span className="font-black underline decoration-fuchsia-400">"{module.topic}"</span>. 
                      Several of your classmates have already mastered this—talking to them might help you see it in a new way!
                    </p>
                    <button
                      onClick={() => navigate('/messages')}
                      className="w-full py-4 bg-white text-violet-700 rounded-2xl font-black shadow-lg hover:shadow-2xl transition-all flex items-center justify-center gap-3"
                    >
                      💬 Message a Peer Mentor
                      <span className="text-xl">→</span>
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => onComplete?.(sessionStats)}
                className="btn-primary w-full"
              >
                <AutoTranslate>Back to Modules</AutoTranslate>
              </button>
            </div>
          );
        }
        return (
          <div className="card text-center p-8 animate-pop">
            <div className="text-5xl mb-4">📅</div>
            <AutoTranslate as="h3" className="text-xl font-bold text-gray-800 mb-2">Great work!</AutoTranslate>
            <ConfidenceBadge calibration={state.calibration} />
            <AutoTranslate as="p" className="text-gray-600 mt-4">
              Your next review has been scheduled based on your performance.
            </AutoTranslate>
            <button onClick={handleNextQuestion} className="btn-primary mt-6">
              <AutoTranslate>
                {state.questionIndex < (module?.questions?.length || 1) - 1
                  ? 'Next Question →'
                  : 'View My Progress →'}
              </AutoTranslate>
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span><AutoTranslate>Question</AutoTranslate> {state.questionIndex + 1} <AutoTranslate>of</AutoTranslate> {module?.questions?.length || 1}</span>
          <span>{Math.round(((state.questionIndex + 1) / (module?.questions?.length || 1)) * 100)}%</span>
        </div>
        <div className="w-full bg-violet-100 rounded-full h-2">
          <div
            className="bg-violet-600 rounded-full h-2 transition-all duration-500"
            style={{
              width: `${((state.questionIndex + 1) / (module?.questions?.length || 1)) * 100}%`,
            }}
          />
        </div>
      </div>
      
      {/* AI Aura Personality Indicator */}
      <div className="flex justify-center mb-4">
        <motion.div 
          key={state.personality}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border ${
            state.personality === 'empathetic' ? 'bg-fuchsia-50 border-fuchsia-100 text-fuchsia-600' :
            state.personality === 'analytical' ? 'bg-blue-50 border-blue-100 text-blue-600' :
            'bg-violet-50 border-violet-100 text-violet-600'
          }`}
        >
          <span className="text-sm">
            {state.personality === 'empathetic' ? '💜' : state.personality === 'analytical' ? '🔬' : '✨'}
          </span>
          AI Tutor Mode: {state.personality}
        </motion.div>
      </div>

      {renderState()}
    </div>
  );
}
