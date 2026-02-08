import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Icon } from '../components/Icon';
import { BottomNav } from '../components/BottomNav';
import { speak } from '../utils/speech';

type SortBy = 'recent' | 'alphabetical';

interface WeakWordsProps {}

export const WeakWords: React.FC<WeakWordsProps> = () => {
  const navigate = useNavigate();
  const { words, decks } = useStore();
  const [sortBy, setSortBy] = useState<SortBy>('recent');

  const weakWords = useMemo(() => {
    // Filter words with proficiency < 50
    const filtered = words.filter((w) => (w.proficiency || 0) < 50);
    if (sortBy === 'alphabetical') {
      return [...filtered].sort((a, b) => a.original.localeCompare(b.original));
    }
    return filtered;
  }, [words, sortBy]);

  const handleSpeak = (text: string) => {
    speak(text);
  };

  const getDeckName = (deckId: string) => {
    const deck = decks.find((d) => d.id === deckId);
    return deck?.title || 'Unknown Deck';
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden pb-24 bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="size-12 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-200"
          >
            <Icon name="arrow_back" />
          </button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Weak Words</h1>
          <button
            onClick={() => navigate('/flashcards')}
            className="h-10 px-4 flex items-center justify-center rounded-full bg-primary text-white hover:bg-sky-500 transition-colors"
          >
            <span className="text-sm font-medium">Review All</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto px-4 pb-4">
        {/* Info Banner */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 mb-4 flex items-start gap-3">
          <Icon name="lightbulb" className="text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            These are words you may need more practice with. Review them regularly to improve retention.
          </p>
        </div>

        {/* Filters */}
        <div className="sticky top-16 z-40 bg-background-light dark:bg-background-dark py-2 -mx-4 px-4 mb-2">
          <div className="flex gap-2 overflow-x-auto no-scrollbar items-center py-2">
            <button
              onClick={() => setSortBy('recent')}
              className={`flex shrink-0 items-center justify-center gap-x-2 rounded-lg py-1.5 px-4 transition-colors active:scale-95 border ${
                sortBy === 'recent'
                  ? 'bg-slate-200 dark:bg-slate-700 border-transparent'
                  : 'border-slate-300 dark:border-slate-600 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              {sortBy === 'recent' && <Icon name="check" size={18} className="text-slate-700 dark:text-slate-200" />}
              <span className="text-slate-900 dark:text-slate-100 text-sm font-medium">Recent</span>
            </button>
            <button
              onClick={() => setSortBy('alphabetical')}
              className={`flex shrink-0 items-center justify-center gap-x-2 rounded-lg py-1.5 px-4 transition-colors active:scale-95 border ${
                sortBy === 'alphabetical'
                  ? 'bg-slate-200 dark:bg-slate-700 border-transparent'
                  : 'border-slate-300 dark:border-slate-600 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              {sortBy === 'alphabetical' && (
                <Icon name="check" size={18} className="text-slate-700 dark:text-slate-200" />
              )}
              <span className="text-slate-900 dark:text-slate-100 text-sm font-medium">A-Z</span>
            </button>
          </div>
        </div>

        {/* Word Count */}
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          {weakWords.length} word{weakWords.length !== 1 ? 's' : ''} to review
        </p>

        {/* Words List */}
        <div className="flex flex-col gap-3">
          {weakWords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="size-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                <Icon name="celebration" size={40} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">No Weak Words!</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-[250px]">
                Great job! All your vocabulary is in good shape. Keep practicing to maintain it.
              </p>
            </div>
          ) : (
            weakWords.map((word) => (
              <article
                key={word.id}
                className="group relative rounded-xl bg-surface-light dark:bg-surface-dark border border-slate-100 dark:border-slate-700/50 transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between p-4">
                  <div className="flex-1 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white leading-tight">
                        {word.original}
                      </h3>
                      <button
                        className="text-primary hover:bg-primary/10 transition-colors flex items-center justify-center size-8 rounded-full"
                        onClick={() => handleSpeak(word.original)}
                      >
                        <Icon name="volume_up" size={20} />
                      </button>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal mb-3">
                      {word.translated}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <Icon name="folder" size={14} />
                        <span className="text-xs font-medium">{getDeckName(word.deckId)}</span>
                      </div>
                      <span className="text-xs text-slate-400">{word.type}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-center h-full self-center pl-2">
                    <button
                      onClick={() => navigate(`/flashcards/${word.deckId}`)}
                      className="flex cursor-pointer items-center justify-center rounded-full h-10 px-6 bg-primary hover:bg-sky-500 text-white text-sm font-medium shadow-sm transition-all active:scale-95"
                    >
                      Review
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};
