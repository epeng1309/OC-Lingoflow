import React, { useState, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Icon } from '../components/Icon';
import { speak } from '../utils/speech';
import { generateExamples, AIExample, normalizeLanguageCode } from '../utils/gemini';
import { LANG_CONFIG, getLangDetails } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

interface FlashcardSessionProps {}

export const FlashcardSession: React.FC<FlashcardSessionProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { deckId } = useParams<{ deckId: string }>();
  const { words, decks, logStudy, updateWord, addXp } = useStore();

  const deck = decks.find((d) => d.id === deckId);

  // Filter words if deckId is present, otherwise show all
  const sessionWords = useMemo(() => {
    return deckId ? words.filter((w) => w.deckId === deckId) : words;
  }, [words, deckId]);

  // Extract startWordId from URL query parameters
  const queryParams = new URLSearchParams(location.search);
  const startWordId = queryParams.get('startWordId');

  const [currentIndex, setCurrentIndex] = useState(() => {
    if (startWordId && sessionWords.length > 0) {
      const idx = sessionWords.findIndex((w) => w.id === startWordId);
      return idx !== -1 ? idx : 0;
    }
    return 0;
  });

  const [isFlipped, setIsFlipped] = useState(false);
  const [aiExamples, setAiExamples] = useState<AIExample[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  // Ensure index is updated if words load late or URL ID is provided
  React.useEffect(() => {
    if (startWordId && sessionWords.length > 0) {
      const idx = sessionWords.findIndex((w) => w.id === startWordId);
      if (idx !== -1 && currentIndex === 0 && sessionCount === 0) {
        setCurrentIndex(idx);
      }
    }
  }, [sessionWords, startWordId, sessionCount]);

  const currentWord = sessionWords[currentIndex] || {
    original: '',
    translated: '',
    type: 'Term',
    fromLang: 'DE',
    toLang: 'EN',
  };

  // Resolve languages: Use word-specific override if present, else fallback to deck default
  const fromCode = (currentWord as any).fromLang || normalizeLanguageCode(deck?.fromLang || 'German');
  const toCode = (currentWord as any).toLang || normalizeLanguageCode(deck?.toLang || 'English');

  const fromLangDetails = getLangDetails(fromCode);
  const toLangDetails = getLangDetails(toCode);

  const handleNext = () => {
    setSessionCount((prev) => prev + 1);
    if (currentIndex < sessionWords.length - 1) {
      setIsFlipped(false);
      setAiExamples([]);
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 150);
    } else {
      // Note: XP and study logging now happens per-card in handleRating()
      // No bulk award needed here anymore
      setIsFinished(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setAiExamples([]);
      setTimeout(() => {
        setCurrentIndex((prev) => prev - 1);
      }, 150);
    }
  };

  // Real spaced repetition: update proficiency based on user rating
  // XP awarded per card: Hard=5, Good=10, Easy=15
  const handleRating = (rating: 'hard' | 'good' | 'easy') => {
    const currentWord = sessionWords[currentIndex];
    if (!currentWord?.id) {
      handleNext();
      return;
    }

    // Update proficiency
    const proficiencyDelta = { hard: -10, good: 5, easy: 15 };
    const currentProficiency = currentWord.proficiency ?? 0;
    const newProficiency = Math.max(0, Math.min(100, currentProficiency + proficiencyDelta[rating]));
    updateWord(currentWord.id, { proficiency: newProficiency });

    // Award XP per card rated (not just at session end)
    const xpReward = { hard: 5, good: 10, easy: 15 };
    addXp(xpReward[rating]);

    // Log study activity per card (for streak tracking)
    if (deckId) {
      logStudy(1, deckId);
    }

    handleNext();
  };

  // Keyboard Shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFinished) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((f) => !f);
      } else if (e.code === 'ArrowRight') {
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isFinished, sessionWords.length]);

  const handleAIEnhance = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loadingAI) return;
    setLoadingAI(true);
    try {
      const examples = await generateExamples(currentWord.original, fromLangDetails.name, toLangDetails.name);
      if (!examples || examples.length === 0) {
        alert('AI generated no examples. Try again.');
      } else {
        setAiExamples(examples);
      }
    } catch (err: any) {
      console.error(err);
      alert(`AI Error: ${err.message}\n\nPlease check console for details.`);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    speak(currentWord.original, fromLangDetails.locale);
  };

  if (sessionWords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background-light dark:bg-background-dark p-6 text-center">
        <Icon name="folder_open" size={64} className="text-slate-300 mb-4" />
        <h2 className="text-xl font-bold">This deck is empty</h2>
        <p className="text-slate-500 mt-2">Add some words to start learning!</p>
        <button onClick={() => navigate(-1)} className="mt-6 px-6 py-2 bg-primary text-white rounded-lg">
          Go Back
        </button>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background-light dark:bg-background-dark p-10 text-center animate-in fade-in zoom-in duration-300">
        <div className="size-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 mb-6 shadow-lg shadow-emerald-500/20">
          <Icon name="check_circle" size={48} filled />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Session Complete!</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">You reviewed {sessionWords.length} words.</p>
        <div className="mt-10 w-full space-y-4">
          <button
            onClick={() => navigate('/library')}
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:brightness-105 transition-all"
          >
            Back to Library
          </button>
          <button
            onClick={() => {
              setIsFinished(false);
              setCurrentIndex(0);
              setSessionCount(0);
            }}
            className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold"
          >
            Restart Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 flex flex-col h-screen overflow-hidden antialiased">
      {/* Top App Bar */}
      <header className="flex items-center justify-between p-4 pt-6 pb-2 bg-background-light dark:bg-background-dark z-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center size-10 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-900 dark:text-white transition-colors"
        >
          <Icon name="close" size={28} />
        </button>
        <div className="text-center">
          <h2 className="text-sm font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
            {deck?.title || 'Practice'}
          </h2>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
              Learning
            </span>
          </div>
        </div>
        <button
          className="flex items-center justify-center size-10 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-900 dark:text-white transition-colors"
          onClick={() => navigate('/settings')}
        >
          <Icon name="settings" size={24} />
        </button>
      </header>

      {/* Progress Section */}
      <div className="px-6 py-2">
        <div className="flex justify-between items-end mb-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
          <span className="text-xs font-black text-primary">
            {currentIndex + 1} / {sessionWords.length}
          </span>
        </div>
        <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={false}
            animate={{ width: `${((currentIndex + 1) / sessionWords.length) * 100}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          ></motion.div>
        </div>
      </div>

      {/* Main Content: Flashcard Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-4 perspective-1000 w-full max-w-md mx-auto relative">
        {/* Navigation Arrows for Desktop */}
        <div className="absolute inset-y-0 left-0 w-12 z-20 hidden sm:flex items-center justify-center">
          {currentIndex > 0 && (
            <button
              onClick={handlePrev}
              className="size-10 bg-white/20 dark:bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-slate-400 hover:text-primary hover:bg-white dark:hover:bg-slate-800 transition-all shadow-lg active:scale-90"
            >
              <Icon name="chevron_left" size={24} />
            </button>
          )}
        </div>
        <div className="absolute inset-y-0 right-0 w-12 z-20 hidden sm:flex items-center justify-center">
          <button
            onClick={handleNext}
            className="size-10 bg-white/20 dark:bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-slate-400 hover:text-primary hover:bg-white dark:hover:bg-slate-800 transition-all shadow-lg active:scale-90"
          >
            <Icon name="chevron_right" size={24} />
          </button>
        </div>

        {/* Card Container */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{
              opacity: 1,
              x: 0,
              rotateY: isFlipped ? 180 : 0,
            }}
            exit={{ opacity: 0, x: -50 }}
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              rotateY: { duration: 0.6, ease: 'easeInOut' },
            }}
            style={{ transformStyle: 'preserve-3d' }}
            className="relative w-full h-[450px] cursor-pointer shadow-2xl rounded-3xl"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            {/* Front of Card */}
            <div className="absolute inset-0 w-full h-full bg-white dark:bg-slate-800 rounded-3xl p-8 flex flex-col items-center justify-between backface-hidden shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="w-full h-32 rounded-2xl bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center relative border border-slate-100 dark:border-slate-700">
                <span className="text-6xl select-none filter drop-shadow-md">{fromLangDetails.flag}</span>
                <div className="absolute top-3 right-3 bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                  {currentWord.type}
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full py-4 text-center">
                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  {currentWord.original}
                </h1>
                <button
                  className="flex items-center justify-center size-16 rounded-full bg-primary/10 text-primary hover:bg-primary/20 active:scale-90 transition-all shadow-sm border border-primary/20"
                  onClick={handleSpeak}
                >
                  <Icon name="volume_up" size={32} />
                </button>
              </div>

              <div className="w-full flex justify-center pb-2">
                <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 opacity-60">
                  <Icon name="sync" size={14} className="animate-spin-slow" />
                  Tap to Flip
                </p>
              </div>
            </div>

            {/* Back of Card */}
            <div className="absolute inset-0 w-full h-full bg-white dark:bg-slate-800 rounded-3xl p-8 flex flex-col items-center justify-between backface-hidden rotate-y-180 shadow-sm border border-slate-100 dark:border-slate-700">
              <div
                className={`w-full rounded-2xl bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden border border-slate-100 dark:border-slate-700 ${aiExamples.length > 0 ? 'h-48 min-h-48' : 'h-32'}`}
              >
                {aiExamples.length > 0 ? (
                  <div className="w-full h-full p-4 overflow-y-auto no-scrollbar space-y-3">
                    {aiExamples.map((ex, i) => (
                      <div key={i} className="text-left animate-in slide-in-from-bottom-2 duration-300">
                        <p
                          className="text-sm font-bold text-slate-900 dark:text-white leading-tight cursor-pointer hover:text-primary transition-colors flex items-center gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            speak(ex.sentence, fromLangDetails.locale);
                          }}
                        >
                          <Icon name="volume_up" size={14} className="text-primary opacity-60 flex-shrink-0" />
                          {ex.sentence}
                        </p>
                        <p
                          className="text-[11px] text-slate-500 italic mt-0.5 cursor-pointer hover:text-primary transition-colors flex items-center gap-1.5 pl-5"
                          onClick={(e) => {
                            e.stopPropagation();
                            speak(ex.translation, toLangDetails.locale);
                          }}
                        >
                          {ex.translation}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <span className="text-6xl select-none mb-3 opacity-20 grayscale">{toLangDetails.flag}</span>
                    {loadingAI ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        className="size-6 border-2 border-primary border-t-transparent rounded-full"
                      />
                    ) : (
                      <button
                        onClick={handleAIEnhance}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 transition-all"
                      >
                        <Icon name="auto_awesome" size={16} />
                        Enhance with AI
                      </button>
                    )}
                  </>
                )}
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-center py-4 w-full">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Translation</h2>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  {currentWord.translated}
                </h1>
              </div>
              <div className="w-full flex justify-center pb-2">
                <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 opacity-60">
                  <Icon name="sync" size={14} />
                  Tap to Flip Back
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Controls */}
      <footer className="p-6 pb-10 bg-background-light dark:bg-background-dark w-full max-w-md mx-auto">
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => handleRating('hard')}
            className="flex flex-col items-center justify-center gap-1 h-20 rounded-2xl bg-rose-50 dark:bg-rose-900/10 text-rose-500 dark:text-rose-400 font-black uppercase tracking-widest text-[10px] border-2 border-rose-100 dark:border-rose-900/30 hover:bg-rose-100 transition-all active:scale-90"
          >
            <Icon name="mood_bad" size={24} />
            <span>Hard</span>
          </button>

          <button
            onClick={() => handleRating('good')}
            className="flex flex-col items-center justify-center gap-1 h-20 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/30 hover:brightness-110 transition-all active:scale-90 group"
          >
            <Icon name="sentiment_satisfied" size={24} className="group-hover:scale-110 transition-transform" />
            <span>Good</span>
          </button>

          <button
            onClick={() => handleRating('easy')}
            className="flex flex-col items-center justify-center gap-1 h-20 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest text-[10px] border-2 border-emerald-100 dark:border-emerald-900/30 hover:bg-emerald-100 transition-all active:scale-90"
          >
            <Icon name="sentiment_very_satisfied" size={24} />
            <span>Easy</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
