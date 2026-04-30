// Path: backend/src/routes/pipeline.js
/**
 * Pipeline Route — Now uses Groq AI instead of Python generate.py
 * 
 * When a user downloads/processes a PDF from the TextbookPortal,
 * this route now extracts text and sends it to Groq AI for processing,
 * instead of trying to run the old Python generate.py script.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Download = require('../models/Download');

// --- Configuration ---
const PDFS_DIR = path.resolve(__dirname, '../../data/pdfs');
const PIPELINE_DIR = path.resolve(__dirname, '../../pipeline');

// Ensure PDFs directory exists
if (!fs.existsSync(PDFS_DIR)) {
  fs.mkdirSync(PDFS_DIR, { recursive: true });
}

// --- Available PDFs catalog ---
const AVAILABLE_PDFS = [
  {
    fileName: 'maths7_ch2.pdf',
    label: 'Mathematics - Class 7, Chapter 2 (Fractions)',
    subject: 'Mathematics',
    grade: 7,
    chapter: 'Fractions',
  },
  {
    fileName: 'maths7_ch3.pdf',
    label: 'Mathematics - Class 7, Chapter 3 (Decimals)',
    subject: 'Mathematics',
    grade: 7,
    chapter: 'Decimals',
  },
  {
    fileName: 'science7_ch1.pdf',
    label: 'Science - Class 7, Chapter 1 (Nutrition in Plants)',
    subject: 'Science',
    grade: 7,
    chapter: 'Nutrition in Plants',
  },
  {
    fileName: 'science7_ch2.pdf',
    label: 'Science - Class 7, Chapter 2 (Nutrition in Animals)',
    subject: 'Science',
    grade: 7,
    chapter: 'Nutrition in Animals',
  },
];

/**
 * Extract text from PDF using available libraries
 */
async function extractPdfText(filePath) {
  try {
    const pdfParse = require('pdf-parse');
    const pdfBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(pdfBuffer);
    if (data.text && data.text.trim().length > 50) {
      return data.text;
    }
  } catch (e) {
    // Fall through
  }

  try {
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
    const pdfBuffer = fs.readFileSync(filePath);
    const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
    
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      pages.push(`--- Page ${i} ---\n${pageText}`);
    }
    const text = pages.join('\n\n');
    if (text.trim().length > 50) return text;
  } catch (e) {
    // Fall through
  }

  throw new Error('Could not extract text from PDF');
}

/**
 * Process PDF with Groq AI (replaces old Python generate.py)
 */
