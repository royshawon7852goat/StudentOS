import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  FileText,
  Calendar,
  GraduationCap,
  Clock,
  AlertTriangle,
  ArrowRight,
  Plus,
  Flame,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api/client';
import { StatCard } from '../components/common/StatCard';
import { PriorityBadge, StatusBadge } from '../components/common/Badge';
import { CountdownTimer } from '../components/common/CountdownTimer';
import { useToast } from '../components/common/Toast';

export function DashboardView({ onNavigate, onOpenTimer, onQuickAdd }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { addToast } = useToast();

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.dashboard.get();
      setData(res);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleToggleStudy = async (sessionId) => {
    try {
      const updated = await api.study.toggle(sessionId);
      if (updated.completed === 1) {
        confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } });
        addToast('Study session marked complete! Awesome discipline!', 'success');
      } else {
        addToast('Study session reopened', 'info');
      }
      fetchDashboard();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleQuickAttendance = async (subjectId, action) => {
    try {
      await api.subjects.quickAttendance(subjectId, action);
      addToast(action === 'attended' ? 'Marked as attended! Keep it up!' : 'Marked class as missed', action === 'attended' ? 'success' : 'info');
      fetchDashboard();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleToggleAssignment = async (assignmentId) => {
    try {
      const updated = await api.assignments.toggleStatus(assignmentId);
      if (updated.status === 'completed') {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
        addToast('Assignment marked as completed! Great progress!', 'success');
      } else {
        addToast(`Assignment status: ${updated.status}`, 'info');
      }
      fetchDashboard();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading your academic workspace...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="apple-card p-6 border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 text-center">
        <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={fetchDashboard}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { stats, greeting, user_name, current_date, next_exam, today_sessions, priority_assignments, subjects, recent_activities } = data;

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 sm:p-8 text-white shadow-lg shadow-blue-500/15">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-medium text-blue-100">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{current_date}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {greeting}, {user_name}!
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm max-w-xl">
              You are enrolled in <span className="font-semibold text-white">{stats.total_subjects} subjects</span>. 
              {stats.critical_subjects_count > 0 ? (
                <span className="text-amber-300 font-semibold ml-1">
                  ⚠️ {stats.critical_subjects_count} subject requires attendance attention.
                </span>
              ) : (
                <span className="text-emerald-300 font-semibold ml-1">
                  🎉 All subjects are meeting or exceeding your {stats.target_attendance}% target!
                </span>
              )}
            </p>
          </div>

          {/* Quick Action Buttons on Banner */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenTimer}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-semibold transition-all active:scale-95"
            >
              <Flame className="w-4 h-4 text-amber-300" /> Start Focus
            </button>
            <button
              onClick={onQuickAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> Quick Add
            </button>
          </div>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute -right-8 -bottom-12 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute right-32 -top-8 w-48 h-48 rounded-full bg-blue-400/20 blur-xl pointer-events-none" />
      </div>

      {/* Primary KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Overall Attendance"
          value={`${stats.overall_attendance}%`}
          subtext={
            stats.overall_attendance >= stats.target_attendance ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Above {stats.target_attendance}% Target</span>
            ) : (
              <span className="text-red-500 font-medium">Below {stats.target_attendance}% Target</span>
            )
          }
          icon={CheckSquare}
          color={stats.overall_attendance >= stats.target_attendance ? 'green' : 'amber'}
          onClick={() => onNavigate('attendance')}
        />

        <StatCard
          title="Pending Assignments"
          value={stats.pending_assignments_count}
          subtext={
            stats.overdue_assignments_count > 0 ? (
              <span className="text-red-500 font-semibold">🚨 {stats.overdue_assignments_count} overdue</span>
            ) : (
              <span className="text-slate-500">{stats.completed_assignments_count} completed</span>
            )
          }
          icon={FileText}
          color="blue"
          onClick={() => onNavigate('assignments')}
        />

        <StatCard
          title="Upcoming Exams"
          value={stats.upcoming_exams_count}
          subtext={
            next_exam ? (
              <span className="text-purple-600 dark:text-purple-400 truncate">
                Next: {next_exam.title.split(' ')[0]} in {next_exam.days_left}d
              </span>
            ) : (
              'No upcoming exams'
            )
          }
          icon={GraduationCap}
          color="purple"
          onClick={() => onNavigate('exams')}
        />

        <StatCard
          title="Today's Study Logged"
          value={`${stats.today_study_hours}h`}
          subtext={
            <span>Planned: {stats.today_planned_hours}h today</span>
          }
          icon={Clock}
          color="indigo"
          onClick={() => onNavigate('study')}
        />
      </div>

      {/* Main Grid: Left 2 Cols, Right 1 Col */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Next Exam + Quick Attendance + Priority Assignments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Next Upcoming Examination Card */}
          {next_exam && (
            <div className="apple-card p-6 border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-500/5 via-transparent to-transparent">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      {next_exam.exam_type} Exam
                    </span>
                    <span className="text-xs text-slate-500">{next_exam.subject_code} • {next_exam.subject_name}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {next_exam.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Location: <span className="font-semibold text-slate-700 dark:text-slate-300">{next_exam.room || 'TBA'}</span> • Weightage: <span className="font-semibold text-slate-700 dark:text-slate-300">{next_exam.weightage}%</span>
                  </p>
                </div>

                <div className="flex flex-col items-start sm:items-end">
                  <span className="text-[11px] font-medium text-slate-400 mb-1">Time Remaining</span>
                  <CountdownTimer targetDate={next_exam.exam_date} />
                </div>
              </div>
            </div>
          )}

          {/* Quick Attendance Check-in Strip */}
          <div className="apple-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-blue-500" />
                  Quick Attendance Check-in
                </h3>
                <p className="text-xs text-slate-500">Mark today's classes with one click</p>
              </div>
              <button
                onClick={() => onNavigate('attendance')}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {subjects.slice(0, 4).map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {sub.code} • {sub.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs font-extrabold ${sub.percentage >= sub.target_percentage ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                        {sub.percentage}%
                      </span>
                      <span className="text-[11px] text-slate-400">
                        ({sub.classes_attended}/{sub.classes_conducted})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleQuickAttendance(sub.id, 'attended')}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold transition-colors"
                      title="Mark Attended (+1 / +1)"
                    >
                      ✓ Attended
                    </button>
                    <button
                      onClick={() => handleQuickAttendance(sub.id, 'missed')}
                      className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold transition-colors"
                      title="Mark Missed (+0 / +1)"
                    >
                      ✕ Missed
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Priority Assignments */}
          <div className="apple-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  Priority Assignments Due
                </h3>
                <p className="text-xs text-slate-500">Upcoming deadlines and tasks</p>
              </div>
              <button
                onClick={() => onNavigate('assignments')}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                Manage all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {priority_assignments.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-medium text-slate-500">No pending assignments! You're completely caught up!</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {priority_assignments.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      task.is_overdue
                        ? 'bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-900/60'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        onClick={() => handleToggleAssignment(task.id)}
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                          task.status === 'completed'
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
                        }`}
                      >
                        {task.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {task.title}
                          </p>
                          <PriorityBadge priority={task.priority} />
                          {task.is_overdue && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500 text-white">
                              OVERDUE
                            </span>
                          )}
                          {task.due_soon && !task.is_overdue && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              DUE SOON
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {task.subject_code} • Due: {task.due_date.replace('T', ' ')}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleAssignment(task.id)}
                      className="text-xs font-semibold text-slate-400 hover:text-blue-600 shrink-0 ml-2"
                    >
                      <StatusBadge status={task.status} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 span): Today's Study Sessions + Recent Activity */}
        <div className="space-y-6">
          {/* Today's Study Planner Card */}
          <div className="apple-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  Today's Study Schedule
                </h3>
                <p className="text-xs text-slate-500">{stats.today_study_hours}h completed of {stats.today_planned_hours}h</p>
              </div>
              <button
                onClick={() => onNavigate('study')}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Schedule
              </button>
            </div>

            {today_sessions.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <p className="text-xs text-slate-400 mb-2">No study sessions scheduled for today</p>
                <button
                  onClick={onOpenTimer}
                  className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-semibold"
                >
                  Start Focus Timer Now
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {today_sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      sess.completed
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200/60 dark:border-emerald-900/30'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => handleToggleStudy(sess.id)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                          sess.completed
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                        }`}
                      >
                        {sess.completed === 1 && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>

                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${sess.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                          {sess.title}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {sess.start_time} • {sess.duration_minutes} mins {sess.subject_code ? `(${sess.subject_code})` : ''}
                        </p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sess.completed ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                      {sess.completed ? 'Done' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity Log */}
          <div className="apple-card p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Recent Activity
            </h3>
            <p className="text-xs text-slate-500 mb-4">Your recent academic interactions</p>

            <div className="space-y-3">
              {recent_activities.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No recent activity recorded yet</p>
              ) : (
                recent_activities.map((act) => (
                  <div key={act.id} className="flex items-start gap-2.5 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {act.title}
                      </p>
                      {act.details && (
                        <p className="text-[11px] text-slate-400 truncate">{act.details}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
