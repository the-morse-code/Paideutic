import React from 'react';
import { Clock, History, Calendar, CheckCircle, Flame } from 'lucide-react';
import { FocusSession } from '../types';

interface StudySessionHistoryProps {
  sessions: FocusSession[];
}

export const StudySessionHistory: React.FC<StudySessionHistoryProps> = ({ sessions }) => {
  const recentSessions = [...sessions].slice(-6).reverse();

  return (
    <div className="lift-box bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col space-y-4 transition-colors">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Recent Study Sessions</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Activity log of your completed focus sprints</p>
          </div>
        </div>

        <span className="text-xs font-semibold text-slate-400">
          {sessions.length} recorded
        </span>
      </div>

      <div className="space-y-2">
        {recentSessions.map((s) => {
          const dateObj = new Date(s.completed_at);
          const timeFormatted = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dateFormatted = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

          return (
            <div
              key={s.id}
              className="lift-card-subtle p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                  s.mode === 'focus'
                    ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300'
                    : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                }`}>
                  {s.mode === 'focus' ? <Flame className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                </div>

                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    {s.mode === 'focus' ? 'Deep Focus Session' : s.mode === 'short_break' ? 'Short Break' : 'Long Break'}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {dateFormatted} at {timeFormatted}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm block">
                  +{s.duration_mins} min
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5 justify-end">
                  <CheckCircle className="w-2.5 h-2.5" />
                  <span>Logged</span>
                </span>
              </div>
            </div>
          );
        })}

        {recentSessions.length === 0 && (
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400 dark:text-slate-500">
            No study sessions logged yet today. Hit Start on the Pomodoro timer to begin tracking!
          </div>
        )}
      </div>
    </div>
  );
};
