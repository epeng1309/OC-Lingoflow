export enum Screen {
  DASHBOARD = 'DASHBOARD',
  LIBRARY = 'LIBRARY',
  DECK_VIEW = 'DECK_VIEW',
  FLASHCARD = 'FLASHCARD',
  SPELLING = 'SPELLING',
  STATS = 'STATS',
  WEAK_WORDS = 'WEAK_WORDS',
  SETTINGS = 'SETTINGS',
}

export interface Deck {
  id: string;
  title: string;
  subtitle: string;
  count: number;
  progress: number;
  fromLang: string;
  toLang: string;
  colorClass: string;
  icon: string;
  isNew?: boolean;
  isReview?: boolean;
}

export interface Word {
  id: string;
  deckId: string;
  original: string;
  translated: string;
  type: string;
  fromLang?: string; // Original language code: DE, EN, CN, etc.
  toLang?: string; // Translation language code: DE, EN, CN, etc.
  imageUrl?: string;
  audio?: boolean;
  proficiency?: number; // 0-100
}

export interface Achievement {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  colorBg: string;
  colorText: string;
  locked?: boolean;
}

export interface HistoryEntry {
  date: string; // ISO date string YYYY-MM-DD
  count: number;
  deckId: string;
}
