import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export function CountdownTimer({ targetDate, compact = false }) {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(targetDate));

  function calculateTimeLeft(dateStr) {
    if (!dateStr) return null;
    const target = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const difference = target - now;

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: true };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((difference % (1000 * 60)) / 1000),
      isPassed: false,
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) return null;

  if (timeLeft.isPassed) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
        <Clock className="w-3.5 h-3.5" /> Exam Completed
      </span>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-md border border-blue-200/60 dark:border-blue-900/40">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span>
          {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}
          {String(timeLeft.hours).padStart(2, '0')}:
          {String(timeLeft.minutes).padStart(2, '0')}:
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-center bg-slate-100 dark:bg-slate-800/80 rounded-xl px-2.5 py-1.5 min-w-[48px] border border-slate-200/60 dark:border-slate-700/60">
        <span className="text-base font-bold font-mono text-slate-900 dark:text-white leading-none">
          {timeLeft.days}
        </span>
        <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mt-0.5">Days</span>
      </div>
      <span className="text-slate-400 font-bold">:</span>
      <div className="flex flex-col items-center bg-slate-100 dark:bg-slate-800/80 rounded-xl px-2.5 py-1.5 min-w-[48px] border border-slate-200/60 dark:border-slate-700/60">
        <span className="text-base font-bold font-mono text-slate-900 dark:text-white leading-none">
          {String(timeLeft.hours).padStart(2, '0')}
        </span>
        <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mt-0.5">Hours</span>
      </div>
      <span className="text-slate-400 font-bold">:</span>
      <div className="flex flex-col items-center bg-slate-100 dark:bg-slate-800/80 rounded-xl px-2.5 py-1.5 min-w-[48px] border border-slate-200/60 dark:border-slate-700/60">
        <span className="text-base font-bold font-mono text-slate-900 dark:text-white leading-none">
          {String(timeLeft.minutes).padStart(2, '0')}
        </span>
        <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mt-0.5">Mins</span>
      </div>
      <span className="text-slate-400 font-bold">:</span>
      <div className="flex flex-col items-center bg-slate-100 dark:bg-slate-800/80 rounded-xl px-2.5 py-1.5 min-w-[48px] border border-slate-200/60 dark:border-slate-700/60">
        <span className="text-base font-bold font-mono text-blue-600 dark:text-blue-400 leading-none">
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
        <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mt-0.5">Secs</span>
      </div>
    </div>
  );
}
