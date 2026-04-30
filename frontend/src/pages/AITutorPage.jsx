// Path: frontend/src/pages/AITutorPage.jsx
/**
 * AI Tutor Page
 * 
 * Full-page AI Tutor experience where students can:
 * 1. Upload a textbook PDF (AI transcribes it chapter-wise)
 * 2. Ask questions about any chapter (voice or text)
 * 3. Take adaptive quizzes that detect misunderstanding types
 * 4. View their learning history and progress
 */

import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentContext } from '../context/StudentContext.jsx';
import TextbookUploader from '../components/pipeline/TextbookUploader.jsx';
import AITutorChat from '../components/learning/AITutorChat.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { saveModule, getModule } from '../db/modules.js';
import { generateQuestionsForChapter } from '../services/aiTutor.js';
import AutoTranslate from '../components/common/AutoTranslate.jsx';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'kn', label: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'te', label: 'తెలుగు', flag: '🇮🇳' },
  { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
];
export default function AITutorPage() {
  const { student, updateStudent } = useContext(StudentContext);
  const navigate = useNavigate();
  const [textbook, setTextbook] = useState(null);
  const [activeChapter, setActiveChapter] = useState(null);
  const [showUploader, setShowUploader] = useState(true);
  const [savedTextbooks, setSavedTextbooks] = useState([]);
  const [libraryModules, setLibraryModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState(student?.language || 'en');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [buildingModules, setBuildingModules] = useState(null); // {current, total, chapterName}

  // Sync state if student language changes from elsewhere
  useEffect(() => {
    if (student?.language) {
      setLanguage(student.language);
    }
  }, [student?.language]);

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    setShowLangPicker(false);
    // Update global context so AutoTranslate picks it up
    updateStudent({ language: newLang });
  };

  // Load previously saved textbooks from IndexedDB
  useEffect(() => {
    async function loadSaved() {
      try {
        const { getAllModules } = await import('../db/modules.js');
        const modules = await getAllModules();
        const textbooks = modules.filter(m => m.chapters && m.chapters.length > 0);
        setSavedTextbooks(textbooks);
        setLibraryModules(modules);
        if (textbooks.length > 0) {
          const latest = textbooks.sort((a, b) =>
            new Date(b.processedAt || 0) - new Date(a.processedAt || 0)
          )[0];
          setTextbook(latest);
          setShowUploader(false);
        }
      } catch (error) {
        console.error('Error loading saved textbooks:', error);
      } finally {
        setLoading(false);
      }
    }
    loadSaved();
  }, []);

  const refreshLibrary = async () => {
    try {
      const { getAllModules } = await import('../db/modules.js');
      const modules = await getAllModules();
      const textbooks = modules.filter(m => m.chapters && m.chapters.length > 0);
      setSavedTextbooks(textbooks);
      setLibraryModules(modules);
    } catch (e) {
      console.error('Error refreshing library:', e);
    }
  };

  // Handle textbook processed
  const handleTextbookProcessed = async (processedTextbook) => {
    setTextbook(processedTextbook);
    setShowUploader(false);
    
    // Save to IndexedDB for offline access
    try {
      // 1. Save the full textbook for AI Tutor reference
      await saveModule({
        moduleId: processedTextbook.id,
        subject: processedTextbook.subject,
        chapter: 'Full Textbook',
        grade: processedTextbook.grade,
        topic: processedTextbook.subject.toLowerCase(),
        type: 'textbook',
        chapters: processedTextbook.chapters,
        tableOfContents: processedTextbook.tableOfContents || [],
        initialQuizzes: processedTextbook.initialQuizzes || [],
        fileName: processedTextbook.fileName,
        processedAt: processedTextbook.processedAt,
        downloadedAt: new Date().toISOString(),
        version: 1,
      });

      // 2. Generate questions with AI and save as offline modules per chapter
      const chapters = processedTextbook.chapters || [];
      for (let i = 0; i < chapters.length; i++) {
        const ch = chapters[i];
        setBuildingModules({ current: i + 1, total: chapters.length, chapterName: ch.chapterName });

        // Generate 5 questions via Groq
        const questions = await generateQuestionsForChapter(
          ch,
          processedTextbook.subject,
          processedTextbook.grade
        );

        const chapterModule = {
          moduleId: `practice-${processedTextbook.id}-${ch.chapterId}`,
          subject: processedTextbook.subject.toLowerCase(),
          chapter: ch.chapterName,
          grade: processedTextbook.grade,
          topic: ch.chapterName,
          parentModuleId: processedTextbook.id,
          type: 'chapter',
          questions,
          downloadedAt: new Date().toISOString(),
          version: 1,
        };
        await saveModule(chapterModule);

        // Save each concept as a topic stub (no questions — generated on demand)
        for (const concept of ch.keyConcepts || []) {
          await saveModule({
            moduleId: `topic-${processedTextbook.id}-${ch.chapterId}-${concept.replace(/\s+/g, '_').toLowerCase()}`,
            subject: processedTextbook.subject.toLowerCase(),
            chapter: ch.chapterName,
            topic: concept,
            grade: processedTextbook.grade,
            parentModuleId: processedTextbook.id,
            parentChapterId: chapterModule.moduleId,
            type: 'topic',
            questions: [],
            downloadedAt: new Date().toISOString(),
            version: 1,
          });
        }
      }

      setBuildingModules(null);
      
      console.log('Textbook and practice modules saved to IndexedDB');
      await refreshLibrary();
    } catch (error) {
      console.error('Error saving practice modules to IndexedDB:', error);
    }
  };

  // Handle textbook delete
  const handleDeleteTextbook = async (e, tbId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this textbook and all its associated modules?')) return;
    
    try {
      const { listModules, deleteModule } = await import('../db/modules.js');
      const allModules = await listModules();
      const relatedIds = allModules
        .filter(m => m.moduleId === tbId || m.parentModuleId === tbId)
        .map(m => m.moduleId);
      for (const id of relatedIds) await deleteModule(id);
      await refreshLibrary();
      if (textbook?.moduleId === tbId || textbook?.id === tbId) {
        setTextbook(null);
        setActiveChapter(null);
      }
    } catch (error) {
      console.error('Error deleting textbook:', error);
    }
  };

  // Handle chapter selection
  const handleChapterSelect = (chapterId) => {
    setActiveChapter(chapterId);
  };

  // Handle back to textbook list
  const handleBackToLibrary = () => {
    setTextbook(null);
    setActiveChapter(null);
    setShowUploader(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-violet-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading AI Tutor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-violet-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Building offline modules progress overlay */}
        {buildingModules && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">🧠</div>
                <h3 className="font-bold text-gray-800">Building Offline Modules</h3>
                <p className="text-xs text-gray-500 mt-1">AI is generating questions for each chapter</p>
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span className="truncate pr-2">{buildingModules.chapterName}</span>
                  <span className="font-bold text-violet-600 whitespace-nowrap">{buildingModules.current}/{buildingModules.total}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-violet-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(buildingModules.current / buildingModules.total) * 100}%` }}
                  />
                </div>
              </div>
              <p className="text-[11px] text-center text-gray-400">These modules will work offline after this</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => navigate('/learn')}
              className="text-violet-600 text-sm hover:underline mb-1 inline-block"
            >
              ← Back to Learning
            </button>
            <h1 className="text-2xl font-bold text-gray-800">🤖 AI Tutor</h1>
            <p className="text-sm text-gray-500">
              Select a chapter and start learning in your language
            </p>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2">

            {/* 🌐 Language picker */}
            <div className="relative">
              <button
                onClick={() => setShowLangPicker(p => !p)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white border-2 border-violet-200 text-violet-700 rounded-xl hover:bg-violet-50 transition-all shadow-sm"
              >
                🌐 {LANGUAGES.find(l => l.code === language)?.label || 'Language'}
                <span className="text-gray-400">▾</span>
              </button>

              {showLangPicker && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 pt-3 pb-1">
                    Choose Language
                  </p>
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                        language === lang.code
                          ? 'bg-violet-50 text-violet-700 font-bold'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                      {language === lang.code && <span className="ml-auto text-violet-500">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => { setShowUploader(true); setShowLangPicker(false); }}
              className="px-3 py-1.5 text-xs font-medium bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors shadow-sm"
            >
              📤 Upload
            </button>
          </div>
        </div>

        {/* Main content area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left sidebar */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 space-y-3"
          >

            {/* ── Sidebar tabs ──────────────────────────── */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowUploader(false)}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  !showUploader
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                📚 My Library
              </button>
              <button
                onClick={() => setShowUploader(true)}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  showUploader
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                📤 Upload
              </button>
            </div>

            {/* ── Upload panel ────────────────────────────── */}
            {showUploader && (
              <TextbookUploader onTextbookProcessed={handleTextbookProcessed} />
            )}

            {/* ── Library panel ───────────────────────────── */}
            {!showUploader && (
              <div className="space-y-3">
                {savedTextbooks.length === 0 ? (
                  <div className="card p-6 text-center">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">No textbooks yet</p>
                    <p className="text-xs text-gray-400 mb-3">Upload a PDF to get started</p>
                    <button
                      onClick={() => setShowUploader(true)}
                      className="text-xs text-violet-600 font-semibold hover:underline"
                    >
                      Upload your first textbook →
                    </button>
                  </div>
                ) : (
                  savedTextbooks.map(tb => {
                    const isSelected = textbook?.moduleId === tb.moduleId;
                    const subjectIcon = {
                      mathematics: '📐', science: '🔬', english: '📖',
                      social: '🌍', hindi: '🏮', kannada: '🏛️',
                    }[tb.subject?.toLowerCase()] || '📚';

                    return (
                      <div key={tb.moduleId || tb.id} className="relative group">
                        <button
                          onClick={() => { setTextbook(tb); setActiveChapter(null); }}
                          className={`w-full text-left rounded-2xl border-2 p-3 transition-all duration-200 ${
                            isSelected
                              ? 'border-violet-400 bg-violet-50 shadow-md shadow-violet-100'
                              : 'border-gray-100 bg-white hover:border-violet-200 hover:shadow-sm'
                          }`}
                        >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                            isSelected ? 'bg-violet-100' : 'bg-gray-100'
                          }`}>
                            {subjectIcon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-800 truncate leading-tight">
                              {tb.fileName || `${tb.subject} Textbook`}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isSelected ? 'bg-violet-200 text-violet-700' : 'bg-gray-100 text-gray-500'
                              }`}>
                                Grade {tb.grade}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {tb.chapters?.length || 0} chapters
                              </span>
                            </div>
                            {tb.processedAt && (
                              <p className="text-[10px] text-gray-300 mt-1">
                                {new Date(tb.processedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <span className="text-violet-500 text-lg flex-shrink-0">✓</span>
                          )}
                        </div>
                        </button>
                        <button
                          onClick={(e) => handleDeleteTextbook(e, tb.moduleId || tb.id)}
                          className="absolute top-2 right-2 p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          title="Delete Textbook"
                        >
                          🗑️
                        </button>
                      </div>
                    );
                  })
                )}

                {/* ── Chapter list for selected textbook ─── */}
                {textbook && (
                  <div className="card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-700 text-sm flex items-center gap-1.5">
                        📖 Chapters
                        <span className="text-xs font-normal text-gray-400">
                          ({textbook.chapters?.length || 0})
                        </span>
                      </h3>
                      {textbook.fileName && (
                        <a
                          href={`${BACKEND_URL}/api/pipeline/pdf/${textbook.fileName}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-violet-600 hover:underline flex items-center gap-1"
                        >
                          📥 PDF
                        </a>
                      )}
                    </div>

                    <div className="space-y-0.5 max-h-80 overflow-y-auto pr-1">
                      <button
                        onClick={() => setActiveChapter('all')}
                        className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors font-semibold ${
                          !activeChapter || activeChapter === 'all'
                            ? 'bg-violet-100 text-violet-700'
                            : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        📚 All Chapters
                      </button>
                      {textbook.chapters?.map((ch, idx) => (
                        <button
                          key={`${ch.chapterId || 'ch'}-${idx}`}
                          onClick={() => setActiveChapter(ch.chapterId)}
                          className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${
                            activeChapter === ch.chapterId
                              ? 'bg-violet-100 text-violet-700 font-semibold'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="truncate pr-2">{ch.chapterName}</span>
                            {ch.startPage && (
                              <span className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-400 flex-shrink-0">
                                p.{ch.startPage}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {ch.keyConcepts?.length || 0} concepts
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>


          {/* Right side - AI Tutor Chat */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <AnimatePresence mode="wait">
              {textbook ? (
                <motion.div 
                  key="chat"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="h-[600px] lg:h-[700px]"
                >
                  <AITutorChat
                    textbook={textbook}
                    chapterId={activeChapter}
                    language={language}
                    onClose={handleBackToLibrary}
                  />
                </motion.div>
              ) : (
                <motion.div 
                  key="welcome"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="card p-8 text-center"
                >
                  <div className="text-6xl mb-4">🤖</div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2">
                    Welcome to AI Tutor!
                  </h2>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    Upload your textbook PDF and I'll transcribe it chapter by chapter.
                    Then you can ask me questions, get explanations with textbook references,
                    and take adaptive quizzes that identify your misunderstanding types.
                  </p>
                  <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
                    <div className="bg-violet-50 rounded-xl p-3">
                      <div className="text-2xl mb-1">📤</div>
                      <p className="text-xs text-gray-600">Upload PDF</p>
                    </div>
                    <div className="bg-violet-50 rounded-xl p-3">
                      <div className="text-2xl mb-1">🧠</div>
                      <p className="text-xs text-gray-600">AI Transcribes</p>
                    </div>
                    <div className="bg-violet-50 rounded-xl p-3">
                      <div className="text-2xl mb-1">💬</div>
                      <p className="text-xs text-gray-600">Ask & Learn</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowUploader(true)}
                    className="btn-primary mt-6"
                  >
                    📤 Upload Your First Textbook
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