async function processWithGroqAI(pdfPath, fileName) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  console.log(`[Pipeline-Groq] Processing ${fileName} with Groq AI...`);
  
  // Extract text from PDF
  const text = await extractPdfText(pdfPath);
  console.log(`[Pipeline-Groq] Extracted ${text.length} characters from ${fileName}`);

  // Send to Groq AI for chapter-wise transcription
  const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
  
  const systemPrompt = `You are an expert K-12 textbook transcriber. Analyze the provided textbook text and organize it chapter by chapter.

For each chapter, extract:
1. Chapter name/number
2. Key concepts covered
3. Important definitions, formulas, and rules
4. Example problems with solutions
5. Practice exercises
6. Starting page number from the text

Also extract a "tableOfContents" array listing all chapters and their starting page numbers.

Return ONLY valid JSON. No markdown.

Schema:
{
  "tableOfContents": [
    { "chapterNumber": 1, "chapterName": "string", "startPage": 1 }
  ],
  "chapters": [
    {
      "chapterId": "ch1",
      "chapterName": "Chapter name",
      "chapterNumber": 1,
      "summary": "Brief summary",
      "startPage": 1,
      "keyConcepts": ["concept1", "concept2"],
      "definitions": [{ "term": "term", "definition": "definition" }],
      "formulas": [{ "name": "formula", "expression": "expression", "description": "when to use" }],
      "examples": [{ "problem": "problem", "solution": "solution", "explanation": "explanation" }],
      "practiceExercises": [{ "question": "question", "answer": "answer", "hint": "hint" }],
      "fullText": "Complete extracted text for this chapter"
    }
  ],
  "subject": "auto-detected",
  "grade": 7,
  "totalChapters": 0
}`;

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Textbook content:\n\n${text.slice(0, 15000)}\n\nExtract all chapters found. Return valid JSON.` },
      ],
      temperature: 0.2,
      max_tokens: 6000,
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from Groq AI');

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in Groq response');

  const result = JSON.parse(jsonMatch[0]);
  
  // Save the processed result to a JSON file
  const outputPath = path.join(PDFS_DIR, fileName.replace('.pdf', '.json'));
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  
  console.log(`[Pipeline-Groq] Saved processed result to ${outputPath}`);
  return result;
}

// --- Routes ---

/**
 * GET /api/pdfs
 * List all available PDFs with metadata.
 */
router.get('/pdfs', (req, res) => {
  const available = AVAILABLE_PDFS.map((pdf) => ({
    ...pdf,
    exists: fs.existsSync(path.join(PDFS_DIR, pdf.fileName)),
  }));
  res.json(available);
});

/**
 * GET /api/pdf/:filename
 * Serve a PDF file for download.
 */
router.get('/pdf/:filename', (req, res) => {
  const { filename } = req.params;
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const filePath = path.join(PDFS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'PDF not found', filename });
  }
  console.log(`[PDF] Serving: ${filename}`);
  res.download(filePath, filename);
});

/**
 * POST /api/track-download
 * Track a PDF download and process with Groq AI (replaces old Python pipeline).
 */
router.post('/track-download', async (req, res) => {
  try {
    const { fileName } = req.body;
    if (!fileName) return res.status(400).json({ error: 'fileName is required' });
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const pdfPath = path.join(PDFS_DIR, fileName);
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ error: 'PDF not found on server', fileName });
    }

    // Save download record
    const record = await Download.create({ fileName, status: 'downloaded' });
    console.log(`[Track] Download recorded: ${fileName} (id: ${record._id})`);

    // Update status to processing
    await Download.findOneAndUpdate({ _id: record._id }, { status: 'processing' });

    // Process with Groq AI asynchronously (replaces old Python pipeline)
    processWithGroqAI(pdfPath, fileName)
      .then(() => {
        Download.findOneAndUpdate({ _id: record._id }, { status: 'processed' })
          .catch(e => console.error('Failed to update status:', e));
      })
      .catch(async (error) => {
        console.error(`[Pipeline-Groq] Processing failed for ${fileName}:`, error.message);
        await Download.findOneAndUpdate(
          { _id: record._id },
          { status: 'failed', errorMessage: error.message }
        );
      });

    res.status(201).json({
      id: record._id,
      fileName,
      status: 'processing',
      message: 'Processing with Groq AI (replaces old Python pipeline).',
    });
  } catch (error) {
    console.error('Error tracking download:', error);
    res.status(500).json({ error: 'Failed to track download' });
  }
});

/**
 * GET /api/status/:fileName
 * Get the current status of a file processing request.
 */
router.get('/status/:fileName', async (req, res) => {
  try {
    const record = await Download.findOne(
      { fileName: req.params.fileName },
      {},
      { sort: { createdAt: -1 } }
    );
    if (!record) return res.status(404).json({ error: 'No record found for this file' });
    res.json({
      id: record._id,
      fileName: record.fileName,
      status: record.status,
      errorMessage: record.errorMessage,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching status:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

/**
 * GET /api/status
 * Get status for all tracked files.
 */
router.get('/status', async (req, res) => {
  try {
    const records = await Download.find().sort({ createdAt: -1 }).limit(50).lean();
    res.json(records);
  } catch (error) {
    console.error('Error fetching all statuses:', error);
    res.status(500).json({ error: 'Failed to fetch statuses' });
  }
});

module.exports = router;
