import React, { useState, useEffect } from 'react';
import { 
  Timer, 
  CheckCircle2, 
  BookOpen, 
  Sparkles, 
  Award, 
  Moon, 
  Sun, 
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { AppTab } from '../types';
import { ThemeMode } from '../utils/theme';

interface SidebarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  pendingTasksCount: number;
  weakTopicsCount: number;
  theme: ThemeMode;
  onToggleTheme: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  pendingTasksCount,
  weakTopicsCount,
  theme,
  onToggleTheme,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('paideutic_sidebar_collapsed');
      if (stored !== null) return stored === 'true';
      // Default collapsed on tablet screens (under 1024px) to preserve screen real estate
      return window.innerWidth < 1024;
    }
    return false;
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('paideutic_sidebar_collapsed', String(next));
      return next;
    });
  };

  const navItems = [
    {
      id: 'dashboard' as AppTab,
      label: 'Dashboard',
      icon: Timer,
      badge: null,
    },
    {
      id: 'tasks' as AppTab,
      label: 'Smart To-Do',
      icon: CheckCircle2,
      badge: pendingTasksCount > 0 ? pendingTasksCount : null,
      badgeColor: 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300',
    },
    {
      id: 'library' as AppTab,
      label: 'Material Library',
      icon: BookOpen,
      badge: null,
    },
    {
      id: 'ai' as AppTab,
      label: 'AI Tutor',
      icon: Sparkles,
      badge: weakTopicsCount > 0 ? `${weakTopicsCount} weak` : null,
      badgeColor: 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold',
    },
    {
      id: 'profile' as AppTab,
      label: 'Profile & Badges',
      icon: Award,
      badge: null,
    },
  ];

  const handleItemClick = (id: AppTab) => {
    onSelectTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="md:hidden fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Mobile Drawer Sidebar */}
      <aside
        id="mobile-drawer-sidebar"
        className={`md:hidden fixed top-0 bottom-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-bold text-base text-slate-900 dark:text-white">Paideutic</span>
            </div>
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1">
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Workspace
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${item.badgeColor || 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onToggleTheme}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center shadow-xs">
                {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
              </div>
              <span className="text-slate-800 dark:text-slate-200 font-bold">
                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </span>
            </div>
            <div className={`w-9 h-5 rounded-full p-0.5 flex items-center ${
              theme === 'dark' ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-600 justify-start'
            }`}>
              <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
            </div>
          </button>
        </div>
      </aside>

      {/* Desktop & Tablet Collapsible Stationary Sidebar */}
      <aside 
        id="desktop-sidebar"
        className={`hidden md:flex flex-col h-full shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-3 lg:p-4 justify-between select-none overflow-y-auto transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-60 lg:w-64'
        }`}
      >
        <div className="space-y-4">
          {/* Collapse Toggle Button Header */}
          <div className="flex items-center justify-between px-1">
            {!isCollapsed && (
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Workspace
              </p>
            )}
            <button
              onClick={toggleCollapse}
              id="sidebar-collapse-toggle"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              className={`p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                isCollapsed ? 'mx-auto' : ''
              }`}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Nav Items */}
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => onSelectTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center rounded-xl text-sm font-medium transition-all ${
                    isCollapsed 
                      ? 'justify-center p-3' 
                      : 'justify-between px-3 py-2.5'
                  } ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400 dark:text-slate-500'}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!isCollapsed && item.badge !== null && (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${item.badgeColor || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                      {item.badge}
                    </span>
                  )}
                  {isCollapsed && item.badge !== null && (
                    <span className="sr-only">({item.badge})</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Section: Dark Mode Toggle & Study Tip */}
        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onToggleTheme}
            id="sidebar-darkmode-toggle"
            title={isCollapsed ? (theme === 'dark' ? 'Dark Mode' : 'Light Mode') : undefined}
            className={`w-full flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-xs font-semibold transition group ${
              isCollapsed ? 'justify-center p-2.5' : 'justify-between p-3'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center shadow-xs text-slate-700 dark:text-amber-400 shrink-0">
                {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
              </div>
              {!isCollapsed && (
                <div className="text-left">
                  <span className="block text-slate-800 dark:text-slate-200 font-bold leading-tight">
                    {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                    {theme === 'dark' ? 'Eye-safe study' : 'High contrast'}
                  </span>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <div className={`w-9 h-5 rounded-full p-0.5 flex items-center transition-colors ${
                theme === 'dark' ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-600 justify-start'
              }`}>
                <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
              </div>
            )}
          </button>

          {!isCollapsed && (
            <div className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100/60 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-300 flex items-start gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
              <p className="text-[10.5px] leading-relaxed text-indigo-800/80 dark:text-indigo-300/80">
                <span className="font-semibold text-indigo-900 dark:text-indigo-200">Tip:</span> Review flashcards right after a 25m Pomodoro block for peak retention.
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar: with 44px min touch targets */}
      <nav 
        id="mobile-bottom-nav"
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-30 flex items-center justify-around px-1 shadow-lg"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] py-1 text-[10px] font-medium transition ${
                isActive ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                {item.badge !== null && (
                  <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-indigo-600" />
                )}
              </div>
              <span className="mt-1 truncate max-w-[56px]">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};

