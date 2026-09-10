import React from 'react';
import { Sparkles, Flame, Sun, Moon, LogOut, LogIn, Home, Menu } from 'lucide-react';
import { UserProfile, AppTab } from '../types';
import { ThemeMode } from '../utils/theme';
import { AuthSessionUser } from '../services/authService';

interface HeaderProps {
  profile: UserProfile;
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onNavigateHome?: () => void;
  onOpenAuth?: (mode: 'signin' | 'signup') => void;
  onSignOut?: () => void;
  currentUser?: AuthSessionUser | null;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  activeTab,
  onSelectTab,
  theme,
  onToggleTheme,
  onNavigateHome,
  onOpenAuth,
  onSignOut,
  currentUser,
  onToggleMobileMenu,
}) => {
  const isGuest = !currentUser || currentUser.is_guest;

  return (
    <header className="h-16 shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 md:px-8 flex items-center justify-between sticky top-0 z-20 transition-colors">
      {/* Brand & Mobile Title */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Hamburger Drawer Toggle */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 -ml-1 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div 
          onClick={() => onSelectTab('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group"
          id="header-brand"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-500 flex items-center justify-center text-white shadow-sm shadow-indigo-200 dark:shadow-none group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">Paideutic</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">chill study hub</p>
          </div>
        </div>

        {/* Landing Page link: Only visible in Instant Demo mode! */}
        {onNavigateHome && isGuest && (
          <button
            onClick={onNavigateHome}
            id="header-home-btn"
            title="Return to Main Landing Page"
            className="hidden md:flex items-center gap-1.5 ml-2 lg:ml-3 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Landing</span>
          </button>
        )}
      </div>

      {/* Action Badges & Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
        {/* Daily Streak Counter */}
        <div 
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs font-semibold shadow-xs"
          title={`${profile.streak_count} day daily study streak`}
          id="header-streak-badge"
        >
          <Flame className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-amber-600 dark:text-amber-400 fill-amber-500 dark:fill-amber-400 animate-pulse" />
          <span>{profile.streak_count} <span className="hidden sm:inline">Days</span></span>
        </div>

        {/* Quick Theme Toggle in Header */}
        <button
          onClick={onToggleTheme}
          id="header-theme-toggle"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-slate-200 dark:border-slate-700"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* User Profile Mini Tab or Sign In */}
        {currentUser && !currentUser.is_guest ? (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => onSelectTab('profile')}
              id="header-profile-btn"
              className="flex items-center gap-2 pl-1 sm:pl-1.5 pr-2 sm:pr-3 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            >
              <img
                src={profile.avatar_url || currentUser.avatar_url}
                alt={profile.username}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
              />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 hidden sm:inline max-w-[110px] truncate">
                {profile.username || currentUser.username}
              </span>
            </button>
            {onSignOut && (
              <button
                onClick={onSignOut}
                id="header-signout-btn"
                title="Sign out of account"
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onSelectTab('profile')}
              id="header-profile-btn"
              className="flex items-center gap-2 pl-1 sm:pl-1.5 pr-2 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <img
                src={profile.avatar_url}
                alt={profile.username}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
              />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 hidden sm:inline max-w-[100px] truncate">
                {profile.username}
              </span>
            </button>
            {onOpenAuth && (
              <button
                onClick={() => onOpenAuth('signup')}
                id="header-auth-cta-btn"
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-2xs flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In / Up</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};


