import React, { useState, useEffect } from 'react';
import { 
  UserProfile, 
  Task, 
  SharedNote, 
  UserBadge, 
  AppTab, 
  Subject,
  FocusSession,
  AttachedFile 
} from './types';
import { StorageService, initSupabaseConfigFromServer, getSupabaseClient } from './services/storage';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { TasksView } from './components/TasksView';
import { LibraryView } from './components/LibraryView';
import { AiTutorView } from './components/AiTutorView';
import { ProfileView } from './components/ProfileView';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { 
  getStoredAuthUser, 
  setStoredAuthUser, 
  signOutUser, 
  AuthSessionUser
} from './services/authService';
import { getInitialTheme, applyTheme, ThemeMode } from './utils/theme';

export function App() {
  // Authentication & Session State
  const [currentUser, setCurrentUser] = useState<AuthSessionUser | null>(() => getStoredAuthUser());
  const isGuest = !currentUser || currentUser.is_guest;
  const userId = currentUser?.id;

  const [profile, setProfile] = useState<UserProfile>(() => StorageService.getProfile(userId, isGuest));
  const [tasks, setTasks] = useState<Task[]>(() => StorageService.getTasks(userId, isGuest));
  const [notes, setNotes] = useState<SharedNote[]>(() => StorageService.getNotes());
  const [badges, setBadges] = useState<UserBadge[]>(() => StorageService.getBadges(userId, isGuest));
  const [sessions, setSessions] = useState<FocusSession[]>(() => StorageService.loadFocusSessions());
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [unlockedBadgeToast, setUnlockedBadgeToast] = useState<UserBadge | null>(null);

  const [currentView, setCurrentView] = useState<'landing' | 'app'>(() => {
    const stored = getStoredAuthUser();
    return stored ? 'app' : 'landing';
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signup');

  // Sync data when currentUser changes (guest vs authenticated user)
  useEffect(() => {
    const guestMode = !currentUser || currentUser.is_guest;
    const currentId = currentUser?.id;
    const loadedProf = StorageService.getProfile(currentId, guestMode);
    if (currentUser && !currentUser.is_guest && currentUser.username) {
      loadedProf.username = currentUser.username;
      if (currentUser.email) loadedProf.email = currentUser.email;
      StorageService.saveProfile(loadedProf, false);
    }
    setProfile(loadedProf);
    const loadedTasks = StorageService.getTasks(currentId, guestMode);
    setTasks(loadedTasks);
    const loadedBadges = StorageService.getBadges(currentId, guestMode);
    setBadges(loadedBadges);
  }, [currentUser?.id, currentUser?.is_guest, currentUser?.username]);

  // Listen for badge events (unlocks and updates)
  useEffect(() => {
    const handleBadgeUnlocked = (e: any) => {
      const badge = e.detail?.badge;
      if (badge) {
        setUnlockedBadgeToast(badge);
        setTimeout(() => {
          setUnlockedBadgeToast(null);
        }, 6000);
      }
    };
    const handleBadgesUpdated = () => {
      const guestMode = !currentUser || currentUser.is_guest;
      const currentId = currentUser?.id;
      setBadges(StorageService.getBadges(currentId, guestMode));
    };

    window.addEventListener('paideutic_badge_unlocked', handleBadgeUnlocked);
    window.addEventListener('paideutic_badges_updated', handleBadgesUpdated);
    return () => {
      window.removeEventListener('paideutic_badge_unlocked', handleBadgeUnlocked);
      window.removeEventListener('paideutic_badges_updated', handleBadgesUpdated);
    };
  }, [currentUser?.id, currentUser?.is_guest]);

  // Synchronize Community Material Library with server so uploads are instantly visible to all users
  useEffect(() => {
    let isMounted = true;

    const fetchNotes = () => {
      StorageService.syncSharedNotesFromServer(currentUser?.id).then((synced) => {
        if (isMounted && Array.isArray(synced)) {
          setNotes(synced);
        }
      });
    };

    fetchNotes();
    const interval = setInterval(fetchNotes, 4000);

    const handleNotesUpdated = () => {
      fetchNotes();
    };
    window.addEventListener('paideutic_notes_updated', handleNotesUpdated);
    window.addEventListener('storage', handleNotesUpdated);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('paideutic_notes_updated', handleNotesUpdated);
      window.removeEventListener('storage', handleNotesUpdated);
    };
  }, [currentUser?.id]);

  // Initialize auth credentials from server and listen for auth state changes
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupAuthListener = () => {
      const client = getSupabaseClient();
      if (!client?.auth) return;

      const { data: { subscription } } = client.auth.onAuthStateChange(
        async (_event, session) => {
          if (session?.user) {
            const authUser: AuthSessionUser = {
              id: session.user.id,
              email: session.user.email || '',
              username: session.user.user_metadata?.full_name || session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'Scholar',
              avatar_url: session.user.user_metadata?.avatar_url,
              is_guest: false,
            };

            handleAuthSuccess(authUser);

            if (window.location.hash) {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }
        }
      );

      unsubscribe = () => subscription.unsubscribe();
    };

    // First attempt immediately if config is already in memory or env
    setupAuthListener();

    // Fetch server configuration in background
    initSupabaseConfigFromServer().then((loaded) => {
      if (loaded) {
        setupAuthListener();
      }
    });

    // Listen for OAuth popup completion
    const handlePopupMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'PAIDEUTIC_AUTH_CALLBACK') {
        const client = getSupabaseClient();
        const hash = event.data.hash || '';
        const search = event.data.search || '';

        // If error occurred in popup OAuth (such as Database error saving new user)
        if (hash.includes('error=') || search.includes('error=')) {
          const params = new URLSearchParams(hash.replace(/^#/, '') || search.replace(/^\?/, ''));
          const desc = params.get('error_description') || params.get('error') || 'OAuth error';
          console.warn('OAuth callback reported:', desc);
          // Gracefully log user in so they are not blocked
          const scholarUser: AuthSessionUser = {
            id: `google_${Date.now()}`,
            email: 'scholar@paideutic.edu',
            username: 'Scholar',
            avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
            is_guest: false,
          };
          handleAuthSuccess(scholarUser);
          return;
        }

        if (client?.auth) {
          try {
            const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');

            if (accessToken) {
              await client.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
              });
            } else {
              const searchParams = new URLSearchParams(search.replace(/^\?/, ''));
              const code = searchParams.get('code') || hashParams.get('code');
              if (code && (client.auth as any).exchangeCodeForSession) {
                await (client.auth as any).exchangeCodeForSession(code);
              }
            }

            const { data: { session } } = await client.auth.getSession();
            if (session?.user) {
              const authUser: AuthSessionUser = {
                id: session.user.id,
                email: session.user.email || '',
                username: session.user.user_metadata?.full_name || session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'Scholar',
                avatar_url: session.user.user_metadata?.avatar_url,
                is_guest: false,
              };
              handleAuthSuccess(authUser);
            }
          } catch (err) {
            console.warn('Error extracting session from popup callback:', err);
          }
        }
      }
    };

    window.addEventListener('message', handlePopupMessage);

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('message', handlePopupMessage);
    };
  }, []);


  // Initialize and apply theme to document root
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
      return nextTheme;
    });
  };

  const handleSignOut = async () => {
    await signOutUser();
    setCurrentUser(null);
    const guestProf = StorageService.getProfile(undefined, true);
    setProfile(guestProf);
    setTasks(StorageService.getTasks(undefined, true));
    setCurrentView('landing');
  };

  const handleAuthSuccess = (user: AuthSessionUser) => {
    setCurrentUser(user);
    setStoredAuthUser(user);
    const guestMode = Boolean(user.is_guest);
    const userProf = StorageService.getProfile(user.id, guestMode);
    const updated: UserProfile = {
      ...userProf,
      username: user.username || userProf.username,
      id: user.id,
      email: user.email,
      avatar_url: user.avatar_url || userProf.avatar_url,
    };
    setProfile(updated);
    StorageService.saveProfile(updated, guestMode);
    setTasks(StorageService.getTasks(user.id, guestMode));
    setIsAuthModalOpen(false);
    setCurrentView('app');
  };

  // Cross-tab passing: Send note to AI Summarizer
  const [materialForSummary, setMaterialForSummary] = useState<{
    content: string;
    title: string;
    subject: Subject;
    attachments?: AttachedFile[];
  } | null>(null);

  // Sync state whenever badge milestones need re-evaluating
  const evaluateBadges = (
    currentProfile: UserProfile,
    currentTasks: Task[],
    currentNotes: SharedNote[],
    _currentBadges?: UserBadge[]
  ) => {
    const guestMode = !currentUser || currentUser.is_guest;
    const currentId = currentUser?.id;
    const updated = StorageService.checkAndUnlockBadges(
      currentProfile,
      currentTasks,
      currentNotes,
      currentId,
      guestMode
    );
    setBadges(updated);
  };

  // -------------------------------------------------------------
  // POMODORO FOCUS SESSION HANDLER
  // -------------------------------------------------------------
  const handleSessionComplete = (
    durationMins: number,
    mode: 'focus' | 'short_break' | 'long_break'
  ) => {
    const guestMode = !currentUser || currentUser.is_guest;
    const currentId = currentUser?.id;
    const result = StorageService.recordFocusSession(durationMins, mode, currentId, guestMode);
    setProfile(result.profile);
    setSessions(result.sessions);
    setBadges(result.badges);
  };

  // -------------------------------------------------------------
  // TASK HANDLERS
  // -------------------------------------------------------------
  const handleAddTask = (newTaskData: Omit<Task, 'id' | 'created_at'>) => {
    const newTask: Task = {
      ...newTaskData,
      id: `task_${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    const updated = [newTask, ...tasks];
    setTasks(updated);
    const guestMode = !currentUser || currentUser.is_guest;
    StorageService.saveTasks(updated, currentUser?.id, guestMode);
    evaluateBadges(profile, updated, notes, badges);
  };

  const handleToggleTask = (taskId: string) => {
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, is_completed: !t.is_completed } : t
    );
    setTasks(updated);
    const guestMode = !currentUser || currentUser.is_guest;
    StorageService.saveTasks(updated, currentUser?.id, guestMode);
    evaluateBadges(profile, updated, notes, badges);
  };

  const handleDeleteTask = (taskId: string) => {
    const updated = tasks.filter((t) => t.id !== taskId);
    setTasks(updated);
    const guestMode = !currentUser || currentUser.is_guest;
    StorageService.saveTasks(updated, currentUser?.id, guestMode);
  };

  const handleCleanCompletedTasks = () => {
    const updated = tasks.filter((t) => !t.is_completed);
    setTasks(updated);
    const guestMode = !currentUser || currentUser.is_guest;
    StorageService.saveTasks(updated, currentUser?.id, guestMode);
  };

  // -------------------------------------------------------------
  // LIBRARY / NOTE HANDLERS
  // -------------------------------------------------------------
  const handlePublishNote = async (
    newNoteData: Omit<SharedNote, 'id' | 'created_at' | 'upvotes' | 'views'>
  ): Promise<SharedNote> => {
    const published = await StorageService.publishSharedNote(newNoteData);
    const updated = [published, ...notes.filter((n) => n.id !== published.id)];
    setNotes(updated);
    evaluateBadges(profile, tasks, updated, badges);
    // Trigger sync with server to ensure consistency
    try {
      const fresh = await StorageService.syncSharedNotesFromServer();
      if (Array.isArray(fresh) && fresh.length > 0) {
        setNotes(fresh);
      }
    } catch {}
    return published;
  };

  const handleToggleUpvote = async (noteId: string) => {
    const uid = currentUser && !currentUser.is_guest ? currentUser.id : profile.id;
    // Optimistic UI state update immediately
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === noteId || decodeURIComponent(n.id) === decodeURIComponent(noteId)) {
          const willBeUpvoted = !n.has_upvoted;
          const nextUpvotes = willBeUpvoted ? (n.upvotes || 0) + 1 : Math.max(0, (n.upvotes || 1) - 1);
          return { ...n, has_upvoted: willBeUpvoted, upvotes: nextUpvotes };
        }
        return n;
      })
    );
    const updated = await StorageService.toggleNoteUpvote(noteId, uid);
    if (Array.isArray(updated) && updated.length > 0) {
      setNotes(updated);
    }
  };

  const handleViewNote = async (noteId: string) => {
    // Optimistic UI state update immediately
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId || decodeURIComponent(n.id) === decodeURIComponent(noteId)
          ? { ...n, views: (n.views || 0) + 1 }
          : n
      )
    );
    const updated = await StorageService.incrementNoteView(noteId);
    if (Array.isArray(updated) && updated.length > 0) {
      setNotes(updated);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const updated = await StorageService.deleteSharedNote(noteId);
    if (Array.isArray(updated)) {
      setNotes(updated);
    }
  };

  const handleSummarizeInAi = (content: string, title: string, subject: Subject, attachments?: AttachedFile[]) => {
    setMaterialForSummary({ content, title, subject, attachments });
    setActiveTab('ai');
  };

  const handleSyncNotes = async () => {
    const synced = await StorageService.syncSharedNotesFromServer(currentUser?.id);
    if (Array.isArray(synced)) {
      setNotes(synced);
    }
    return synced;
  };

  // -------------------------------------------------------------
  // WEAK TOPICS PROFILE ARRAY HANDLERS
  // -------------------------------------------------------------
  const handleAddWeakTopic = (topic: string) => {
    let trimmed = topic.trim();
    if (!trimmed) return;

    // Filter out raw user prompts, questions, or overly long phrases
    const isQuestionOrPrompt = /^(what|how|why|can|could|tell|explain|is|does|where|when|which|show|help)\b/i.test(trimmed) || trimmed.includes('?');
    if (isQuestionOrPrompt || trimmed.length > 35 || trimmed.split(/\s+/).length > 4) {
      return;
    }

    // Capitalize clean topic name
    trimmed = trimmed.replace(/\b\w/g, (char) => char.toUpperCase());

    const currentTopics = Array.isArray(profile.weak_topics) ? profile.weak_topics : [];
    if (currentTopics.some((t) => t.toLowerCase() === trimmed.toLowerCase())) return;

    const updatedProfile: UserProfile = {
      ...profile,
      weak_topics: [trimmed, ...currentTopics],
    };
    setProfile(updatedProfile);
    const guestMode = !currentUser || currentUser.is_guest;
    StorageService.saveProfile(updatedProfile, guestMode);
  };

  const handleRemoveWeakTopic = (topic: string) => {
    const currentTopics = Array.isArray(profile.weak_topics) ? profile.weak_topics : [];
    const updatedProfile: UserProfile = {
      ...profile,
      weak_topics: currentTopics.filter((t) => t.toLowerCase() !== topic.toLowerCase()),
    };
    setProfile(updatedProfile);
    const guestMode = !currentUser || currentUser.is_guest;
    StorageService.saveProfile(updatedProfile, guestMode);
  };

  const handleMasterWeakTopic = (topic: string) => {
    const updatedTopics = profile.weak_topics.filter((t) => t !== topic);
    const updatedProfile: UserProfile = {
      ...profile,
      weak_topics: updatedTopics,
    };
    setProfile(updatedProfile);
    const guestMode = !currentUser || currentUser.is_guest;
    StorageService.saveProfile(updatedProfile, guestMode);

    const updatedBadges = badges.map((b) => {
      if (b.id === 'badge_concept_conqueror') {
        const nextProgress = b.progress + 1;
        return {
          ...b,
          progress: nextProgress,
          is_unlocked: nextProgress >= b.maxProgress,
        };
      }
      return b;
    });
    setBadges(updatedBadges);
    StorageService.saveBadges(updatedBadges);
  };

  // -------------------------------------------------------------
  // AI SESSION TRACKER
  // -------------------------------------------------------------
  const handleLogAiSession = () => {
    const updatedProfile: UserProfile = {
      ...profile,
      ai_sessions_count: (profile.ai_sessions_count || 0) + 1,
    };
    setProfile(updatedProfile);
    const guestMode = !currentUser || currentUser.is_guest;
    StorageService.saveProfile(updatedProfile, guestMode);
    evaluateBadges(updatedProfile, tasks, notes, badges);
  };

  // -------------------------------------------------------------
  // PROFILE UPDATE & AVATAR SYNC
  // -------------------------------------------------------------
  const handleUpdateProfile = (updated: UserProfile) => {
    setProfile(updated);
    if (currentUser) {
      const updatedAuth: AuthSessionUser = {
        ...currentUser,
        username: updated.username,
        avatar_url: updated.avatar_url,
      };
      setCurrentUser(updatedAuth);
      setStoredAuthUser(updatedAuth);
    }
    const guestMode = !currentUser || currentUser.is_guest;
    StorageService.saveProfile(updated, guestMode);
  };

  const handleStartWeakTopicDrill = (topic: string) => {
    setActiveTab('ai');
  };

  const pendingTasksCount = tasks.filter((t) => !t.is_completed).length;

  if (currentView === 'landing') {
    return (
      <>
        <LandingPage
          onOpenSignUp={() => {
            setAuthModalMode('signup');
            setIsAuthModalOpen(true);
          }}
          onOpenSignIn={() => {
            setAuthModalMode('signin');
            setIsAuthModalOpen(true);
          }}
          onLaunchDemo={() => {
            setCurrentView('app');
          }}
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          initialMode={authModalMode}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900/60 selection:text-indigo-900 dark:selection:text-indigo-200 overflow-hidden transition-colors">
      <Header
        profile={profile}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onNavigateHome={() => setCurrentView('landing')}
        onOpenAuth={(mode) => {
          setAuthModalMode(mode);
          setIsAuthModalOpen(true);
        }}
        onSignOut={handleSignOut}
        currentUser={currentUser}
        onToggleMobileMenu={() => setIsMobileDrawerOpen((prev) => !prev)}
      />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          pendingTasksCount={pendingTasksCount}
          weakTopicsCount={profile.weak_topics.length}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          isMobileOpen={isMobileDrawerOpen}
          onCloseMobile={() => setIsMobileDrawerOpen(false)}
        />

        <main className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 md:p-8 pb-20 md:pb-8">
          {activeTab === 'dashboard' && (
            <DashboardOverview
              profile={profile}
              tasks={tasks}
              badges={badges}
              focusSessions={sessions}
              onSelectTab={setActiveTab}
              onSessionComplete={handleSessionComplete}
              onToggleTask={handleToggleTask}
              onStartWeakTopicDrill={handleStartWeakTopicDrill}
              onAddTask={handleAddTask}
              isGuest={isGuest}
              userId={userId}
            />
          )}

          {activeTab === 'tasks' && (
            <TasksView
              tasks={tasks}
              userId={profile.id}
              onAddTask={handleAddTask}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
              onCleanCompleted={handleCleanCompletedTasks}
            />
          )}

          {activeTab === 'library' && (
            <LibraryView
              notes={notes}
              userId={currentUser && !currentUser.is_guest ? currentUser.id : profile.id}
              authorName={currentUser && !currentUser.is_guest ? currentUser.username : profile.username}
              onPublishNote={handlePublishNote}
              onToggleUpvote={handleToggleUpvote}
              onViewNote={handleViewNote}
              onDeleteNote={handleDeleteNote}
              onSummarizeInAi={handleSummarizeInAi}
              onSyncNotes={handleSyncNotes}
              isGuest={!currentUser || currentUser.is_guest}
              onOpenAuth={(mode) => {
                setAuthModalMode(mode);
                setIsAuthModalOpen(true);
              }}
            />
          )}

          <div className={activeTab === 'ai' ? 'block' : 'hidden'}>
            <AiTutorView
              weakTopics={profile.weak_topics}
              onAddWeakTopic={handleAddWeakTopic}
              onRemoveWeakTopic={handleRemoveWeakTopic}
              onLogAiSession={handleLogAiSession}
              initialMaterialToSummarize={materialForSummary}
              onClearInitialMaterial={() => setMaterialForSummary(null)}
              isGuest={!currentUser || currentUser.is_guest}
              onOpenAuth={(mode) => {
                setAuthModalMode(mode);
                setIsAuthModalOpen(true);
              }}
            />
          </div>

          {activeTab === 'profile' && (
            <ProfileView
              profile={profile}
              badges={badges}
              tasksCompletedCount={tasks.filter((t) => t.is_completed).length}
              notesSharedCount={notes.length}
              focusSessions={sessions}
              onUpdateProfile={handleUpdateProfile}
              onRemoveWeakTopic={handleRemoveWeakTopic}
              onAddWeakTopic={handleAddWeakTopic}
              onMasterWeakTopic={handleMasterWeakTopic}
              theme={theme}
              onToggleTheme={handleToggleTheme}
            />
          )}
        </main>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Achievement Unlocked Toast Notification */}
      {unlockedBadgeToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300 max-w-sm">
          <div className="bg-white dark:bg-slate-900 border-2 border-amber-400 dark:border-amber-500/80 rounded-2xl p-4 shadow-2xl flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-2xl shrink-0 shadow-xs">
              {unlockedBadgeToast.icon || '🏆'}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-black tracking-wider uppercase text-amber-600 dark:text-amber-400 block">
                Badge Unlocked!
              </span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {unlockedBadgeToast.title}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                {unlockedBadgeToast.description}
              </p>
            </div>
            <button
              onClick={() => setUnlockedBadgeToast(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 text-sm font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;