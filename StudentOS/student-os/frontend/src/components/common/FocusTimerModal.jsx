import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, CheckCircle2, Flame, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Modal } from './Modal';
import { api } from '../../api/client';
import { useToast } from './Toast';

export function FocusTimerModal({ isOpen, onClose, subjects = [], onSessionSaved }) {
  const [mode, setMode] = useState('focus'); // focus (25m), deep (50m), break (5m)
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const intervalRef = useRef(null);
  const { addToast } = useToast();

  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.2);
    } catch {
      // AudioContext not allowed or not supported
    }
  };

  const setTimerMode = (newMode, minutes) => {
    setIsActive(false);
    setMode(newMode);
    setTotalSeconds(minutes * 60);
    setSecondsLeft(minutes * 60);
  };

  useEffect(() => {
    if (isActive && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isActive) {
      setIsActive(false);
      clearInterval(intervalRef.current);
      playChime();
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
      addToast('Focus session complete! Excellent work!', 'success');
    }

    return () => clearInterval(intervalRef.current);
  }, [isActive, secondsLeft, addToast]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setSecondsLeft(totalSeconds);
  };

  const handleSaveSession = async () => {
    const minutesCompleted = Math.round((totalSeconds - secondsLeft) / 60);
    if (minutesCompleted < 1) {
      addToast('Please study for at least 1 minute before saving.', 'info');
      return;
    }

    setIsSaving(true);
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const sub = subjects.find(s => s.id === Number(selectedSubjectId));

      await api.study.create({
        subject_id: selectedSubjectId ? Number(selectedSubjectId) : null,
        title: sub ? `Focus Session: ${sub.name}` : 'Deep Focus Study Sprint',
        session_date: todayStr,
        start_time: nowTime,
        duration_minutes: minutesCompleted,
        notes: sessionNotes || `Completed ${minutesCompleted}m focus timer sprint`,
        completed: 1
      });

      addToast(`Logged ${minutesCompleted} mins into your study tracker!`, 'success');
      if (onSessionSaved) onSessionSaved();
      onClose();
      resetTimer();
      setSessionNotes('');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const progressPercent = Math.max(0, Math.min(100, Math.round(((totalSeconds - secondsLeft) / totalSeconds) * 100)));
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Deep Focus Study Timer" maxWidth="max-w-md">
      <div className="flex flex-col items-center text-center space-y-6">
        {/* Preset selector */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full justify-center">
          <button
            onClick={() => setTimerMode('focus', 25)}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
              mode === 'focus'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            25m Pomodoro
          </button>
          <button
            onClick={() => setTimerMode('deep', 50)}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
              mode === 'deep'
                ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            50m Deep Work
          </button>
          <button
            onClick={() => setTimerMode('break', 5)}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
              mode === 'break'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            5m Break
          </button>
        </div>

        {/* Big circular clock display */}
        <div className="relative flex items-center justify-center w-56 h-56 rounded-full border-4 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 shadow-inner">
          {/* Subtle SVG progress ring */}
          <svg className="absolute w-56 h-56 transform -rotate-90">
            <circle
              cx="112"
              cy="112"
              r="104"
              className="text-slate-200 dark:text-slate-800"
              strokeWidth="6"
              stroke="currentColor"
              fill="transparent"
            />
            <circle
              cx="112"
              cy="112"
              r="104"
              className="text-blue-500 transition-all duration-500"
              strokeWidth="6"
              strokeDasharray={2 * Math.PI * 104}
              strokeDashoffset={2 * Math.PI * 104 * (1 - progressPercent / 100)}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>

          <div className="flex flex-col items-center z-10">
            <span className="text-5xl font-mono font-extrabold tracking-tight text-slate-900 dark:text-white">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 mt-1 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              {isActive ? 'In Focus Flow' : 'Paused'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={resetTimer}
            className="p-3 rounded-full text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Reset Timer"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={toggleTimer}
            className={`flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold text-white shadow-lg transition-transform active:scale-95 ${
              isActive
                ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25'
            }`}
          >
            {isActive ? (
              <>
                <Pause className="w-5 h-5" /> Pause Session
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" /> Start Focus
              </>
            )}
          </button>
        </div>

        {/* Subject association & save section */}
        <div className="w-full text-left space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Subject (Optional)
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="">-- General / Non-subject study --</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Session Goal / Notes
            </label>
            <input
              type="text"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="e.g. Chapter 4 exercises, memory leak debugging"
              className="w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <button
            onClick={handleSaveSession}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSaving ? 'Logging Session...' : `Log Elapsed Study (${Math.round((totalSeconds - secondsLeft) / 60)}m)`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
