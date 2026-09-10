export type Subject = 
  | 'Mathematics'
  | 'Physics'
  | 'Biology'
  | 'Chemistry'
  | 'Computer Science'
  | 'History'
  | 'Literature'
  | 'Psychology'
  | 'Language'
  | 'General Study';

export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  bio: string;
  avatar_url: string;
  study_goal: string;
  preferred_subjects: Subject[];
  weak_topics: string[];
  total_focus_mins: number;
  streak_count: number;
  ai_sessions_count?: number;
  notes_shared_count?: number;
  last_active_at: string;
  created_at: string;
}

export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  subject: Subject;
  priority: TaskPriority;
  is_completed: boolean;
  due_date: string;
  notes?: string;
  created_at: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string; // 'application/pdf', 'image/png', 'image/jpeg', etc.
  dataUrl: string;
  storageType?: 'supabase' | 'server' | 'local';
  supabasePath?: string;
  storageUrl?: string;
}

export interface SharedNote {
  id: string;
  user_id: string;
  author_name: string;
  author_avatar?: string;
  title: string;
  content: string;
  subject: Subject;
  upvotes: number;
  views: number;
  has_upvoted?: boolean;
  flashcards?: Flashcard[];
  attachments?: AttachedFile[];
  created_at: string;
}

export interface FocusSession {
  id: string;
  user_id: string;
  duration_mins: number;
  mode: 'focus' | 'short_break' | 'long_break';
  completed_at: string;
}

export type BadgeType = 
  | 'focus_novice'
  | 'study_marathoner'
  | 'knowledge_contributor'
  | 'ai_master'
  | 'streak_keeper'
  | 'task_master'
  | 'concept_conqueror';

export interface UserBadge {
  id: string;
  user_id: string;
  badge_type: BadgeType;
  title: string;
  description: string;
  icon: string;
  requirement: string;
  progress: number;
  maxProgress: number;
  is_unlocked: boolean;
  awarded_at?: string;
}

export interface WebSearchSource {
  title: string;
  url: string;
  snippet?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  detectedWeakness?: string | null;
  suggestedFollowUps?: string[];
  isWeaknessSaved?: boolean;
  searchedWeb?: boolean;
  sources?: WebSearchSource[];
}

export interface PracticeQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface AdaptiveSummaryResult {
  summary: string;
  highlightedWeaknesses: string[];
  analogies?: string;
  practiceQuestions?: PracticeQuestion[];
}

export interface ExamItem {
  id: string;
  title: string;
  subject: Subject;
  examDate: string; // YYYY-MM-DD
  weightPercent?: number;
  totalMarks?: number;
  locationOrRoom?: string;
  notes?: string;
}

export interface CourseGrade {
  id: string;
  courseName: string;
  credits: number;
  grade: string; // 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F'
}

export type AppTab = 'dashboard' | 'tasks' | 'library' | 'ai' | 'profile';
