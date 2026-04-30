// Path: frontend/src/components/learning/AITutorChat.jsx
/**
 * AI Tutor Chat Component
 * 
 * Provides a chat interface where students can:
 * 1. Ask questions about their textbook (voice or text)
 * 2. Get answers with textbook references
 * 3. Take adaptive quizzes that detect misunderstanding types
 * 4. Switch between Q&A and Quiz modes
 */

import React, { useState, useRef, useEffect, useContext } from 'react';
import { StudentContext } from '../../context/StudentContext.jsx';
import { 
  askTextbookQuestion, 
  generateAdaptiveQuiz, 
  analyzeMisconception,
  handleTutoringInteraction 
} from '../../services/aiTutor.js';
import { readAloud, startListening } from '../../services/voice.js';
import { detectGap } from '../../engine/detector.js';
import { calibrateConfidence } from '../../engine/calibrator.js';
import { schedule, deriveQuality } from '../../engine/sm2.js';
import { saveEvent } from '../../db/events.js';
import { saveCard, getCardsByTopic } from '../../db/cards.js';
import InsightAfterAnswer from './InsightAfterAnswer.jsx';
import AutoTranslate from '../common/AutoTranslate.jsx';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function AITutorChat({ textbook, chapterId, language: langProp, onClose }) {
  const { student } = useContext(StudentContext);
  // langProp from parent overrides student profile language
  const language = langProp || student?.language || 'en';
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('qa'); // 'qa' | 'quiz'
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizResult, setQuizResult] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState(chapterId || 'all');
  const [showInsight, setShowInsight] = useState(false);
  const [lastQuizInsight, setLastQuizInsight] = useState(null);
  const [sessionStats, setSessionStats] = useState({
    totalAnswered: 0,
    correctCount: 0,
    conceptStats: {},
    gapHistory: [],
  });
  const [insightData, setInsightData] = useState(null);

  const messagesEndRef = useRef(null);

  const inputRef = useRef(null);

  // Find current chapter name
  const currentChapter = textbook?.chapters?.find(ch => 
    ch.chapterId === selectedChapter || 
    ch.chapterName?.toLowerCase().includes(selectedChapter?.toLowerCase())
  );

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Welcome message on textbook load
  useEffect(() => {
    if (messages.length === 0 && textbook) {
      const langLabel = { 
        en: 'English', kn: 'Kannada (ಕನ್ನಡ)', hi: 'Hindi (हिन्दी)', 
        te: 'Telugu (తెలుగు)', ta: 'Tamil (தமிழ்)' 
      }[language] || language;

      const textbookName = textbook.fileName || `${textbook.subject} Grade ${textbook.grade}`;
      const chapterCount = textbook.chapters?.length || 0;

      setMessages([
        {
          role: 'ai',
          type: 'welcome',
          content: {
            text: `👋 Welcome! I've analyzed your textbook **${textbookName}** — ${chapterCount} chapter${chapterCount === 1 ? '' : 's'} found. Select a chapter from the sidebar to start a focused session, or ask me anything! Responding in **${langLabel}**.`,
            chapters: textbook.chapters?.map(ch => ({
              id: ch.chapterId,
              name: ch.chapterName,
              concepts: ch.keyConcepts?.slice(0, 3) || [],
            })) || [],
          },
          timestamp: new Date().toISOString(),
          id: `msg-welcome-${Date.now()}`,
        },
      ]);
    }
  }, [textbook]);

  // When a chapter is selected, send a chapter-start greeting
  useEffect(() => {
    if (!chapterId || chapterId === 'all' || !textbook) return;
    const ch = textbook.chapters?.find(c => c.chapterId === chapterId);
    if (!ch) return;
    setSelectedChapter(chapterId);
    const langInstruction = language !== 'en'
      ? ` (Responding in ${({ kn: 'Kannada', hi: 'Hindi', te: 'Telugu', ta: 'Tamil' }[language] || language)})`
      : '';
    addMessage('ai', 'info', {
      text: `📖 **${ch.chapterName}** selected${langInstruction}. This chapter covers: ${(ch.keyConcepts || []).slice(0, 4).join(', ')}. What would you like to learn or practice?`,
    });
  }, [chapterId]);

  // Auto-read AI responses — only on explicit listen button click, not auto-fire


  const handleVoiceInput = () => {
    if (isListening) return;
    setIsListening(true);
    startListening(
      (transcript) => {
        setInput(transcript);
        setIsListening(false);
      },
      (error) => {
        console.error('Voice input error:', error);
        setIsListening(false);
        const msg = error === 'network'
          ? 'Microphone needs an internet connection for speech recognition. Please check your connection and try again.'
          : error === 'not-allowed' || error === 'permission-denied'
          ? 'Microphone access was denied. Please allow microphone permission in your browser settings.'
          : error === 'no-speech'
          ? 'No speech detected. Please try speaking again.'
          : error === 'not_supported'
          ? 'Speech recognition is not supported in this browser. Try Chrome or Edge.'
          : 'Could not understand the audio. Please try typing your question.';
        addMessage('ai', 'error', { text: msg });
      },
      language
    );
  };

  // Add a message to the chat
  const addMessage = (role, type, content) => {
    setMessages(prev => [...prev, {
      role,
      type,
      content,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
    }]);
  };

  // Handle sending a question
  const handleSendQuestion = async () => {
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput('');
    setLoading(true);

    // Add user message
    addMessage('user', 'question', { text: question });

    try {
      const response = await handleTutoringInteraction(
        question,
        textbook,
        selectedChapter,
        {
          history: sessionHistory,
          mode,
          lastGapType: sessionHistory[sessionHistory.length - 1]?.gapType,
          difficulty: calculateDifficulty(),
          language: language, // Corrected: Use the component's language state/prop
        }
      );

      if (response.type === 'answer') {
        addMessage('ai', 'answer', response.content);

        // Update session history
        setSessionHistory(prev => [...prev, {
          type: 'qa',
          question,
          answer: response.content.answer,
          timestamp: response.timestamp,
        }]);
      } else if (response.type === 'quiz') {
        setCurrentQuiz(response.content);
        addMessage('ai', 'quiz', response.content);
      }
    } catch (error) {
      console.error('Error in tutoring interaction:', error);
      addMessage('ai', 'error', {
        text: 'Sorry, I encountered an error. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle quiz answer submission
  const handleQuizSubmit = async () => {
    if (!quizAnswer.trim() || !currentQuiz) return;

    setLoading(true);
    const studentAnswer = quizAnswer.trim();

    // Add user's quiz answer
    addMessage('user', 'quiz_answer', { 
      text: studentAnswer,
      questionId: currentQuiz.questionId,
    });

    try {
      // Analyze the answer using Groq with textbook context
      const gapResult = await analyzeMisconception({
        question: currentQuiz.question,
        correctAnswer: currentQuiz.correctAnswer,
        studentAnswer,
        concept: currentQuiz.concept,
        textbook,
        chapterId: selectedChapter,
      });

      const isCorrect = gapResult.gapType === null;
      const calibration = calibrateConfidence(isCorrect, 3); // Default confidence

      // Save event
      await saveEvent({
        eventId: `${student?.studentId || 'unknown'}-${Date.now()}`,
        studentId: student?.studentId || 'unknown',
        sessionId: `tutor-session-${Date.now()}`,
        date: new Date().toISOString(),
        topic: textbook.subject,
        subtopic: currentQuiz.concept || '',
        questionId: currentQuiz.questionId,
        studentAnswer,
        correctAnswer: currentQuiz.correctAnswer,
        gapType: gapResult.gapType,
        confidence: 3,
        correct: isCorrect,
        selfFixed: false,
        modality: 'text',
        synced: false,
      });

      // Update SM-2 card
      const quality = deriveQuality(isCorrect, 3, false);
      const existingCards = await getCardsByTopic(
        student?.studentId || 'unknown',
        currentQuiz.concept || textbook.subject
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
          cardId: `${student?.studentId || 'unknown'}-${currentQuiz.questionId}`,
          studentId: student?.studentId || 'unknown',
          topic: currentQuiz.concept || textbook.subject,
          subtopic: currentQuiz.concept || '',
          questionId: currentQuiz.questionId,
          n: result.n,
          ef: result.ef,
          interval: result.interval,
          nextReview: result.nextReview,
          lastReview: new Date().toISOString(),
        };
      }
      await saveCard(card);

      // Find matching misconception for detailed feedback
      const matchedMisconception = currentQuiz.misconceptions?.find(
        m => m.studentAnswer?.toLowerCase() === studentAnswer.toLowerCase()
      );

      setQuizResult({
        isCorrect,
        gapResult,
        calibration,
        correctAnswer: currentQuiz.correctAnswer,
        explanation: currentQuiz.explanation,
        misconception: matchedMisconception,
      });

      // Add AI response with results
      addMessage('ai', 'quiz_result', {
        isCorrect,
        gapResult,
        calibration,
        correctAnswer: currentQuiz.correctAnswer,
        explanation: currentQuiz.explanation,
        misconception: matchedMisconception,
        studentAnswer,
      });

      // Update session history
      setSessionHistory(prev => [...prev, {
        type: 'answer',
        question: currentQuiz.question,
        studentAnswer,
        correctAnswer: currentQuiz.correctAnswer,
        gapType: gapResult.gapType,
        isCorrect,
        timestamp: new Date().toISOString(),
      }]);

      // Set insight data for the InsightAfterAnswer component
      setInsightData({
        gapResult,
        calibration,
        question: {
          question: currentQuiz.question,
          correctAnswer: currentQuiz.correctAnswer,
          concept: currentQuiz.concept,
        },
        studentAnswer,
      });

      // Update session stats
      const concept = currentQuiz.concept || 'general';
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
            questionId: currentQuiz.questionId,
            concept,
            gapType: gapResult.gapType,
            correct: isCorrect,
            confidence: 3,
          }],
        };
      });

      setQuizAnswer('');
      setCurrentQuiz(null);
      setQuizResult(null);

    } catch (error) {
      console.error('Error analyzing quiz answer:', error);
      addMessage('ai', 'error', {
        text: 'Sorry, I encountered an error analyzing your answer. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate adaptive difficulty based on history
  const calculateDifficulty = () => {
    if (sessionHistory.length === 0) return 3;
    const recent = sessionHistory.slice(-5);
    const correctCount = recent.filter(h => h.isCorrect).length;
    const ratio = correctCount / recent.length;
    if (ratio > 0.8) return Math.min(5, Math.floor(ratio * 5));
    if (ratio < 0.3) return Math.max(1, Math.floor(ratio * 5));
    return 3;
  };

  // Generate a new quiz question
  const handleNewQuiz = async () => {
    setLoading(true);
    try {
      const quiz = await generateAdaptiveQuiz(textbook, selectedChapter, {
        previousAnswers: sessionHistory.filter(h => h.type === 'answer'),
        lastGapType: sessionHistory[sessionHistory.length - 1]?.gapType,
        difficulty: calculateDifficulty(),
      });
      setCurrentQuiz(quiz);
      addMessage('ai', 'quiz', quiz);
    } catch (error) {
      console.error('Error generating quiz:', error);
      addMessage('ai', 'error', {
        text: 'Sorry, I couldn\'t generate a quiz question. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle insight continue - dismiss the insight overlay
  const handleInsightContinue = () => {
    setInsightData(null);
    setShowInsight(false);
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e) => {

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (currentQuiz) {
        handleQuizSubmit();
      } else {
        handleSendQuestion();
      }
    }
  };

  // Render a message based on its type
  const renderMessage = (msg) => {
    switch (msg.type) {
      case 'welcome':
        return (
          <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl p-4 border border-violet-200">
            <AutoTranslate as="p" className="text-gray-700 text-sm leading-relaxed">{msg.content.text}</AutoTranslate>
            {msg.content.chapters?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {msg.content.chapters.map((ch, idx) => (
                  <button
                    key={`${ch.id || 'ch'}-${idx}`}
                    onClick={() => {
                      setSelectedChapter(ch.id);
                      addMessage('ai', 'info', {
                        text: `Now focusing on: ${ch.name}`,
                      });
                    }}
                    className="text-xs bg-white px-2.5 py-1 rounded-full border border-violet-200 text-violet-700 hover:bg-violet-100 transition-colors"
                  >
                    📖 {ch.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case 'question':
        return (
          <div className="bg-violet-600 text-white rounded-2xl rounded-br-md p-3 max-w-[85%] ml-auto">
            <AutoTranslate as="p" className="text-sm">{msg.content.text}</AutoTranslate>
          </div>
        );

      case 'answer':
        return (
          <div className="bg-white rounded-2xl rounded-bl-md p-4 border border-gray-200 shadow-sm max-w-[90%]">
            <AutoTranslate as="p" className="text-gray-800 text-sm leading-relaxed">{msg.content.answer}</AutoTranslate>
            
            {/* Listen button */}
            <button
              onClick={() => readAloud(msg.content.answer, language)}
              className="mt-2 text-xs text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 px-2.5 py-1 rounded-full transition-colors flex items-center gap-1"
              title="Read aloud"
            >
              🔊 Listen
            </button>

            {/* Textbook references */}
            {msg.content.textbookReferences?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-1.5">📚 From your textbook:</p>
                {msg.content.textbookReferences.map((ref, i) => (
                  <div key={i} className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2 mb-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium">{ref.chapter}</span>
                        {ref.section && <span> → {ref.section}</span>}
                      </div>
                      {ref.pageNumber && (
                        <span className="text-[10px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded font-bold">
                          p. {ref.pageNumber}
                        </span>
                      )}
                    </div>
                    {ref.quote && <p className="text-gray-500 mt-1 italic leading-relaxed">"{ref.quote}"</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Follow-up question */}
            {msg.content.followUpQuestion && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-amber-600 font-medium mb-1">💡 Follow-up:</p>
                <AutoTranslate as="p" className="text-sm text-gray-700 italic">{msg.content.followUpQuestion}</AutoTranslate>
              </div>
            )}
          </div>
        );

      case 'quiz':
        return (
          <div className="bg-white rounded-2xl p-4 border-2 border-amber-300 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🧠</span>
              <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                Quiz Question
              </span>
              <span className="text-xs text-gray-400 ml-auto">
                Difficulty: {msg.content.difficulty}/5
              </span>
            </div>
            <AutoTranslate as="p" className="text-gray-800 font-medium mb-1">{msg.content.question}</AutoTranslate>
            {msg.content.chapterReference && (
              <p className="text-xs text-gray-400 mb-3">
                From: <AutoTranslate>{msg.content.chapterReference.chapterName}</AutoTranslate>
                {msg.content.chapterReference.section && <> → <AutoTranslate>{msg.content.chapterReference.section}</AutoTranslate></>}
              </p>
            )}
            
            {/* Quiz answer input */}
            <div className="mt-3">
              <input
                type="text"
                value={quizAnswer}
                onChange={(e) => setQuizAnswer(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your answer..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                disabled={loading}
                autoFocus
              />
              <button
                onClick={handleQuizSubmit}
                disabled={loading || !quizAnswer.trim()}
                className="mt-2 w-full px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-xl hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Analyzing...' : 'Submit Answer →'}
              </button>
            </div>
          </div>
        );

      case 'quiz_result':
        return (
          <div className={`rounded-2xl p-4 border-2 max-w-[90%] ${
            msg.content.isCorrect 
              ? 'bg-emerald-50 border-emerald-300' 
              : 'bg-red-50 border-red-300'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{msg.content.isCorrect ? '✅' : '❌'}</span>
              <div>
                <p className="font-bold text-gray-800 text-sm">
                  {msg.content.isCorrect ? 'Correct!' : 'Not quite right'}
                </p>
                <p className="text-xs text-gray-500">
                  Your answer: {msg.content.studentAnswer}
                  {!msg.content.isCorrect && (
                    <> · Correct: <span className="font-semibold text-emerald-600">{msg.content.correctAnswer}</span></>
                  )}
                </p>
              </div>
            </div>

            {/* Gap analysis */}
            {msg.content.gapResult?.gapType && (
              <div className="mt-2 bg-white rounded-xl p-3 border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 mb-1">Analysis:</p>
                <AutoTranslate as="p" className="text-sm text-gray-700">{msg.content.gapResult.reasoning}</AutoTranslate>
                <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                  msg.content.gapResult.gapType === 'conceptual' ? 'bg-red-100 text-red-700' :
                  msg.content.gapResult.gapType === 'procedural' ? 'bg-orange-100 text-orange-700' :
                  msg.content.gapResult.gapType === 'careless' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {msg.content.gapResult.gapType} gap
                </span>
              </div>
            )}

            {/* Explanation */}
            <div className="mt-2 bg-white rounded-xl p-3 border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 mb-1">Explanation:</p>
              <AutoTranslate as="p" className="text-sm text-gray-700">{msg.content.explanation}</AutoTranslate>
              <button
                onClick={() => readAloud(msg.content.explanation, language)}
                className="mt-2 text-[10px] text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 px-2 py-0.5 rounded-full transition-colors flex items-center gap-1"
              >
                🔊 Listen
              </button>
            </div>

            {/* Misconception story */}
            {msg.content.misconception?.story && (
              <div className="mt-2 bg-amber-50 rounded-xl p-3 border border-amber-200">
                <p className="text-xs font-semibold text-amber-700 mb-1">💡 Let me explain:</p>
                {msg.content.misconception.story.steps?.map((step, i) => (
                  <p key={i} className="text-sm text-gray-700 mb-1">
                    <span className="font-medium text-amber-600">{i + 1}.</span> <AutoTranslate as="span">{step}</AutoTranslate>
                  </p>
                ))}
                {msg.content.misconception.story.moral && (
                  <p className="text-xs text-amber-700 mt-2 font-medium italic">
                    "<AutoTranslate as="span">{msg.content.misconception.story.moral}</AutoTranslate>"
                  </p>
                )}
              </div>
            )}

            {/* Next action */}
            <button
              onClick={handleNewQuiz}
              className="mt-3 w-full px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors"
            >
              Next Question →
            </button>
          </div>
        );

      case 'info':
        return (
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-200 text-center">
            <AutoTranslate as="p" className="text-sm text-blue-700">{msg.content.text}</AutoTranslate>
          </div>
        );

      case 'error':
        return (
          <div className="bg-red-50 rounded-xl p-3 border border-red-200">
            <AutoTranslate as="p" className="text-sm text-red-700">{msg.content.text}</AutoTranslate>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-2xl overflow-hidden border border-gray-200 shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <div>
            <h3 className="font-bold text-sm">AI Tutor</h3>
            <div className="flex items-center gap-2">
              <p className="text-xs text-violet-200 truncate max-w-[200px]">
                {currentChapter 
                  ? `📖 ${currentChapter.chapterName}` 
                  : `${textbook?.fileName || textbook?.subject || 'Textbook'} · Grade ${textbook?.grade || '?'}`}
              </p>
              {textbook?.fileName && (
                <a
                  href={`${BACKEND_URL}/api/pipeline/pdf/${textbook.fileName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-white/10 rounded text-violet-200 hover:text-white transition-colors"
                  title="Download Textbook PDF"
                >
                  📥
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <button
            onClick={() => {
              setMode(mode === 'qa' ? 'quiz' : 'qa');
              addMessage('ai', 'info', {
                text: mode === 'qa' 
                  ? '🔄 Switched to Quiz mode! I\'ll generate questions to test your understanding.'
                  : '🔄 Switched to Q&A mode! Ask me anything about your textbook.',
              });
              if (mode === 'qa') {
                handleNewQuiz();
              }
            }}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
              mode === 'quiz' 
                ? 'bg-amber-400 text-amber-900' 
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            {mode === 'quiz' ? '🧠 Quiz' : '💬 Q&A'}
          </button>

          {/* Chapter selector */}
          <div className="relative">
            <button
              onClick={() => setShowChapters(!showChapters)}
              className="text-xs px-2.5 py-1 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              📑 Chapters
            </button>
            {showChapters && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-60 overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedChapter('all');
                    setShowChapters(false);
                    addMessage('ai', 'info', {
                      text: 'Now searching all chapters. Ask me anything!',
                    });
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-violet-50 ${
                    selectedChapter === 'all' ? 'bg-violet-100 text-violet-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  <AutoTranslate>📚 All Chapters</AutoTranslate>
                </button>
                {textbook?.chapters?.map((ch, idx) => (
                  <button
                    key={`${ch.chapterId || 'ch'}-${idx}`}
                    onClick={() => {
                      setSelectedChapter(ch.chapterId);
                      setShowChapters(false);
                      addMessage('ai', 'info', {
                        text: `Now focusing on: ${ch.chapterName}${ch.startPage ? ` (starts on page ${ch.startPage})` : ''}`,
                      });
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-violet-50 border-t border-gray-100 ${
                      selectedChapter === ch.chapterId ? 'bg-violet-100 text-violet-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="truncate block">📖 {ch.chapterName}</span>
                      {ch.startPage && (
                        <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 whitespace-nowrap">
                          p. {ch.startPage}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {renderMessage(msg)}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-md p-4 border border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-violet-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-violet-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-violet-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        {currentQuiz ? (
          // Quiz mode - answer input is in the quiz card
          <p className="text-xs text-center text-gray-400">
            <AutoTranslate>Answer the quiz question above, or </AutoTranslate>
            <button
              onClick={() => {
                setCurrentQuiz(null);
                setQuizAnswer('');
              }}
              className="text-violet-600 hover:underline"
            >
              <AutoTranslate>skip to next</AutoTranslate>
            </button>
          </p>
        ) : (
          <div className="flex items-center gap-2">
            {/* Voice input button */}
            <button
              onClick={handleVoiceInput}
              disabled={isListening}
              className={`p-2 rounded-xl transition-colors ${
                isListening 
                  ? 'bg-red-100 text-red-600 animate-pulse' 
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              title="Voice input"
            >
              🎤
            </button>

            {/* Text input */}
            <AutoTranslate
              as="input"
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                mode === 'qa' 
                  ? 'Ask a question about your textbook...' 
                  : 'Type your answer...'
              }
              className="flex-1 px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-400 focus:border-violet-400 outline-none"
              disabled={loading}
            />

            {/* Send button */}
            <button
              onClick={handleSendQuestion}
              disabled={loading || !input.trim()}
              className="p-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '...' : '→'}
            </button>
          </div>
        )}
      </div>

      {/* Insight After Answer overlay */}
      {insightData && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 overflow-y-auto p-4">
          <div className="max-w-md mx-auto pt-8">
            <InsightAfterAnswer
              gapResult={insightData.gapResult}
              calibration={insightData.calibration}
              question={insightData.question}
              studentAnswer={insightData.studentAnswer}
              sessionStats={sessionStats}
              onContinue={handleInsightContinue}
            />
          </div>
        </div>
      )}
    </div>
  );
}


