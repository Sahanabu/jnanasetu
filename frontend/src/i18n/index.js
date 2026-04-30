// Path: frontend/src/i18n/index.js
import { useContext } from 'react';
import { StudentContext } from '../context/StudentContext.jsx';
import en from './packs/en.json';
import hi from './packs/hi.json';
import kn from './packs/kn.json';

const packs = { en, hi, kn };

export function useTranslation() {
  const { student } = useContext(StudentContext);
  const language = student?.language || 'en';

  return (key) => {
    return packs[language]?.[key] ?? packs['en']?.[key] ?? key;
  };
}

export function getTranslation(language, key) {
  return packs[language]?.[key] ?? packs['en']?.[key] ?? key;
}

export function getAvailableLanguages() {
  return [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  ];
}

export default packs;
