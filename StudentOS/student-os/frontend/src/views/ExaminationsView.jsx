import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Calendar,
  Clock,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Award,
  AlertCircle,
  MapPin,
  FileCheck,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api/client';
import { Modal } from '../components/common/Modal';
import { CountdownTimer } from '../components/common/CountdownTimer';
import { useToast } from '../components/common/Toast';

export function ExaminationsView() {
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Form
  const [formData, setFormData] = useState({
    subject_id: '',
    title: '',
    exam_type: 'final',
    exam_date: '',
    room: '',
    weightage: 20,
    syllabus: '',
    target_score: 90,
    achieved_score: '',
  });

  const { addToast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [examRes, subRes] = await Promise.all([
        api.exams.list(),
        api.subjects.list()
      ]);
      setExams(examRes);
      setSubjects(subRes);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingExam(null);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(9, 0, 0, 0);

    setFormData({
      subject_id: subjects[0]?.id || '',
      title: '',
      exam_type: 'final',
      exam_date: nextWeek.toISOString().slice(0, 16),
      room: '',
      weightage: 25,
      syllabus: '',
      target_score: 90,
      achieved_score: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (exam) => {
    setEditingExam(exam);
    setFormData({
      subject_id: exam.subject_id,
      title: exam.title,
      exam_type: exam.exam_type || 'final',
      exam_date: exam.exam_date.replace(' ', 'T').slice(0, 16),
      room: exam.room || '',
      weightage: exam.weightage || 20,
      syllabus: exam.syllabus || '',
      target_score: exam.target_score || 90,
      achieved_score: exam.achieved_score !== null ? exam.achieved_score : '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.subject_id || !formData.exam_date) {
      addToast('Please enter an exam title, select a subject, and choose a date', 'error');
      return;
    }

    try {
      const payload = {
        ...formData,
        subject_id: Number(formData.subject_id),
        weightage: Number(formData.weightage) || 20,
        target_score: Number(formData.target_score) || 90,
        achieved_score: formData.achieved_score !== '' ? Number(formData.achieved_score) : null,
      };

      if (editingExam) {
        await api.exams.update(editingExam.id, payload);
        addToast('Examination details updated', 'success');
      } else {
        await api.exams.create(payload);
        addToast('Examination scheduled in your calendar!', 'success');
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.exams.delete(id);
      addToast('Examination removed', 'info');
      setDeleteConfirmId(null);
      fetchData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const upcomingExams = exams.filter((e) => e.is_upcoming);
  const pastExams = exams.filter((e) => !e.is_upcoming);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Examination Manager & Countdown
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time countdown clocks, syllabus preparation checklists, and weightage tracking
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Examination
        </button>
      </div>

      {/* Upcoming Examinations Section */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-blue-500" /> Upcoming Examinations ({upcomingExams.length})
        </h3>

        {loading && exams.length === 0 ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : upcomingExams.length === 0 ? (
          <div className="apple-card p-10 text-center">
            <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Upcoming Examinations</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-3">
              Add your midterms, lab evaluations, and finals to start the countdown.
            </p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
            >
              Add Examination
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {upcomingExams.map((exam) => (
              <div
                key={exam.id}
                className="apple-card p-6 flex flex-col justify-between hover:border-purple-300 dark:hover:border-purple-800 transition-all border-l-4 border-l-purple-500"
              >
                <div>
                  {/* Top: Course tag and exam type badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[11px] font-bold px-2.5 py-0.5 rounded-md text-white font-mono"
                        style={{ backgroundColor: exam.subject_color || '#8B5CF6' }}
                      >
                        {exam.subject_code}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        {exam.subject_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        {exam.exam_type}
                      </span>
                      <button
                        onClick={() => openEditModal(exam)}
                        className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(exam.id)}
                        className="p-1 rounded text-slate-400 hover:text-red-500"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Metadata */}
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                    {exam.title}
                  </h4>

                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(exam.exam_date).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>

                    {exam.room && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {exam.room}
                      </span>
                    )}

                    <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      Weight: {exam.weightage}% • Target: {exam.target_score}%
                    </span>
                  </div>

                  {/* Live Countdown Clock */}
                  <div className="mt-5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850/80 border border-slate-200/60 dark:border-slate-800 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Countdown to Exam
                    </span>
                    <CountdownTimer targetDate={exam.exam_date} />
                  </div>

                  {/* Syllabus & Preparation Notes */}
                  {exam.syllabus && (
                    <div className="mt-4 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/30">
                      <p className="text-[11px] font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5 mb-1">
                        <FileCheck className="w-3.5 h-3.5 text-blue-500" /> Syllabus / Preparation Topics:
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                        {exam.syllabus}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Examinations Archive */}
      {pastExams.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Completed Examinations Archive ({pastExams.length})
          </h3>

          <div className="apple-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/60 dark:border-slate-700/60 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Exam Title</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Date Conducted</th>
                    <th className="py-3 px-4">Weight</th>
                    <th className="py-3 px-4">Result / Target</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pastExams.map((exam) => (
                    <tr key={exam.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {exam.subject_code}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {exam.title}
                      </td>
                      <td className="py-3 px-4 uppercase text-slate-500 font-semibold text-[10px]">
                        {exam.exam_type}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(exam.exam_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {exam.weightage}%
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {exam.achieved_score !== null ? `${exam.achieved_score}%` : 'Pending Score'}
                        </span>
                        <span className="text-slate-400 text-[11px] ml-1">/ {exam.target_score}% goal</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(exam)}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(exam.id)}
                            className="p-1 rounded text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Exam Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingExam ? 'Edit Examination' : 'Add Examination'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Subject *
              </label>
              <select
                required
                value={formData.subject_id}
                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">Select Course</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Exam Type
              </label>
              <select
                value={formData.exam_type}
                onChange={(e) => setFormData({ ...formData, exam_type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="midterm">Midterm Examination</option>
                <option value="final">Final Comprehensive Exam</option>
                <option value="quiz">Quiz / Class Assessment</option>
                <option value="lab">Lab Evaluation</option>
                <option value="practical">Practical Defense</option>
                <option value="project">Project Review</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Examination Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Operating Systems Concurrency Midterm"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.exam_date}
                onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Room / Venue
              </label>
              <input
                type="text"
                placeholder="e.g. Hewlett Hall 200"
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Weightage %
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.weightage}
                onChange={(e) => setFormData({ ...formData, weightage: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Target Score %
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.target_score}
                onChange={(e) => setFormData({ ...formData, target_score: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Achieved Score %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="Pending"
                value={formData.achieved_score}
                onChange={(e) => setFormData({ ...formData, achieved_score: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Syllabus & Topics to Revise
            </label>
            <textarea
              rows="3"
              placeholder="e.g. Chapters 1-4, Peterson algorithm, deadlock avoidance, past papers 2024..."
              value={formData.syllabus}
              onChange={(e) => setFormData({ ...formData, syllabus: e.target.value })}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
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
              {editingExam ? 'Save Changes' : 'Schedule Exam'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <Modal
          isOpen={!!deleteConfirmId}
          onClose={() => setDeleteConfirmId(null)}
          title="Delete Examination"
          maxWidth="max-w-sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to delete this examination record?
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
