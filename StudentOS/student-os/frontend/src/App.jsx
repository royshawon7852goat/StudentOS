import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './views/DashboardView';
import { AttendanceView } from './views/AttendanceView';
import { AssignmentsView } from './views/AssignmentsView';
import { StudyPlannerView } from './views/StudyPlannerView';
import { ExaminationsView } from './views/ExaminationsView';
import { AnalyticsView } from './views/AnalyticsView';
import { SettingsView } from './views/SettingsView';
import { AuthView } from './views/AuthView';
import { FocusTimerModal } from './components/common/FocusTimerModal';
import { Modal } from './components/common/Modal';
import { api } from './api/client';
import { CheckSquare, FileText, Calendar, GraduationCap } from 'lucide-react';

export function AppContent() {
  const { user, token, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState('assignment');

  // Shared state for counts & timer
  const [subjects, setSubjects] = useState([]);
  const [counts, setCounts] = useState({
    criticalSubjects: 0,
    pendingAssignments: 0,
    upcomingExams: 0,
  });

  const refreshCounts = async () => {
    if (!token) return;
    try {
      const [subs, assigns, exams] = await Promise.all([
        api.subjects.list(),
        api.assignments.list({ status: 'pending' }),
        api.exams.list(),
      ]);
      setSubjects(subs);
      const criticalCount = subs.filter(s => s.percentage < s.target_percentage).length;
      const upcomingExamsCount = exams.filter(e => e.is_upcoming).length;
      setCounts({
        criticalSubjects: criticalCount,
        pendingAssignments: assigns.length,
        upcomingExams: upcomingExamsCount,
      });
    } catch {
      // Ignore background errors
    }
  };

  useEffect(() => {
    if (token) {
      refreshCounts();
    }
  }, [token, currentView]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-white space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/25 animate-pulse">
          <GraduationCap className="w-6 h-6" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Loading StudentOS...</p>
      </div>
    );
  }

  if (!token || !user) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex transition-colors">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        counts={counts}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        onOpenTimer={() => setIsTimerOpen(true)}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <Header
          currentView={currentView}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          onOpenTimer={() => setIsTimerOpen(true)}
          onQuickAdd={() => setIsQuickAddOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentView === 'dashboard' && (
            <DashboardView
              onNavigate={(view) => setCurrentView(view)}
              onOpenTimer={() => setIsTimerOpen(true)}
              onQuickAdd={() => setIsQuickAddOpen(true)}
            />
          )}
          {currentView === 'attendance' && <AttendanceView />}
          {currentView === 'assignments' && <AssignmentsView />}
          {currentView === 'study' && <StudyPlannerView onOpenTimer={() => setIsTimerOpen(true)} />}
          {currentView === 'exams' && <ExaminationsView />}
          {currentView === 'analytics' && <AnalyticsView />}
          {currentView === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Global Focus / Pomodoro Timer Modal */}
      <FocusTimerModal
        isOpen={isTimerOpen}
        onClose={() => setIsTimerOpen(false)}
        subjects={subjects}
        onSessionSaved={refreshCounts}
      />

      {/* Quick Add Chooser Modal */}
      <Modal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        title="Quick Create"
        maxWidth="max-w-md"
      >
        <div className="grid grid-cols-2 gap-3 py-2">
          <button
            onClick={() => { setIsQuickAddOpen(false); setCurrentView('attendance'); }}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:border-blue-500 flex flex-col items-center text-center gap-2 hover:bg-blue-50/50 dark:hover:bg-slate-800 transition-all group"
          >
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <CheckSquare className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">New Subject</span>
            <span className="text-[10px] text-slate-400">Track a new course & attendance</span>
          </button>

          <button
            onClick={() => { setIsQuickAddOpen(false); setCurrentView('assignments'); }}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:border-blue-500 flex flex-col items-center text-center gap-2 hover:bg-blue-50/50 dark:hover:bg-slate-800 transition-all group"
          >
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Assignment</span>
            <span className="text-[10px] text-slate-400">Add project task or submission</span>
          </button>

          <button
            onClick={() => { setIsQuickAddOpen(false); setCurrentView('study'); }}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:border-blue-500 flex flex-col items-center text-center gap-2 hover:bg-blue-50/50 dark:hover:bg-slate-800 transition-all group"
          >
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Study Session</span>
            <span className="text-[10px] text-slate-400">Schedule daily focus hours</span>
          </button>

          <button
            onClick={() => { setIsQuickAddOpen(false); setCurrentView('exams'); }}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:border-blue-500 flex flex-col items-center text-center gap-2 hover:bg-blue-50/50 dark:hover:bg-slate-800 transition-all group"
          >
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Examination</span>
            <span className="text-[10px] text-slate-400">Set exam date & countdown</span>
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
