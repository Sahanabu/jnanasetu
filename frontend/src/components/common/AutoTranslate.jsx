import React, { useState, useEffect, useContext, forwardRef } from 'react';
import { translateText } from '../../services/voice.js';
import { StudentContext } from '../../context/StudentContext.jsx';

// Simple in-memory cache to prevent duplicate translations during a session
const translationCache = new Map();

const AutoTranslate = forwardRef(function AutoTranslate({ children, as: Component = 'span', className = '', ...props }, ref) {
  const { student } = useContext(StudentContext);
  const lang = student?.language || 'en';
  
  // Extract text if children is a string or number
  const text = typeof children === 'string' || typeof children === 'number' 
    ? String(children) 
    : '';

  const [translatedText, setTranslatedText] = useState(text);
  const [translatedPlaceholder, setTranslatedPlaceholder] = useState(props.placeholder || '');
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    // If not a translatable string, or target is English, just return original
    if ((!text && !props.placeholder) || lang === 'en') {
      setTranslatedText(text);
      setTranslatedPlaceholder(props.placeholder || '');
      return;
    }

    let isMounted = true;
    setTranslating(true);

    const translate = async () => {
      try {
        // Translate text content
        if (text) {
          const cacheKey = `${lang}:${text}`;
          if (translationCache.has(cacheKey)) {
            if (isMounted) setTranslatedText(translationCache.get(cacheKey));
          } else {
            const result = await translateText(text, 'en', lang);
            if (isMounted) {
              setTranslatedText(result);
              translationCache.set(cacheKey, result);
            }
          }
        }

        // Translate placeholder
        if (props.placeholder) {
          const pCacheKey = `${lang}:p:${props.placeholder}`;
          if (translationCache.has(pCacheKey)) {
            if (isMounted) setTranslatedPlaceholder(translationCache.get(pCacheKey));
          } else {
            const result = await translateText(props.placeholder, 'en', lang);
            if (isMounted) {
              setTranslatedPlaceholder(result);
              translationCache.set(pCacheKey, result);
            }
          }
        }
      } catch (err) {
        console.warn('AutoTranslate failed:', err);
      } finally {
        if (isMounted) setTranslating(false);
      }
    };

    translate();

    return () => {
      isMounted = false;
    };
  }, [text, props.placeholder, lang]);

  const finalProps = {
    ...props,
    ref,
    placeholder: translatedPlaceholder,
    className: `${className} ${translating ? 'opacity-70 transition-opacity' : 'opacity-100 transition-opacity'}`
  };

  if (!text) {
    return <Component {...finalProps}>{children}</Component>;
  }

  return (
    <Component {...finalProps}>
      {translatedText}
    </Component>
  );
});

export default AutoTranslate;
