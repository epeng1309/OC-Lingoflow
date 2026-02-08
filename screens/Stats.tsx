import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Icon } from '../components/Icon';
import { ACHIEVEMENTS } from '../constants';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { BottomNav } from '../components/BottomNav';

interface StatsProps {}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const Stats: React.FC<StatsProps> = () => {
  const navigate = useNavigate();
  const { words, decks, history } = useStore();

  // Calculate real streak (consecutive study days ending today/yesterday)
  const streak = useMemo(() => {
    if (history.length === 0) return 0;
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

    const mostRecentStudy = uniqueDates[0];
    if (mostRecentStudy !== todayStr && mostRecentStudy !== yesterdayStr) {
      return 0;
    }

    let count = 0;
    const checkDate = mostRecentStudy === todayStr ? new Date(today) : new Date(yesterday);

    for (const dateStr of uniqueDates) {
      const expectedStr = checkDate.toISOString().split('T')[0];
      if (dateStr === expectedStr) {
        count++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (dateStr < expectedStr) {
        break;
      }
    }
    return count;
  }, [history]);

  // Generate weekly chart data from actual history
  const chartData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = DAY_NAMES[date.getDay()];
      const count = history.filter((h) => h.date === dateStr).reduce((acc, curr) => acc + curr.count, 0);
      result.push({ name: dayName, value: count, isToday: i === 0 });
    }
    return result;
  }, [history]);

  const totalWords = words.length;

  // Derive mastery from word proficiency
  const { mastered, learning, newWords } = useMemo(() => {
    let masteredCount = 0;
    let learningCount = 0;
    let newCount = 0;

    words.forEach((word) => {
      const p = word.proficiency || 0;
      if (p >= 80) {
        masteredCount++;
      } else if (p >= 20) {
        learningCount++;
      } else {
        newCount++;
      }
    });

    return {
      mastered: masteredCount,
      learning: learningCount,
      newWords: newCount,
    };
  }, [words]);

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden pb-24 bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between bg-background-light/90 dark:bg-background-dark/90 px-4 py-4 backdrop-blur-md">
        <button
          onClick={() => navigate(-1)}
          className="flex size-10 items-center justify-center rounded-full text-slate-900 hover:bg-slate-200 dark:text-white dark:hover:bg-slate-700 transition-colors"
        >
          <Icon name="arrow_back_ios_new" size={24} />
        </button>
        <h1 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">Statistics</h1>
      </header>

      {/* Time Range Selector */}
      <div className="px-4 py-2">
        <div className="flex h-10 w-full items-center rounded-lg bg-slate-200 dark:bg-slate-800 p-1">
          {['Week', 'Month', 'Year'].map((range, index) => (
            <label
              key={range}
              className="group flex flex-1 cursor-pointer items-center justify-center rounded-[6px] py-1 transition-all has-[:checked]:bg-white has-[:checked]:shadow-sm dark:has-[:checked]:bg-primary"
            >
              <input
                className="peer hidden"
                name="time_range"
                type="radio"
                value={range.toLowerCase()}
                defaultChecked={index === 0}
              />
              <span className="text-xs font-medium text-slate-500 peer-checked:text-primary dark:text-slate-400 dark:peer-checked:text-white">
                {range}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6 p-4">
        {/* Hero Metrics */}
        <div className="flex flex-wrap gap-4">
          <div className="flex min-w-[150px] flex-1 flex-col gap-3 rounded-2xl bg-surface-light dark:bg-surface-dark p-5 shadow-soft border border-slate-100 dark:border-slate-700/50">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary">
                <Icon name="schedule" size={18} />
              </span>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Decks</p>
            </div>
            <p className="text-2xl font-bold tracking-tight">{decks.length}</p>
          </div>

          <div className="flex min-w-[150px] flex-1 flex-col gap-3 rounded-2xl bg-surface-light dark:bg-surface-dark p-5 shadow-soft border border-slate-100 dark:border-slate-700/50 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 size-20 rounded-full bg-orange-500/10"></div>
            <div className="flex items-center gap-2 relative z-10">
              <span className="flex items-center justify-center size-8 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
                <Icon name="local_fire_department" size={18} />
              </span>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Streak</p>
            </div>
            <p className="relative z-10 text-2xl font-bold tracking-tight">
              {streak} {streak === 1 ? 'Day' : 'Days'}
            </p>
          </div>
        </div>

        {/* Line Chart */}
        <div className="flex w-full flex-col gap-4 rounded-2xl bg-surface-light dark:bg-surface-dark p-6 shadow-soft border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-medium text-slate-500 dark:text-slate-400">Words Learned</h2>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{totalWords}</p>
                <span className="flex items-center text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                  <Icon name="trending_up" size={14} className="mr-0.5" />
                  +25%
                </span>
              </div>
            </div>
            <button className="text-slate-400 hover:text-primary transition-colors">
              <Icon name="more_horiz" size={20} />
            </button>
          </div>
          <div className="relative h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#13a4ec" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#13a4ec" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" hide />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#13a4ec"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
            {/* Custom Labels below chart matching design */}
            <div className="flex justify-between pt-2">
              {chartData.map((d, i) => (
                <p key={i} className={`text-[11px] font-medium ${d.isToday ? 'text-primary' : 'text-slate-400'}`}>
                  {d.name}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Pie Chart: Proficiency */}
        <div className="flex w-full flex-col gap-6 rounded-2xl bg-surface-light dark:bg-surface-dark p-6 shadow-soft border border-slate-100 dark:border-slate-700/50">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Vocabulary Mastery</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Distribution of your learned words</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-8 justify-center">
            {/* SVG Donut Chart from design */}
            <div className="relative size-40 flex-shrink-0">
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                {/* Background Circle */}
                <circle
                  className="dark:stroke-slate-700"
                  cx="50"
                  cy="50"
                  fill="transparent"
                  r="40"
                  stroke="#f1f5f9"
                  strokeWidth="12"
                ></circle>

                {/* Mastered (Blue) ~30% */}
                <circle
                  cx="50"
                  cy="50"
                  fill="transparent"
                  r="40"
                  stroke="#13a4ec"
                  strokeDasharray={`${0.3 * 251} 251`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                  strokeWidth="12"
                ></circle>

                {/* Learning (Light Blue) ~45% */}
                <circle
                  cx="50"
                  cy="50"
                  fill="transparent"
                  r="40"
                  stroke="#7dd3fc"
                  strokeDasharray={`${0.45 * 251} 251`}
                  strokeDashoffset={`-${0.3 * 251}`}
                  strokeLinecap="round"
                  strokeWidth="12"
                ></circle>

                {/* New (Gray) ~25% */}
                <circle
                  className="dark:stroke-slate-500"
                  cx="50"
                  cy="50"
                  fill="transparent"
                  r="40"
                  stroke="#cbd5e1"
                  strokeDasharray={`${0.25 * 251} 251`}
                  strokeDashoffset={`-${(0.3 + 0.45) * 251}`}
                  strokeLinecap="round"
                  strokeWidth="12"
                ></circle>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{totalWords}</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400">Total</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-col gap-3 w-full sm:w-auto">
              {[
                { label: 'Mastered', count: mastered, color: 'bg-primary' },
                { label: 'Learning', count: learning, color: 'bg-[#7dd3fc]' },
                { label: 'New', count: newWords, color: 'bg-slate-300 dark:bg-slate-500' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className={`size-3 rounded-full ${item.color}`}></div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{item.label}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Achievements Section */}
        <div className="flex w-full flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Achievements</h3>
            <button className="text-sm font-medium text-primary">View All</button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x no-scrollbar -mx-4 px-4">
            {ACHIEVEMENTS.map((ach) => (
              <div
                key={ach.id}
                className={`snap-start flex min-w-[140px] flex-col items-center gap-3 rounded-xl p-4 shadow-soft border ${ach.locked ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 opacity-70 grayscale' : 'bg-surface-light dark:bg-surface-dark border-slate-100 dark:border-slate-700/50'}`}
              >
                <div
                  className={`flex size-14 items-center justify-center rounded-full shadow-sm ${ach.colorBg} ${ach.colorText}`}
                >
                  <Icon name={ach.icon} size={24} />
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <p
                      className={`text-sm font-bold leading-tight ${ach.locked ? 'text-slate-500 dark:text-slate-400' : ''}`}
                    >
                      {ach.title}
                    </p>
                    {ach.locked && <Icon name="lock" size={10} className="text-slate-400" />}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{ach.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Review CTA Section */}
      <div className="p-4 pb-6">
        <button
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-white shadow-lg shadow-blue-500/20 transition-transform active:scale-[0.98] hover:bg-primary-dark"
          onClick={() => navigate('/weak-words')}
        >
          <Icon name="school" />
          Review Weak Words
        </button>
      </div>

      <BottomNav />
    </div>
  );
};
