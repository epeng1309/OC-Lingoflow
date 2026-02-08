import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Word, Deck } from '../types';
import { WORD_LIST, DECKS } from '../constants';
import { supabase } from '../utils/supabase';
import { User } from '@supabase/supabase-js';

interface LanguageFilter {
  id: string;
  name: string;
}

interface AppState {
  words: Word[];
  decks: Deck[];
  languageFilters: LanguageFilter[];
  isDarkMode: boolean;
  user: User | null; // Auth User

  // Actions
  addWords: (newWords: Word[]) => void;
  updateWord: (id: string, updates: Partial<Word>) => void;
  deleteWord: (id: string) => void;
  createDeck: (deck: Deck) => void;
  updateDeck: (id: string, updates: Partial<Deck>) => void;
  deleteDeck: (id: string) => void;

  // Auth & Sync
  setUser: (user: User | null) => void;
  syncFromSupabase: () => Promise<void>;

  addLanguageFilter: (filter: LanguageFilter) => void;
  updateLanguageFilter: (id: string, name: string) => void;
  deleteLanguageFilter: (id: string) => void;
  autoGenerateFilters: () => void;
  history: { date: string; count: number; deckId: string }[];
  logStudy: (count: number, deckId: string) => void;
  setTheme: (isDark: boolean) => void;
  toggleTheme: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      words: WORD_LIST,
      decks: DECKS,
      languageFilters: [], // Will be auto-generated
      isDarkMode: false,
      user: null,

      setUser: (user) => set({ user }),

      syncFromSupabase: async () => {
        const { user, words: localWords, decks: localDecks } = get();
        if (!user) return;

        try {
          // 1. Fetch remote data
          const { data: remoteDecks, error: decksError } = await supabase.from('decks').select('*');
          if (decksError) throw decksError;

          const { data: remoteWords, error: wordsError } = await supabase.from('words').select('*');
          if (wordsError) throw wordsError;

          const hasRemoteDecks = remoteDecks && remoteDecks.length > 0;
          const hasRemoteWords = remoteWords && remoteWords.length > 0;
          const hasLocalDecks = localDecks && localDecks.length > 0;
          const hasLocalWords = localWords && localWords.length > 0;

          // CASE 1: Remote is empty, but local has data -> PUSH local to Supabase
          if (!hasRemoteDecks && hasLocalDecks) {
            console.log('[Sync] Remote empty, pushing local decks to Supabase...');
            const deckRows = localDecks.map((d) => ({
              id: d.id,
              title: d.title,
              subtitle: d.subtitle || '',
              icon: d.icon || 'folder',
              user_id: user.id,
            }));

            const { error: insertDecksError } = await supabase.from('decks').insert(deckRows);
            if (insertDecksError) {
              console.error('Supabase Deck Push Error:', insertDecksError);
            } else {
              console.log('[Sync] Successfully pushed', deckRows.length, 'decks to Supabase');
            }
          }

          if (!hasRemoteWords && hasLocalWords) {
            console.log('[Sync] Remote empty, pushing local words to Supabase...');
            const wordRows = localWords.map((w) => ({
              id: w.id,
              deck_id: w.deckId,
              original: w.original,
              translated: w.translated,
              type: w.type || 'Term',
              user_id: user.id,
            }));

            const { error: insertWordsError } = await supabase.from('words').insert(wordRows);
            if (insertWordsError) {
              console.error('Supabase Words Push Error:', insertWordsError);
            } else {
              console.log('[Sync] Successfully pushed', wordRows.length, 'words to Supabase');
            }
          }

          // CASE 2: Remote has data -> Pull from remote (remote wins)
          if (hasRemoteDecks) {
            console.log('[Sync] Pulling', remoteDecks.length, 'decks from Supabase...');
            const mappedDecks = remoteDecks.map((d: any) => ({
              id: d.id,
              title: d.title,
              subtitle: d.subtitle || '',
              count: 0,
              progress: 0,
              fromLang: 'German',
              toLang: 'English',
              colorClass: 'bg-emerald-500',
              icon: d.icon || 'folder',
            }));
            set({ decks: mappedDecks });
          }

          if (hasRemoteWords) {
            console.log('[Sync] Pulling', remoteWords.length, 'words from Supabase...');
            const mappedWords = remoteWords.map((w: any) => {
              const localMatch = localWords.find((lw) => lw.id === w.id);
              return {
                id: w.id,
                deckId: w.deck_id,
                original: w.original,
                translated: w.translated,
                type: w.type || 'Term',
                audio: true,
                fromLang: 'DE',
                toLang: 'EN',
                proficiency: w.proficiency ?? localMatch?.proficiency ?? 0,
              };
            });
            set({ words: mappedWords });
          }

          console.log('[Sync] Synchronization complete');
        } catch (e) {
          console.error('Sync Error:', e);
        }
      },

