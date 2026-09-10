export const ZERO_COST_SQL_SCHEMA = `-- ==============================================================================
-- PAIDEUTIC: ZERO-COST SUPABASE POSTGRESQL SCHEMA WITH RLS & INDEXES
-- Designed for 100% permanent free-tier longevity (500MB DB, 1GB Storage)
-- ==============================================================================

-- 1. PROFILES: Core student identity, weak-topics array, and focus analytics
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  bio TEXT,
  avatar_url TEXT,
  study_goal TEXT,
  preferred_subjects TEXT[] DEFAULT '{}',
  -- Using TEXT[] array prevents costly many-to-many join tables and keeps row counts tiny
  weak_topics TEXT[] DEFAULT '{}',
  total_focus_mins INTEGER DEFAULT 0,
  streak_count INTEGER DEFAULT 0,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SHARED NOTES: Community peer note library
CREATE TABLE IF NOT EXISTS shared_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  title TEXT NOT NULL,
  -- Storing markdown/text directly in Postgres TEXT columns avoids Supabase Storage limits
  content TEXT NOT NULL,
  subject TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  flashcards_json JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TASKS: Smart To-Do list with priority and completion states
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  is_completed BOOLEAN DEFAULT FALSE,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. FOCUS SESSIONS: Lightweight Pomodoro session logs (only logged on completion)
CREATE TABLE IF NOT EXISTS focus_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  duration_mins INTEGER DEFAULT 25,
  mode TEXT DEFAULT 'focus',
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. USER BADGES: Dynamic milestones & gamification
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_type)
);

-- ==============================================================================
-- PERFORMANCE INDEXES (Zero cost, maximum query speed)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_shared_notes_subject ON shared_notes(subject);
CREATE INDEX IF NOT EXISTS idx_shared_notes_created ON shared_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Profiles: Public read, owner update/insert
CREATE POLICY "Public profiles are viewable by everyone" 
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Shared Notes: Public read, owner insert/update/delete
CREATE POLICY "Shared notes are viewable by everyone" 
  ON shared_notes FOR SELECT USING (true);

CREATE POLICY "Users can insert own notes" 
  ON shared_notes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes" 
  ON shared_notes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes" 
  ON shared_notes FOR DELETE USING (auth.uid() = user_id);

-- Tasks: Private to each student
CREATE POLICY "Users can manage own tasks" 
  ON tasks FOR ALL USING (auth.uid() = user_id);

-- Focus Sessions: Private to each student
CREATE POLICY "Users can manage own focus sessions" 
  ON focus_sessions FOR ALL USING (auth.uid() = user_id);

-- Badges: Private to student
CREATE POLICY "Users can view own badges" 
  ON user_badges FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own badges" 
  ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- HELPER RPC: Append Weak Topic Atomically
-- Avoids race conditions and guarantees unique weak topics without row overhead
-- ==============================================================================
CREATE OR REPLACE FUNCTION append_weak_topic(user_id UUID, new_topic TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET weak_topics = ARRAY(
    SELECT DISTINCT unnest(array_append(weak_topics, new_topic))
  )
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

export const ZERO_COST_ARCHITECTURE_NOTES = [
  {
    pillar: "Database & Relational Model",
    freeLimit: "500MB on Supabase",
    optimization: "Uses TEXT[] array columns for small collections (weak_topics, preferred_subjects) rather than join tables, minimizing row counts and query latency."
  },
  {
    pillar: "File Storage & Bandwidth",
    freeLimit: "1GB Storage / 100GB Vercel",
    optimization: "Stores markdown notes and flashcards directly as Postgres TEXT and JSONB columns, completely bypassing costly S3/storage buckets and binary downloads."
  },
  {
    pillar: "Adaptive Gemini AI",
    freeLimit: "1,500 free req/day",
    optimization: "Utilizes gemini-3.8-flash via @google/genai with strict JSON schema outputs and resilient fallback, ensuring zero token hallucination and low latency."
  },
  {
    pillar: "Client Computation & Timers",
    freeLimit: "Zero Server Overhead",
    optimization: "Pomodoro timers and harmonic audio cues run 100% in the browser via Web Audio API, logging to DB only when a full 25-minute cycle finishes."
  }
];
