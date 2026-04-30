import React, { useContext } from 'react';
import { StudentContext } from '../../context/StudentContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getAvailableLanguages } from '../../i18n/index.js';

export default function LanguageSelector() {
  const { student, updateStudent } = useContext(StudentContext);
  const { updateProfile, isAuthenticated } = useAuth();
  const languages = getAvailableLanguages();

  const handleLanguageChange = async (e) => {
    const newLang = e.target.value;
    // Update local student context
    updateStudent({ language: newLang });
    
    // Update backend if authenticated
    if (isAuthenticated) {
      try {
        await updateProfile({ language: newLang });
      } catch (err) {
        console.error('Failed to sync language to profile', err);
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xl" title="Language">🌐</span>
      <select
        value={student?.language || 'en'}
        onChange={handleLanguageChange}
        className="text-sm border border-gray-200 bg-white text-gray-700 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none cursor-pointer hover:bg-gray-50 transition-colors"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName} ({lang.code.toUpperCase()})
          </option>
        ))}
      </select>
    </div>
  );
}
