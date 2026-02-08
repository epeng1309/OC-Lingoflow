import { GoogleGenerativeAI } from '@google/generative-ai';

// Fallback key provided by user
const FALLBACK_KEY = 'AIzaSyAYeFyJ1vcY7mChzwOzN9zIj73ArOfP3vc'.trim(); // Ensure no whitespace

// Prioritize Env key if valid, else use fallback
const ENV_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_KEY = ENV_KEY && ENV_KEY.length > 20 ? ENV_KEY : FALLBACK_KEY;

console.log('Gemini API Initialized. Key Length:', API_KEY?.length);

const genAI = new GoogleGenerativeAI(API_KEY);

export const getGeminiModel = (modelName = 'gemini-2.5-flash') => {
  return genAI.getGenerativeModel({
    model: modelName,
  });
};

const AI_TUTOR_SYSTEM_INSTRUCTION = `You are LingoFlow AI Tutor, a friendly and helpful language learning assistant.

IMPORTANT RESPONSE GUIDELINES:
1. Keep your FIRST response to any new topic BRIEF - around 200-300 words maximum.
2. Provide a concise overview or summary first. Do NOT give exhaustive details upfront.
3. End your brief responses by offering to elaborate: "Would you like me to go into more detail on any of these points?"
4. Only provide longer, detailed responses (up to 3000 words max) when the user explicitly asks for more details, elaboration, or a deeper explanation.
5. Your absolute maximum response length is 3000 words. Never exceed this limit.
6. Use clear structure with headers, bullet points, and numbered lists for readability.
7. Remember information the user shares (their native language, target language, level, goals) and reference it in future responses.

When asked for plans, roadmaps, or comprehensive guides:
- First give a HIGH-LEVEL OVERVIEW (5-7 key points, ~250 words)
- Offer to expand on specific sections if they want details
- Only dive deep when explicitly requested`;

export const getGeminiTutorModel = (modelName = 'gemini-2.5-flash') => {
  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: AI_TUTOR_SYSTEM_INSTRUCTION,
  });
};

export interface AIExample {
  sentence: string;
  translation: string;
}

export const generateExamples = async (word: string, fromLang: string, toLang: string): Promise<AIExample[]> => {
  const model = getGeminiModel();
  const prompt = `Generate 3 short, natural example sentences for the word "${word}" in ${fromLang}. 
  Provide the translation in ${toLang}. 
  Format the output as a JSON array of objects with keys "sentence" and "translation". 
  Only return the JSON.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanText = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error: any) {
    console.error('Gemini Error:', error);
    // Rethrow with more detail for the UI to catch
    throw new Error(error.message || 'Unknown AI Error');
  }
};

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export const generateQuiz = async (
  words: { original: string; translated: string }[],
  fromLang: string,
  toLang: string,
): Promise<QuizQuestion[]> => {
  const model = getGeminiModel();
  const wordList = words.map((w) => `${w.original} (${w.translated})`).join(', ');
  const prompt = `Create a 5-question multiple choice quiz to test these words: ${wordList}.
  The quiz should be in ${toLang}, asking for the meaning of ${fromLang} words or vice versa.
  Format the output as a JSON array of objects with keys: "question", "options" (array of 4 strings), "correctAnswer" (string), and "explanation".
  Only return the JSON.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanText = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error('Gemini Quiz Error:', error);
    return [];
  }
};

// Language code mapping for Google Translate CSV
const GOOGLE_TRANSLATE_LANG_MAP: Record<string, string> = {
  德文: 'DE',
  英文: 'EN',
  '中文 (繁體)': 'CN',
  '中文(繁體)': 'CN',
  '中文 (简体)': 'CN',
  '中文(简体)': 'CN',
  法文: 'FR',
  西班牙文: 'ES',
  日文: 'JP',
  韓文: 'KR',
  義大利文: 'IT',
  葡萄牙文: 'PT',
  俄文: 'RU',
  阿拉伯文: 'AR',
  偵測語言: 'AUTO', // Will need AI detection
  German: 'DE',
  English: 'EN',
  Chinese: 'CN',
  French: 'FR',
  Spanish: 'ES',
  Japanese: 'JP',
  Korean: 'KR',
  Italian: 'IT',
  Portuguese: 'PT',
  Russian: 'RU',
  Arabic: 'AR',
};

// Convert Google Translate language name to code
export const normalizeLanguageCode = (lang: string): string => {
  const trimmed = lang.trim();
  return GOOGLE_TRANSLATE_LANG_MAP[trimmed] || trimmed.substring(0, 2).toUpperCase();
};

