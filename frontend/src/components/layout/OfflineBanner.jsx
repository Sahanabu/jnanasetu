// Path: frontend/src/components/layout/OfflineBanner.jsx
import React, { useState, useEffect } from 'react';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      // Auto-hide after 3 seconds
      setTimeout(() => {}, 3000);
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium shadow-lg animate-slideDown">
      <div className="flex items-center justify-center gap-2">
        <span className="text-lg">📡</span>
        <span>You are offline — some features may be limited</span>
      </div>
    </div>
  );
}
