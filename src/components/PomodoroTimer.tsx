import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, CheckCircle, Coffee, Sparkles, Settings2, X, SlidersHorizontal } from 'lucide-react';
import { playPomodoroBell } from '../utils/audio';

interface PomodoroTimerProps {
  onSessionComplete: (durationMins: number, mode: 'focus' | 'short_break' | 'long_break') => void;
  todayFocusMins: number;
}

type TimerMode = 'focus' | 'short_break' | 'long_break';

interface CustomTimerDurations {
  focus: number; // in minutes
  short_break: number; // in minutes
  long_break: number; // in minutes
}

const DEFAULT_DURATIONS: CustomTimerDurations = {
  focus: 25,
  short_break: 5,
  long_break: 15,
};

const TIMER_STORAGE_KEY = 'paideutic_custom_timer_durations_v1';

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  onSessionComplete,
  todayFocusMins,
}) => {
  const [durations, setDurations] = useState<CustomTimerDurations>(() => {
    try {
      const saved = localStorage.getItem(TIMER_STORAGE_KEY);
      if (saved) return { ...DEFAULT_DURATIONS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_DURATIONS;
  });

  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(durations.focus * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [completedSessionsCount, setCompletedSessionsCount] = useState(0);

  const modeConfigs: Record<TimerMode, { label: string; duration: number; description: string }> = {
    focus: { label: 'Focus Study', duration: durations.focus * 60, description: 'Deep, distraction-free learning' },
    short_break: { label: 'Short Break', duration: durations.short_break * 60, description: 'Step away, hydrate & breathe' },
    long_break: { label: 'Long Break', duration: durations.long_break * 60, description: 'Rest, recharge & stretch' },
  };

  const totalDuration = modeConfigs[mode].duration;
  const progressPercent = Math.round(((totalDuration - timeLeft) / totalDuration) * 100);

  // Interval Ref
  const intervalRef = useRef<number | null>(null);

  // Save durations to local storage
  const handleSaveDurations = (newDurations: CustomTimerDurations) => {
    setDurations(newDurations);
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(newDurations));
    if (!isRunning) {
      setTimeLeft(newDurations[mode] * 60);
    }
  };

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, mode, durations]);

  const handleComplete = () => {
    setIsRunning(false);
    if (soundEnabled) {
      playPomodoroBell();
    }

    const completedMins = durations[mode];
    onSessionComplete(completedMins, mode);

    if (mode === 'focus') {
      const nextCount = completedSessionsCount + 1;
      setCompletedSessionsCount(nextCount);
      if (nextCount % 4 === 0) {
        setMode('long_break');
        setTimeLeft(durations.long_break * 60);
      } else {
        setMode('short_break');
        setTimeLeft(durations.short_break * 60);
      }
    } else {
      setMode('focus');
      setTimeLeft(durations.focus * 60);
    }
  };

  const handleModeChange = (newMode: TimerMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(durations[newMode] * 60);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(durations[mode] * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      id="pomodoro-focus-engine"
      className="lift-box bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-xs relative overflow-hidden transition-colors"
    >
      {/* Background Subtle Gradient Accent */}
      <div 
        className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-10 pointer-events-none transition-colors duration-700 ${
          mode === 'focus' ? 'bg-indigo-600' : 'bg-emerald-500'
        }`} 
      />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left / Info Column */}
        <div className="w-full md:w-1/2 space-y-4 text-center md:text-left">
          {/* Mode Switcher Pills + Customize Button */}
          <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl gap-1">
              <button
                onClick={() => handleModeChange('focus')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                  mode === 'focus'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Focus ({durations.focus}m)
              </button>
              <button
                onClick={() => handleModeChange('short_break')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                  mode === 'short_break'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Short Break ({durations.short_break}m)
              </button>
              <button
                onClick={() => handleModeChange('long_break')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                  mode === 'long_break'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Long Break ({durations.long_break}m)
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsCustomizeOpen(!isCustomizeOpen)}
              className={`p-2 rounded-xl border text-xs font-semibold transition flex items-center gap-1.5 ${
                isCustomizeOpen
                  ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Customize Timer Durations"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Customize</span>
            </button>
          </div>

          {/* Inline Customize Drawer */}
          {isCustomizeOpen && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Custom Timer Durations
                </span>
                <button
                  type="button"
                  onClick={() => setIsCustomizeOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Focus (min)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={durations.focus}
                    onChange={(e) =>
                      handleSaveDurations({
                        ...durations,
                        focus: Math.max(1, Math.min(180, Number(e.target.value) || 25)),
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Short Break
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={durations.short_break}
                    onChange={(e) =>
                      handleSaveDurations({
                        ...durations,
                        short_break: Math.max(1, Math.min(60, Number(e.target.value) || 5)),
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Long Break
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={durations.long_break}
                    onChange={(e) =>
                      handleSaveDurations({
                        ...durations,
                        long_break: Math.max(1, Math.min(90, Number(e.target.value) || 15)),
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-500 font-semibold">Presets:</span>
                <button
                  type="button"
                  onClick={() => handleSaveDurations({ focus: 25, short_break: 5, long_break: 15 })}
                  className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:border-indigo-400"
                >
                  Standard (25/5)
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveDurations({ focus: 50, short_break: 10, long_break: 20 })}
                  className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:border-indigo-400"
                >
                  Ultra Focus (50/10)
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveDurations({ focus: 15, short_break: 3, long_break: 10 })}
                  className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:border-indigo-400"
                >
                  Sprint (15/3)
                </button>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              {modeConfigs[mode].label}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {modeConfigs[mode].description}
            </p>
          </div>

          {/* Session Progress Stats */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-slate-600 dark:text-slate-300 pt-2">
            <div className="lift-card-subtle flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
              <CheckCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Session #{completedSessionsCount + 1}</span>
            </div>
            <div className="lift-card-subtle flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Total Focused: {(todayFocusMins / 60).toFixed(1)} hrs</span>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition"
              title={soundEnabled ? 'Mute study bells' : 'Enable study bells'}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[11px]">Chime on</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px]">Muted</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right / Big Timer Display & Controls */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center">
            {/* Circular Progress Ring */}
            <svg className="w-56 h-56 transform -rotate-90">
              <circle
                cx="112"
                cy="112"
                r="96"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-slate-100 dark:text-slate-800"
              />
              <circle
                cx="112"
                cy="112"
                r="96"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={2 * Math.PI * 96}
                strokeDashoffset={2 * Math.PI * 96 * (1 - progressPercent / 100)}
                strokeLinecap="round"
                fill="transparent"
                className={`transition-all duration-500 ${
                  mode === 'focus' ? 'text-indigo-600 dark:text-indigo-500' : 'text-emerald-500'
                }`}
              />
            </svg>

            {/* Centered Timer Number */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
                {formatTime(timeLeft)}
              </span>
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase mt-1">
                {isRunning ? 'Session Active' : 'Ready'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsRunning(!isRunning)}
              id="pomodoro-play-pause-btn"
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm text-white shadow-md transition-all active:scale-95 ${
                isRunning
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200 dark:shadow-none'
                  : mode === 'focus'
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 dark:shadow-none'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start Focus</span>
                </>
              )}
            </button>

            <button
              onClick={handleReset}
              id="pomodoro-reset-btn"
              className="p-2.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
