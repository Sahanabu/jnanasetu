// Path: frontend/src/services/aiTutor.js
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

function getApiKey() {
  const key = import.meta.env.VITE_GROQ_API_KEY;
  if (!key) throw new Error('VITE_GROQ_API_KEY not configured in frontend/.env');
  return key;
}

async function callGroq(messages, { temperature = 0.3, maxTokens = 1000, timeout = 30000, model = 'llama-3.3-70b-versatile' } = {}) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
      signal: controller.signal,
    });
    clearTimeout(tid);

    // Retry once on 429 after the suggested wait
    if (res.status === 429) {
      const body = await res.json().catch(() => ({}));
      const waitMs = (() => {
        const msg = body?.error?.message || '';
        const m = msg.match(/(\d+(\.\d+)?)s/);
        return m ? Math.ceil(parseFloat(m[1])) * 1000 + 500 : 25000;
      })();
      console.warn(`[Groq] 429 — retrying after ${waitMs}ms`);
      await new Promise(r => setTimeout(r, waitMs));
      return callGroq(messages, { temperature, maxTokens, timeout, model });
    }

    if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty Groq response');
    return content;
  } catch (err) {
    clearTimeout(tid);
    if (err.name === 'AbortError') throw new Error('Groq request timed out');
    throw err;
  }
}

function extractJSON(text) {
  // Try array first (for question generation responses)
  const arrMatch = text.match(/\[[\s\S]*\]/);
  const objMatch = text.match(/\{[\s\S]*\}/);
  // Pick whichever appears first in the text
  const arrIdx = arrMatch ? text.indexOf(arrMatch[0]) : Infinity;
  const objIdx = objMatch ? text.indexOf(objMatch[0]) : Infinity;
  const match = arrIdx < objIdx ? arrMatch : objMatch;
  if (!match) throw new Error('No JSON in response');
  return JSON.parse(match[0]);
}

// ── Chapter context builder ────────────────────────────────────────────────────
// Works with the normalized schema: { chapterName, keyConcepts[] }
function buildChapterContext(chapters = []) {
  return chapters
    .slice(0, 3)
    .map(ch => `Chapter: ${ch.chapterName}\nConcepts: ${(ch.keyConcepts || []).join(', ')}`)
    .join('\n\n');
}

