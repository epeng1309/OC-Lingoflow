import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Icon } from '../components/Icon';
import { BottomNav } from '../components/BottomNav';
import { motion, AnimatePresence } from 'framer-motion';

export const Library: React.FC = () => {
  const navigate = useNavigate();
  const {
    decks,
    words,
    createDeck,
    updateDeck,
    history,
    languageFilters,
    updateLanguageFilter,
    deleteLanguageFilter,
    addLanguageFilter,
    autoGenerateFilters,
  } = useStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [newDeckSubtitle, setNewDeckSubtitle] = useState('');
  const [newDeckFromLang, setNewDeckFromLang] = useState('German');
  const [newDeckToLang, setNewDeckToLang] = useState('English');
  const [filter, setFilter] = useState<string>('All');

  // Editing states
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [editingDeckTitle, setEditingDeckTitle] = useState('');
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  const [editingFilterName, setEditingFilterName] = useState('');
  const [showAddFilter, setShowAddFilter] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');

  // Auto-generate filters on mount if empty
  useEffect(() => {
    if (languageFilters.length === 0 && decks.length > 0) {
      autoGenerateFilters();
    }
  }, []);

  // Filter Decks
  const filteredDecks = React.useMemo(() => {
    if (filter === 'All') return decks;
    return decks.filter(
      (d) => d.fromLang?.toLowerCase() === filter.toLowerCase() || d.toLang?.toLowerCase() === filter.toLowerCase(),
    );
  }, [decks, filter]);

  // Helper to get status
  const getDeckStatus = (deckId: string) => {
    const deckHistory = history.filter((h) => h.deckId === deckId);
    if (deckHistory.length === 0) return 'New Deck';
    const lastSession = deckHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const today = new Date().toISOString().split('T')[0];
    if (lastSession.date === today) return 'Studied Today';
    return `Last: ${lastSession.date}`;
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckTitle.trim()) return;

    const newDeck = {
      id: Date.now().toString(),
      title: newDeckTitle,
      subtitle: newDeckSubtitle || 'New Collection',
      count: 0,
      progress: 0,
      fromLang: newDeckFromLang,
      toLang: newDeckToLang,
      colorClass: 'text-primary bg-sky-50 dark:bg-sky-900/20',
      icon: 'folder',
      isNew: true,
    };
    createDeck(newDeck);

    // Auto-generate filters for new languages
    setTimeout(() => autoGenerateFilters(), 100);

    setNewDeckTitle('');
    setNewDeckSubtitle('');
    setShowCreateModal(false);
    navigate(`/deck/${newDeck.id}`);
  };

  const handleSaveDeckTitle = (deckId: string) => {
    if (editingDeckTitle.trim()) {
      updateDeck(deckId, { title: editingDeckTitle.trim() });
    }
    setEditingDeckId(null);
  };

  const handleSaveFilterName = (filterId: string) => {
    if (editingFilterName.trim()) {
      updateLanguageFilter(filterId, editingFilterName.trim());
    }
    setEditingFilterId(null);
  };

  const handleAddFilter = () => {
    if (newFilterName.trim()) {
      addLanguageFilter({
        id: `filter-${Date.now()}`,
        name: newFilterName.trim(),
      });
      setNewFilterName('');
      setShowAddFilter(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark shadow-2xl overflow-hidden pb-24 font-display">
      {/* Top Status Bar */}
      <div className="h-8 w-full bg-background-light dark:bg-background-dark sticky top-0 z-20"></div>

      {/* Top App Bar */}
      <div className="flex items-center px-6 py-4 justify-between bg-background-light dark:bg-background-dark sticky top-8 z-10">
        <h2 className="text-slate-900 dark:text-white text-3xl font-black leading-tight tracking-tight flex-1">
          My Decks
        </h2>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => autoGenerateFilters()}
            className="flex items-center justify-center rounded-full h-10 w-10 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh filters from decks"
          >
            <Icon name="refresh" size={20} />
          </button>
          <button
            className="flex items-center justify-center rounded-full h-10 w-10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            onClick={() => navigate('/settings')}
          >
            <Icon name="settings" size={24} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Inventory</span>
          <span className="text-sm font-bold text-slate-900 dark:text-white">{decks.length} Collections</span>
        </div>
        <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
          <Icon name="auto_stories" size={14} className="text-primary" />
          <span className="text-xs font-black text-primary">{words.length} Total Words</span>
        </div>
      </div>

      {/* Filter Tabs - Editable */}
      <div className="px-6 pb-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar items-center">
          {/* All filter - always present */}
          <button
            onClick={() => setFilter('All')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
              filter === 'All'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All
          </button>

          {/* Dynamic language filters */}
          {languageFilters.map((f) => (
            <div key={f.id} className="relative shrink-0 group">
              {editingFilterId === f.id ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    value={editingFilterName}
                    onChange={(e) => setEditingFilterName(e.target.value)}
                    onBlur={() => handleSaveFilterName(f.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveFilterName(f.id);
                      if (e.key === 'Escape') setEditingFilterId(null);
                    }}
                    className="px-3 py-1 rounded-full text-xs font-bold bg-white dark:bg-slate-700 border-2 border-primary outline-none w-24"
                  />
                  <button
                    onClick={() => {
                      deleteLanguageFilter(f.id);
                      setEditingFilterId(null);
                    }}
                    className="p-1 text-rose-500 hover:bg-rose-50 rounded-full"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setFilter(f.name)}
                  onDoubleClick={() => {
                    setEditingFilterId(f.id);
                    setEditingFilterName(f.name);
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    filter === f.name
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  title="Double-click to edit"
                >
                  {f.name}
                </button>
              )}
            </div>
          ))}

          {/* Add filter button */}
          {showAddFilter ? (
            <div className="flex items-center gap-1 shrink-0">
              <input
                autoFocus
                value={newFilterName}
                onChange={(e) => setNewFilterName(e.target.value)}
                onBlur={() => {
                  if (newFilterName.trim()) handleAddFilter();
                  else setShowAddFilter(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddFilter();
                  if (e.key === 'Escape') setShowAddFilter(false);
                }}
                placeholder="Language..."
                className="px-3 py-1 rounded-full text-xs font-bold bg-white dark:bg-slate-700 border-2 border-primary outline-none w-24"
              />
            </div>
          ) : (
            <button
              onClick={() => setShowAddFilter(true)}
              className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-primary hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shrink-0"
            >
              <Icon name="add" size={14} />
            </button>
          )}
        </div>
        <p className="text-[9px] text-slate-400 mt-1 px-1">Double-click filter to edit • Click + to add</p>
      </div>

      {/* Deck List - Editable */}
      <div className="flex flex-col gap-4 px-6 pb-6 mt-2">
        <AnimatePresence>
          {filteredDecks.map((deck, idx) => {
            const deckWords = words.filter((w) => w.deckId === deck.id);
            const status = getDeckStatus(deck.id);
            const isEditing = editingDeckId === deck.id;

            return (
              <motion.div
                key={deck.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative flex flex-col gap-3 rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 hover:shadow-xl transition-all"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div
                      onClick={() => navigate(`/deck/${deck.id}`)}
                      className={`flex items-center justify-center rounded-xl ${deck.colorClass} shrink-0 size-14 shadow-sm group-hover:scale-110 transition-transform cursor-pointer`}
                    >
                      <Icon name={deck.icon} size={28} />
                    </div>
                    <div className="flex flex-1 flex-col justify-center min-w-0">
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editingDeckTitle}
                          onChange={(e) => setEditingDeckTitle(e.target.value)}
                          onBlur={() => handleSaveDeckTitle(deck.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveDeckTitle(deck.id);
                            if (e.key === 'Escape') setEditingDeckId(null);
                          }}
                          className="text-lg font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded-lg border-2 border-primary outline-none w-full"
                        />
                      ) : (
                        <div className="flex items-center gap-2 mb-1">
                          <p
                            onClick={() => navigate(`/deck/${deck.id}`)}
                            className="text-slate-900 dark:text-white text-lg font-black leading-tight truncate cursor-pointer hover:text-primary transition-colors"
                          >
                            {deck.title}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingDeckId(deck.id);
                              setEditingDeckTitle(deck.title);
                            }}
                            className="p-1 text-slate-300 hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
                            title="Edit title"
                          >
                            <Icon name="edit" size={14} />
                          </button>
                          {status === 'New Deck' && (
                            <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                              New
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-normal mb-2 line-clamp-1">
                        {status}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">
                        <span>{deckWords.length} Words</span>
                        <div className="size-1 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                        <span>{deck.fromLang}</span>
                        <Icon name="arrow_forward" size={10} />
                        <span>{deck.toLang}</span>
                      </div>
                    </div>
                  </div>
                  <div onClick={() => navigate(`/deck/${deck.id}`)} className="shrink-0 self-center cursor-pointer">
                    <Icon
                      name="chevron_right"
                      className="text-slate-200 dark:text-slate-600 group-hover:text-primary transition-colors"
                    />
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1 shadow-inner">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${deck.progress}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  ></motion.div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredDecks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
            <Icon name="inventory_2" size={64} className="mb-4" />
            <p className="text-sm font-black uppercase tracking-widest">No decks found.</p>
          </div>
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-24 right-6 z-50">
        <button
          aria-label="Add new library"
          onClick={() => setShowCreateModal(true)}
          className="group flex items-center justify-center size-14 rounded-full bg-primary text-white shadow-xl shadow-primary/30 hover:bg-sky-500 hover:scale-105 active:scale-90 transition-all duration-300"
        >
          <Icon name="add" size={32} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>

      {/* Create Deck Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
              onClick={() => setShowCreateModal(false)}
            ></motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-surface-dark rounded-3xl shadow-2xl p-8 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">
                Create New Deck
              </h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Deck Title
                  </label>
                  <input
                    autoFocus
                    type="text"
                    placeholder="e.g. Daily German"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary outline-none text-slate-900 dark:text-white font-bold"
                    value={newDeckTitle}
                    onChange={(e) => setNewDeckTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Chapter 1 Vocab"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary outline-none text-slate-900 dark:text-white font-bold"
                    value={newDeckSubtitle}
                    onChange={(e) => setNewDeckSubtitle(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      From
                    </label>
                    <input
                      type="text"
                      placeholder="German"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary outline-none text-slate-900 dark:text-white font-bold text-sm"
                      value={newDeckFromLang}
                      onChange={(e) => setNewDeckFromLang(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      To
                    </label>
                    <input
                      type="text"
                      placeholder="English"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary outline-none text-slate-900 dark:text-white font-bold text-sm"
                      value={newDeckToLang}
                      onChange={(e) => setNewDeckToLang(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 font-black text-slate-500 uppercase tracking-widest text-xs hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newDeckTitle.trim()}
                    className="flex-1 py-3 font-black text-white bg-primary hover:bg-sky-500 rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50 disabled:grayscale transition-all uppercase tracking-widest text-xs"
                  >
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};
