export const speak = (text: string, lang: string = 'de-DE') => {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    console.warn("Browser does not support speech synthesis");
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 1.0;

  // Ensure voices are loaded
  let voices = window.speechSynthesis.getVoices();

  const attemptSpeak = () => {
    voices = window.speechSynthesis.getVoices();
    // Try to find an exact match, then a partial match
    const voice = voices.find(v => v.lang === lang) || voices.find(v => v.lang.startsWith(lang.split('-')[0]));
    if (voice) {
      utterance.voice = voice;
    }
    window.speechSynthesis.speak(utterance);
  };

  if (voices.length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      attemptSpeak();
      // Remove listener to prevent multiple triggers
      window.speechSynthesis.onvoiceschanged = null;
    };
  } else {
    attemptSpeak();
  }
};
