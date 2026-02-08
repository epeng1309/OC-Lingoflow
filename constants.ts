import { Deck, Word, Achievement } from './types';

export const DECKS: Deck[] = [
  {
    id: '1',
    title: 'German Verbs',
    subtitle: 'Basics • 50 words',
    count: 50,
    progress: 10,
    fromLang: 'German',
    toLang: 'English',
    colorClass: 'text-primary bg-blue-50 dark:bg-blue-900/20',
    icon: 'menu_book',
    isNew: true,
  },
  {
    id: '2',
    title: 'Travel Phrases',
    subtitle: 'Last studied: Yesterday',
    count: 230,
    progress: 65,
    fromLang: 'English',
    toLang: 'German',
    colorClass: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20',
    icon: 'flight',
  },
  {
    id: '3',
    title: 'Kitchen Vocab',
    subtitle: 'Review needed • 45 words',
    count: 45,
    progress: 85,
    fromLang: 'German',
    toLang: 'English',
    colorClass: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
    icon: 'restaurant',
    isReview: true,
  },
];

export const WORD_LIST: Word[] = [
  { id: '1', deckId: '1', original: 'Der Apfel', translated: 'The Apple', type: 'Noun', audio: true, proficiency: 85 },
  { id: '2', deckId: '1', original: 'Das Haus', translated: 'The House', type: 'Noun', audio: true, proficiency: 40 },
  { id: '3', deckId: '1', original: 'Laufen', translated: 'To run', type: 'Verb', audio: true, proficiency: 10 },
  { id: '4', deckId: '1', original: 'Der Hund', translated: 'The Dog', type: 'Noun', audio: true, proficiency: 95 },
  { id: '5', deckId: '1', original: 'Glücklich', translated: 'Happy', type: 'Adjective', audio: true, proficiency: 60 },
  { id: '6', deckId: '1', original: 'Der Baum', translated: 'The Tree', type: 'Noun', audio: true, proficiency: 25 },
  { id: '7', deckId: '1', original: 'Sehen', translated: 'To see', type: 'Verb', audio: true, proficiency: 5 },
];

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: '1',
    title: 'First 50',
    subtitle: 'Words Learned',
    icon: 'star',
    colorBg: 'bg-yellow-100 dark:bg-yellow-500/20',
    colorText: 'text-yellow-600 dark:text-yellow-400',
  },
  {
    id: '2',
    title: '7 Day Streak',
    subtitle: 'Consistency',
    icon: 'local_fire_department',
    colorBg: 'bg-orange-100 dark:bg-orange-500/20',
    colorText: 'text-orange-600 dark:text-orange-400',
  },
  {
    id: '3',
    title: 'Pro Speaker',
    subtitle: 'Pronunciation',
    icon: 'mic',
    colorBg: 'bg-slate-200 dark:bg-slate-700',
    colorText: 'text-slate-400 dark:text-slate-500',
    locked: true,
  },
];
