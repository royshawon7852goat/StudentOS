import React, { useState } from 'react';
import {
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Lock,
  Mail,
  User,
  ArrowRight,
  Flame,
  Clock,
  CheckSquare
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';

export function AuthView() {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [university, setUniversity] = useState('');
  const [major, setMajor] = useState('');

  const { login, register, loginDemo } = useAuth();
  const { addToast } = useToast();

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        if (!name.trim()) throw new Error('Please enter your full name');
        await register({
          name,
          email,
          password,
          university: university || 'Apex University',
          major: major || 'Computer Science',
          target_attendance: 75.0,
        });
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
        addToast('Account created successfully! Welcome to StudentOS!', 'success');
      } else {
        await login(email, password);
        addToast('Signed in successfully!', 'success');
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = async () => {
    setDemoLoading(true);
    try {
      await loginDemo();
      confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
      addToast('Welcome to Demo Workspace! Loaded Alex Morgan sample profile.', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-white transition-colors">
      {/* Left Column: Visual Showcase & Brand Intro */}
      <div className="hidden lg:flex lg:w-1/2 p-12 bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 text-white flex-col justify-between relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

        {/* Top Logo */}
        <div className="flex items-center gap-3 z-10">
          <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-md">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight">StudentOS</span>
            <p className="text-[11px] text-blue-200">The University Operating System</p>
          </div>
        </div>

        {/* Center: Value Propositions & Feature Cards */}
        <div className="space-y-6 z-10 my-auto py-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-blue-100">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Engineered for Academic Excellence
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
              One central command center for all your coursework.
            </h1>
            <p className="text-blue-100/90 text-sm max-w-lg leading-relaxed">
              Track attendance shortages before they happen with the mathematical bunk calculator, conquer assignments on time, schedule daily study sessions, and master your exams.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <CheckSquare className="w-5 h-5 text-emerald-300 mb-2" />
              <h4 className="text-xs font-bold text-white">Smart Attendance & Bunks</h4>
              <p className="text-[11px] text-blue-100/80 mt-0.5">Calculates how many classes you can miss or must attend.</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <Clock className="w-5 h-5 text-amber-300 mb-2" />
              <h4 className="text-xs font-bold text-white">Exam Countdowns</h4>
              <p className="text-[11px] text-blue-100/80 mt-0.5">Live ticking seconds, venue logs, and syllabus trackers.</p>
            </div>
          </div>
        </div>

        {/* Bottom Quote / Credibility */}
        <div className="z-10 pt-4 border-t border-white/15 flex items-center justify-between text-xs text-blue-200">
          <span>Enterprise-Grade Multi-Tenant Isolation</span>
          <span>Apple & Notion Design Inspiration</span>
        </div>
      </div>

      {/* Right Column: Authentication Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 dark:text-white">StudentOS</span>
              <p className="text-[11px] text-slate-400">Academic Management System</p>
            </div>
          </div>

          {/* Heading */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {isRegister ? 'Create StudentOS Account' : 'Welcome to StudentOS'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isRegister
                ? 'Join your university peers and elevate your GPA'
                : 'Sign in to access your attendance, assignments, and schedule'}
            </p>
          </div>

          {/* 1-Click Demo Login Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/20 text-center">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">
              ⚡ Instant Evaluator Access (No typing needed)
            </p>
            <button
              onClick={handleDemoAccess}
              disabled={demoLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              {demoLoading ? 'Loading Demo...' : 'Launch Demo Workspace (1-Click)'}
            </button>
            <p className="text-[10px] text-slate-400 mt-1.5">Pre-seeded with realistic courses, attendance logs & exams</p>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
            <span className="flex-shrink mx-3 text-[11px] font-semibold text-slate-400 uppercase">
              Or {isRegister ? 'Sign Up with Email' : 'Sign in with Password'}
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
          </div>

          {/* Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                University Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="student@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {isRegister && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    University / College
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Stanford"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Major / Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CS"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isRegister ? 'Complete Registration' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle between register and sign in */}
          <div className="text-center pt-2">
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-xs text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
            >
              {isRegister
                ? 'Already have an account? Sign in here'
                : "Don't have an account yet? Register for free"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
