import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Icon } from '../components/Icon';
import { BottomNav } from '../components/BottomNav';

interface DashboardProps {}

export const Dashboard: React.FC<DashboardProps> = () => {
  const navigate = useNavigate();
  const { history, words } = useStore();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Guten Morgen';
    if (hour < 18) return 'Guten Tag';
    return 'Guten Abend';
  };

  const calculateStreak = () => {
    if (history.length === 0) return 0;

    // Get unique study dates and sort descending (most recent first)
    const uniqueDates = Array.from(new Set(history.map((h) => h.date)))
      .sort()
      .reverse();
    if (uniqueDates.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Streak must include today or yesterday to be active
    const mostRecentStudy = uniqueDates[0];
    if (mostRecentStudy !== todayStr && mostRecentStudy !== yesterdayStr) {
      return 0; // Streak broken
    }

    // Count consecutive days backwards
    let streak = 0;
    let checkDate = mostRecentStudy === todayStr ? today : yesterday;

    for (const dateStr of uniqueDates) {
      const expectedStr = checkDate.toISOString().split('T')[0];
      if (dateStr === expectedStr) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (dateStr < expectedStr) {
        // Gap found, streak ends
        break;
      }
    }

    return streak;
  };

  const todayCount = history
    .filter((h) => h.date === new Date().toISOString().split('T')[0])
    .reduce((acc, curr) => acc + curr.count, 0);

  const streak = calculateStreak();
  const mastered = words.filter((w) => w.type !== 'Term').length; // Mock logic for 'mastered'

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden pb-24 bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold leading-tight tracking-[-0.015em]">{getGreeting()}!</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Ready to learn German? (v2.0)</p>
          </div>
          <button
            className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            onClick={() => navigate('/settings')}
          >
            <Icon name="settings" />
          </button>
        </div>
      </header>

      <main className="flex flex-col gap-6 p-4">
        {/* Progress Section */}
        <section className="w-full">
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center gap-6">
            <div className="w-full flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold">Today's Goal</h3>
              <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                Keep going!
              </span>
            </div>
            {/* Circular Progress */}
            <div className="relative w-48 h-48 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-[12px] border-slate-100 dark:border-slate-800"></div>
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(#13a4ec ${(todayCount / 20) * 100}%, transparent 0)`,
                  mask: 'radial-gradient(transparent 58%, black 59%)',
                  WebkitMask: 'radial-gradient(transparent 58%, black 59%)',
                  borderRadius: '50%',
                }}
              ></div>
              <div className="flex flex-col items-center justify-center z-10">
                <span className="text-4xl font-bold tracking-tight">{todayCount}</span>
                <span className="text-sm font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">
                  of 20 words
                </span>
              </div>
            </div>
            <div className="text-center max-w-[80%]">
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                You've reviewed{' '}
                <span className="font-bold text-primary">{Math.min(100, Math.round((todayCount / 20) * 100))}%</span> of
                your daily target.
              </p>
            </div>
          </div>
        </section>

        {/* AI Tutor Hero Card */}
        <section>
          <div
            onClick={() => navigate('/ai-tutor')}
            className="group relative h-40 w-full overflow-hidden rounded-3xl bg-indigo-600 p-6 flex items-center justify-between cursor-pointer shadow-xl shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="z-10 flex-1">
              <span className="inline-block px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-widest mb-2">
                New: Generative AI
              </span>
              <h3 className="text-2xl font-black text-white leading-tight">
                Practice with
                <br />
                your AI Tutor
              </h3>
              <p className="text-indigo-100 text-xs font-semibold mt-2 opacity-80">
                Conversational learning powered by Gemini
              </p>
            </div>
            <div className="relative z-10 shrink-0 size-20 bg-white/10 rounded-2xl backdrop-blur-md flex items-center justify-center border border-white/20">
              <Icon name="robot_2" size={40} className="text-white" filled />
            </div>
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/40 to-transparent"></div>
            <div className="absolute -bottom-10 -right-10 size-40 bg-white/5 rounded-full blur-3xl"></div>
          </div>
        </section>

        {/* Stats Grid */}
        <section>
          <div className="grid grid-cols-2 gap-4">
            <div
              className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-start gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              onClick={() => navigate('/stats')}
            >
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-500 dark:text-orange-400">
                <Icon name="local_fire_department" />
              </div>
              <div>
                <h4 className="text-2xl font-bold">{streak}</h4>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Day Streak
                </p>
              </div>
            </div>

            <div
              className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-start gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              onClick={() => navigate('/weak-words')}
            >
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                <Icon name="school" />
              </div>
              <div>
                <h4 className="text-2xl font-bold">{mastered}</h4>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Words Mastered
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
};
