import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  Flame,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  BookOpen,
  Award,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api/client';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';

export function StudyPlannerView({ onOpenTimer }) {
  const [sessions, setSessions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'weekly'
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Form
  const [formData, setFormData] = useState({
    subject_id: '',
    title: '',
    session_date: '',
    start_time: '10:00',
    duration_minutes: 60,
    notes: '',
    completed: 0,
  });

  const { addToast } = useToast();
  const { user } = useAuth();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sessRes, sumRes, subRes] = await Promise.all([
        api.study.list(viewMode === 'daily' ? { date: selectedDate } : {}),
        api.study.summary(),
        api.subjects.list()
      ]);
      setSessions(sessRes);
      setSummary(sumRes);
      setSubjects(subRes);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [viewMode, selectedDate]);

  const changeDay = (delta) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + delta);
    setSelectedDate(current.toISOString().slice(0, 10));
  };

  const openCreateModal = () => {
    setEditingSession(null);
    setFormData({
      subject_id: subjects[0]?.id || '',
      title: '',
      session_date: selectedDate,
      start_time: '10:00',
      duration_minutes: 60,
      notes: '',
      completed: 0,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (sess) => {
    setEditingSession(sess);
    setFormData({
      subject_id: sess.subject_id || '',
      title: sess.title,
      session_date: sess.session_date,
      start_time: sess.start_time || '10:00',
      duration_minutes: sess.duration_minutes || 60,
      notes: sess.notes || '',
      completed: sess.completed || 0,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.session_date) {
      addToast('Please enter a title and session date', 'error');
      return;
    }

    try {
      const payload = {
        ...formData,
        subject_id: formData.subject_id ? Number(formData.subject_id) : null,
        duration_minutes: Number(formData.duration_minutes) || 60,
      };

      if (editingSession) {
        await api.study.update(editingSession.id, payload);
        addToast('Study session updated', 'success');
      } else {
        await api.study.create(payload);
        addToast('Study session scheduled!', 'success');
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleToggleComplete = async (id) => {
    try {
      const updated = await api.study.toggle(id);
      if (updated.completed === 1) {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
        addToast('Study session completed! Excellent job!', 'success');
      } else {
        addToast('Session status reopened', 'info');
      }
      fetchData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.study.delete(id);
      addToast('Study session deleted', 'info');
      setDeleteConfirmId(null);
      fetchData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const weeklyGoal = summary?.week_goal || user?.weekly_study_goal || 20;
  const currentWeekHours = summary?.week_hours || 0;
  const weeklyProgress = Math.min(100, Math.round((currentWeekHours / weeklyGoal) * 100));

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);
  const formattedSelectedDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Daily & Weekly Study Planner
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Structure your study hours, organize topics, and build daily momentum
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={onOpenTimer}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold transition-all"
          >
            <Flame className="w-4 h-4 fill-current animate-pulse" /> Focus Timer
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Schedule Session
          </button>
        </div>
      </div>

      {/* Weekly Goal Progress Bar & Day breakdown */}
      {summary && (
        <div className="apple-card p-5 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/20 dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-900">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Weekly Study Target</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {currentWeekHours}h <span className="text-sm font-semibold text-slate-400">/ {weeklyGoal}h goal</span>
                </span>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">({weeklyProgress}% completed)</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {summary.daily_breakdown?.map((day) => (
                <div
                  key={day.date}
                  onClick={() => { setSelectedDate(day.date); setViewMode('daily'); }}
                  className={`flex flex-col items-center px-2.5 py-1.5 rounded-xl border cursor-pointer transition-all ${
                    day.date === selectedDate
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : day.is_today
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                      : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200/60 dark:border-slate-700/60 hover:border-slate-400'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase">{day.day}</span>
                  <span className="text-xs font-extrabold font-mono mt-0.5">{day.completed_hours}h</span>
                </div>
              ))}
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${weeklyProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Date Navigation & View Mode Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 apple-card p-4">
        {/* Date picker buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeDay(-1)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
            className={`px-3 py-1 rounded-lg text-xs font-semibold ${
              isToday
                ? 'bg-blue-600 text-white'
                : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => changeDay(1)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-xs font-bold text-slate-900 dark:text-white ml-2">
            {formattedSelectedDate}
          </span>
        </div>

        {/* View toggle */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setViewMode('daily')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'daily'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            Daily View
          </button>
          <button
            onClick={() => setViewMode('weekly')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'weekly'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            Weekly Schedule
          </button>
        </div>
      </div>

      {/* Sessions List */}
      {loading && sessions.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="apple-card p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {viewMode === 'daily' ? 'No Study Sessions for this day' : 'No Study Sessions found'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Schedule a focused study session or start the timer to log your hours.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
            >
              Schedule Study Session
            </button>
            <button
              onClick={onOpenTimer}
              className="px-4 py-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold"
            >
              Start Focus Timer
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((sess) => (
            <div
              key={sess.id}
              className={`apple-card p-4 flex items-center justify-between gap-4 transition-all ${
                sess.completed
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200/60 dark:border-emerald-900/40'
                  : 'hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Checkbox & Details */}
              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                <button
                  onClick={() => handleToggleComplete(sess.id)}
                  className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                    sess.completed
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                      : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                  }`}
                >
                  {sess.completed === 1 && <CheckCircle2 className="w-4 h-4" />}
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={`text-sm font-bold ${sess.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                      {sess.title}
                    </h4>
                    {sess.subject_code && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded text-white font-mono"
                        style={{ backgroundColor: sess.subject_color || '#3B82F6' }}
                      >
                        {sess.subject_code}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      {sess.start_time} ({sess.duration_minutes} mins)
                    </span>
                    {viewMode === 'weekly' && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {sess.session_date}
                      </span>
                    )}
                  </div>

                  {sess.notes && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1 italic">
                      "{sess.notes}"
                    </p>
                  )}
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  sess.completed
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {sess.completed ? 'Completed' : 'Planned'}
                </span>

                <button
                  onClick={() => openEditModal(sess)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirmId(sess.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Study Session Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSession ? 'Edit Study Session' : 'Schedule Study Session'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Associated Subject (Optional)
            </label>
            <select
              value={formData.subject_id}
              onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="">-- General / Non-Course Study --</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Topic / Session Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Red-Black Tree Rotation drills"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={formData.session_date}
                onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Duration (mins)
              </label>
              <input
                type="number"
                min="10"
                step="5"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Personal Study Notes & Goals
            </label>
            <textarea
              rows="3"
              placeholder="e.g. Complete chapter 5 problem set, write test cases..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sessionCompleted"
              checked={formData.completed === 1}
              onChange={(e) => setFormData({ ...formData, completed: e.target.checked ? 1 : 0 })}
              className="w-4 h-4 rounded text-blue-600"
            />
            <label htmlFor="sessionCompleted" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              Mark this session as already completed
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md"
            >
              {editingSession ? 'Save Changes' : 'Schedule Session'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <Modal
          isOpen={!!deleteConfirmId}
          onClose={() => setDeleteConfirmId(null)}
          title="Delete Study Session"
          maxWidth="max-w-sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to delete this study session record?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
