import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Icon } from '../components/Icon';
import { speak } from '../utils/speech';

interface SpellingPracticeProps {}

export const SpellingPractice: React.FC<SpellingPracticeProps> = () => {
  const navigate = useNavigate();
  const { deckId } = useParams<{ deckId: string }>();
  const { words } = useStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [showHint, setShowHint] = useState(false);

  // Filter words if deckId is present, otherwise show all
  const sessionWords = useMemo(() => {
    return deckId ? words.filter((w) => w.deckId === deckId) : words;
  }, [words, deckId]);

  const currentWord = sessionWords[currentIndex] || { original: '', translated: '' };

  const handleSpeak = () => {
    speak(currentWord.original);
  };

  const handleCheck = () => {
    if (status !== 'idle') {
      // Move to next
      setStatus('idle');
      setInput('');
      setShowHint(false);
      if (currentIndex < sessionWords.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setCurrentIndex(0); // loop
      }
      return;
    }

    if (input.toLowerCase().trim() === currentWord.original.toLowerCase()) {
      setStatus('correct');
      speak('Correct!');
    } else {
      setStatus('wrong');
      speak('Incorrect, try again.');
    }
  };

  const getButtonColor = () => {
    if (status === 'correct') return 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30';
    if (status === 'wrong') return 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30';
    return 'bg-primary hover:bg-sky-500 shadow-primary/20';
  };

  const getButtonText = () => {
    if (status === 'correct') return 'Continue';
    if (status === 'wrong') return 'Try Again';
    return 'Check Answer';
  };

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-white dark:bg-background-dark shadow-2xl font-display text-slate-900 dark:text-white">
      {/* Top App Bar */}
      <div className="flex items-center p-4 pb-2 justify-between">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-800 dark:text-white flex size-12 shrink-0 items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          <Icon name="close" />
        </button>
        <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">Spelling Practice</h2>
        <div className="flex w-12 items-center justify-end">
          <button
            className="flex size-12 shrink-0 items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-800 dark:text-white"
            onClick={() => navigate('/settings')}
          >
            <Icon name="settings" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex flex-col gap-2 px-6 pt-2 pb-6">
        <div className="flex gap-6 justify-between items-end">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-normal">Progress</p>
          <p className="text-primary text-sm font-bold leading-normal">
            {currentIndex + 1}/{sessionWords.length}
          </p>
        </div>
        <div className="rounded-full bg-slate-200 dark:bg-slate-700 h-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${((currentIndex + 1) / sessionWords.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Main Interaction Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8 w-full">
        {/* Audio Circle with Pulse Effect */}
        <div className="relative group cursor-pointer" onClick={handleSpeak}>
          <div className="absolute inset-0 rounded-full bg-primary/20 scale-125 animate-pulse"></div>
          <div className="absolute inset-0 rounded-full bg-primary/40 scale-110"></div>
          <button className="relative flex items-center justify-center w-32 h-32 bg-primary rounded-full shadow-xl shadow-primary/30 active:scale-95 transition-transform duration-200 z-10">
            <Icon name="volume_up" size={60} className="text-white" filled />
          </button>
          <button
            aria-label="Replay audio"
            className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-700 p-2 rounded-full shadow-lg border border-slate-100 dark:border-slate-600 text-primary hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors z-20"
          >
            <Icon name="replay" size={20} />
          </button>
        </div>

        <div className="text-center w-full space-y-8 mt-4">
          {/* Input Field */}
          <div className="relative w-full max-w-xs mx-auto">
            <input
              autoComplete="off"
              autoCorrect="off"
              className={`w-full bg-transparent border-b-2 text-center text-3xl font-bold py-3 text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-0 transition-colors ${
                status === 'correct'
                  ? 'border-emerald-500 text-emerald-600'
                  : status === 'wrong'
                    ? 'border-rose-500 text-rose-600'
                    : 'border-slate-300 dark:border-slate-600 focus:border-primary'
              }`}
              placeholder="Type word here..."
              spellCheck={false}
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (status !== 'idle') setStatus('idle');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
            />
          </div>
          {/* Hint Toggle */}
          <div className="flex flex-col items-center gap-2 h-10">
            {showHint || status === 'wrong' ? (
              <p className="text-slate-600 dark:text-slate-300 text-lg font-medium animate-in fade-in slide-in-from-bottom-2">
                {currentWord.original}
              </p>
            ) : (
              <button
                onClick={() => setShowHint(true)}
                className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium text-slate-600 dark:text-slate-300"
              >
                <Icon name="visibility" size={18} />
                <span>Show Answer</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-6 w-full mt-auto bg-white dark:bg-background-dark">
        <div className="flex flex-col gap-3">
          <button
            onClick={handleCheck}
            className={`w-full text-white font-bold text-lg py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${getButtonColor()}`}
          >
            <span>{getButtonText()}</span>
            <Icon name={status === 'idle' ? 'check_circle' : status === 'correct' ? 'arrow_forward' : 'refresh'} />
          </button>
          <button
            className="w-full bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold text-sm py-3 rounded-lg transition-colors"
            onClick={() => {
              if (currentIndex < sessionWords.length - 1) {
                setCurrentIndex((prev) => prev + 1);
                setStatus('idle');
                setInput('');
                setShowHint(false);
              } else {
                navigate('/library'); // Navigate to library when finished
              }
            }}
          >
            Skip this word
          </button>
        </div>
      </div>
    </div>
  );
};
