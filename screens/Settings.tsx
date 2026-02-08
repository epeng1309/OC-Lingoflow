import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Icon } from '../components/Icon';
import { motion } from 'framer-motion';

import { BottomNav } from '../components/BottomNav';

import { supabase } from '../utils/supabase';

interface SettingsProps {}

export const Settings: React.FC<SettingsProps> = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme, user, setUser, syncFromSupabase } = useStore();

  const [notifications, setNotifications] = useState(true);
  const [sourceLang, setSourceLang] = useState('English');
  const [learnLang, setLearnLang] = useState('German');
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const { words, decks } = useStore();

  const handleDebugSync = async () => {
    if (!user) {
      alert('Please login first');
      return;
    }

    setSyncStatus('Syncing...');
    try {
      // Check what's in Supabase
      const { data: remoteDecks, error: decksError } = await supabase.from('decks').select('*');
      const { data: remoteWords, error: wordsError } = await supabase.from('words').select('*');

      let msg = `=== SYNC DEBUG ===\n`;
      msg += `User ID: ${user.id}\n`;
      msg += `Local decks: ${decks.length}\n`;
      msg += `Local words: ${words.length}\n`;
      msg += `Remote decks: ${remoteDecks?.length ?? 'ERROR: ' + decksError?.message}\n`;
      msg += `Remote words: ${remoteWords?.length ?? 'ERROR: ' + wordsError?.message}\n\n`;

      // If remote is empty, try to push
      if (remoteDecks && remoteDecks.length === 0 && decks.length > 0) {
        msg += `Attempting to push ${decks.length} decks...\n`;
        const deckRows = decks.map((d) => ({
          id: d.id,
          title: d.title,
          subtitle: d.subtitle || '',
          icon: d.icon || 'folder',
          user_id: user.id,
        }));

        const { data: insertedDecks, error: insertError } = await supabase.from('decks').insert(deckRows).select();
        if (insertError) {
          msg += `DECK INSERT ERROR: ${insertError.message}\n`;
          msg += `Error code: ${insertError.code}\n`;
          msg += `Error details: ${JSON.stringify(insertError.details)}\n`;
        } else {
          msg += `SUCCESS: Inserted ${insertedDecks?.length} decks\n`;
        }
      }

      if (remoteWords && remoteWords.length === 0 && words.length > 0) {
        msg += `Attempting to push ${words.length} words...\n`;
        const wordRows = words.map((w) => ({
          id: w.id,
          deck_id: w.deckId,
          original: w.original,
          translated: w.translated,
          type: w.type || 'Term',
          user_id: user.id,
        }));

        const { data: insertedWords, error: insertError } = await supabase.from('words').insert(wordRows).select();
        if (insertError) {
          msg += `WORDS INSERT ERROR: ${insertError.message}\n`;
          msg += `Error code: ${insertError.code}\n`;
          msg += `Error details: ${JSON.stringify(insertError.details)}\n`;
        } else {
          msg += `SUCCESS: Inserted ${insertedWords?.length} words\n`;
        }
      }

      setSyncStatus(msg);
      console.log(msg);
      alert(msg);
    } catch (e: any) {
      const errorMsg = `Sync error: ${e.message}`;
      setSyncStatus(errorMsg);
      alert(errorMsg);
    }
  };

  const handleAuth = async () => {
    const method = confirm('Login with GitHub?\n\nOK = GitHub\nCancel = Email/Password');

    if (method) {
      // GitHub OAuth
      setLoadingAuth(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: window.location.origin + '/settings',
        },
      });
      if (error) {
        alert('GitHub login failed: ' + error.message);
      }
      setLoadingAuth(false);
    } else {
      // Email/Password
      const email = prompt('Enter your email:');
      if (!email) return;
      const password = prompt('Enter your password:');
      if (!password) return;

      setLoadingAuth(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (confirm(`Login failed: ${error.message}\n\nDo you want to Create an Account instead?`)) {
          const { data: upData, error: upError } = await supabase.auth.signUp({ email, password });
          if (upError) {
            alert('Signup failed: ' + upError.message);
          } else {
            alert('Account created! You are now logged in.');
            setUser(upData.user);
            syncFromSupabase();
          }
        }
      } else {
        alert('Logged in successfully!');
        setUser(data.user);
        syncFromSupabase();
      }
      setLoadingAuth(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Log out?')) {
      await supabase.auth.signOut();
      setUser(null);
      navigate('/');
    }
  };

  const cycleLanguage = (current: string, setter: (s: string) => void, options: string[]) => {
    const idx = options.indexOf(current);
    const next = options[(idx + 1) % options.length];
    setter(next);
  };

  const settingsGroups = [
    {
      title: 'Account',
      items: [
        {
          icon: 'cloud_sync',
          label: user ? 'Cloud Sync Active' : 'Sign In / Sign Up',
          value: user ? user.email : 'Not connected',
          action: user ? () => syncFromSupabase().then(() => alert('Synced!')) : handleAuth,
          subtitle: user ? 'Tap to force sync' : 'Sync your progress across devices',
        },
        {
          icon: 'bug_report',
          label: 'Debug Sync',
          action: handleDebugSync,
          subtitle: 'Test sync with detailed error output',
        },
        {
          icon: 'table_view',
          label: 'Vocabulary Manager',
          action: () => navigate('/vocabulary'),
          subtitle: 'Bulk edit & organize words',
        },
        {
          icon: 'workspace_premium',
          label: 'Subscription',
          value: 'Basic Learner',
          action: () => alert('Upgrade to Premium for AI Tutor Plus!'),
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'language',
          label: 'Source language',
          value: sourceLang,
          action: () => cycleLanguage(sourceLang, setSourceLang, ['English', 'Spanish', 'French', 'Chinese']),
        },
        {
          icon: 'translate',
          label: 'Learning language',
          value: learnLang,
          action: () => cycleLanguage(learnLang, setLearnLang, ['German', 'Italian', 'Japanese', 'Portuguese']),
        },
        {
          icon: 'notifications',
          label: 'Notifications',
          toggle: true,
          checked: notifications,
          action: () => setNotifications(!notifications),
        },
        { icon: 'dark_mode', label: 'Dark mode interface', toggle: true, checked: isDarkMode, action: toggleTheme },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help', label: 'Help Center & Onboarding', action: () => navigate('/help') },
        {
          icon: 'feedback',
          label: 'Send Feedback',
          action: () => (window.location.href = 'mailto:support@lingoflow.com'),
        },
        {
          icon: 'info',
          label: 'About LingoFlow',
          value: 'v1.2.0',
          action: () => alert('LingoFlow v1.2.0\nEnhanced with Gemini AI'),
        },
      ],
    },
  ];

  return (
    <div className="relative flex min-h-screen w-full flex-col pb-24 bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white transition-colors duration-200">
      <header className="sticky top-0 z-20 bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-md px-4 h-16 flex items-center gap-4 border-b border-slate-200 dark:border-slate-800">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-primary">
          <Icon name="arrow_back" size={24} />
        </button>
        <h1 className="text-xl font-black tracking-tight">Settings</h1>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
        {settingsGroups.map((group, idx) => (
          <section key={idx}>
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-2">
              {group.title}
            </h2>
            <div className="space-y-3">
              {group.items.map((item, itemIdx) => (
                <motion.div
                  key={itemIdx}
                  whileTap={{ scale: 0.98 }}
                  onClick={item.action}
                  className="flex items-center justify-between p-5 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer transition-all hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-2xl flex items-center justify-center bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      <Icon name={item.icon} size={22} />
                    </div>
                    <div>
                      <p className="font-bold text-sm tracking-tight leading-none">{item.label}</p>
                      {item.subtitle && <p className="text-[10px] text-slate-400 font-medium mt-1">{item.subtitle}</p>}
                    </div>
                  </div>

                  {item.toggle !== undefined ? (
                    <div
                      className={`w-12 h-7 rounded-full relative transition-all duration-300 shadow-inner ${item.checked ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'}`}
                    >
                      <div
                        className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${item.checked ? 'left-6' : 'left-1'}`}
                      ></div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {item.value && <span className="text-xs font-bold text-slate-400">{item.value}</span>}
                      <Icon name="chevron_right" size={18} className="text-slate-200" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </section>
        ))}

        {user && (
          <button
            onClick={handleLogout}
            className="w-full py-5 text-rose-500 font-black uppercase tracking-widest text-[10px] bg-rose-50 dark:bg-rose-900/10 rounded-3xl hover:bg-rose-100 transition-all active:scale-95"
          >
            Sign Out
          </button>
        )}

        <div className="pb-4 text-center">
          <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">
            Designed for Polyglots • 2026
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};
