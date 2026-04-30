// Path: frontend/src/components/pipeline/TextbookUploader.jsx
/**
 * Textbook Uploader Component
 * 
 * Allows users to upload entire textbook PDFs.
 * The AI transcribes it chapter-wise and makes it available for Q&A and quizzes.
 * This replaces the old generate.py pipeline approach.
 */

import React, { useState, useRef } from 'react';
import { processTextbookUpload } from '../../services/aiTutor.js';
import AutoTranslate from '../common/AutoTranslate.jsx';

export default function TextbookUploader({ onTextbookProcessed }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState(null);
  const [largePdf, setLargePdf] = useState(null); // { numPages, maxPages }
  const [dragOver, setDragOver] = useState(false);
  const [subject, setSubject] = useState('Mathematics');
  const [grade, setGrade] = useState('7');
  const fileInputRef = useRef(null);

  const subjects = [
    'Mathematics',
    'Science',
    'English',
    'Social Studies',
    'Hindi',
    'Kannada',
    'Sanskrit',
  ];

  const grades = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

  const MAX_PAGES = 60;

  /**
   * Count PDF pages client-side by reading raw file bytes.
   * PDFs store total page count in a /Count N entry inside the page tree.
   * This is instant and costs zero API tokens.
   */
  const countPdfPages = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = new TextDecoder('latin1').decode(e.target.result);
        // PDF page trees store total page count as /Count <number>
        const matches = [...text.matchAll(/\/Count\s+(\d+)/g)];
        if (matches.length === 0) { resolve(null); return; }
        // The largest /Count value is the root page count
        const counts = matches.map(m => parseInt(m[1], 10));
        resolve(Math.max(...counts));
      } catch {
        resolve(null); // can't determine — let backend decide
      }
    };
    reader.onerror = () => resolve(null);
    // Only read first 200KB — the page tree is always near the start
    reader.readAsArrayBuffer(file.slice(0, 200 * 1024));
  });

  const handleFileSelect = async (file) => {
    if (!file) return;
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file.');
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError('File is too large. Maximum size is 50MB.');
      return;
    }

    // ── Client-side page count check (NO API calls, NO upload) ──
    setError(null);
    setLargePdf(null);
    setProgressMessage('🔍 Checking PDF size...');

    const numPages = await countPdfPages(file);
    if (numPages !== null && numPages > MAX_PAGES) {
      setProgressMessage('');
      setLargePdf({ numPages, maxPages: MAX_PAGES });
      return; // Stop here — don't upload, don't call Groq
    }

    setProgressMessage('');
    setUploading(true);
    setProgress(0);

    try {
      const textbook = await processTextbookUpload(
        file,
        subject,
        parseInt(grade),
        (pct, msg) => {
          setProgress(pct);
          if (msg) setProgressMessage(msg);
        }
      );

      setUploading(false);
      setProgress(100);
      setProgressMessage('✅ Textbook processed successfully!');

      // Notify parent
      if (onTextbookProcessed) {
        onTextbookProcessed(textbook);
      }
    } catch (err) {
      setUploading(false);
      setProgressMessage('');
      // Backend may also reject if page count check missed something
      if (err.errorCode === 'pdf_too_large') {
        setLargePdf({ numPages: err.numPages, maxPages: err.maxPages });
      } else {
        setError(err.message || 'Failed to process textbook. Please try again.');
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">📤</div>
        <div>
          <AutoTranslate as="h2" className="font-bold text-gray-800">Upload Textbook</AutoTranslate>
          <AutoTranslate as="p" className="text-sm text-gray-500">
            Upload a PDF textbook and AI will transcribe it chapter by chapter
          </AutoTranslate>
        </div>
      </div>

      {/* Subject & Grade selection */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <AutoTranslate as="label" className="block text-xs font-medium text-gray-600 mb-1">Subject</AutoTranslate>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="input-field text-sm"
            disabled={uploading}
          >
            {subjects.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <AutoTranslate as="label" className="block text-xs font-medium text-gray-600 mb-1">Grade</AutoTranslate>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="input-field text-sm"
            disabled={uploading}
          >
            {grades.map(g => (
              <option key={g} value={g}>Grade {g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-violet-500 bg-violet-50'
            : uploading
            ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-violet-400 hover:bg-violet-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={(e) => handleFileSelect(e.target.files[0])}
          className="hidden"
          disabled={uploading}
        />

        {uploading ? (
          <div className="space-y-3">
            <div className="text-4xl animate-bounce">⚙️</div>
            <AutoTranslate as="p" className="text-sm font-medium text-gray-700">
              {progressMessage || 'Processing textbook...'}
            </AutoTranslate>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-violet-600 rounded-full h-2.5 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400"><AutoTranslate>{progress}% complete</AutoTranslate></p>
            <AutoTranslate as="p" className="text-xs text-gray-400 mt-2">
              This may take a few seconds while the AI reads and organises each chapter.
            </AutoTranslate>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-5xl mb-2">📄</div>
            <AutoTranslate as="p" className="text-sm font-medium text-gray-700">
              Drop your textbook PDF here
            </AutoTranslate>
            <AutoTranslate as="p" className="text-xs text-gray-400">
              or click to browse files (max 50MB)
            </AutoTranslate>
            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-violet-400 font-semibold bg-violet-50 px-3 py-1 rounded-full w-max mx-auto">
              <span>📚 All subjects supported</span>
            </div>
          </div>
        )}
      </div>

      {/* PDF too large — split helper */}
      {largePdf && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm font-bold text-amber-800 mb-1">
                PDF is too large ({largePdf.numPages} pages)
              </p>
              <AutoTranslate as="p" className="text-xs text-amber-700 mb-3 leading-relaxed">
                Our AI works best with up to {largePdf.maxPages} pages. Please split your PDF by chapter using one of these free tools, then upload each chapter separately.
              </AutoTranslate>
              <div className="grid grid-cols-1 gap-2">
                <a
                  href="https://www.ilovepdf.com/split_pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-semibold text-amber-800 hover:bg-amber-50 transition-all shadow-sm"
                >
                  <span className="text-lg">🔪</span>
                  <div>
                    <div>iLovePDF — Split PDF</div>
                    <div className="font-normal text-amber-600">Free • No sign-up needed</div>
                  </div>
                </a>
                <a
                  href="https://smallpdf.com/split-pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-semibold text-amber-800 hover:bg-amber-50 transition-all shadow-sm"
                >
                  <span className="text-lg">✂️</span>
                  <div>
                    <div>Smallpdf — Split PDF</div>
                    <div className="font-normal text-amber-600">Free online tool</div>
                  </div>
                </a>
                <a
                  href="https://www.sejda.com/split-pdf-by-pages"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-semibold text-amber-800 hover:bg-amber-50 transition-all shadow-sm"
                >
                  <span className="text-lg">📑</span>
                  <div>
                    <div>Sejda — Split by page range</div>
                    <div className="font-normal text-amber-600">Split by exact page numbers</div>
                  </div>
                </a>
              </div>
              <button
                onClick={() => setLargePdf(null)}
                className="mt-3 text-xs text-amber-600 hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-sm text-red-700 flex items-center gap-2">
            <span>❌</span>
            <span>{error}</span>
          </p>
        </div>
      )}

      {/* Success message */}
      {progress === 100 && !uploading && !error && (
        <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <p className="text-sm text-emerald-700 flex items-center gap-2">
            <span>✅</span>
            <AutoTranslate as="span">Textbook processed! You can now ask questions and take quizzes.</AutoTranslate>
          </p>
        </div>
      )}

      {/* Help links */}
      <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-xs font-bold text-blue-800 mb-2 uppercase tracking-wider">
          <AutoTranslate>Need Karnataka Textbooks?</AutoTranslate>
        </p>
        <div className="flex flex-col gap-2">
          <a 
            href="https://pue.karnataka.gov.in/167/TEXT%20BOOKS/en" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline flex items-center gap-2"
          >
            🔗 <AutoTranslate>PUE Karnataka Textbooks</AutoTranslate>
          </a>
          <a 
            href="https://textbooks.karnataka.gov.in/textbooks/en" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline flex items-center gap-2"
          >
            🔗 <AutoTranslate>KTBS Karnataka Textbooks</AutoTranslate>
          </a>
        </div>
      </div>

      {/* Info footer */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <span>🤖</span>
          <AutoTranslate as="span">
            Powered by Groq AI (llama-3.3-70b). Your textbook is processed in real-time.
            No data is stored permanently on servers.
          </AutoTranslate>
        </p>
      </div>
    </div>
  );
}
