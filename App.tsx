import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from './store/useStore';
import { supabase } from './utils/supabase';

// Eagerly loaded - critical path
import { Dashboard } from './screens/Dashboard';
import { Library } from './screens/Library';

// Lazy loaded - secondary screens
const DeckView = lazy(() => import('./screens/DeckView').then((m) => ({ default: m.DeckView })));
const FlashcardSession = lazy(() =>
  import('./screens/FlashcardSession').then((m) => ({ default: m.FlashcardSession })),
);
const Profile = lazy(() => import('./screens/Profile').then((m) => ({ default: m.Profile })));
const SpellingPractice = lazy(() =>
  import('./screens/SpellingPractice').then((m) => ({ default: m.SpellingPractice })),
);
const WeakWords = lazy(() => import('./screens/WeakWords').then((m) => ({ default: m.WeakWords })));
const Settings = lazy(() => import('./screens/Settings').then((m) => ({ default: m.Settings })));
const AIQuiz = lazy(() => import('./screens/AIQuiz').then((m) => ({ default: m.AIQuiz })));
const AITutor = lazy(() => import('./screens/AITutor').then((m) => ({ default: m.AITutor })));
const Help = lazy(() => import('./screens/Help').then((m) => ({ default: m.Help })));
const VocabularyManager = lazy(() =>
  import('./screens/VocabularyManager').then((m) => ({ default: m.VocabularyManager })),
);

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-background-light dark:bg-background-dark">
    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// Page transition variants
const pageVariants = {
  initial: { opacity: 0, x: 20 },
  enter: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

const pageTransition = {
  duration: 0.2,
  ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
};

// Animated routes wrapper
const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={pageVariants}
        transition={pageTransition}
        className="h-full w-full"
      >
        <Routes location={location}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/library" element={<Library />} />
          <Route path="/deck/:id" element={<DeckView />} />
          <Route path="/flashcards/:deckId" element={<FlashcardSession />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/spelling/:deckId" element={<SpellingPractice />} />
          <Route path="/weak-words" element={<WeakWords />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/ai-quiz/:deckId" element={<AIQuiz />} />
          <Route path="/ai-tutor" element={<AITutor />} />
          <Route path="/help" element={<Help />} />
          <Route path="/vocabulary" element={<VocabularyManager />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const App: React.FC = () => {
  const { isDarkMode, setUser, syncFromSupabase } = useStore();

  // Initialize Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) syncFromSupabase();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) syncFromSupabase();
    });

    return () => subscription.unsubscribe();
  }, []);

  // Apply theme class to html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <Router>
      <div className="w-full h-full bg-neutral-100 dark:bg-neutral-900 flex justify-center overflow-hidden">
        {/* Wrapper to simulate mobile view on desktop if opened there */}
        <div className="w-full max-w-md bg-background-light dark:bg-background-dark h-full shadow-2xl relative overflow-hidden flex flex-col">
          <Suspense fallback={<PageLoader />}>
            <AnimatedRoutes />
          </Suspense>
        </div>
      </div>
    </Router>
  );
};

export default App;
