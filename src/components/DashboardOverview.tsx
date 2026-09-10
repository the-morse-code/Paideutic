import React from 'react';
import { 
  Flame, 
  Clock, 
  CheckCircle2, 
  BookOpen, 
  Sparkles, 
  Award, 
  ArrowRight, 
  AlertCircle,
  TrendingUp,
  Target
} from 'lucide-react';
import { UserProfile, Task, UserBadge, AppTab, FocusSession, Subject } from '../types';
import { PomodoroTimer } from './PomodoroTimer';
import { ExamCountdownWidget } from './ExamCountdownWidget';
import { QuickScratchpad } from './QuickScratchpad';
import { StudySessionHistory } from './StudySessionHistory';

interface DashboardOverviewProps {
  profile: UserProfile;
  tasks: Task[];
  badges: UserBadge[];
  focusSessions?: FocusSession[];
  onSelectTab: (tab: AppTab) => void;
  onSessionComplete: (durationMins: number, mode: 'focus' | 'short_break' | 'long_break') => void;
  onToggleTask: (taskId: string) => void;
  onStartWeakTopicDrill: (topic: string) => void;
  onAddTask?: (taskData: Omit<Task, 'id' | 'created_at'>) => void;
  isGuest?: boolean;
  userId?: string;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  profile,
  tasks,
  badges,
  focusSessions = [],
  onSelectTab,
  onSessionComplete,
  onToggleTask,
  onStartWeakTopicDrill,
  onAddTask,
  isGuest = true,
  userId,
}) => {
  const pendingTasks = tasks.filter(t => !t.is_completed);
  const completedTasks = tasks.filter(t => t.is_completed);
  const unlockedBadges = badges.filter(b => b.is_unlocked);
  const totalFocusHours = (profile.total_focus_mins / 60).toFixed(1);

  const handleAddTaskFromScratchpad = (title: string, subject: Subject) => {
    if (onAddTask) {
      onAddTask({
        user_id: profile.id,
        title,
        subject,
        priority: 'medium',
        is_completed: false,
        due_date: new Date().toISOString().split('T')[0],
      });
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200">
              Welcome back, {profile.username}
            </span>
            <span className="text-xs text-indigo-300">🔥 Day {profile.streak_count}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Ready to conquer your academic goals today?
          </h1>
          <p className="text-sm text-indigo-200 leading-relaxed">
            Target Goal: <span className="text-white font-medium">{profile.study_goal}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectTab('ai')}
            id="dash-ai-tutor-cta"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-indigo-900 font-bold text-xs hover:bg-indigo-50 transition shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Ask Adaptive AI Tutor</span>
          </button>
        </div>
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Focus Hours */}
        <div className="lift-box bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4 transition-colors cursor-default">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Total Focus</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">{totalFocusHours} <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">hrs</span></span>
          </div>
        </div>

        {/* Metric 2: Streak */}
        <div className="lift-box bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4 transition-colors cursor-default">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Daily Streak</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">{profile.streak_count} <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">days</span></span>
          </div>
        </div>

        {/* Metric 3: Tasks Done */}
        <div className="lift-box bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4 transition-colors cursor-default">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Tasks Completed</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">{completedTasks.length} <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">/ {tasks.length}</span></span>
          </div>
        </div>

        {/* Metric 4: Badges Unlocked */}
        <div className="lift-box bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4 transition-colors cursor-default">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Badges Unlocked</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">{unlockedBadges.length} <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">/ {badges.length}</span></span>
          </div>
        </div>
      </div>

      {/* Main Focus Engine Component */}
      <PomodoroTimer 
        onSessionComplete={onSessionComplete}
        todayFocusMins={profile.total_focus_mins}
      />

      {/* Two Column Grid: Adaptive Weak Topics Radar + Tasks Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* WEAK TOPICS RADAR */}
        <div className="lift-box bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Adaptive Weak-Point Radar</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Concepts flagged during AI tutor interactions</p>
                </div>
              </div>
              <button 
                onClick={() => onSelectTab('profile')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
              >
                Manage
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              Paideutic AI passively logs recurring struggle concepts into your profile array so you can drill them until mastery.
            </p>

            {profile.weak_topics.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
                No weak points recorded yet. Ask the AI Tutor questions or paste study material to automatically diagnose conceptual gaps!
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.weak_topics.map((topic, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs font-medium"
                  >
                    <span>{topic}</span>
                    <button
                      onClick={() => onStartWeakTopicDrill(topic)}
                      className="px-2 py-0.5 rounded-lg bg-amber-200 dark:bg-amber-900/60 hover:bg-amber-300 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-100 text-[10px] font-bold transition flex items-center gap-0.5"
                      title="Drill this weak point with AI tutor"
                    >
                      <span>Drill</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              {profile.weak_topics.length} topics currently targeted for review
            </span>
            <button
              onClick={() => onSelectTab('ai')}
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Launch AI Summarizer</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* PRIORITY TO-DO PREVIEW */}
        <div className="lift-box bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Priority Study Tasks</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{pendingTasks.length} pending academic deadlines</p>
                </div>
              </div>
              <button
                onClick={() => onSelectTab('tasks')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
              >
                View All
              </button>
            </div>

            {/* Task list preview */}
            <div className="space-y-2">
              {pendingTasks.slice(0, 4).map((task) => (
                <div
                  key={task.id}
                  onClick={() => onToggleTask(task.id)}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition flex items-start gap-3 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={task.is_completed}
                    onChange={() => {}}
                    className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 pointer-events-none bg-white dark:bg-slate-800"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-300">
                        {task.subject}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        task.priority === 'high' ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60' :
                        task.priority === 'medium' ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>
                        {task.priority}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">Due {task.due_date}</span>
                    </div>
                  </div>
                </div>
              ))}

              {pendingTasks.length === 0 && (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center text-xs text-slate-500 dark:text-slate-400">
                  🎉 All tasks finished! Add more assignments in the Smart To-Do tab.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">{completedTasks.length} tasks completed this week</span>
            <button
              onClick={() => onSelectTab('tasks')}
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Open Task Manager</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* STUDENT TOOLS ROW: Exam & Midterm Countdown + Quick Scratchpad & Formula Sheet */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ExamCountdownWidget isGuest={isGuest} userId={userId || profile.id} />
        <QuickScratchpad onAddTaskFromScratchpad={handleAddTaskFromScratchpad} />
      </div>

      {/* RECENT FOCUS SESSIONS LOG */}
      {focusSessions.length > 0 && (
        <StudySessionHistory sessions={focusSessions} />
      )}
    </div>
  );
};
