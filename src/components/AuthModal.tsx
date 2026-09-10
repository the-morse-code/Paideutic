import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight, 
  Eye,
  EyeOff,
  Copy,
  Check,
  Code2
} from 'lucide-react';
import { 
  signUpWithEmail, 
  signInWithEmail, 
  signInWithGoogle, 
  continueAsGuest, 
  isSupabaseConfigured,
  AuthSessionUser 
} from '../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'signin' | 'signup';
  onClose: () => void;
  onSuccess: (user: AuthSessionUser) => void;
  onOpenDatabaseSettings?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'signup',
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [studyGoal, setStudyGoal] = useState('Maintain a 3.8+ GPA in STEM');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showSqlFix, setShowSqlFix] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const SQL_FIX_SCRIPT = `-- 30-Second Fix for Supabase Database Error Saving New User
-- Paste & Run in Supabase Dashboard -> SQL Editor:

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  study_goal TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url, study_goal)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'study_goal', 'Academic Excellence')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
`;

  const copySqlScript = () => {
    navigator.clipboard.writeText(SQL_FIX_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  if (!isOpen) return null;

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (!isSupabaseConfigured()) {
        throw new Error(
          'Authentication service is initializing. Please ensure environment variables are configured.'
        );
      }

      if (mode === 'signup') {
        if (!email || !password || !username) {
          throw new Error('Please fill in all required fields.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        const result = await signUpWithEmail(email, password, username, studyGoal);
        setSuccessMsg(result.message || 'Account created successfully!');
        onSuccess(result.user);
        onClose();
      } else {
        if (!email || !password) {
          throw new Error('Please enter both email and password.');
        }
        const user = await signInWithEmail(email, password);
        setSuccessMsg('Welcome back to Paideutic!');
        onSuccess(user);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Google Auth is not configured in environment variables');
      }
      await signInWithGoogle();
    } catch (err: any) {
      setErrorMsg(err.message || 'Google Auth is not configured in environment variables');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestQuickStart = () => {
    const guest = continueAsGuest();
    onSuccess(guest);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            id="auth-modal-close-btn"
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20 mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {mode === 'signup' ? 'Create Your Paideutic Account' : 'Welcome Back to Paideutic'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              {mode === 'signup' 
                ? 'Your personal AI study hub, smart flashcards & peer notes'
                : 'Enter your details to access your personal study workspace'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-5">
            <button
              type="button"
              id="auth-tab-signup"
              onClick={() => { setMode('signup'); setErrorMsg(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              id="auth-tab-signin"
              onClick={() => { setMode('signin'); setErrorMsg(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                mode === 'signin'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Log In
            </button>
          </div>

          {/* Social Auth: Continue with Google */}
          <div className="space-y-3 mb-4">
            <button
              type="button"
              id="auth-google-login-btn"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2.5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{mode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}</span>
            </button>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-slate-900 px-3 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 absolute">
                or with email
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name or Username *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    id="auth-input-username"
                    placeholder="e.g. Alex Chen"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  id="auth-input-email"
                  placeholder="student@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  id="auth-input-password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
                <button
                  type="button"
                  id="auth-toggle-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Academic Goal (Optional)
                </label>
                <input
                  type="text"
                  id="auth-input-goal"
                  placeholder="e.g. Master Organic Chemistry & MCAT Prep"
                  value={studyGoal}
                  onChange={(e) => setStudyGoal(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>
            )}

            {/* Error & Success Messages */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              id="auth-submit-btn"
              className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <span>Please wait...</span>
              ) : (
                <>
                  <span>{mode === 'signup' ? 'Create Account' : 'Log In to Paideutic'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Database Setup & SQL Helper */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              id="auth-toggle-sql-fix-btn"
              onClick={() => setShowSqlFix(!showSqlFix)}
              className="w-full text-center text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center gap-1.5 transition"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Fix Supabase "Database error saving new user"? (Click to view 30s SQL fix)</span>
            </button>

            {showSqlFix && (
              <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between mb-1.5 font-bold text-slate-800 dark:text-slate-100">
                  <span>Supabase SQL Fix (Create Profiles Table & Trigger)</span>
                  <button
                    type="button"
                    onClick={copySqlScript}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
                  >
                    {copiedSql ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSql ? 'Copied!' : 'Copy SQL'}</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
                  Paste this into your Supabase Dashboard &rarr; <strong>SQL Editor</strong> &rarr; Click <strong>Run</strong>. It creates the missing profiles table and sets up user syncing automatically.
                </p>
                <pre className="p-2 rounded-xl bg-slate-900 text-slate-200 text-[10px] font-mono overflow-x-auto max-h-32">
                  {SQL_FIX_SCRIPT}
                </pre>
              </div>
            )}
          </div>

          {/* Guest Demo Mode */}
          <div className="mt-3 text-center">
            <button
              type="button"
              id="auth-guest-demo-btn"
              onClick={handleGuestQuickStart}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1"
            >
              <span>Instant Test Drive: Continue as Guest (Demo)</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
