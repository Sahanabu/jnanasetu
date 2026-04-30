// Path: frontend/src/components/pipeline/TextbookPortal.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const STATUS_MAP = {
  idle: { icon: '📋', label: 'Ready', color: 'text-gray-500' },
  downloading: { icon: '⬇️', label: 'Downloading...', color: 'text-blue-500' },
  downloaded: { icon: '✅', label: 'Downloaded', color: 'text-green-500' },
  processing: { icon: '⚙️', label: 'Processing...', color: 'text-amber-500' },
  processed: { icon: '🎉', label: 'Completed', color: 'text-emerald-500' },
  failed: { icon: '❌', label: 'Failed', color: 'text-red-500' },
};

export default function TextbookPortal() {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [statuses, setStatuses] = useState({});
  const pollingRef = useRef(null);

  // Fetch available PDFs on mount
  useEffect(() => {
    fetchPdfs();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const fetchPdfs = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/pdfs`);
      if (res.ok) {
        const data = await res.json();
        setPdfs(data);
      }
    } catch (err) {
      console.error('Failed to fetch PDFs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Poll status for a specific file
  const startPolling = useCallback((fileName) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/status/${encodeURIComponent(fileName)}`);
        if (res.ok) {
          const data = await res.json();
          setStatuses((prev) => ({
            ...prev,
            [fileName]: data.status,
          }));

          if (data.status === 'processed' || data.status === 'failed') {
            clearInterval(interval);
            pollingRef.current = null;
          }
        }
      } catch {
        // Ignore polling errors
      }
    }, 3000);

    pollingRef.current = interval;
  }, []);

  // Handle download
  const handleDownload = async (fileName) => {
    // Set status to downloading immediately
    setStatuses((prev) => ({ ...prev, [fileName]: 'downloading' }));

    try {
      // Track the download
      const res = await fetch(`${BACKEND_URL}/api/track-download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName }),
      });

      if (res.ok) {
        const data = await res.json();
        setStatuses((prev) => ({ ...prev, [fileName]: data.status }));
        startPolling(fileName);
      } else {
        const err = await res.json();
        console.error('Track download failed:', err);
        setStatuses((prev) => ({ ...prev, [fileName]: 'failed' }));
      }
    } catch (err) {
      console.error('Download error:', err);
      setStatuses((prev) => ({ ...prev, [fileName]: 'failed' }));
    }

    // Trigger PDF download via browser
    window.open(`${BACKEND_URL}/api/pdf/${fileName}`, '_blank');
  };

  // Filter PDFs by subject
  const subjects = ['all', ...new Set(pdfs.map((p) => p.subject))];
  const filteredPdfs =
    selectedSubject === 'all'
      ? pdfs
      : pdfs.filter((p) => p.subject === selectedSubject);

  // Group by subject for display
  const groupedBySubject = {};
  filteredPdfs.forEach((pdf) => {
    if (!groupedBySubject[pdf.subject]) {
      groupedBySubject[pdf.subject] = [];
    }
    groupedBySubject[pdf.subject].push(pdf);
  });

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">📚</div>
        <div>
          <h2 className="font-bold text-gray-800">JnanaSetu Textbook Library</h2>
          <p className="text-sm text-gray-500">
            Download and process textbooks for AI-powered learning modules
          </p>
        </div>
      </div>

      {/* Subject filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Filter by Subject
        </label>
        <div className="flex gap-2 flex-wrap">
          {subjects.map((subject) => (
            <button
              key={subject}
              onClick={() => setSelectedSubject(subject)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                selectedSubject === subject
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-violet-300'
              }`}
            >
              {subject === 'all' ? 'All Subjects' : subject}
            </button>
          ))}
        </div>
      </div>

      {/* PDF list grouped by subject */}
      {Object.entries(groupedBySubject).length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">📭</div>
          <p className="text-sm">No textbooks available yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            Place PDF files in <code className="bg-gray-100 px-1 rounded">backend/data/pdfs/</code>
          </p>
        </div>
      ) : (
        Object.entries(groupedBySubject).map(([subject, subjectPdfs]) => (
          <div key={subject} className="mb-6 last:mb-0">
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span>{subject === 'Mathematics' ? '📐' : '🔬'}</span>
              <span>{subject}</span>
              <span className="text-xs text-gray-400 font-normal">
                ({subjectPdfs.length} chapters)
              </span>
            </h3>

            <div className="space-y-2">
              {subjectPdfs.map((pdf) => {
                const status = statuses[pdf.fileName] || 'idle';
                const statusInfo = STATUS_MAP[status] || STATUS_MAP.idle;

                return (
                  <div
                    key={pdf.fileName}
                    className={`border rounded-lg p-3 transition-all ${
                      !pdf.exists
                        ? 'bg-gray-50 border-gray-200 opacity-60'
                        : 'bg-white border-gray-200 hover:border-violet-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {pdf.label}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Grade {pdf.grade} · Chapter: {pdf.chapter}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 ml-3">
                        {/* Status indicator */}
                        <span className={`text-xs ${statusInfo.color} flex items-center gap-1`}>
                          {status === 'processing' && (
                            <span className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin inline-block" />
                          )}
                          {statusInfo.icon}
                          <span className="hidden sm:inline">{statusInfo.label}</span>
                        </span>

                        {/* Download button */}
                        {pdf.exists && status !== 'processing' && status !== 'processed' && (
                          <button
                            onClick={() => handleDownload(pdf.fileName)}
                            disabled={status === 'downloading'}
                            className="px-3 py-1.5 text-xs font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                          >
                            {status === 'downloading' ? (
                              <>
                                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Opening...</span>
                              </>
                            ) : (
                              <>
                                <span>⬇️</span>
                                <span>Download</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* Processed badge */}
                        {status === 'processed' && (
                          <span className="px-3 py-1.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-lg">
                            ✅ Ready
                          </span>
                        )}

                        {/* Missing badge */}
                        {!pdf.exists && (
                          <span className="px-3 py-1.5 text-xs font-medium bg-gray-200 text-gray-500 rounded-lg">
                            📄 Place PDF
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Error message */}
                    {status === 'failed' && (
                      <p className="text-xs text-red-500 mt-2">
                        Processing failed. The PDF may still be available for download.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Info footer */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <span>💡</span>
          <span>
            PDFs are served directly from the server. No external websites required.
            Works fully offline after PDFs are stored.
          </span>
        </p>
      </div>
    </div>
  );
}
