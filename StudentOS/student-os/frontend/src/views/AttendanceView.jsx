import React, { useState, useEffect } from 'react';
import {
  Plus,
  CheckSquare,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Trash2,
  Calendar,
  Sliders,
  Sparkles,
  Info,
  TrendingUp,
  Percent,
  History
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api/client';
import { Modal } from '../components/common/Modal';
import { StatusBadge } from '../components/common/Badge';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';

export function AttendanceView() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [targetSlider, setTargetSlider] = useState(75);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [detailSubject, setDetailSubject] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    instructor: '',
    color: '#3B82F6',
    target_percentage: 75,
    classes_conducted: 0,
    classes_attended: 0,
    room: '',
    credits: 3,
    notes: '',
  });

  const { addToast } = useToast();
  const { user } = useAuth();

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const list = await api.subjects.list();
      setSubjects(list);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const openCreateModal = () => {
    setEditingSubject(null);
    setFormData({
      name: '',
      code: '',
      instructor: '',
      color: '#3B82F6',
      target_percentage: user?.target_attendance || 75,
      classes_conducted: 0,
      classes_attended: 0,
      room: '',
      credits: 3,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (sub) => {
    setEditingSubject(sub);
    setFormData({
      name: sub.name,
      code: sub.code,
      instructor: sub.instructor || '',
      color: sub.color || '#3B82F6',
      target_percentage: sub.target_percentage,
      classes_conducted: sub.classes_conducted,
      classes_attended: sub.classes_attended,
      room: sub.room || '',
      credits: sub.credits || 3,
      notes: sub.notes || '',
    });
    setIsModalOpen(true);
  };

  const openDetailDrawer = async (subId) => {
    try {
      const detail = await api.subjects.get(subId);
      setDetailSubject(detail);
      setIsDetailOpen(true);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      addToast('Subject name and code are required', 'error');
      return;
    }

    try {
      if (editingSubject) {
        await api.subjects.update(editingSubject.id, formData);
        addToast(`Updated subject ${formData.code}`, 'success');
      } else {
        await api.subjects.create(formData);
        addToast(`Added subject ${formData.code}!`, 'success');
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      }
      setIsModalOpen(false);
      fetchSubjects();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.subjects.delete(id);
      addToast('Subject deleted', 'info');
      setDeleteConfirmId(null);
      fetchSubjects();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleQuickAttendance = async (subId, action) => {
    try {
      await api.subjects.quickAttendance(subId, action);
      if (action === 'attended') {
        confetti({ particleCount: 30, spread: 45, origin: { y: 0.8 } });
      }
      addToast(action === 'attended' ? 'Class attendance marked! (+1)' : 'Class recorded as missed', action === 'attended' ? 'success' : 'info');
      fetchSubjects();
      if (detailSubject && detailSubject.id === subId) {
        openDetailDrawer(subId);
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // Dynamic Bunk Math Calculator for a given target slider
  const calculateDynamicStats = (attended, conducted, targetPercent) => {
    if (conducted <= 0) return { pct: 100, canMiss: 0, mustAttend: 0, onTrack: true };
    const pct = Math.round((attended / conducted) * 1000) / 10;
    const target = targetPercent / 100.0;
    
    if (pct >= targetPercent) {
      // can miss y: attended / (conducted + y) >= target => y <= (attended/target) - conducted
      const canMiss = Math.max(0, Math.floor((attended / target) - conducted));
      return { pct, canMiss, mustAttend: 0, onTrack: true };
    } else {
      // must attend x consecutive: (attended + x) / (conducted + x) >= target
      const numerator = (target * conducted) - attended;
      const denominator = 1.0 - target;
      const mustAttend = Math.max(1, Math.ceil(numerator / (denominator > 0 ? denominator : 0.001)));
      return { pct, canMiss: 0, mustAttend, onTrack: false };
    }
  };

  const totalConducted = subjects.reduce((sum, s) => sum + s.classes_conducted, 0);
  const totalAttended = subjects.reduce((sum, s) => sum + s.classes_attended, 0);
  const overallPercentage = totalConducted > 0 ? Math.round((totalAttended / totalConducted) * 1000) / 10 : 100.0;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Attendance Tracker & Bunk Calculator
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time tracking, target simulations and safe absence predictions
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Subject
        </button>
      </div>

      {/* Target Percentage Simulator Banner */}
      <div className="apple-card p-5 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-slate-50 dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Live Attendance Target Simulator
              </h3>
            </div>
            <p className="text-xs text-slate-500 max-w-xl">
              Adjust the slider below to dynamically calculate how many classes you can afford to miss or need to attend to satisfy university policy.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">Simulate Target:</span>
            <input
              type="range"
              min="50"
              max="95"
              step="1"
              value={targetSlider}
              onChange={(e) => setTargetSlider(Number(e.target.value))}
              className="w-32 sm:w-44 accent-blue-600 cursor-pointer"
            />
            <span className="text-sm font-extrabold font-mono text-blue-600 dark:text-blue-400 min-w-[40px] text-right">
              {targetSlider}%
            </span>
          </div>
        </div>
      </div>

      {/* Overall Attendance Summary Bar */}
      <div className="apple-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Academic Attendance</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{overallPercentage}%</span>
              <span className="text-xs text-slate-500">({totalAttended} attended of {totalConducted} conducted)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              overallPercentage >= targetSlider
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
            }`}>
              {overallPercentage >= targetSlider ? `✓ Safe (Above ${targetSlider}%)` : `⚠️ Critical (Below ${targetSlider}%)`}
            </span>
          </div>
        </div>

        {/* Progress Bar with Target Marker */}
        <div className="relative w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              overallPercentage >= targetSlider ? 'bg-emerald-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(100, overallPercentage)}%` }}
          />
          {/* Target tick line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-slate-900 dark:bg-white z-10"
            style={{ left: `${targetSlider}%` }}
            title={`Target: ${targetSlider}%`}
          />
        </div>
      </div>

      {/* Subject Cards Grid */}
      {loading && subjects.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : subjects.length === 0 ? (
        <div className="apple-card p-12 text-center">
          <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Subjects Added Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Add your university courses to track attendance, compute bunk allowances, and avoid shortage warnings.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md"
          >
            Add Your First Subject
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {subjects.map((sub) => {
            const dynamic = calculateDynamicStats(sub.classes_attended, sub.classes_conducted, targetSlider);
            return (
              <div
                key={sub.id}
                className="apple-card p-5 flex flex-col justify-between group hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div>
                  {/* Top: Code, Color Badge, Options */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: sub.color || '#3B82F6' }}
                      />
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 font-mono">
                        {sub.code}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openDetailDrawer(sub.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="View Attendance History"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openEditModal(sub)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Edit Subject"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(sub.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                        title="Delete Subject"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Subject Name & Instructor */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                    {sub.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {sub.instructor ? `Instructor: ${sub.instructor}` : (sub.room ? `Room: ${sub.room}` : 'University Core Course')}
                  </p>

                  {/* Percentage & Fraction */}
                  <div className="mt-4 flex items-baseline justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-extrabold font-mono tracking-tight ${
                        dynamic.onTrack ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                      }`}>
                        {dynamic.pct}%
                      </span>
                      <span className="text-xs text-slate-400">
                        {sub.classes_attended} / {sub.classes_conducted} classes
                      </span>
                    </div>

                    <StatusBadge status={dynamic.onTrack ? 'on_track' : 'critical'} />
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="relative w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        dynamic.onTrack ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, dynamic.pct)}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-slate-900 dark:bg-white z-10"
                      style={{ left: `${targetSlider}%` }}
                    />
                  </div>

                  {/* Smart Bunk / Target Calculator Outcome Callout */}
                  <div className={`mt-3.5 p-3 rounded-xl text-xs font-medium border ${
                    dynamic.onTrack
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
                      : 'bg-red-50/70 dark:bg-red-950/20 border-red-200/80 dark:border-red-900/40 text-red-900 dark:text-red-200'
                  }`}>
                    {dynamic.onTrack ? (
                      <p className="flex items-start gap-1.5">
                        <span className="text-base leading-none">🎉</span>
                        <span>
                          You can safely miss <strong className="font-extrabold underline">{dynamic.canMiss}</strong> more {dynamic.canMiss === 1 ? 'class' : 'classes'} and maintain <strong className="font-bold">{targetSlider}%</strong>.
                        </span>
                      </p>
                    ) : (
                      <p className="flex items-start gap-1.5">
                        <span className="text-base leading-none">⚠️</span>
                        <span>
                          Must attend the next <strong className="font-extrabold underline">{dynamic.mustAttend}</strong> consecutive {dynamic.mustAttend === 1 ? 'class' : 'classes'} without missing to hit <strong className="font-bold">{targetSlider}%</strong>.
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Quick Attendance 1-Click Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                  <button
                    onClick={() => handleQuickAttendance(sub.id, 'attended')}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Attended (+1)
                  </button>
                  <button
                    onClick={() => handleQuickAttendance(sub.id, 'missed')}
                    className="flex-1 py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    ✕ Missed (+0/+1)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Subject Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSubject ? `Edit Subject: ${formData.code}` : 'Add New Subject'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Course Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CS-201"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Course Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-9 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <span className="text-xs font-mono text-slate-500">{formData.color}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Subject Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Data Structures & Algorithms"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Instructor
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. Alan Turing"
                value={formData.instructor}
                onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Room / Hall
              </label>
              <input
                type="text"
                placeholder="e.g. Science 102"
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Target %
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.target_percentage}
                onChange={(e) => setFormData({ ...formData, target_percentage: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Conducted
              </label>
              <input
                type="number"
                min="0"
                value={formData.classes_conducted}
                onChange={(e) => setFormData({ ...formData, classes_conducted: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Attended
              </label>
              <input
                type="number"
                min="0"
                value={formData.classes_attended}
                onChange={(e) => setFormData({ ...formData, classes_attended: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Personal Notes
            </label>
            <textarea
              rows="2"
              placeholder="e.g. Lab counts as double, attendance policy notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md"
            >
              {editingSubject ? 'Save Changes' : 'Create Subject'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail & History Drawer Modal */}
      {detailSubject && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`${detailSubject.code} — Attendance History & Records`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{detailSubject.name}</h4>
                <p className="text-xs text-slate-500">Instructor: {detailSubject.instructor || 'N/A'} • Target: {detailSubject.target_percentage}%</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
                  {detailSubject.percentage}%
                </span>
                <p className="text-[11px] text-slate-400">{detailSubject.classes_attended} of {detailSubject.classes_conducted} attended</p>
              </div>
            </div>

            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-4">
              Historical Class Logs ({detailSubject.logs?.length || 0})
            </h5>

            {(!detailSubject.logs || detailSubject.logs.length === 0) ? (
              <p className="text-xs text-slate-400 text-center py-6">No historical class check-ins recorded yet</p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {detailSubject.logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/40 dark:border-slate-700/40 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${log.status === 'attended' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <span className="font-semibold text-slate-900 dark:text-white">{log.date}</span>
                      <span className="text-slate-400 truncate max-w-xs">{log.notes}</span>
                    </div>

                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      log.status === 'attended'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-red-500/10 text-red-600 dark:text-red-400'
                    }`}>
                      {log.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <Modal
          isOpen={!!deleteConfirmId}
          onClose={() => setDeleteConfirmId(null)}
          title="Confirm Subject Deletion"
          maxWidth="max-w-sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to delete this subject? All associated attendance logs, assignments, and study sessions will also be removed.
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
                Delete Subject
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