      addWords: (newWords) => {
        set((state) => {
          const updated = [...state.words, ...newWords];

          // Supabase Sync
          const { user } = state;
          if (user) {
            const rows = newWords.map((w) => ({
              id: w.id, // Ensure UUID or handle mapping
              deck_id: w.deckId,
              original: w.original,
              translated: w.translated,
              type: w.type,
              user_id: user.id,
            }));
            supabase
              .from('words')
              .insert(rows)
              .then(({ error }) => {
                if (error) console.error('Supabase Insert Error:', error);
              });
          }

          return { words: updated };
        });
      },

      updateWord: (id, updates) =>
        set((state) => {
          const updated = state.words.map((w) => (w.id === id ? { ...w, ...updates } : w));

          // Supabase Sync
          if (state.user) {
            const row: any = { ...updates };
            // Map camelCase to snake_case if needed
            if (row.deckId) {
              row.deck_id = row.deckId;
              delete row.deckId;
            }

            supabase
              .from('words')
              .update(row)
              .eq('id', id)
              .then(({ error }) => {
                if (error) console.error('Supabase Update Error:', error);
              });
          }

          return { words: updated };
        }),

      deleteWord: (id) =>
        set((state) => {
          if (state.user) {
            supabase
              .from('words')
              .delete()
              .eq('id', id)
              .then(({ error }) => {
                if (error) console.error('Supabase Delete Error:', error);
              });
          }
          return { words: state.words.filter((w) => w.id !== id) };
        }),

      createDeck: (deck) =>
        set((state) => {
          if (state.user) {
            supabase
              .from('decks')
              .insert({
                id: deck.id,
                title: deck.title,
                subtitle: deck.subtitle,
                icon: deck.icon,
                user_id: state.user.id,
              })
              .then(({ error }) => {
                if (error) console.error('Supabase Deck Insert Error:', error);
              });
          }
          return { decks: [...state.decks, deck] };
        }),

      updateDeck: (id, updates) =>
        set((state) => {
          if (state.user) {
            supabase
              .from('decks')
              .update(updates)
              .eq('id', id)
              .then(({ error }) => {
                if (error) console.error('Supabase Deck Update Error:', error);
              });
          }
          return { decks: state.decks.map((deck) => (deck.id === id ? { ...deck, ...updates } : deck)) };
        }),

      deleteDeck: (id) =>
        set((state) => {
          if (state.user) {
            supabase
              .from('decks')
              .delete()
              .eq('id', id)
              .then(({ error }) => {
                if (error) console.error('Supabase Deck Delete Error:', error);
              });
          }
          return {
            decks: state.decks.filter((d) => d.id !== id),
            words: state.words.filter((w) => w.deckId !== id),
          };
        }),

      addLanguageFilter: (filter) =>
        set((state) => ({
          languageFilters: [...state.languageFilters, filter],
        })),
      updateLanguageFilter: (id, name) =>
        set((state) => ({
          languageFilters: state.languageFilters.map((f) => (f.id === id ? { ...f, name } : f)),
        })),
      deleteLanguageFilter: (id) =>
        set((state) => ({
          languageFilters: state.languageFilters.filter((f) => f.id !== id),
        })),
      autoGenerateFilters: () => {
        const state = get();
        // Extract unique languages from decks
        const languages = new Set<string>();
        state.decks.forEach((deck) => {
          if (deck.fromLang) languages.add(deck.fromLang);
          if (deck.toLang) languages.add(deck.toLang);
        });

        // Create filters for languages not already in filters
        const existingNames = new Set(state.languageFilters.map((f) => f.name.toLowerCase()));
        const newFilters: LanguageFilter[] = [];

        languages.forEach((lang) => {
          if (!existingNames.has(lang.toLowerCase())) {
            newFilters.push({
              id: `lang-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              name: lang,
            });
          }
        });

        if (newFilters.length > 0) {
          set((state) => ({
            languageFilters: [...state.languageFilters, ...newFilters],
          }));
        }
      },
      history: [],
      logStudy: (count, deckId) =>
        set((state) => {
          const today = new Date().toISOString().split('T')[0];
          return {
            history: [...state.history, { date: today, count, deckId }],
          };
        }),
      setTheme: (isDark) => set({ isDarkMode: isDark }),
      toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
    }),
    {
      name: 'lingoflow-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
