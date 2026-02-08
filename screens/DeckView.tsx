import React, { useState, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Word } from '../types';
import { useStore } from '../store/useStore';
import { Icon } from '../components/Icon';
import { speak } from '../utils/speech';
import { normalizeLanguageCode } from '../utils/gemini';
import { getLangDetails } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';

export const DeckView: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { words, addWords, updateWord, deleteWord, decks, deleteDeck } = useStore();

  const [showImport, setShowImport] = useState(false);
  const [showWordModal, setShowWordModal] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);

  // Form states for manual word add/edit
  const [manualOriginal, setManualOriginal] = useState('');
  const [manualTranslated, setManualTranslated] = useState('');
  const [manualType, setManualType] = useState('Term');

  // Import states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<string[][]>([]);
  const [termCol, setTermCol] = useState(0);
  const [defCol, setDefCol] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentDeck = decks.find((d) => d.id === id);
  const deckTitle = currentDeck ? currentDeck.title : 'Vocabulary';
  const deckWords = words.filter((w) => w.deckId === id);

  const [searchQuery, setSearchQuery] = useState('');
  const filteredWords = deckWords.filter(
    (w) =>
      w.original.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.translated.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const parentRef = useRef<HTMLElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: filteredWords.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88, // Estimate row height (p-5 + content)
    overscan: 5,
  });

  // Restore scroll position on mount
  React.useEffect(() => {
    if (filteredWords.length > 0 && id) {
      const savedIndex = sessionStorage.getItem(`lingoflow_deck_scroll_${id}`);
      if (savedIndex !== null) {
        const index = parseInt(savedIndex, 10);
        if (!isNaN(index) && index >= 0 && index < filteredWords.length) {
          // Small timeout to ensure virtualizer is ready
          setTimeout(() => {
            rowVirtualizer.scrollToIndex(index, { align: 'start' });
            // Clear storage so we don't keep restoring on subsequent renders/updates
            sessionStorage.removeItem(`lingoflow_deck_scroll_${id}`);
          }, 0);
        }
      }
    }
  }, [id, filteredWords.length]); // Removed rowVirtualizer from deps to avoid loop, though it should be stable enough

  const handleDeleteDeck = () => {
    if (confirm('Are you sure you want to delete this deck and all its words?')) {
      if (id) {
        deleteDeck(id);
        navigate('/library');
      }
    }
  };

  const handleSpeak = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    const fromCode = normalizeLanguageCode(currentDeck?.fromLang || 'German');
    const langDetails = getLangDetails(fromCode);
    speak(text, langDetails.locale);
  };

  const openWordModal = (word: Word | null = null) => {
    if (word) {
      setEditingWord(word);
      setManualOriginal(word.original);
      setManualTranslated(word.translated);
      setManualType(word.type || 'Term');
    } else {
      setEditingWord(null);
      setManualOriginal('');
      setManualTranslated('');
      setManualType('Term');
    }
    setShowWordModal(true);
  };

  const handleSaveWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualOriginal.trim() || !manualTranslated.trim()) return;

    if (editingWord) {
      updateWord(editingWord.id, {
        original: manualOriginal.trim(),
        translated: manualTranslated.trim(),
        type: manualType,
      });
    } else {
      const newWord: Word = {
        id: Date.now().toString(),
        deckId: id || '',
        original: manualOriginal.trim(),
        translated: manualTranslated.trim(),
        type: manualType,
        audio: true,
      };
      addWords([newWord]);
    }
    setShowWordModal(false);
  };

  const handleDeleteWord = (wordId: string) => {
    if (confirm('Delete this word?')) {
      deleteWord(wordId);
      setShowWordModal(false);
    }
  };

  // CSV Import Logic
  const parseCSV = (content: string): string[][] => {
    const arr: string[][] = [];
    let quote = false;
    let row = 0,
      col = 0;
    for (let c = 0; c < content.length; c++) {
      let cc = content[c],
        nc = content[c + 1];
      arr[row] = arr[row] || [];
      arr[row][col] = arr[row][col] || '';
      if (cc == '"' && quote && nc == '"') {
        arr[row][col] += cc;
        ++c;
        continue;
      }
      if (cc == '"') {
        quote = !quote;
        continue;
      }
      if (cc == ',' && !quote) {
        ++col;
        continue;
      }
      if (cc == '\r' && nc == '\n' && !quote) {
        ++row;
        col = 0;
        ++c;
        continue;
      }
      if (cc == '\n' && !quote) {
        ++row;
        col = 0;
        continue;
      }
      if (cc == '\r' && !quote) {
        ++row;
        col = 0;
        continue;
      }
      arr[row][col] += cc;
    }
    return arr.filter((r) => r.length > 0 && r.some((cell) => cell.trim() !== ''));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const data = parseCSV(text);
        setParsedData(data);
        if (data.length > 0 && data[0].length >= 4) {
          setTermCol(2);
          setDefCol(3);
        } else {
          setTermCol(0);
          setDefCol(1);
        }
      };
      reader.readAsText(file);
    }
  };

  const [typeCol, setTypeCol] = useState(-1); // -1 for manual default
  const [defaultType, setDefaultType] = useState('Term');
  const [swapLanguages, setSwapLanguages] = useState(false);

  const handleImport = () => {
    if (!selectedFile || parsedData.length === 0) return;

    // Build a set of existing words in this deck for fast duplicate lookup
    // Use lowercase original+translated as the key for comparison
    const existingWords = new Set(
      deckWords.map((w) => `${w.original.toLowerCase().trim()}|${w.translated.toLowerCase().trim()}`),
    );

    let skippedCount = 0;

    const imported: Word[] = parsedData
      .map((row, index) => {
        // Allow swapping source/target columns
        const original = row[swapLanguages ? defCol : termCol] || '';
        const translated = row[swapLanguages ? termCol : defCol] || '';
        const type = typeCol >= 0 ? row[typeCol] || defaultType : defaultType;

        if (!original.trim() && !translated.trim()) return null;

        // Check for duplicates - skip if word already exists
        const key = `${original.toLowerCase().trim()}|${translated.toLowerCase().trim()}`;
        if (existingWords.has(key)) {
          skippedCount++;
          return null;
        }

        // Add to set so we don't import duplicates from within the same file
        existingWords.add(key);

        return {
          id: Date.now().toString() + index,
          deckId: id || '',
          original: original.trim(),
          translated: translated.trim(),
          type: type.trim() || 'Term',
          audio: true,
        } as Word;
      })
      .filter((w): w is Word => w !== null);

    if (imported.length > 0 || skippedCount > 0) {
      if (imported.length > 0) {
        addWords(imported);
      }
      setShowImport(false);
      setSelectedFile(null);
      setParsedData([]);

      if (skippedCount > 0) {
        alert(`Imported ${imported.length} new words.\nSkipped ${skippedCount} duplicates (already in deck).`);
      } else {
        alert(`Imported ${imported.length} words!`);
      }
    } else {
      alert('No new words to import. All entries already exist in this deck.');
    }
  };

  const handleStartSession = () => {
    const scrollTop = parentRef.current?.scrollTop || 0;
    const virtualItems = rowVirtualizer.getVirtualItems();

    // Default to first item
    let firstIndex = 0;

    // Find the item that starts visible in the viewport
    // The item whose 'end' (start + size) is greater than scrollTop
    const visibleItem = virtualItems.find((item) => {
      // Logic: A word is "visible" if its center point is within the viewport
      // OR if a significant portion (e.g., > 50%) is visible.
      // Current simple check: item.end > scrollTop
      // Improved check: item.end > scrollTop + (item.size * 0.6)
      // This means at least 60% of the item must be visible at the bottom to count as "the one"
      // If it's mostly scrolled out (only 40% visible at bottom), we skip it and take the next one.
      return item.start + item.size > scrollTop + item.size * 0.6;
    });

    if (visibleItem) {
      firstIndex = visibleItem.index;
    } else {
      // Fallback math if virtualizer is empty or acting up
      // 88px is the estimated height of a row
      firstIndex = Math.floor(scrollTop / 88);
    }

    // Safety clamp
    firstIndex = Math.max(0, Math.min(firstIndex, filteredWords.length - 1));

    // Save scroll position
    if (id) {
      sessionStorage.setItem(`lingoflow_deck_scroll_${id}`, firstIndex.toString());
    }

    const startWord = filteredWords[firstIndex];
    // Use query parameter instead of state for robust URL-based navigation
    navigate(`/flashcards/${id}?startWordId=${startWord?.id || ''}`);
  };

  return (
    <div className="relative flex h-full w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark shadow-2xl overflow-hidden font-display">
      {/* App Bar */}
      <header className="sticky top-0 z-20 bg-surface-light dark:bg-surface-dark border-b border-slate-100 dark:border-slate-800 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 h-16">
          <button onClick={() => navigate('/library')} className="p-2 -ml-2 text-primary">
            <Icon name="arrow_back" size={24} />
          </button>
          <div className="flex-1 px-4 text-center">
            <h1 className="text-lg font-black text-slate-900 dark:text-white truncate">{deckTitle}</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{deckWords.length} Words</p>
          </div>
          <div className="flex items-center gap-1 -mr-2">
            <button
              onClick={() => setShowImport(true)}
              className="p-2 text-slate-400 hover:text-primary transition-colors"
            >
              <Icon name="file_upload" size={22} />
            </button>
            <button onClick={handleDeleteDeck} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
              <Icon name="delete" size={20} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Icon name="search" size={18} />
            </div>
            <input
              type="text"
              placeholder="Search in this deck..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold placeholder-slate-400 focus:ring-2 focus:ring-primary/20 dark:text-white"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main ref={parentRef} className="flex-1 overflow-y-auto no-scrollbar pb-32 bg-slate-50 dark:bg-background-dark">
        {filteredWords.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center opacity-40">
            <Icon name="auto_stories" size={64} className="mb-4" />
            <p className="text-sm font-black uppercase tracking-widest">No words found in this deck.</p>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const word = filteredWords[virtualRow.index];
              return (
                <div
                  key={word.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div
                    onClick={() => openWordModal(word)}
                    className="flex items-center justify-between p-5 bg-white dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800/50 active:bg-slate-50 dark:active:bg-slate-800 transition-colors cursor-pointer group h-full"
                  >
                    <div className="flex flex-col gap-1 overflow-hidden">
                      <p className="text-base font-bold text-slate-900 dark:text-white truncate">{word.original}</p>
                      <p className="text-sm font-medium text-slate-400 truncate">{word.translated}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => handleSpeak(e, word.original)}
                        className="size-10 rounded-full flex items-center justify-center text-primary bg-primary/5 hover:bg-primary/20 hover:scale-105 active:scale-90 transition-all"
                      >
                        <Icon name="volume_up" size={20} />
                      </button>
                      <Icon
                        name="chevron_right"
                        size={18}
                        className="text-slate-200 group-hover:text-primary transition-colors"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Primary Action Buttons */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm flex items-center gap-3 z-30">
        <button
          onClick={() => navigate(`/ai-quiz/${id}`)}
          disabled={deckWords.length < 3}
          className="size-16 bg-white dark:bg-slate-800 text-amber-500 rounded-3xl font-black shadow-xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all border border-slate-100 dark:border-slate-700 disabled:opacity-50 disabled:grayscale"
        >
          <Icon name="psychology" size={32} />
        </button>
        <button
          onClick={handleStartSession}
          disabled={deckWords.length === 0}
          className="flex-1 h-16 bg-primary text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/40 hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:grayscale disabled:opacity-50"
        >
          <Icon name="play_arrow" filled />
          Start Session
        </button>
        <button
          onClick={() => openWordModal()}
          className="size-16 bg-white dark:bg-slate-800 text-primary rounded-3xl font-black shadow-xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all border border-slate-100 dark:border-slate-700"
        >
          <Icon name="add" size={32} />
        </button>
      </div>

      {/* Word Edit/Add Modal */}
      <AnimatePresence>
        {showWordModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWordModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full bg-white dark:bg-surface-dark rounded-t-[3rem] p-8 pb-10 shadow-2xl z-10"
            >
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-8" />
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">
                {editingWord ? 'Edit Vocabulary' : 'Add New Word'}
              </h3>

              <form onSubmit={handleSaveWord} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                    {currentDeck?.fromLang || 'Original'} Word
                  </label>
                  <input
                    autoFocus
                    value={manualOriginal}
                    onChange={(e) => setManualOriginal(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl font-bold border-2 border-transparent focus:border-primary focus:bg-white outline-none transition-all dark:text-white"
                    placeholder="e.g. der Hund"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                    Translation
                  </label>
                  <input
                    value={manualTranslated}
                    onChange={(e) => setManualTranslated(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl font-bold border-2 border-transparent focus:border-primary focus:bg-white outline-none transition-all dark:text-white"
                    placeholder="e.g. default"
                  />
                </div>

                <div className="flex gap-4 pt-6">
                  {editingWord && (
                    <button
                      type="button"
                      onClick={() => handleDeleteWord(editingWord.id)}
                      className="size-16 rounded-2xl border-2 border-rose-100 flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-colors"
                    >
                      <Icon name="delete" />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 h-16 bg-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:brightness-105 transition-all"
                  >
                    Save Word
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import Modal */}
      <AnimatePresence>
        {showImport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowImport(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full bg-white dark:bg-surface-dark rounded-3xl p-8 shadow-2xl"
            >
              <h3 className="text-xl font-black mb-4 dark:text-white">Import CSV</h3>
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />

              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <Icon name="upload_file" size={48} className="text-slate-300 mb-2" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Select CSV File</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center gap-3">
                    <Icon name="check_circle" className="text-emerald-500" />
                    <span className="text-sm font-bold text-emerald-800 dark:text-emerald-400 truncate">
                      {selectedFile.name}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                        Original Col
                      </label>
                      <select
                        value={termCol}
                        onChange={(e) => setTermCol(Number(e.target.value))}
                        className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg p-2 font-bold text-xs dark:text-white"
                      >
                        {parsedData[0]?.map((_, i) => (
                          <option key={i} value={i}>
                            Col {i + 1} ({parsedData[0][i].substring(0, 8)}...)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                        Translation Col
                      </label>
                      <select
                        value={defCol}
                        onChange={(e) => setDefCol(Number(e.target.value))}
                        className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg p-2 font-bold text-xs dark:text-white"
                      >
                        {parsedData[0]?.map((_, i) => (
                          <option key={i} value={i}>
                            Col {i + 1} ({parsedData[0][i].substring(0, 8)}...)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => setSwapLanguages(!swapLanguages)}
                  >
                    <div
                      className={`size-4 rounded-full border-2 ${swapLanguages ? 'bg-primary border-primary' : 'border-slate-300'}`}
                    />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Swap Source/Target</span>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                      Part of Speech (Type)
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={typeCol}
                        onChange={(e) => setTypeCol(Number(e.target.value))}
                        className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-lg p-2 font-bold text-xs dark:text-white"
                      >
                        <option value="-1">Fixed Value</option>
                        {parsedData[0]?.map((_, i) => (
                          <option key={i} value={i}>
                            Col {i + 1}
                          </option>
                        ))}
                      </select>
                      {typeCol === -1 && (
                        <select
                          value={defaultType}
                          onChange={(e) => setDefaultType(e.target.value)}
                          className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-lg p-2 font-bold text-xs dark:text-white"
                        >
                          <option value="Term">Term (Generic)</option>
                          <option value="Noun">Noun</option>
                          <option value="Verb">Verb</option>
                          <option value="Adjective">Adjective</option>
                          <option value="Phrase">Phrase</option>
                        </select>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleImport}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs"
                  >
                    Import Now
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