function findRelevantChapters(question, chapters = []) {
  const kw = question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  return chapters
    .map(ch => {
      const hay = [ch.chapterName, ...(ch.keyConcepts || [])].join(' ').toLowerCase();
      const score = kw.reduce((s, w) => s + (hay.includes(w) ? w.length : 0), 0);
      return { ...ch, score };
    })
    .filter(ch => ch.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// ── 1. Upload ──────────────────────────────────────────────────────────────────
export async function processTextbookUpload(pdfFile, subject, grade, onProgress) {
  onProgress?.(5, 'Uploading PDF...');
  const form = new FormData();
  form.append('pdf', pdfFile);
  form.append('subject', subject);
  form.append('grade', String(grade));

  onProgress?.(15, 'Extracting chapters...');
  const res = await fetch(`${BACKEND_URL}/api/extract-text`, { method: 'POST', body: form });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (err.error === 'pdf_too_large') {
      const e = new Error(err.message);
      e.errorCode = 'pdf_too_large';
      e.numPages = err.numPages;
      e.maxPages = err.maxPages;
      throw e;
    }
    throw new Error(err.message || `Server error: ${res.statusText}`);
  }

  onProgress?.(80, 'Finalizing...');
  const textbook = await res.json();
  onProgress?.(100, '✅ Textbook ready!');
  return { ...textbook, id: textbook.id || `textbook_${Date.now()}`, fileName: pdfFile.name };
}

// ── 2. Q&A ────────────────────────────────────────────────────────────────────
export async function askTextbookQuestion(question, textbook, chapterId, options = {}) {
  const { language = 'en', history = [] } = options;

  let relevant = chapterId && chapterId !== 'all'
    ? (textbook.chapters || []).filter(ch => ch.chapterId === chapterId)
    : findRelevantChapters(question, textbook.chapters);

  if (relevant.length === 0) relevant = (textbook.chapters || []).slice(0, 3);

  const context = buildChapterContext(relevant);
  const historyStr = history.slice(-4)
    .map(h => `Q: ${h.question}\nA: ${h.answer}`)
    .join('\n\n');

  const langNote = language !== 'en'
    ? `IMPORTANT: Reply entirely in ${({ hi: 'Hindi', kn: 'Kannada', te: 'Telugu', ta: 'Tamil' }[language] || language)}.`
    : '';

  const prompt = `You are a K-12 tutor for Indian students (Grade ${textbook.grade}, ${textbook.subject}).
${langNote}
Answer using ONLY the textbook content below. If the answer is not there, say so.
Return ONLY valid JSON: {"answer":"...","textbookReferences":[{"chapter":"...","section":"..."}],"followUpQuestion":"...or null"}

Textbook content:
${context}

${historyStr ? `Recent conversation:\n${historyStr}\n` : ''}
Student question: ${question}`;

  try {
    const raw = await callGroq(
      [{ role: 'user', content: prompt }],
      { temperature: 0.3, maxTokens: 800, timeout: 30000 }
    );
    const result = extractJSON(raw);
    return {
      answer: result.answer || 'Could not generate an answer.',
      textbookReferences: result.textbookReferences || [],
      followUpQuestion: result.followUpQuestion || null,
      question,
      chapterId: relevant[0]?.chapterId || null,
      chapterName: relevant[0]?.chapterName || null,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[aiTutor] askTextbookQuestion failed:', err);
    return {
      answer: "I'm having trouble right now. Please try again.",
      textbookReferences: [],
      followUpQuestion: null,
      question,
      timestamp: new Date().toISOString(),
    };
  }
}

// ── 3. Adaptive quiz ──────────────────────────────────────────────────────────
export async function generateAdaptiveQuiz(textbook, chapterId, studentState = {}) {
  const { previousAnswers = [], lastGapType = null, difficulty = 3, language = 'en' } = studentState;

  const chapter = (textbook.chapters || []).find(ch =>
    ch.chapterId === chapterId || ch.chapterName?.toLowerCase().includes((chapterId || '').toLowerCase())
  ) || textbook.chapters?.[0];

  if (!chapter) throw new Error('Chapter not found');

  const langNote = language !== 'en'
    ? `IMPORTANT: Write the question and explanation in ${({ hi: 'Hindi', kn: 'Kannada', te: 'Telugu', ta: 'Tamil' }[language] || language)}.`
    : '';

  const recentErrors = previousAnswers.slice(-3)
    .filter(a => !a.isCorrect)
    .map(a => `Wrong: "${a.studentAnswer}" for "${a.question}"`)
    .join('\n');

  const prompt = `You are a K-12 quiz generator for Indian students.
${langNote}
Generate ONE question from this chapter. Difficulty: ${difficulty}/5.
${lastGapType ? `Target gap type: ${lastGapType}.` : ''}
${recentErrors ? `Recent errors to address:\n${recentErrors}` : ''}

Chapter: ${chapter.chapterName}
Concepts: ${(chapter.keyConcepts || []).join(', ')}

Return ONLY valid JSON:
{
  "questionId": "q-${Date.now()}",
  "question": "...",
  "correctAnswer": "...",
  "explanation": "...",
  "concept": "...",
  "difficulty": ${difficulty},
  "chapterReference": {"chapterName": "${chapter.chapterName}", "section": "..."},
  "misconceptions": [
    {
      "gapType": "conceptual",
      "studentAnswer": "...",
      "reason": "...",
      "hint": "...",
      "story": {"steps": ["...","...","..."], "moral": "..."}
    }
  ]
}`;

  try {
    const raw = await callGroq(
      [{ role: 'user', content: prompt }],
      { temperature: 0.4, maxTokens: 800, timeout: 25000 }
    );
    const result = extractJSON(raw);
    return {
      ...result,
      chapterId: chapter.chapterId,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[aiTutor] generateAdaptiveQuiz failed:', err);
    return generateFallbackQuiz(chapter, textbook);
  }
}

function generateFallbackQuiz(chapter, textbook) {
  const concept = chapter.keyConcepts?.[0] || 'the main topic';
  return {
    questionId: `fallback-${Date.now()}`,
    question: `What is the main idea of "${concept}" in ${chapter.chapterName}?`,
    correctAnswer: `${concept} is a key concept in ${chapter.chapterName}.`,
    explanation: `This chapter covers: ${(chapter.keyConcepts || []).join(', ')}.`,
    concept,
    difficulty: 2,
    chapterReference: { chapterName: chapter.chapterName, section: 'Key Concepts' },
    misconceptions: [{
      gapType: 'unknown',
      studentAnswer: "I don't know",
      reason: 'Student may need to review the chapter',
      hint: 'Can you recall any key terms from this chapter?',
      story: { steps: ['Review the chapter.', 'Identify key terms.', 'Connect ideas.'], moral: 'Regular review helps.' },
    }],
    chapterId: chapter.chapterId,
    generatedAt: new Date().toISOString(),
  };
}

// ── 4. Misconception analysis ─────────────────────────────────────────────────
export async function analyzeMisconception({ question, correctAnswer, studentAnswer, concept, textbook, chapterId }) {
  const chapter = (textbook?.chapters || []).find(ch =>
    ch.chapterId === chapterId || ch.chapterName?.toLowerCase().includes((chapterId || '').toLowerCase())
  );

  const context = chapter
    ? `Chapter: ${chapter.chapterName}\nConcepts: ${(chapter.keyConcepts || []).join(', ')}`
    : '';

  const prompt = `Classify this student mistake as: conceptual | procedural | careless | unknown.
If the answer is correct, return gapType: null.
Return ONLY valid JSON: {"gapType":"...or null","confidence":0.8,"reasoning":"one sentence","hint":"one Socratic question or null"}

${context}
Concept: ${concept}
Question: ${question}
Correct answer: ${correctAnswer}
Student answer: ${studentAnswer}`;

  try {
    const raw = await callGroq(
      [{ role: 'user', content: prompt }],
      { temperature: 0.1, maxTokens: 200, timeout: 10000 }
    );
    const result = extractJSON(raw);
    if (result.gapType !== null && !['conceptual', 'procedural', 'careless', 'unknown'].includes(result.gapType)) {
      result.gapType = 'unknown';
    }
    return {
      gapType: result.gapType ?? null,
      confidence: Math.min(1, Math.max(0, result.confidence || 0.5)),
      reasoning: result.reasoning || '',
      hint: result.hint || null,
      isOnline: true,
    };
  } catch (err) {
    console.error('[aiTutor] analyzeMisconception failed:', err);
    return { gapType: 'unknown', confidence: 0.5, reasoning: 'Analysis unavailable.', hint: null, isOnline: false };
  }
}

// ── 5. Tutoring interaction router ────────────────────────────────────────────
export async function handleTutoringInteraction(input, textbook, currentChapterId, sessionState = {}) {
  const { history = [], mode = 'qa', lastGapType = null, difficulty = 3, language = 'en' } = sessionState;

  if (mode === 'quiz') {
    const quiz = await generateAdaptiveQuiz(textbook, currentChapterId, {
      previousAnswers: history.filter(h => h.type === 'answer'),
      lastGapType,
      difficulty,
      language,
    });
    return { type: 'quiz', content: quiz, timestamp: new Date().toISOString() };
  }

  const answer = await askTextbookQuestion(input, textbook, currentChapterId, {
    language,
    history: history.filter(h => h.type === 'qa').map(h => ({ question: h.question, answer: h.answer })),
  });
  return { type: 'answer', content: answer, timestamp: new Date().toISOString() };
}

// ── 6. Offline module question generator ───────────────────────────────────────────
/**
 * Generate 5 questions with misconceptions for a chapter.
 * Output matches fractions.json schema so LearningLoop works offline.
 */
export async function generateQuestionsForChapter(chapter, subject, grade) {
  const concepts = (chapter.keyConcepts || []).slice(0, 4).join(', ') || chapter.chapterName;

  const prompt = `Generate 3 quiz questions for Grade ${grade} ${subject} students.
Chapter: ${chapter.chapterName}
Concepts: ${concepts}

Each question needs 2 misconceptions. Use Indian context (roti, cricket, etc.).
Return ONLY a JSON array — no markdown, no explanation:
[
  {
    "id": "q1",
    "question": "...",
    "correctAnswer": "...",
    "explanation": "...",
    "concept": "...",
    "difficulty": "medium",
    "misconceptions": [
      {
        "id": "q1-m1",
        "studentAnswer": "...",
        "gapType": "conceptual",
        "reason": "...",
        "confidence": 0.8,
        "story": {
          "template": "sharing",
          "entities": {"item": "roti", "people": 2, "container": "plate"},
          "steps": ["step1", "step2", "step3"],
          "highlight": "key_concept",
          "moral": "..."
        }
      }
    ]
  }
]`;

  try {
    const raw = await callGroq(
      [{ role: 'user', content: prompt }],
      { temperature: 0.4, maxTokens: 4000, timeout: 60000, model: 'llama-3.3-70b-versatile' }
    );
    const result = extractJSON(raw);
    if (!Array.isArray(result) || result.length === 0) throw new Error('Empty or invalid array');
    return result.map((q, i) => ({
      ...q,
      id: `${chapter.chapterId}-q${i + 1}`,
      misconceptions: (q.misconceptions || []).map((m, j) => ({
        ...m,
        id: `${chapter.chapterId}-q${i + 1}-m${j + 1}`,
      })),
    }));
  } catch (err) {
    console.error('[aiTutor] generateQuestionsForChapter failed:', err);
    return (chapter.keyConcepts || [chapter.chapterName]).slice(0, 3).map((concept, i) => ({
      id: `${chapter.chapterId}-q${i + 1}`,
      question: `What is "${concept}" in the context of ${chapter.chapterName}?`,
      correctAnswer: `${concept} is a key concept in ${chapter.chapterName}.`,
      explanation: `Review the section on ${concept} in ${chapter.chapterName}.`,
      concept,
      difficulty: 'medium',
      misconceptions: [{
        id: `${chapter.chapterId}-q${i + 1}-m1`,
        studentAnswer: 'I am not sure',
        gapType: 'unknown',
        reason: 'Student may not have reviewed this concept.',
        confidence: 0.5,
        story: {
          template: 'flow',
          entities: { item: 'concept', people: 1, container: 'mind' },
          steps: [`Read about ${concept}.`, 'Connect it to what you know.', 'Try explaining it in your own words.'],
          highlight: 'review',
          moral: 'Understanding comes from connecting new ideas to familiar ones.',
        },
      }],
    }));
  }
}

export default { processTextbookUpload, askTextbookQuestion, generateAdaptiveQuiz, analyzeMisconception, handleTutoringInteraction, generateQuestionsForChapter };