// Detect language from text using simple heuristics first, then AI if needed
export const detectLanguageFromText = (text: string): string => {
  if (!text || text.trim().length === 0) return 'EN';

  const trimmed = text.trim();

  // Check for Chinese characters
  if (/[\u4e00-\u9fff]/.test(trimmed)) {
    return 'CN';
  }

  // Check for German-specific characters and patterns
  if (/[äöüßÄÖÜ]/.test(trimmed)) {
    return 'DE';
  }

  // Check for German common patterns (der, die, das, ein, eine, ist, und, nicht)
  if (
    /\b(der|die|das|ein|eine|ist|und|nicht|auf|für|mit|von|bei|nach|zu|aus|über|auch|nur|noch|wie|was|wenn|kann|muss|will|soll|hat|haben|sein|sind|wird|werden)\b/i.test(
      trimmed,
    )
  ) {
    return 'DE';
  }

  // Check for French patterns
  if (
    /[àâçéèêëïîôùûü]/.test(trimmed) ||
    /\b(le|la|les|un|une|des|est|sont|avec|pour|dans|sur|par|que|qui|ce|cette|ces)\b/i.test(trimmed)
  ) {
    return 'FR';
  }

  // Check for Spanish patterns
  if (
    /[ñáéíóú¿¡]/.test(trimmed) ||
    /\b(el|la|los|las|un|una|es|son|con|para|en|por|que|como|pero|muy|más)\b/i.test(trimmed)
  ) {
    return 'ES';
  }

  // Check for Japanese (Hiragana, Katakana)
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(trimmed)) {
    return 'JP';
  }

  // Check for Korean (Hangul)
  if (/[\uac00-\ud7af\u1100-\u11ff]/.test(trimmed)) {
    return 'KR';
  }

  // Default to English for Latin alphabet text
  return 'EN';
};

export interface LanguageDetectionResult {
  text: string;
  detectedLang: string;
}

// Batch detect languages using AI for more accuracy
export const detectLanguagesBatch = async (texts: string[]): Promise<LanguageDetectionResult[]> => {
  // First, use heuristics for obvious cases
  const results: LanguageDetectionResult[] = texts.map((text) => ({
    text,
    detectedLang: detectLanguageFromText(text),
  }));

  // Find texts that might need AI verification (those detected as EN but could be German)
  const ambiguousIndices: number[] = [];
  results.forEach((r, i) => {
    // If detected as EN but contains words that might be German
    if (r.detectedLang === 'EN' && /^[A-Za-z\s]+$/.test(r.text)) {
      // Could be German without umlauts - mark for AI check
      ambiguousIndices.push(i);
    }
  });

  // If there are ambiguous texts and not too many, use AI to verify
  if (ambiguousIndices.length > 0 && ambiguousIndices.length <= 50) {
    try {
      const model = getGeminiModel();
      const textsToCheck = ambiguousIndices.map((i) => results[i].text);

      const prompt = `Detect the language of each word/phrase. Return ONLY a JSON array of language codes.
Use these codes: DE (German), EN (English), FR (French), ES (Spanish), CN (Chinese), JP (Japanese), KR (Korean), IT (Italian), PT (Portuguese), RU (Russian).

Words to analyze:
${textsToCheck.map((t, i) => `${i + 1}. "${t}"`).join('\n')}

Return format: ["DE", "EN", "DE", ...] - one code per word in order.
Only return the JSON array, nothing else.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleanText = text.replace(/```json|```/g, '').trim();
      const detectedLangs: string[] = JSON.parse(cleanText);

      // Update results with AI detection
      ambiguousIndices.forEach((originalIndex, i) => {
        if (detectedLangs[i]) {
          results[originalIndex].detectedLang = detectedLangs[i].toUpperCase();
        }
      });
    } catch (error) {
      console.error('AI Language Detection Error:', error);
      // Keep heuristic results on error
    }
  }

  return results;
};

// Single text language detection with AI
export const detectLanguageAI = async (text: string): Promise<string> => {
  // First try heuristics
  const heuristicResult = detectLanguageFromText(text);

  // If confident (non-Latin or has special chars), return immediately
  if (heuristicResult !== 'EN' || /[^a-zA-Z\s\-']/.test(text)) {
    return heuristicResult;
  }

  // Use AI for ambiguous Latin-alphabet text
  try {
    const model = getGeminiModel();
    const prompt = `What language is this word or phrase? Reply with ONLY the 2-letter code: DE (German), EN (English), FR (French), ES (Spanish). 
Word: "${text}"
Reply with just the code, nothing else.`;

    const result = await model.generateContent(prompt);
    const code = result.response.text().trim().toUpperCase();

    // Validate the response
    if (['DE', 'EN', 'FR', 'ES', 'CN', 'JP', 'KR', 'IT', 'PT', 'RU'].includes(code)) {
      return code;
    }
  } catch (error) {
    console.error('AI Detection Error:', error);
  }

  return heuristicResult;
};
