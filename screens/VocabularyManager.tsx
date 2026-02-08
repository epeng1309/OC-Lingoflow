import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Icon } from '../components/Icon';
import { Word } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { detectLanguageFromText, detectLanguagesBatch } from '../utils/gemini';

// Default column widths - adjusted for new columns
const DEFAULT_COL_WIDTHS = {
  checkbox: 40,
  id: 60,
  original: 160,
  fromLang: 50,
  translated: 160,
  toLang: 50,
  type: 70,
  deck: 90,
  actions: 80,
};

type ColKey = keyof typeof DEFAULT_COL_WIDTHS;

export const VocabularyManager: React.FC = () => {
  const navigate = useNavigate();
  const { words, decks, updateWord, deleteWord, addWords } = useStore();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterDeck, setFilterDeck] = useState('All');
  const [isDetecting, setIsDetecting] = useState(false);

  const totalWords = words.length;

  const filteredWords = React.useMemo(() => {
    return words.filter((w) => {
      const matchesSearch =
        (w.original || '').toLowerCase().includes(search.toLowerCase()) ||
        (w.translated || '').toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === 'All' || w.type === filterType;
      const matchesDeck = filterDeck === 'All' || w.deckId === filterDeck;
      return matchesSearch && matchesType && matchesDeck;
    });
  }, [words, search, filterType, filterDeck]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Word>>({});

  const startEdit = (word: Word) => {
    setEditForm({ ...word });
    setEditingId(word.id);
  };

  const saveEdit = () => {
    if (editingId && editForm) {
      updateWord(editingId, editForm);
      setEditingId(null);
    }
  };

  // Import Logic
  const [showImport, setShowImport] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<string[][]>([]);
  const [termCol, setTermCol] = useState(0);
  const [defCol, setDefCol] = useState(1);
  const [typeCol, setTypeCol] = useState(-1);
  const [defaultType, setDefaultType] = useState('Term');
  const [swapLanguages, setSwapLanguages] = useState(false);
  const [targetDeckId, setTargetDeckId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set default target deck when decks load or modal opens
  useEffect(() => {
    if (showImport && !targetDeckId && decks.length > 0) {
      setTargetDeckId(decks[0].id);
    }
  }, [showImport, decks, targetDeckId]);

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

  const handleImport = () => {
    if (!selectedFile || parsedData.length === 0 || !targetDeckId) {
      if (!targetDeckId) alert('Please select a target deck.');
      return;
    }

    // Build a set of existing words globally for fast duplicate lookup
    // Use lowercase original+translated as the key for comparison
    const existingWords = new Set(
      words.map((w) => `${w.original.toLowerCase().trim()}|${w.translated.toLowerCase().trim()}`),
    );

    let skippedCount = 0;

    const imported: Word[] = parsedData
      .map((row, index) => {
        // Allow swapping source/target columns
        const original = row[swapLanguages ? defCol : termCol] || '';
        const translated = row[swapLanguages ? termCol : defCol] || '';
        const type = typeCol >= 0 ? row[typeCol] || defaultType : defaultType;

        if (!original.trim() && !translated.trim()) return null;

        // Check for duplicates - skip if word already exists ANYWHERE
        const key = `${original.toLowerCase().trim()}|${translated.toLowerCase().trim()}`;
        if (existingWords.has(key)) {
          skippedCount++;
          return null;
        }

        // Add to set so we don't import duplicates from within the same file
        existingWords.add(key);

        return {
          id: Date.now().toString() + index,
          deckId: targetDeckId,
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
        alert(
          `Imported ${imported.length} new words.\nSkipped ${skippedCount} duplicates (already present in database).`,
        );
      } else {
        alert(`Imported ${imported.length} words!`);
      }
    } else {
      alert('No new words to import. All entries already exist in the database.');
    }
  };

  // AI Language Detection for all words
  const handleDetectLanguages = async () => {
    if (isDetecting) return;
    setIsDetecting(true);

    try {
      // Get words that need detection (missing fromLang or toLang)
      const wordsToDetect = words.filter((w) => !w.fromLang || w.fromLang === 'AUTO');

      if (wordsToDetect.length === 0) {
        alert('All words already have language information.');
        setIsDetecting(false);
        return;
      }

      // Batch detect for originals
      const originals = wordsToDetect.map((w) => w.original);
      const detectedResults = await detectLanguagesBatch(originals);

      // Update words with detected languages
      let updatedCount = 0;
      for (let i = 0; i < wordsToDetect.length; i++) {
        const word = wordsToDetect[i];
        const detected = detectedResults[i];

        // Detect translation language using heuristics
        const toLangDetected = detectLanguageFromText(word.translated);

        updateWord(word.id, {
          fromLang: detected.detectedLang,
          toLang: word.toLang || toLangDetected,
        });
        updatedCount++;
      }

      alert(`Language detection complete! Updated ${updatedCount} words.`);
    } catch (error) {
      console.error('Detection error:', error);
      alert('Error detecting languages. Check console for details.');
    } finally {
      setIsDetecting(false);
    }
  };

  // Column widths state
  const [colWidths, setColWidths] = useState(DEFAULT_COL_WIDTHS);

  // Resize state stored in ref to avoid stale closures
  const resizeState = useRef<{
    col: ColKey;
    startX: number;
    startWidth: number;
  } | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizeState.current) return;
    const { col, startX, startWidth } = resizeState.current;
    const diff = e.clientX - startX;
    const newWidth = Math.max(40, startWidth + diff);
    setColWidths((prev) => ({ ...prev, [col]: newWidth }));
  }, []);

  const handleMouseUp = useCallback(() => {
    resizeState.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleMouseMove]);

  const startResize = useCallback(
    (e: React.MouseEvent, col: ColKey) => {
      e.preventDefault();
      e.stopPropagation();
      resizeState.current = { col, startX: e.clientX, startWidth: colWidths[col] };
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [colWidths, handleMouseMove, handleMouseUp],
  );

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const totalWidth = Object.values(colWidths).reduce((a, b) => a + b, 0);

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredWords.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });

  const ResizeHandle = ({ col }: { col: ColKey }) => (
    <div
      onMouseDown={(e) => startResize(e, col)}
      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-emerald-500 transition-colors z-20"
      style={{ touchAction: 'none' }}
    />
  );

  return (
    <div className="flex h-screen bg-[#1c1c1c] text-slate-300 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-14 flex flex-col items-center py-4 bg-[#161616] border-r border-[#2a2a2a] shrink-0">
        <div className="size-8 bg-emerald-500 rounded-lg flex items-center justify-center text-black mb-8">
          <Icon name="bolt" size={18} filled />
        </div>
        <div className="flex flex-col gap-4">
          <button onClick={() => setShowImport(true)} className="text-emerald-500">
            <Icon name="database" size={18} filled />
          </button>
          <button onClick={() => navigate('/')} className="text-slate-500 hover:text-slate-300 transition-colors">
            <Icon name="home" size={18} />
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <Icon name="settings" size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="shrink-0 p-3 bg-[#1c1c1c] border-b border-[#2a2a2a]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Icon name="table_chart" className="text-slate-500" size={18} />
              <h1 className="text-base font-semibold text-white">Vocabulary</h1>
              <span className="px-2 py-0.5 rounded bg-[#2a2a2a] text-[10px] text-slate-400 font-bold">
                {filteredWords.length} / {totalWords}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDetectLanguages}
                disabled={isDetecting}
                className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors ${
                  isDetecting
                    ? 'bg-slate-600 text-slate-400 cursor-wait'
                    : 'bg-primary hover:bg-primary-dark text-white'
                }`}
                title="AI detect languages for all words"
              >
                <Icon name="translate" size={14} />
                {isDetecting ? 'Detecting...' : 'AI Detect Lang'}
              </button>
              <button
                onClick={() => navigate(-1)}
                className="px-3 py-1 bg-[#2a2a2a] hover:bg-[#333] text-slate-200 rounded text-xs transition-colors"
              >
                Back
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Icon name="search" size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter..."
                className="bg-[#161616] border border-[#2a2a2a] rounded px-7 py-1 text-xs w-48 focus:border-emerald-500/50 outline-none"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-[#161616] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-slate-300"
            >
              <option value="All">All types</option>
              <option value="Noun">Noun</option>
              <option value="Verb">Verb</option>
              <option value="Adjective">Adjective</option>
              <option value="Phrase">Phrase</option>
              <option value="Sentence">Sentence</option>
              <option value="Term">Term</option>
            </select>

            <select
              value={filterDeck}
              onChange={(e) => setFilterDeck(e.target.value)}
              className="bg-[#161616] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-slate-300"
            >
              <option value="All">All decks</option>
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>
        </header>

        {/* Table Container */}
        <div className="flex-1 overflow-hidden bg-[#161616]">
          <div className="h-full overflow-x-auto">
            <div style={{ minWidth: totalWidth }}>
              {/* Header Row */}
              <div className="sticky top-0 z-10 bg-[#1c1c1c] border-b border-[#2a2a2a] flex text-[10px] font-bold text-slate-500 uppercase">
                <div
                  style={{ width: colWidths.checkbox }}
                  className="p-2 border-r border-[#2a2a2a] flex items-center justify-center"
                >
                  <Icon name="check_box_outline_blank" size={14} />
                </div>
                <div style={{ width: colWidths.id }} className="p-2 border-r border-[#2a2a2a] relative">
                  <span>ID</span>
                  <ResizeHandle col="id" />
                </div>
                <div style={{ width: colWidths.original }} className="p-2 border-r border-[#2a2a2a] relative">
                  <span>Original</span>
                  <ResizeHandle col="original" />
                </div>
                <div style={{ width: colWidths.fromLang }} className="p-2 border-r border-[#2a2a2a] relative">
                  <span>Ori.L</span>
                  <ResizeHandle col="fromLang" />
                </div>
                <div style={{ width: colWidths.translated }} className="p-2 border-r border-[#2a2a2a] relative">
                  <span>Translation</span>
                  <ResizeHandle col="translated" />
                </div>
                <div style={{ width: colWidths.toLang }} className="p-2 border-r border-[#2a2a2a] relative">
                  <span>Tr.L</span>
                  <ResizeHandle col="toLang" />
                </div>
                <div style={{ width: colWidths.type }} className="p-2 border-r border-[#2a2a2a] relative">
                  <span>Type</span>
                  <ResizeHandle col="type" />
                </div>
                <div style={{ width: colWidths.deck }} className="p-2 border-r border-[#2a2a2a] relative">
                  <span>Deck</span>
                  <ResizeHandle col="deck" />
                </div>
                <div style={{ width: colWidths.actions }} className="p-2">
                  <span>Actions</span>
                </div>
              </div>

              {/* Virtualized Body */}
              <div ref={parentRef} className="overflow-y-auto" style={{ height: 'calc(100vh - 180px)' }}>
                <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const word = filteredWords[virtualRow.index];
                    const isEditing = editingId === word.id;

                    return (
                      <div
                        key={word.id}
                        className={`absolute left-0 right-0 flex text-xs border-b border-[#2a2a2a] ${
                          isEditing ? 'bg-emerald-500/10' : 'hover:bg-[#1c1c1c]'
                        }`}
                        style={{
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        {/* Checkbox */}
                        <div
                          style={{ width: colWidths.checkbox }}
                          className="p-2 border-r border-[#2a2a2a] flex items-center justify-center text-slate-600"
                        >
                          <Icon name="check_box_outline_blank" size={14} />
                        </div>

                        {/* ID */}
                        <div
                          style={{ width: colWidths.id }}
                          className="p-2 border-r border-[#2a2a2a] truncate font-mono text-[9px] text-slate-500"
                        >
                          {word.id.slice(0, 5)}..
                        </div>

                        {/* Original */}
                        <div style={{ width: colWidths.original }} className="p-2 border-r border-[#2a2a2a] truncate">
                          {isEditing ? (
                            <input
                              autoFocus
                              className="w-full bg-transparent outline-none text-white font-bold"
                              value={editForm.original || ''}
                              onChange={(e) => setEditForm({ ...editForm, original: e.target.value })}
                            />
                          ) : (
                            <span className="text-slate-200 font-bold">{word.original}</span>
                          )}
                        </div>

                        {/* From Lang */}
                        <div style={{ width: colWidths.fromLang }} className="p-2 border-r border-[#2a2a2a] truncate">
                          {isEditing ? (
                            <input
                              className="w-full bg-transparent outline-none text-cyan-400 text-[10px] uppercase"
                              value={editForm.fromLang || ''}
                              onChange={(e) => setEditForm({ ...editForm, fromLang: e.target.value.toUpperCase() })}
                              placeholder="DE"
                              maxLength={3}
                            />
                          ) : (
                            <span
                              className={`text-[10px] font-bold ${word.fromLang ? 'text-cyan-400' : 'text-slate-600'}`}
                            >
                              {word.fromLang || '—'}
                            </span>
                          )}
                        </div>

                        {/* Translated */}
                        <div style={{ width: colWidths.translated }} className="p-2 border-r border-[#2a2a2a] truncate">
                          {isEditing ? (
                            <input
                              className="w-full bg-transparent outline-none text-slate-300"
                              value={editForm.translated || ''}
                              onChange={(e) => setEditForm({ ...editForm, translated: e.target.value })}
                            />
                          ) : (
                            <span className="text-slate-400">{word.translated}</span>
                          )}
                        </div>

                        {/* To Lang */}
                        <div style={{ width: colWidths.toLang }} className="p-2 border-r border-[#2a2a2a] truncate">
                          {isEditing ? (
                            <input
                              className="w-full bg-transparent outline-none text-amber-400 text-[10px] uppercase"
                              value={editForm.toLang || ''}
                              onChange={(e) => setEditForm({ ...editForm, toLang: e.target.value.toUpperCase() })}
                              placeholder="EN"
                              maxLength={3}
                            />
                          ) : (
                            <span
                              className={`text-[10px] font-bold ${word.toLang ? 'text-amber-400' : 'text-slate-600'}`}
                            >
                              {word.toLang || '—'}
                            </span>
                          )}
                        </div>

                        {/* Type */}
                        <div style={{ width: colWidths.type }} className="p-2 border-r border-[#2a2a2a] truncate">
                          {isEditing ? (
                            <select
                              className="w-full bg-[#1c1c1c] text-slate-300 text-[10px] outline-none"
                              value={editForm.type || 'Term'}
                              onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                            >
                              <option value="Noun">Noun</option>
                              <option value="Verb">Verb</option>
                              <option value="Adjective">Adj</option>
                              <option value="Phrase">Phrase</option>
                              <option value="Sentence">Sent</option>
                              <option value="Term">Term</option>
                            </select>
                          ) : (
                            <span className="px-1 py-0.5 rounded bg-[#2a2a2a] text-[9px] text-slate-400">
                              {word.type || 'Term'}
                            </span>
                          )}
                        </div>

                        {/* Deck - EDITABLE */}
                        <div style={{ width: colWidths.deck }} className="p-2 border-r border-[#2a2a2a] truncate">
                          {isEditing ? (
                            <select
                              className="w-full bg-[#1c1c1c] text-slate-300 text-[10px] outline-none"
                              value={editForm.deckId || ''}
                              onChange={(e) => setEditForm({ ...editForm, deckId: e.target.value })}
                            >
                              {decks.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.title}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-500 text-[10px]">
                              {decks.find((d) => d.id === word.deckId)?.title || '—'}
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div style={{ width: colWidths.actions }} className="p-2 flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={saveEdit}
                                className="text-emerald-500 hover:text-emerald-400 text-[10px] font-bold"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="text-slate-500 hover:text-slate-400 text-[10px]"
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(word)}
                                className="p-1 text-slate-600 hover:text-white transition-colors"
                              >
                                <Icon name="edit" size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Delete?')) deleteWord(word.id);
                                }}
                                className="p-1 text-slate-600 hover:text-rose-500 transition-colors"
                              >
                                <Icon name="delete" size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="shrink-0 h-7 bg-[#1c1c1c] border-t border-[#2a2a2a] flex items-center px-3 gap-3 text-[9px] font-bold text-slate-500 uppercase">
          <div className="flex items-center gap-1">
            <div className="size-1.5 rounded-full bg-emerald-500" />
            Ready
          </div>
          <div>Showing {filteredWords.length} rows</div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">Ori.L</span>=Original Lang
            <span className="text-amber-400">Tr.L</span>=Translation Lang
          </div>
        </footer>
      </div>

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
              className="relative w-full max-w-lg bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-6 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-white mb-4">Import Vocabulary CSV</h3>
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />

              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#2a2a2a] rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-[#222] transition-colors"
                >
                  <Icon name="upload_file" size={32} className="text-slate-500 mb-2" />
                  <p className="text-xs font-bold text-slate-400 uppercase">Select CSV File</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-3">
                    <Icon name="check_circle" className="text-emerald-500" />
                    <span className="text-sm font-bold text-emerald-400 truncate">{selectedFile.name}</span>
                  </div>

                  {/* Target Deck Selector */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Target Deck</label>
                    <select
                      value={targetDeckId}
                      onChange={(e) => setTargetDeckId(e.target.value)}
                      className="w-full bg-[#161616] border border-[#2a2a2a] rounded p-2 text-xs text-slate-300 outline-none focus:border-emerald-500"
                    >
                      <option value="" disabled>
                        Select a deck...
                      </option>
                      {decks.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Original Col</label>
                      <select
                        value={termCol}
                        onChange={(e) => setTermCol(Number(e.target.value))}
                        className="w-full bg-[#161616] border border-[#2a2a2a] rounded p-2 text-xs text-slate-300 outline-none focus:border-emerald-500"
                      >
                        {parsedData[0]?.map((_, i) => (
                          <option key={i} value={i}>
                            Col {i + 1} ({parsedData[0][i].substring(0, 8)}...)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                        Translation Col
                      </label>
                      <select
                        value={defCol}
                        onChange={(e) => setDefCol(Number(e.target.value))}
                        className="w-full bg-[#161616] border border-[#2a2a2a] rounded p-2 text-xs text-slate-300 outline-none focus:border-emerald-500"
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
                      className={`size-3 rounded-full border ${swapLanguages ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'}`}
                    />
                    <span className="text-xs text-slate-400">Swap Source/Target</span>
                  </div>

                  <button
                    onClick={handleImport}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-black rounded-lg font-bold uppercase text-xs transition-colors"
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
