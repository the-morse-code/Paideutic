import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Award, 
  CheckCircle2, 
  Clock, 
  Flame, 
  BookOpen, 
  Sparkles, 
  Plus, 
  Trash2, 
  Target,
  Edit2,
  Save,
  Check,
  Upload,
  Camera,
  Moon,
  Sun,
  Palette
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile, UserBadge, Subject } from '../types';
import { playAchievementFanfare } from '../utils/audio';
import { FLAT_VECTOR_AVATARS, processUserUploadedImage } from '../utils/avatars';
import { ThemeMode } from '../utils/theme';
import { FocusSession } from '../types';
import { GpaCalculatorWidget } from './GpaCalculatorWidget';
import { StudySessionHistory } from './StudySessionHistory';

interface ProfileViewProps {
  profile: UserProfile;
  badges: UserBadge[];
  tasksCompletedCount: number;
  notesSharedCount: number;
  focusSessions?: FocusSession[];
  onUpdateProfile: (updated: UserProfile) => void;
  onRemoveWeakTopic: (topic: string) => void;
  onAddWeakTopic: (topic: string) => void;
  onMasterWeakTopic: (topic: string) => void;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
}

const AVAILABLE_SUBJECTS: Subject[] = [
  'Mathematics',
  'Physics',
  'Biology',
  'Chemistry',
  'Computer Science',
  'History',
  'Literature',
  'Psychology',
  'Language',
  'General Study',
];

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  badges,
  tasksCompletedCount,
  notesSharedCount,
  focusSessions = [],
  onUpdateProfile,
  onRemoveWeakTopic,
  onAddWeakTopic,
  onMasterWeakTopic,
  theme,
  onToggleTheme,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio);
  const [studyGoal, setStudyGoal] = useState(profile.study_goal);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [preferredSubjects, setPreferredSubjects] = useState<Subject[]>(profile.preferred_subjects);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Add Topic Input
  const [newTopicInput, setNewTopicInput] = useState('');

  // Keep state in sync with incoming profile prop
  useEffect(() => {
    setUsername(profile.username);
    setBio(profile.bio);
    setStudyGoal(profile.study_goal);
    setAvatarUrl(profile.avatar_url);
    setPreferredSubjects(profile.preferred_subjects);
  }, [profile.avatar_url, profile.username, profile.bio, profile.study_goal]);

  const handleCustomAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset error
    setUploadError(null);
    setIsUploadingImage(true);

    try {
      const dataUrl = await processUserUploadedImage(file);
      setAvatarUrl(dataUrl);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to process image. Try a JPG or PNG under 5MB.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...profile,
      username: username.trim() || profile.username,
      bio: bio.trim(),
      study_goal: studyGoal.trim(),
      avatar_url: avatarUrl,
      preferred_subjects: preferredSubjects,
    });
    setIsEditing(false);
  };

  const handleToggleSubject = (sub: Subject) => {
    if (preferredSubjects.includes(sub)) {
      setPreferredSubjects(preferredSubjects.filter(s => s !== sub));
    } else {
      setPreferredSubjects([...preferredSubjects, sub]);
    }
  };

  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicInput.trim()) return;
    onAddWeakTopic(newTopicInput.trim());
    setNewTopicInput('');
  };

  const handleMaster = (topic: string) => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
    });
    playAchievementFanfare();
    onMasterWeakTopic(topic);
  };

  const totalFocusHours = (profile.total_focus_mins / 60).toFixed(1);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Profile Header Card */}
      <div className="lift-box bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-xs relative overflow-hidden transition-colors">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start md:items-center gap-5">
            {/* Display Avatar (Non-interactive when not in edit panel) */}
            <div className="shrink-0">
              <img
                src={avatarUrl}
                alt={profile.username}
                className="w-20 h-20 rounded-3xl object-cover border-2 border-indigo-100 dark:border-indigo-900/60 shadow-sm bg-indigo-50 dark:bg-slate-800"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {profile.username}
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 font-bold text-indigo-700 dark:text-indigo-300">
                  Scholar
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
                {profile.bio}
              </p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold pt-1">
                🎯 Target Goal: {profile.study_goal}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              id="profile-edit-toggle-btn"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
            </button>
          </div>
        </div>

        {/* Hidden File Input for Custom Avatar */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleCustomAvatarUpload}
          accept="image/png, image/jpeg, image/webp, image/gif"
          className="hidden" 
          id="avatar-file-upload-input"
        />

        {uploadError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
            {uploadError}
          </div>
        )}

        {/* EDIT FORM (Conditionally Shown when user clicks Edit Profile) */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Target Study Goal</label>
                <input
                  type="text"
                  value={studyGoal}
                  onChange={(e) => setStudyGoal(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Bio</label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none resize-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Flat Vector Illustrative Avatars & Custom Upload Option */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Choose Profile Picture
              </label>
              
              <div className="flex flex-wrap items-center gap-3">
                {FLAT_VECTOR_AVATARS.map((av) => (
                  <div
                    key={av.id}
                    onClick={() => setAvatarUrl(av.url)}
                    className={`flex items-center gap-2 p-1.5 pr-3 rounded-2xl border-2 cursor-pointer transition ${
                      avatarUrl === av.url
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/50 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={av.url}
                      alt={av.name}
                      className="w-9 h-9 rounded-xl object-cover bg-white dark:bg-slate-800"
                    />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {av.name}
                    </span>
                  </div>
                ))}

                {/* Custom Photo Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isUploadingImage ? 'Processing image...' : 'Upload Your Photo'}</span>
                </button>
              </div>
            </div>

            {/* Preferred Subjects */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Preferred Subjects</label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_SUBJECTS.map((sub) => {
                  const isPref = preferredSubjects.includes(sub);
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => handleToggleSubject(sub)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                        isPref
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="lift-card-subtle bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Self-Study Focus</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalFocusHours} <span className="text-xs font-semibold text-slate-400">hours</span></p>
        </div>
        <div className="lift-card-subtle bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tasks Completed</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{tasksCompletedCount} <span className="text-xs font-semibold text-slate-400">tasks</span></p>
        </div>
        <div className="lift-card-subtle bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Shared Peer Notes</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{notesSharedCount} <span className="text-xs font-semibold text-slate-400">notes</span></p>
        </div>
        <div className="lift-card-subtle bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Daily Streak</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{profile.streak_count} <span className="text-xs font-semibold text-slate-400">days</span></p>
        </div>
      </div>

      {/* Appearance Section in Profile Page */}
      {onToggleTheme && (
        <div className="lift-box bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Appearance & Study Theme</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Switch between high-contrast daylight mode and eye-comfort dark mode for late-night sessions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleTheme}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition ${
                theme === 'dark'
                  ? 'bg-slate-800 text-amber-300 border-slate-700 shadow-xs'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}
            >
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <span>{theme === 'dark' ? 'Dark Mode Active' : 'Light Mode Active'}</span>
            </button>
          </div>
        </div>
      )}

      {/* WEAK-TOPICS PROFILE ARRAY MANAGER */}
      <div className="lift-box bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-xs space-y-5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Weak-Point Knowledge Tracker</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track and conquer difficult concepts. The AI Tutor uses these to target your practice sessions.
              </p>
            </div>
          </div>

          {/* Add Manual Weak Point */}
          <form onSubmit={handleAddTopic} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Add topic (e.g. L'Hôpital's Rule)"
              value={newTopicInput}
              onChange={(e) => setNewTopicInput(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-amber-500/20 w-48 sm:w-56"
            />
            <button
              type="submit"
              disabled={!newTopicInput.trim()}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs disabled:opacity-40 transition"
            >
              Add
            </button>
          </form>
        </div>

        <div className="space-y-3 pt-2">
          {profile.weak_topics.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {profile.weak_topics.map((topic, i) => (
                <div
                  key={i}
                  className="lift-card-subtle p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-2 shadow-xs group"
                >
                  <span className="text-xs font-bold text-amber-950 dark:text-amber-200 truncate max-w-[150px]">
                    {topic}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMaster(topic)}
                      className="px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold transition flex items-center gap-1"
                      title="Mark topic as Mastered"
                    >
                      <Check className="w-3 h-3" />
                      <span>Mastered</span>
                    </button>

                    <button
                      onClick={() => onRemoveWeakTopic(topic)}
                      className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                      title="Remove from list"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400 dark:text-slate-500">
              No weak topics currently recorded. Ask questions in the AI Tutor to diagnose your gaps.
            </div>
          )}
        </div>
      </div>

      {/* GAMIFICATION: BADGES & MILESTONES */}
      <div className="lift-box bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-xs space-y-6 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Gamification & Milestones</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Unlock dynamic study trophies by maintaining streaks, focus sessions, and sharing knowledge.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map((badge) => {
            const percent = Math.min(100, Math.round((badge.progress / badge.maxProgress) * 100));
            return (
              <div
                key={badge.id}
                className={`lift-card-subtle p-5 rounded-3xl border transition flex flex-col justify-between ${
                  badge.is_unlocked
                    ? 'bg-gradient-to-b from-white to-amber-50/20 dark:from-slate-800 dark:to-amber-950/20 border-amber-200 dark:border-amber-800/60 shadow-xs'
                    : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{badge.icon}</span>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        badge.is_unlocked
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {badge.is_unlocked ? 'Unlocked' : 'In Progress'}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{badge.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{badge.description}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="pt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    <span>{badge.requirement}</span>
                    <span>{percent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        badge.is_unlocked ? 'bg-amber-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Academic Standing & Grade Projector */}
      <GpaCalculatorWidget />

      {/* Study Session History Log */}
      {focusSessions && focusSessions.length > 0 && (
        <StudySessionHistory sessions={focusSessions} />
      )}
    </div>
  );
};

