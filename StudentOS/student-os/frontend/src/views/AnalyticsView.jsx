import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Award,
  AlertTriangle,
  Flame,
  CheckCircle2,
  BookOpen,
  Calendar,
  Sparkles
} from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';

export function AnalyticsView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const { user } = useAuth();

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.analytics.get();
      setData(res);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { subject_charts, assignment_distribution, weekly_study, attendance_trend, insights } = data;

  const totalAssignments = assignment_distribution.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Academic Performance Analytics
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Visual insights into your study habits, course health, and milestone metrics
        </p>
      </div>

      {/* Strategic Insight Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Study Streak */}
        <div className="apple-card p-5 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Active Study Streak
            </span>
            <Flame className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {insights.study_streak_days}
            </span>
            <span className="text-xs text-slate-500 font-medium">consecutive days</span>
          </div>
          <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
            {insights.study_streak_days >= 3 ? '🔥 Exceptional momentum!' : 'Start building your streak today!'}
          </p>
        </div>

        {/* Weekly Study Hours */}
        <div className="apple-card p-5 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Study Logged This Week
            </span>
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {insights.total_week_hours}h
            </span>
            <span className="text-xs text-slate-400">/ {insights.weekly_goal}h goal</span>
          </div>
          <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">
            {Math.round((insights.total_week_hours / insights.weekly_goal) * 100)}% of weekly quota reached
          </p>
        </div>

        {/* Strongest Subject */}
        <div className="apple-card p-5 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Strongest Subject
            </span>
            <Award className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="mt-2">
            <span className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1">
              {insights.strongest_subject ? insights.strongest_subject.code : 'None'}
            </span>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-extrabold mt-0.5">
              {insights.strongest_subject ? `${insights.strongest_subject.percentage}% attendance` : 'Add subjects'}
            </p>
          </div>
          <p className="text-xs text-slate-400 mt-1 truncate">
            {insights.strongest_subject?.name || 'Great work maintaining high marks'}
          </p>
        </div>

        {/* Needs Attention */}
        <div className="apple-card p-5 bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border-red-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
              Needs Attention
            </span>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="mt-2">
            <span className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1">
              {insights.needs_attention ? insights.needs_attention.code : 'None'}
            </span>
            <p className="text-xs text-red-600 dark:text-red-400 font-extrabold mt-0.5">
              {insights.needs_attention ? `${insights.needs_attention.percentage}% attendance` : 'All safe'}
            </p>
          </div>
          <p className="text-xs text-slate-400 mt-1 truncate">
            {insights.needs_attention?.status === 'critical' ? `Attend next ${insights.needs_attention.must_attend} classes` : 'Above target threshold'}
          </p>
        </div>
      </div>

      {/* Chart 1: Subject Attendance vs Target */}
      <div className="apple-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              Subject Attendance vs Policy Target ({insights.target_attendance}%)
            </h3>
            <p className="text-xs text-slate-500">Real-time attendance percentage compared against required minimums</p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-3 h-3 rounded bg-blue-500" /> Attendance %
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-4 h-0.5 bg-red-500" /> Target Line
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={subject_charts} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="code" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 text-xs">
                        <p className="font-bold text-slate-900 dark:text-white">{d.name} ({d.code})</p>
                        <p className="text-blue-600 dark:text-blue-400 font-extrabold mt-1">Attendance: {d.percentage}%</p>
                        <p className="text-slate-400">{d.attended} of {d.conducted} classes attended</p>
                        <p className={`mt-1 font-semibold ${d.status === 'on_track' ? 'text-emerald-500' : 'text-red-500'}`}>
                          {d.status === 'on_track' ? `Can miss ${d.can_miss} classes` : `Must attend ${d.must_attend} consecutive`}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={insights.target_attendance} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={2} />
              <Bar dataKey="percentage" radius={[8, 8, 0, 0]} fill="#3b82f6">
                {subject_charts.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.percentage >= entry.target ? (entry.color || '#3b82f6') : '#ef4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: 2 Charts Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Study Hours Area Chart */}
        <div className="apple-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                Weekly Study Time Distribution
              </h3>
              <p className="text-xs text-slate-500">Hours spent studying day by day this week</p>
            </div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg">
              {insights.total_week_hours} Total Hours
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekly_study} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="studyColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="h" />
                <Tooltip
                  formatter={(val) => [`${val} hours`, 'Studied']}
                  contentStyle={{ backgroundColor: 'var(--card-bg)', borderRadius: '12px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#studyColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Assignment Status Breakdown Donut Chart */}
        <div className="apple-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Assignment Status Breakdown
              </h3>
              <p className="text-xs text-slate-500">Distribution of coursework deliverables</p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
              {totalAssignments} Total
            </span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {totalAssignments === 0 ? (
              <p className="text-xs text-slate-400">No assignments created yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assignment_distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {assignment_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name) => [`${val} tasks`, name]}
                    contentStyle={{ backgroundColor: 'var(--card-bg)', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Chart 3: 14-Day Attendance Trend */}
      <div className="apple-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              14-Day Attendance Log Trend
            </h3>
            <p className="text-xs text-slate-500">Daily classes attended vs classes missed across the past fortnight</p>
          </div>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={attendance_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--card-bg)', borderRadius: '12px', fontSize: '12px' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="attended" name="Attended" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="missed" name="Missed" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
