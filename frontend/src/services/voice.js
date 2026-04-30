// Path: frontend/src/services/voice.js

/**
 * Voice services for TTS (Text-to-Speech) and STT (Speech-to-Text).
 * Works with Indian English, Hindi, and Kannada.
 */

const langMap = {
  en: 'en-IN',
  hi: 'hi-IN',
  kn: 'kn-IN',
  te: 'te-IN',
  ta: 'ta-IN',
};

/**
 * Read text aloud using the Web Speech API.
 * @param {string} text - The text to read aloud
 * @param {string} lang - Language code ('en', 'hi', 'kn', 'te', 'ta')
 * @returns {{ cancel: () => void }} - Control object with cancel function
 */
export function readAloud(text, lang = 'en') {
  const synth = window.speechSynthesis;
  if (!synth) {
    console.warn('Speech synthesis not supported in this browser.');
    return { cancel: () => {}, pause: () => {}, resume: () => {} };
  }

  // Cancel any ongoing speech
  synth.cancel();

  let cancelled = false;

  const speak = (textToSpeak) => {
    if (cancelled) return;
    
    // Ensure text is clean of markdown for better reading
    const cleanText = textToSpeak.replace(/[\*\#\_]/g, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = langMap[lang] || 'en-IN';
    utterance.rate = 0.95; 
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = synth.getVoices();
    const targetLang = langMap[lang] || 'en-IN';
    
    let matchingVoice = voices.find(v => v.lang === targetLang) || 
                        voices.find(v => v.lang.startsWith(lang));
    
    // If no regional voice, try to find an Indian English voice (en-IN)
    if (!matchingVoice) {
      matchingVoice = voices.find(v => v.lang === 'en-IN');
    }

    console.log(`[TTS] Speaking in ${lang}. Target: ${targetLang}. Match: ${matchingVoice?.name || 'none'}`);
    
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onerror = (e) => console.error('[TTS] Utterance error:', e);
    utterance.onstart = () => console.log('[TTS] Started speaking');
    utterance.onend = () => console.log('[TTS] Finished speaking');

    // PHONETIC FALLBACK: If we're using an English voice to read non-English script, it won't work well.
    // We'll ask Groq to transliterate to phonetic English if the voice is missing.
    const isEnglishVoice = !matchingVoice || matchingVoice.lang.startsWith('en');
    const isNonEnglishText = /[^\x00-\x7F]/.test(textToSpeak);

    if (isEnglishVoice && isNonEnglishText && lang !== 'en') {
      console.log(`[TTS] Voice missing for ${lang}. Attempting phonetic transliteration...`);
      transliterateText(textToSpeak, lang).then(phoneticText => {
        console.log(`[TTS] Phonetic transliteration: "${phoneticText.slice(0, 30)}..."`);
        const phoneticUtterance = new SpeechSynthesisUtterance(phoneticText);
        phoneticUtterance.lang = 'en-IN'; // Use Indian English voice for better phonetics
        phoneticUtterance.voice = matchingVoice;
        phoneticUtterance.rate = 0.9;
        synth.speak(phoneticUtterance);
      }).catch(() => {
        // Final fallback to original
        synth.speak(utterance);
      });
    } else {
      synth.speak(utterance);
    }
  };


  // If not English and text doesn't already contain non-ASCII characters (Hindi/Kannada script), translate
  const isNonEnglishScript = /[^\x00-\x7F]/.test(text);
  
  console.log(`[TTS] Input text: "${text.slice(0, 30)}...". Non-English script: ${isNonEnglishScript}`);

  if (lang !== 'en' && !isNonEnglishScript) {
    console.log(`[TTS] Translating to ${lang} before speaking...`);
    translateText(text, 'en', lang).then((translatedText) => {
      console.log(`[TTS] Translation successful: "${translatedText.slice(0, 30)}..."`);
      speak(translatedText);
    }).catch(err => {
      console.error('[TTS] Translation failed, falling back to original', err);
      speak(text);
    });
  } else {
    speak(text);
  }

  return {
    cancel: () => {
      cancelled = true;
      synth.cancel();
    },
    pause: () => synth.pause(),
    resume: () => synth.resume(),
  };
}

/**
 * Start speech recognition (listening).
 * @param {function} onResult - Callback with recognized text
 * @param {function} onError - Callback with error message
 * @returns {{ stop: () => void }} - Control object with stop function
 */
export function startListening(onResult, onError, lang = 'en') {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.warn('Speech recognition not supported in this browser.');
    onError?.('not_supported');
    return { stop: () => {} };
  }

  let stopped = false;
  let retried = false;

  function createRecognition() {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = langMap[lang] || 'en-IN';

    recognition.onresult = (event) => {
      stopped = true;
      onResult?.(event.results[0][0].transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      // Retry once on transient network errors
      if (event.error === 'network' && !retried && !stopped) {
        retried = true;
        console.warn('[STT] Network error — retrying once after 1s...');
        setTimeout(() => {
          if (!stopped) {
            try { createRecognition().start(); } catch (e) { onError?.('network'); }
          }
        }, 1000);
        return;
      }
      onError?.(event.error);
    };

    return recognition;
  }

  const recognition = createRecognition();

  try {
    recognition.start();
  } catch (error) {
    console.error('Failed to start speech recognition:', error);
    onError?.('start_failed');
  }

  return {
    stop: () => {
      stopped = true;
      try { recognition.stop(); } catch (e) { /* ignore */ }
    },
  };
}

/**
 * Translate text using AI4Bharat IndicTrans2 API or Groq fallback.
 * @param {string} text - Text to translate
 * @param {string} sourceLang - Source language code
 * @param {string} targetLang - Target language code
 * @returns {Promise<string>} - Translated text
 */
export async function translateText(text, sourceLang, targetLang) {
  // Try AI4Bharat API if key is configured
  const ai4bharatKey = import.meta.env.VITE_AI4BHARAT_KEY;
  if (ai4bharatKey) {
    try {
      const response = await fetch('https://api.ai4bharat.org/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ai4bharatKey}`,
        },
        body: JSON.stringify({
          text,
          source_language: sourceLang,
          target_language: targetLang,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.translated_text || data.translation || text;
      }
    } catch (error) {
      console.warn('AI4Bharat translation failed, trying fallback:', error);
    }
  }

  // Fallback: use Groq for translation
  const groqKey = import.meta.env.VITE_GROQ_API_KEY;
  if (groqKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `Translate the following text from ${sourceLang} to ${targetLang}. Return ONLY the translated text, no explanation.`,
            },
            { role: 'user', content: text },
          ],
          temperature: 0.3,
          max_tokens: 500,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const translated = data.choices?.[0]?.message?.content;
        if (translated) {
          return translated.trim();
        }
      }
    } catch (error) {
      console.warn('Groq translation fallback failed:', error);
    }
  }
  // Final fallback: return original text
  console.warn('Translation unavailable, returning original text');
  return text;
}

/**
 * Transliterate text to phonetic English using Groq.
 * Useful when local regional voices are missing.
 */
export async function transliterateText(text, targetLang) {
  const groqKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!groqKey) return text;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Transliterate the following ${targetLang} text into phonetic English (Latin script) so it can be read by an English speaker. Return ONLY the transliterated text.`,
          },
          { role: 'user', content: text },
        ],
        temperature: 0.2,
        max_tokens: 500,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content?.trim() || text;
    }
  } catch (error) {
    console.warn('Transliteration failed:', error);
  }
  return text;
}
