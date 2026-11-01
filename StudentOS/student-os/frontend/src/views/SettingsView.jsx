import React, { useState } from 'react';
import {
  User,
  Settings,
  Download,
  Moon,
  Sun,
  Shield,
  LogOut,
  Save,
  CheckCircle2,
  FileSpreadsheet,
  FileJson,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import { useToast } from '../components/common/Toast';

export function SettingsView() {
  const { user, updateUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    university: user?.university || '',
    major: user?.major || '',
    target_attendance: user?.target_attendance || 75,
    weekly_study_goal: user?.weekly_study_goal || 20,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await api.auth.updateProfile({
        name: formData.name,
        university: formData.university,
        major: formData.major,
        target_attendance: Number(formData.target_attendance),
        weekly_study_goal: Number(formData.weekly_study_goal),
      });
      updateUser(updated);
      addToast('Profile and preferences updated successfully', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadJson = async () => {
    setIsExporting(true);
    try {
      await api.export.downloadJson();
      addToast('Academic data JSON archive downloaded', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadCsv = async () => {
    setIsExporting(true);
    try {
      await api.export.downloadCsv();
      addToast('Attendance logs CSV exported', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Settings & Preferences
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Manage your personal university profile, academic goals, and data backup
        </p>
      </div>

      {/* Profile & Academic Goals Card */}
      <div className="apple-card p-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-blue-500" />
          Student Profile & Academic Targets
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Set your institution and target benchmarks for attendance algorithms
        </p>

        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Email Address (Account ID)
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                University / College Name
              </label>
              <input
                type="text"
                value={formData.university}
                onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                placeholder="e.g. Stanford University"
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Major / Degree Program
              </label>
              <input
                type="text"
                value={formData.major}
                onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                placeholder="e.g. Computer Science"
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Default Attendance Target %
              </label>
              <input
                type="number"
                min="50"
                max="100"
                value={formData.target_attendance}
                onChange={(e) => setFormData({ ...formData, target_attendance: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">Used as threshold for bunk calculations (typically 75% or 80%)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Weekly Study Goal (Hours)
              </label>
              <input
                type="number"
                min="5"
                max="80"
                value={formData.weekly_study_goal}
                onChange={(e) => setFormData({ ...formData, weekly_study_goal: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">Tracks your study progress bar in the weekly study planner</p>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving Preferences...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Theme Appearance Card */}
      <div className="apple-card p-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
          <Moon className="w-4 h-4 text-purple-500" />
          Interface Theme
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Customize the visual theme of your StudentOS environment
        </p>

        <div className="grid grid-cols-3 gap-3 max-w-md">
          <button
            onClick={() => setTheme('light')}
            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
              theme === 'light'
                ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-950/40'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Sun className="w-5 h-5" />
            <span className="text-xs font-bold">Light</span>
          </button>

          <button
            onClick={() => setTheme('dark')}
            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
              theme === 'dark'
                ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Moon className="w-5 h-5" />
            <span className="text-xs font-bold">Dark</span>
          </button>

          <button
            onClick={() => setTheme('system')}
            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
              theme === 'system'
                ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-950/40'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-xs font-bold">Auto</span>
          </button>
        </div>
      </div>

      {/* Data Export & Backup */}
      <div className="apple-card p-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
          <Download className="w-4 h-4 text-emerald-500" />
          Academic Data Export & Backup
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Export your complete semester records, attendance logs, and study logs for offline safekeeping
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleDownloadJson}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200/80 dark:border-slate-700/80 transition-all"
          >
            <FileJson className="w-4 h-4 text-blue-500" />
            Export Complete Data (JSON)
          </button>

          <button
            onClick={handleDownloadCsv}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200/80 dark:border-slate-700/80 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            Export Attendance (CSV)
          </button>
        </div>
      </div>

      {/* Account Security & Logout */}
      <div className="apple-card p-6 border-red-200/50 dark:border-red-900/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-500" />
              Sign Out of Session
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Securely terminate your current session on this device
            </p>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/70 text-red-600 dark:text-red-400 text-xs font-bold border border-red-200 dark:border-red-900/60 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
