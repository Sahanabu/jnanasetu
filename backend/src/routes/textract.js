// Path: backend/src/routes/textract.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) =>
      cb(null, `upload_${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`),
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf'))
      cb(null, true);
    else cb(new Error('Only PDF files are allowed'), false);
  },
});

const MAX_PDF_PAGES = 60;

async function extractPdfText(filePath) {
  const pdfParseModule = require('pdf-parse');
  const pdfParse = typeof pdfParseModule === 'function' ? pdfParseModule : pdfParseModule.default;
  if (typeof pdfParse !== 'function') throw new Error('pdf-parse is not callable');
  const data = await pdfParse(fs.readFileSync(filePath));
  if (!data.text || data.text.trim().length < 50)
    throw new Error('Could not extract sufficient text. The PDF may be scanned/image-based.');
  console.log(`[Textract] Extracted ${data.text.length} chars from ${data.numpages} pages`);
  return { text: data.text, numPages: data.numpages };
}

async function runPythonExtractor(filePath) {
  const { exec } = require('child_process');
  const scriptPath = path.resolve(__dirname, '../scripts/extract_chapters.py');
  const absPdfPath = path.resolve(filePath);

  if (!fs.existsSync(absPdfPath)) throw new Error(`PDF not found: ${absPdfPath}`);

  return new Promise((resolve) => {
    const cmd = `python "${scriptPath}" "${absPdfPath}"`;
    const env = { ...process.env, GROQ_API_KEY: process.env.GROQ_API_KEY || '' };
    console.log(`[Textract] Running: ${cmd}`);

    // Font-size extraction: instant, no API calls needed
    exec(cmd, { env, timeout: 30000, maxBuffer: 5 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (stderr) console.warn(`[Python]: ${stderr}`);
      try {
        const data = JSON.parse(stdout.trim());
        if (data.error) { console.error(`[Python Error]: ${data.error}`); return resolve([]); }
        if (!Array.isArray(data)) { console.warn('[Textract] Non-array from Python'); return resolve([]); }
        console.log(`[Textract] Python found ${data.length} chapters`);
        resolve(data);
      } catch (e) {
        console.error(`[Textract] JSON parse failed: ${stdout.slice(0, 200)}`);
        resolve([]);
      }
    });
  });
}

/**
 * Normalize Python extractor output → unified chapter schema used by aiTutor.js
 * Python returns: { chapter: string, concepts: string[], conceptCount: number }
 * We produce:     { chapterId, chapterNumber, chapterName, keyConcepts, ... }
 */
function normalizeChapters(pythonChapters) {
  return pythonChapters.map((ch, idx) => ({
    chapterId: `ch-${idx + 1}`,
    chapterNumber: idx + 1,
    chapterName: ch.chapter || `Chapter ${idx + 1}`,
    keyConcepts: ch.concepts || [],
    conceptCount: ch.conceptCount || 0,
    definitions: [],
    formulas: [],
    practiceExercises: [],
  }));
}

// POST /api/extract-text
router.post('/extract-text', upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });

  const filePath = req.file.path;
  const subject = req.body.subject || 'General';
  const grade = parseInt(req.body.grade) || 7;

  console.log(`[Textract] ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)} MB) | ${subject} Grade ${grade}`);

  try {
    // Step 1: Page count guard
    const { numPages } = await extractPdfText(filePath);
    if (numPages > MAX_PDF_PAGES) {
      try { fs.unlinkSync(filePath); } catch (_) {}
      return res.status(422).json({
        error: 'pdf_too_large', numPages, maxPages: MAX_PDF_PAGES,
        message: `PDF has ${numPages} pages, limit is ${MAX_PDF_PAGES}.`,
      });
    }

    // Step 2: Python hybrid extractor (rule-based + AI refinement)
    const pythonChapters = await runPythonExtractor(filePath);
    try { fs.unlinkSync(filePath); } catch (_) {}

    if (pythonChapters.length === 0) {
      return res.status(422).json({
        error: 'no_chapters',
        message: 'Could not detect any chapters. Check that the PDF has selectable text.',
      });
    }

    // Step 3: Normalize to unified schema
    const chapters = normalizeChapters(pythonChapters);

    res.json({
      id: `textbook_${Date.now()}`,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      subject,
      grade,
      chapters,
      totalChapters: chapters.length,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Textract] Error:', error);
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {}
    res.status(500).json({ error: 'Failed to process textbook', message: error.message });
  }
});

// GET /api/extract-status
router.get('/extract-status', (req, res) => {
  res.json({
    status: 'ok',
    uploadsDir: UPLOADS_DIR,
    maxFileSize: '50MB',
    groqConfigured: !!process.env.GROQ_API_KEY,
  });
});

module.exports = router;
