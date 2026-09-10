import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  BookOpen, 
  Clock, 
  Share2, 
  ArrowRight, 
  CheckCircle, 
  ShieldCheck, 
  Database, 
  Flame, 
  Paperclip, 
  Layers, 
  Brain, 
  GraduationCap,
  Play,
  RotateCw,
  Star,
  Users
} from 'lucide-react';
import { isSupabaseConfigured } from '../services/authService';

interface LandingPageProps {
  onOpenSignUp: () => void;
  onOpenSignIn: () => void;
  onLaunchDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenSignUp,
  onOpenSignIn,
  onLaunchDemo,
}) => {
  const isConnectedToSupabase = isSupabaseConfigured();
  const [activeInteractiveDemo, setActiveInteractiveDemo] = useState<'timer' | 'radar'>('timer');
  const [demoTimerSeconds, setDemoTimerSeconds] = useState(1500); // 25:00
  const [isDemoRunning, setIsDemoRunning] = useState(false);

  React.useEffect(() => {
    let interval: any = null;
    if (isDemoRunning) {
      interval = setInterval(() => {
        setDemoTimerSeconds((prev) => (prev > 0 ? prev - 1 : 1500));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isDemoRunning]);

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-indigo-500/15 to-purple-500/15 blur-3xl rounded-full" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-sky-500/10 blur-3xl rounded-full" />
        <div className="absolute bottom-10 -left-40 w-96 h-96 bg-amber-500/10 blur-3xl rounded-full" />
      </div>

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-indigo-500/20">
              Π
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Paideutic
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                Academic Suite
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onLaunchDemo}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <span>Explore Instant Demo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onOpenSignIn}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Sign In
            </button>
            <button
              onClick={onOpenSignUp}
              className="px-4.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm shadow-indigo-600/20"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold mb-6 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            <span>Next-Gen Academic Mastery Engine</span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">Adaptive Intelligence</span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.08] max-w-4xl mx-auto"
          >
            Study with ruthless precision. Master any subject{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-sky-600">
              effortlessly.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed"
          >
            Paideutic combines an adaptive AI tutor that pinpoints your personal weak spots, 
            curated peer study materials with high-yield attachments, and an intelligent Pomodoro focus system engineered for academic excellence.
          </motion.p>

          {/* CTA Group */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
          >
            <button
              onClick={onOpenSignUp}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onLaunchDemo}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-800 dark:text-slate-200 font-bold text-sm transition flex items-center justify-center gap-2 shadow-2xs"
            >
              <Play className="w-4 h-4 text-indigo-500 fill-indigo-500" />
              <span>Launch Live Interactive Demo</span>
            </button>
          </motion.div>

          {/* Trust points */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400"
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-indigo-500" />
              <span>Full Cognitive Diagnostics</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Database className="w-4 h-4 text-indigo-500" />
              <span>Real-Time Collaborative Library</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-500" />
              <span>Instant AI Diagnostic Engine</span>
            </div>
          </motion.div>
        </div>

        {/* INTERACTIVE MOCKUP / ANIMATED PREVIEW CARD */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-14">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl overflow-hidden relative"
          >
            {/* Window bar */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-xs font-mono text-slate-400 dark:text-slate-500">
                  paideutic.app/study-workspace
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveInteractiveDemo('timer')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                    activeInteractiveDemo === 'timer'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Flow Timer
                </button>
                <button
                  onClick={() => setActiveInteractiveDemo('radar')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                    activeInteractiveDemo === 'radar'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Weak-Point Radar
                </button>
              </div>
            </div>

            {/* Interactive Preview Content */}
            <div className="pt-6">
              {activeInteractiveDemo === 'timer' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="md:col-span-1 text-center md:text-left space-y-2">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-400">
                      Live Focus Engine
                    </span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                      Deep Work Telemetry
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Syncs with Supabase to track continuous study sessions, streaks, and subject mastery points.
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={() => setIsDemoRunning(!isDemoRunning)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-2 mx-auto md:mx-0 shadow-xs"
                      >
                        {isDemoRunning ? 'Pause Session' : 'Start Focus Session'}
                        <Play className={`w-3.5 h-3.5 ${isDemoRunning ? 'rotate-90' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-around gap-6">
                    <div className="text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-1">
                        Interval Remaining
                      </span>
                      <div className="font-mono text-4xl sm:text-5xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                        {formatTimer(demoTimerSeconds)}
                      </div>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1 inline-block">
                        Mathematics: Integration by Parts
                      </span>
                    </div>

                    <div className="space-y-2.5 w-full sm:w-56 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Daily Focus Goal</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">120 / 180 min</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 rounded-full w-2/3" />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Current Streak</span>
                        <span className="font-bold text-amber-500 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 fill-amber-500" /> 7 Days
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="md:col-span-1 text-center md:text-left space-y-2">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-purple-600 dark:text-purple-400">
                      Adaptive AI Diagnosis
                    </span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                      Weak-Point Targeting
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Calculates high-priority focus topics from quiz mistakes and generates tailored summaries.
                    </p>
                  </div>

                  <div className="md:col-span-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">Physics: Electromagnetism</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                        Needs Practice (42%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full w-[42%]" />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="font-bold text-slate-700 dark:text-slate-300">Mathematics: Tabular Integration</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                        Moderate (68%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full w-[68%]" />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="font-bold text-slate-700 dark:text-slate-300">Biology: Calvin Cycle</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        Mastered (94%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full w-[94%]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CORE CAPABILITIES GRID */}
      <section className="py-20 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
              Built For Serious Learners
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-2">
              Engineered to replace six fragmented study tools
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-indigo-700 transition space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Adaptive AI Tutor</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Directly analyzes your weak spots, generates diagnostic questions, and retains chat memory across tabs.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-indigo-700 transition space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Paperclip className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Notes & File Attachments</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Publish markdown summaries with lecture PDFs and diagram images. Read and download with one click.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-indigo-700 transition space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Instant Flashcard Flip</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Active recall flashcards are automatically extracted by AI from any peer note or manual input.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-indigo-700 transition space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Pomodoro Flow Engine</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Full session tracking, task matrix, ambient audio synthesizer, and weekly productivity analytics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <footer className="py-16 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-3">
            Start mastering your courses today.
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-lg mx-auto">
            Engineered for high-performing scholars, researchers, and competitive university cohorts.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onOpenSignUp}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-md shadow-indigo-600/20 flex items-center gap-2"
            >
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onLaunchDemo}
              className="px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              Instant Guest Mode
            </button>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-8">
            Paideutic © 2026. Adaptive AI Study & Student Productivity Platform. Designed for modern scholars.
          </p>
        </div>
      </footer>
    </div>
  );
};
