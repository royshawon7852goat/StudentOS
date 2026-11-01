import React, { useState, useEffect } from 'react';
import { Menu, Sun, Moon, Plus, Bell, Flame, Search } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export function Header({ currentView, onOpenMobileMenu, onOpenTimer, onQuickAdd }) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const titles = {
    dashboard: 'Dashboard Overview',
    attendance: 'Attendance Tracker & Bunk Calculator',
    assignments: 'Assignment Manager & Deadlines',
    study: 'Daily & Weekly Study Planner',
    exams: 'Examination Hub & Countdown',
    analytics: 'Academic Performance Analytics',
    settings: 'Settings & Profile Preferences',
  };

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const formattedClock = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-[#0c1220]/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 flex items-center justify-between transition-colors">
      {/* Left: Mobile hamburger & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 lg:hidden hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
            {titles[currentView] || 'Dashboard'}
          </h1>
          <p className="hidden sm:block text-xs text-slate-400">
            {user?.university ? `${user.university} • ${user.major || 'Student'}` : 'University Academic Portal'}
          </p>
        </div>
      </div>

      {/* Right: Live time, Focus timer, Theme toggle, Quick action */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Date / Time Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-850/80 border border-slate-200/60 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span>{formattedDate}</span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{formattedClock}</span>
        </div>

        {/* Quick Focus Timer Button */}
        <button
          onClick={onOpenTimer}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold transition-colors"
          title="Open Focus Timer"
        >
          <Flame className="w-3.5 h-3.5 fill-current" />
          <span className="hidden sm:inline">Timer</span>
        </button>

        {/* Theme switcher */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Quick Add Button */}
        {onQuickAdd && (
          <button
            onClick={onQuickAdd}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Quick Add</span>
          </button>
        )}
      </div>
    </header>
  );
}
