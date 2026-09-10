import { UserProfile, Task, SharedNote, FocusSession, UserBadge, BadgeType } from '../types';
import { INITIAL_PROFILE, INITIAL_TASKS, INITIAL_NOTES, INITIAL_BADGES } from '../data/initialData';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEYS = {
  GUEST_PROFILE: 'paideutic_guest_profile',
  GUEST_TASKS: 'paideutic_guest_tasks',
  GUEST_BADGES: 'paideutic_guest_badges',
  PROFILE: 'paideutic_profile',
  TASKS: 'paideutic_tasks',
  NOTES: 'paideutic_notes',
  SESSIONS: 'paideutic_sessions',
  BADGES: 'paideutic_badges',
  SUPABASE_URL: 'paideutic_supabase_url',
  SUPABASE_ANON: 'paideutic_supabase_anon',
};

let supabaseInstance: SupabaseClient | null = null;

const DEFAULT_SUPABASE_URL = 'https://gomekylzuztihoxzjbbm.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbWVreWx6dXp0aWhveHpqYmJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwODU4MDcsImV4cCI6MjEwMzY2MTgwN30.bgRnD-99BD7mFgKNZwtB3IdGTvQjdeTsDR4q1hnuusk';

export function getSupabaseConfig(): { url: string; key: string } {
  if (typeof window === 'undefined') return { url: DEFAULT_SUPABASE_URL, key: DEFAULT_SUPABASE_ANON_KEY };
  
  const envUrl = 
    (import.meta as any).env?.VITE_SUPABASE_URL ||
    (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL || process.env?.NEXT_PUBLIC_SUPABASE_URL)) ||
    '';
    
  const envKey = 
    (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
    (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_ANON_KEY || process.env?.SUPABASE_ANON_KEY || process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY)) ||
    '';

  const url = envUrl || localStorage.getItem(STORAGE_KEYS.SUPABASE_URL) || DEFAULT_SUPABASE_URL;
  const key = envKey || localStorage.getItem(STORAGE_KEYS.SUPABASE_ANON) || DEFAULT_SUPABASE_ANON_KEY;
  return { url, key };
}

export async function initSupabaseConfigFromServer(): Promise<boolean> {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      if (data.supabaseUrl && data.supabaseAnonKey) {
        setSupabaseConfig(data.supabaseUrl, data.supabaseAnonKey);
        return true;
      }
    }
  } catch {}
  return false;
}

export function setSupabaseConfig(url: string, key: string) {
  if (typeof window === 'undefined') return;
  if (url && key) {
    localStorage.setItem(STORAGE_KEYS.SUPABASE_URL, url);
    localStorage.setItem(STORAGE_KEYS.SUPABASE_ANON, key);
    try {
      supabaseInstance = createClient(url, key);
    } catch {
      supabaseInstance = null;
    }
  } else {
    localStorage.removeItem(STORAGE_KEYS.SUPABASE_URL);
    localStorage.removeItem(STORAGE_KEYS.SUPABASE_ANON);
    supabaseInstance = null;
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;
  const { url, key } = getSupabaseConfig();
  if (url && key) {
    try {
      supabaseInstance = createClient(url, key);
      return supabaseInstance;
    } catch {
      return null;
    }
  }
  return null;
}

// -------------------------------------------------------------
// PROFILE OPERATIONS (User Scoped)
// -------------------------------------------------------------
export function loadProfile(userId?: string, isGuest: boolean = true): UserProfile {
  if (typeof window === 'undefined') return INITIAL_PROFILE;
  try {
    if (isGuest || !userId || userId === 'guest_user') {
      const raw = localStorage.getItem(STORAGE_KEYS.GUEST_PROFILE);
      if (!raw) {
        localStorage.setItem(STORAGE_KEYS.GUEST_PROFILE, JSON.stringify(INITIAL_PROFILE));
        return INITIAL_PROFILE;
      }
      const parsed = JSON.parse(raw);
      // Guarantee Guest profile always shows Guest
      if (parsed.username !== 'Guest' || parsed.id !== 'guest_user') {
        parsed.username = 'Guest';
        parsed.id = 'guest_user';
        localStorage.setItem(STORAGE_KEYS.GUEST_PROFILE, JSON.stringify(parsed));
      }
      return parsed;
    }

    // Real authenticated user
    const userKey = `${STORAGE_KEYS.PROFILE}_${userId}`;
    const rawUser = localStorage.getItem(userKey);
    if (rawUser) {
      return JSON.parse(rawUser);
    }

    // Fresh clean initial profile for real user (NO demo numbers/weak topics)
    const freshUser: UserProfile = {
      id: userId,
      username: 'Scholar',
      email: '',
      bio: 'Ready to master my academics with deliberate practice.',
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userId)}`,
      study_goal: 'Excel at studies!',
      preferred_subjects: ['Mathematics', 'Physics', 'Computer Science', 'Language'],
      weak_topics: [], // Clean empty for real users
      total_focus_mins: 0, // 0 for real users
      streak_count: 1, // Fresh start
      ai_sessions_count: 0,
      notes_shared_count: 0,
      last_active_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    localStorage.setItem(userKey, JSON.stringify(freshUser));
    return freshUser;
  } catch {
    return INITIAL_PROFILE;
  }
}

export function saveProfile(profile: UserProfile, isGuest: boolean = true): void {
  if (typeof window === 'undefined') return;
  if (isGuest || !profile.id || profile.id === 'guest_user') {
    localStorage.setItem(STORAGE_KEYS.GUEST_PROFILE, JSON.stringify(profile));
  } else {
    // Only save to real user's key - NEVER overwrite guest profile!
    localStorage.setItem(`${STORAGE_KEYS.PROFILE}_${profile.id}`, JSON.stringify(profile));
  }
  
  // Asynchronously sync to Supabase if configured
  const supabase = getSupabaseClient();
  if (supabase && profile.id && profile.id !== 'guest_user') {
    supabase.from('profiles').upsert({
      id: profile.id,
      username: profile.username,
      bio: profile.bio,
      avatar_url: profile.avatar_url,
      study_goal: profile.study_goal,
      weak_topics: profile.weak_topics,
      total_focus_mins: profile.total_focus_mins,
      streak_count: profile.streak_count,
      last_active_at: new Date().toISOString(),
    }).then(({ error }) => {
      if (error) console.warn('Supabase profile sync notice:', error.message);
    });
  }
}

export function appendWeakTopic(topic: string, userId?: string, isGuest: boolean = true): UserProfile {
  const profile = loadProfile(userId, isGuest);
  const clean = topic.trim();
  if (!clean) return profile;
  
  // Case-insensitive duplicate check
  const exists = profile.weak_topics.some(t => t.toLowerCase() === clean.toLowerCase());
  if (!exists) {
    const updated = {
      ...profile,
      weak_topics: [clean, ...profile.weak_topics],
    };
    saveProfile(updated, isGuest);
    return updated;
  }
  return profile;
}

export function removeWeakTopic(topic: string, userId?: string, isGuest: boolean = true): UserProfile {
  const profile = loadProfile(userId, isGuest);
  const updated = {
    ...profile,
    weak_topics: profile.weak_topics.filter(t => t.toLowerCase() !== topic.toLowerCase()),
  };
  saveProfile(updated, isGuest);
  return updated;
}

// -------------------------------------------------------------
// TASKS OPERATIONS (User Scoped)
// -------------------------------------------------------------
export function loadTasks(userId?: string, isGuest: boolean = true): Task[] {
  if (typeof window === 'undefined') return isGuest ? INITIAL_TASKS : [];
  try {
    if (isGuest || !userId || userId === 'guest_user') {
      const raw = localStorage.getItem(STORAGE_KEYS.GUEST_TASKS);
      if (!raw) {
        localStorage.setItem(STORAGE_KEYS.GUEST_TASKS, JSON.stringify(INITIAL_TASKS));
        return INITIAL_TASKS;
      }
      return JSON.parse(raw);
    }

    // Real user starts clean with empty tasks
    const userKey = `${STORAGE_KEYS.TASKS}_${userId}`;
    const raw = localStorage.getItem(userKey);
    if (!raw) {
      return []; // Clean empty list for real logged-in users!
    }
    return JSON.parse(raw);
  } catch {
    return isGuest ? INITIAL_TASKS : [];
  }
}

export function saveTasks(tasks: Task[], userId?: string, isGuest: boolean = true): void {
  if (typeof window === 'undefined') return;
  if (isGuest || !userId || userId === 'guest_user') {
    localStorage.setItem(STORAGE_KEYS.GUEST_TASKS, JSON.stringify(tasks));
  } else {
    localStorage.setItem(`${STORAGE_KEYS.TASKS}_${userId}`, JSON.stringify(tasks));
  }
}

export function upsertTask(task: Task): Task[] {
  const tasks = loadTasks();
  const idx = tasks.findIndex(t => t.id === task.id);
  let updated: Task[];
  if (idx >= 0) {
    updated = [...tasks];
    updated[idx] = task;
  } else {
    updated = [task, ...tasks];
  }
  saveTasks(updated);

  // Sync to Supabase if connected
  const supabase = getSupabaseClient();
  if (supabase) {
    supabase.from('tasks').upsert({
      id: task.id,
      user_id: task.user_id,
      title: task.title,
      subject: task.subject,
      priority: task.priority,
      is_completed: task.is_completed,
      due_date: task.due_date,
      notes: task.notes,
    }).then(({ error }) => {
      if (error) console.warn('Supabase task sync notice:', error.message);
    });
  }

  return updated;
}

export function deleteTask(taskId: string): Task[] {
  const tasks = loadTasks().filter(t => t.id !== taskId);
  saveTasks(tasks);

  const supabase = getSupabaseClient();
  if (supabase) {
    supabase.from('tasks').delete().eq('id', taskId).then();
  }

  return tasks;
}

export function cleanCompletedTasks(): Task[] {
  const tasks = loadTasks().filter(t => !t.is_completed);
  saveTasks(tasks);

  const supabase = getSupabaseClient();
  if (supabase) {
    supabase.from('tasks').delete().eq('is_completed', true).then();
  }

  return tasks;
}

// -------------------------------------------------------------
// SHARED NOTES OPERATIONS (Syncs with server & Supabase)
// -------------------------------------------------------------
const DELETED_NOTES_KEY = 'paideutic_deleted_note_ids';
const PERMANENT_EXCLUDED_NOTE_IDS = ['note_01', 'note_02', 'note_03', 'note_1788716473265_ilbs'];

export function getDeletedNoteIds(): Set<string> {
  if (typeof window === 'undefined') return new Set(PERMANENT_EXCLUDED_NOTE_IDS);
  try {
    const raw = localStorage.getItem(DELETED_NOTES_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    return new Set([...PERMANENT_EXCLUDED_NOTE_IDS, ...list]);
  } catch {
    return new Set(PERMANENT_EXCLUDED_NOTE_IDS);
  }
}

export function addDeletedNoteId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const set = getDeletedNoteIds();
    set.add(id);
    localStorage.setItem(DELETED_NOTES_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

let hasSharedNotesTable = true;

function isTableMissingError(error: any): boolean {
  if (!error) return false;
  const code = error.code || '';
  const message = error.message || '';
  if (
    code === 'PGRST205' ||
    code === '42P01' ||
    message.includes('schema cache') ||
    message.includes('Could not find the table') ||
    message.includes('relation "public.shared_notes" does not exist')
  ) {
    hasSharedNotesTable = false;
    return true;
  }
  return false;
}

export function isExcludedNote(note: any): boolean {
  if (!note) return true;
  const deleted = getDeletedNoteIds();
  if (note.id && deleted.has(note.id)) return true;
  if (note.id && PERMANENT_EXCLUDED_NOTE_IDS.includes(note.id)) return true;
  if (note.title && deleted.has(note.title)) return true;
  if (note.name && deleted.has(note.name)) return true;
  const title = (note.title || '').toLowerCase();
  if (
    title.includes('integration by parts') ||
    title.includes('calvin cycle') ||
    title.includes('avl balance')
  ) {
    return true;
  }
  return false;
}

export function loadSharedNotes(): SharedNote[] {
  if (typeof window === 'undefined') return INITIAL_NOTES.filter((n) => !isExcludedNote(n));
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTES);
    if (!raw) {
      const filtered = INITIAL_NOTES.filter((n) => !isExcludedNote(n));
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(filtered));
      return filtered;
    }
    const parsed: SharedNote[] = JSON.parse(raw);
    const cleaned = (Array.isArray(parsed) ? parsed : INITIAL_NOTES).filter((n) => !isExcludedNote(n));
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return INITIAL_NOTES.filter((n) => !isExcludedNote(n));
  }
}

export function saveSharedNotes(notes: SharedNote[]): void {
  if (typeof window === 'undefined') return;
  try {
    // Filter out any excluded notes
    const validNotes = notes.filter((n) => !isExcludedNote(n));
    // Sanitize attachments: replace any multi-megabyte base64 strings with lightweight storageUrls
    const lightweight = validNotes.map((n) => ({
      ...n,
      attachments: (n.attachments || []).map((a) => ({
        ...a,
        dataUrl: a.storageUrl || (a.dataUrl?.startsWith('data:') && a.dataUrl.length > 2000 ? a.storageUrl || '' : a.dataUrl),
      })),
    }));
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(lightweight));
  } catch (err) {
    console.warn('Notice: localStorage write quota exceeded, keeping in memory:', err);
  }
}

// Helper to extract clean metadata from any uploaded file name
export function extractUploadedFileMeta(rawFilename: string) {
  let author = 'Scholar';
  let userId = 'community_user';
  let cleanName = rawFilename;

  const byMatch = cleanName.match(/__by__(.*?)__(?:uid__(.*?)__)?/);
  if (byMatch) {
    if (byMatch[1]) {
      try {
        author = decodeURIComponent(byMatch[1]).replace(/_/g, ' ').trim();
      } catch {
        author = byMatch[1].replace(/_/g, ' ').trim();
      }
    }
    if (byMatch[2]) {
      try {
        userId = decodeURIComponent(byMatch[2]).trim();
      } catch {
        userId = byMatch[2].trim();
      }
    }
    cleanName = cleanName.replace(/^\d+__by__.*?__(?:uid__.*?__)?/, '');
  } else {
    cleanName = cleanName.replace(/^\d+_+/, '');
  }

  if (!cleanName.trim()) {
    cleanName = rawFilename;
  }

  const title = cleanName
    .replace(/\.[^/.]+$/, '')
    .replace(/[_]+/g, ' ')
    .trim();

  return {
    author: author || 'Scholar',
    userId: userId || 'community_user',
    cleanName,
    title: title || cleanName,
  };
}

/**
 * Synchronize community notes from central backend & Supabase Storage
 * so all notes, views, and likes are globally synchronized across all users,
 * and uploader's real name is correctly displayed.
 */
export async function syncSharedNotesFromServer(currentUserId?: string): Promise<SharedNote[]> {
  let notes = loadSharedNotes().filter((n) => !isExcludedNote(n));
  const currentLocalMap = new Map<string, SharedNote>(notes.map((n) => [n.id, n]));
  const upvotedIds = new Set(notes.filter((n) => n.has_upvoted).map((n) => n.id));
  const deletedIds = getDeletedNoteIds();

  const serverNotesMap = new Map<string, SharedNote>();

  // 1. QUERY CENTRAL BACKEND FIRST (/api/notes)
  try {
    const res = await fetch('/api/notes');
    if (res.ok) {
      const serverNotes = await res.json();
      if (Array.isArray(serverNotes)) {
        for (const sn of serverNotes) {
          if (isExcludedNote(sn) || deletedIds.has(sn.id)) continue;
          const userHasUpvoted = Array.isArray(sn.upvoted_by)
            ? (currentUserId ? sn.upvoted_by.includes(currentUserId) : upvotedIds.has(sn.id))
            : (upvotedIds.has(sn.id) || !!sn.has_upvoted);

          const localMatch = currentLocalMap.get(sn.id);
          const formatted: SharedNote = {
            ...sn,
            author_name: sn.author_name || 'Scholar',
            has_upvoted: userHasUpvoted || !!localMatch?.has_upvoted,
            upvotes: Math.max(Number(sn.upvotes) || 0, Number(localMatch?.upvotes) || 0),
            views: Math.max(Number(sn.views) || 1, Number(localMatch?.views) || 1),
            attachments: (sn.attachments || []).map((a: any) => ({
              ...a,
              dataUrl: a.storageUrl || a.dataUrl,
            })),
          };
          serverNotesMap.set(sn.id, formatted);
        }
      }
    }
  } catch (err) {
    console.warn('Notice: Server API notes sync notice:', err);
  }

  // 2. QUERY SUPABASE DB TABLE 'shared_notes' IF AVAILABLE
  const supabase = getSupabaseClient();
  if (supabase && hasSharedNotesTable) {
    try {
      const { data: supaRows } = await supabase.from('shared_notes').select('*').order('created_at', { ascending: false });
      if (supaRows && Array.isArray(supaRows)) {
        for (const row of supaRows) {
          if (isExcludedNote(row) || deletedIds.has(row.id)) continue;
          const formatted: SharedNote = {
            id: row.id,
            user_id: row.user_id || 'community_user',
            author_name: row.author_name || 'Scholar',
            title: row.title,
            content: row.content,
            subject: row.subject,
            upvotes: typeof row.upvotes === 'number' ? row.upvotes : 1,
            views: typeof row.views === 'number' ? row.views : 1,
            has_upvoted: upvotedIds.has(row.id),
            flashcards: Array.isArray(row.flashcards_json) ? row.flashcards_json : [],
            attachments: Array.isArray(row.attachments_json) ? row.attachments_json : [],
            created_at: row.created_at || new Date().toISOString(),
          };
          serverNotesMap.set(row.id, formatted);
        }
      }
    } catch (err) {
      isTableMissingError(err);
    }
  }

  // Merged notes from server & database
  const merged: SharedNote[] = Array.from(serverNotesMap.values()).filter((n) => !isExcludedNote(n) && !deletedIds.has(n.id));

  // 3. SCAN SUPABASE STORAGE BUCKET FOR UNLINKED RAW UPLOADS (SKIP DELETED ITEMS)
  try {
    const { url: supabaseUrl } = getSupabaseConfig();
    if (supabase && supabaseUrl) {
      const bucketName = 'Material Library';
      const foldersToCheck = ['Uploaded Material', ''];
      const allFiles: Array<{ name: string; folder: string; metadata?: any; created_at?: string; updated_at?: string }> = [];

      for (const fld of foldersToCheck) {
        try {
          const { data: folderFiles } = await supabase.storage
            .from(bucketName)
            .list(fld, { limit: 200 });

          if (folderFiles && Array.isArray(folderFiles)) {
            for (const f of folderFiles) {
              if (f.name && f.name !== '.emptyFolderPlaceholder' && f.id !== null && !deletedIds.has(f.name)) {
                if (!allFiles.some((x) => x.name === f.name && x.folder === fld)) {
                  allFiles.push({ ...f, folder: fld });
                }
              }
            }
          }
        } catch (e) {
          console.warn(`Notice scanning bucket folder "${fld}":`, e);
        }
      }

      for (const f of allFiles) {
        if (deletedIds.has(f.name)) continue;
        const safeId = `sup_mat_${f.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        if (deletedIds.has(safeId)) continue;

        const { author, userId, cleanName, title } = extractUploadedFileMeta(f.name);
        const folderPrefix = f.folder ? `${f.folder}/` : '';
        const filePubUrl = `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucketName)}/${encodeURIComponent(folderPrefix)}${encodeURIComponent(f.name)}`;

        // Check if any note already references this file
        const existingNote = merged.find((n) =>
          n.id === safeId ||
          (n.attachments || []).some(
            (a) =>
              (a.supabasePath && a.supabasePath.includes(f.name)) ||
              (a.storageUrl && a.storageUrl.includes(f.name)) ||
              a.name === cleanName ||
              a.name === f.name
          ) || (title && n.title.toLowerCase() === title.toLowerCase())
        );

        if (existingNote) {
          if (existingNote.author_name === 'Peer Contributor' || !existingNote.author_name) {
            existingNote.author_name = author;
          }
        } else {
          const isPdf = f.name.toLowerCase().endsWith('.pdf');
          const isImg = /\.(png|jpe?g|webp|gif|svg)$/i.test(f.name);

          const newNote: SharedNote = {
            id: safeId,
            user_id: userId,
            author_name: author,
            title: title || cleanName,
            subject: isPdf ? 'Computer Science' : isImg ? 'Mathematics' : 'Biology',
            content: `### ${cleanName}\n\nShared study resource and notes uploaded to the community library by ${author}.\n\n- **File Name**: \`${cleanName}\`\n- **Format**: ${isPdf ? 'PDF Document' : isImg ? 'Diagram / Image Asset' : 'Study Resource'}\n- **Storage**: Supabase Material Library`,
            upvotes: 1,
            views: 1,
            has_upvoted: upvotedIds.has(safeId),
            created_at: f.created_at || f.updated_at || new Date().toISOString(),
            attachments: [
              {
                id: `att_sup_${f.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
                name: cleanName,
                size: (f.metadata as any)?.size || 0,
                type: (f.metadata as any)?.mimetype || (isPdf ? 'application/pdf' : isImg ? 'image/png' : 'application/octet-stream'),
                dataUrl: filePubUrl,
                storageType: 'supabase',
                storageUrl: filePubUrl,
                supabasePath: `${folderPrefix}${f.name}`,
              },
            ],
          };

          if (!isExcludedNote(newNote) && !deletedIds.has(newNote.id)) {
            merged.unshift(newNote);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Notice: Direct Supabase storage check:', err);
  }

  saveSharedNotes(merged);
  return merged;
}

export async function publishSharedNote(note: Omit<SharedNote, 'id' | 'created_at' | 'upvotes' | 'views'>): Promise<SharedNote> {
  const cleanAttachments = (note.attachments || []).map((a) => ({
    ...a,
    dataUrl: a.storageUrl || a.dataUrl,
    storageUrl: a.storageUrl || a.dataUrl,
  }));

  const author = note.author_name && note.author_name !== 'Peer Contributor' ? note.author_name : 'Scholar';

  const newNote: SharedNote = {
    ...note,
    author_name: author,
    attachments: cleanAttachments,
    id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    upvotes: 1,
    views: 1,
    has_upvoted: true,
    created_at: new Date().toISOString(),
  };

  // 1. Post to backend server API FIRST for durable database persistence
  let savedRecord: SharedNote = newNote;
  try {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newNote),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText);
      console.error(`Backend failed to publish note (HTTP ${res.status}):`, errorText);
      throw new Error(`Failed to publish note to server (HTTP ${res.status}): ${errorText}`);
    }

    const serverConfirmed = await res.json();
    if (serverConfirmed && serverConfirmed.id) {
      savedRecord = serverConfirmed;
    }
  } catch (err: any) {
    console.error('Error in publishSharedNote API call:', err);
    throw err;
  }

  // 2. Post to Supabase database if configured and table exists
  const supabase = getSupabaseClient();
  if (supabase && hasSharedNotesTable) {
    try {
      const { error } = await supabase.from('shared_notes').upsert({
        id: savedRecord.id,
        user_id: savedRecord.user_id,
        author_name: savedRecord.author_name,
        title: savedRecord.title,
        content: savedRecord.content,
        subject: savedRecord.subject,
        upvotes: savedRecord.upvotes,
        views: savedRecord.views,
        flashcards_json: savedRecord.flashcards || [],
        attachments_json: savedRecord.attachments || [],
      });
      if (error && !isTableMissingError(error)) {
        console.warn('Supabase note publish notice:', error.message);
      }
    } catch (err: any) {
      if (!isTableMissingError(err)) {
        console.warn('Supabase note publish exception:', err?.message || err);
      }
    }
  }

  // 3. Update local state cache with the database-confirmed record
  const currentNotes = loadSharedNotes();
  const updatedList = [savedRecord, ...currentNotes.filter((n) => n.id !== savedRecord.id && n.id !== newNote.id)];
  saveSharedNotes(updatedList);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('paideutic_notes_updated'));
  }

  return savedRecord;
}

export const publishNote = publishSharedNote;

export async function updateSharedNote(
  noteId: string,
  updates: Partial<Omit<SharedNote, 'id' | 'created_at'>>
): Promise<SharedNote | null> {
  const notes = loadSharedNotes();
  const existing = notes.find((n) => n.id === noteId);
  if (!existing) {
    const notFoundErr = new Error(`Note with ID "${noteId}" not found in library.`);
    console.error(`Error in updateSharedNote:`, notFoundErr);
    throw notFoundErr;
  }

  const cleanAttachments = updates.attachments
    ? updates.attachments.map((a) => ({
        ...a,
        dataUrl: a.storageUrl || a.dataUrl,
        storageUrl: a.storageUrl || a.dataUrl,
      }))
    : existing.attachments;

  const updatedNote: SharedNote = {
    ...existing,
    ...updates,
    id: noteId,
    created_at: existing.created_at,
    attachments: cleanAttachments,
  };

  let savedRecord: SharedNote = updatedNote;

  // 1. Call central server API to update in database
  try {
    const res = await fetch(`/api/notes/${encodeURIComponent(noteId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedNote),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText);
      console.error(`Backend failed to update note ${noteId} (HTTP ${res.status}):`, errorText);
      throw new Error(`Failed to update note on server (HTTP ${res.status}): ${errorText}`);
    }

    const serverConfirmed = await res.json();
    if (serverConfirmed && serverConfirmed.id) {
      savedRecord = serverConfirmed;
    }
  } catch (err: any) {
    console.error('Error in updateSharedNote API call:', err);
    throw err;
  }

  // 2. Update Supabase database if configured and table exists
  const supabase = getSupabaseClient();
  if (supabase && hasSharedNotesTable) {
    try {
      const { error } = await supabase
        .from('shared_notes')
        .update({
          title: savedRecord.title,
          content: savedRecord.content,
          subject: savedRecord.subject,
          author_name: savedRecord.author_name,
          flashcards_json: savedRecord.flashcards || [],
          attachments_json: savedRecord.attachments || [],
        })
        .eq('id', noteId);
      if (error && !isTableMissingError(error)) {
        console.warn('Supabase note update notice:', error.message);
      }
    } catch (err: any) {
      if (!isTableMissingError(err)) {
        console.warn('Supabase note update exception:', err?.message || err);
      }
    }
  }

  // 3. Update local state in-place by unique ID (no duplicates)
  const currentNotes = loadSharedNotes();
  const updatedList = currentNotes.map((n) => (n.id === noteId ? savedRecord : n));
  saveSharedNotes(updatedList);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('paideutic_notes_updated'));
  }

  return savedRecord;
}

export const updateNote = updateSharedNote;

export async function toggleNoteUpvote(noteId: string, userId?: string): Promise<SharedNote[]> {
  const notes = loadSharedNotes();
  const target = notes.find((n) => n.id === noteId || decodeURIComponent(n.id) === decodeURIComponent(noteId));
  if (!target) return notes;

  const willBeUpvoted = !target.has_upvoted;
  const optimisticUpvotes = willBeUpvoted ? (target.upvotes || 0) + 1 : Math.max(0, (target.upvotes || 1) - 1);

  // Optimistic local update
  const updated = notes.map((n) =>
    (n.id === noteId || decodeURIComponent(n.id) === decodeURIComponent(noteId))
      ? { ...n, has_upvoted: willBeUpvoted, upvotes: optimisticUpvotes }
      : n
  );
  saveSharedNotes(updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('paideutic_notes_updated'));
  }

  let finalUpvotes = optimisticUpvotes;

  // Sync to central backend
  try {
    const res = await fetch(`/api/notes/${encodeURIComponent(noteId)}/upvote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId || 'user_guest' }),
    });

    if (res.ok) {
      const data = await res.json();
      if (typeof data.upvotes === 'number') {
        finalUpvotes = data.upvotes;
      }
      const current = loadSharedNotes();
      const confirmed = current.map((n) =>
        (n.id === noteId || decodeURIComponent(n.id) === decodeURIComponent(noteId))
          ? {
              ...n,
              upvotes: finalUpvotes,
              has_upvoted: typeof data.has_upvoted === 'boolean' ? data.has_upvoted : willBeUpvoted,
            }
          : n
      );
      saveSharedNotes(confirmed);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('paideutic_notes_updated'));
      }
    }
  } catch (err) {
    console.warn('Notice: Upvote sync notice:', err);
  }

  // Sync to Supabase DB if table exists
  const supabase = getSupabaseClient();
  if (supabase && hasSharedNotesTable) {
    try {
      await supabase.from('shared_notes').update({ upvotes: finalUpvotes }).eq('id', noteId);
    } catch (e) {
      if (!isTableMissingError(e)) {
        console.warn('Supabase DB upvote update notice:', e);
      }
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('paideutic_notes_updated'));
  }
  return loadSharedNotes();
}

export async function incrementNoteView(noteId: string): Promise<SharedNote[]> {
  const notes = loadSharedNotes();
  const target = notes.find((n) => n.id === noteId || decodeURIComponent(n.id) === decodeURIComponent(noteId));
  if (!target) return notes;

  const optimisticViews = (target.views || 0) + 1;
  const updated = notes.map((n) =>
    (n.id === noteId || decodeURIComponent(n.id) === decodeURIComponent(noteId))
      ? { ...n, views: optimisticViews }
      : n
  );
  saveSharedNotes(updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('paideutic_notes_updated'));
  }

  let finalViews = optimisticViews;

  try {
    const res = await fetch(`/api/notes/${encodeURIComponent(noteId)}/view`, {
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.views === 'number') {
        finalViews = data.views;
      }
      const current = loadSharedNotes();
      const confirmed = current.map((n) =>
        (n.id === noteId || decodeURIComponent(n.id) === decodeURIComponent(noteId))
          ? { ...n, views: finalViews }
          : n
      );
      saveSharedNotes(confirmed);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('paideutic_notes_updated'));
      }
    }
  } catch (err) {
    console.warn('Notice: View count sync notice:', err);
  }

  // Sync to Supabase DB if table exists
  const supabase = getSupabaseClient();
  if (supabase && hasSharedNotesTable) {
    try {
      await supabase.from('shared_notes').update({ views: finalViews }).eq('id', noteId);
    } catch (e) {
      if (!isTableMissingError(e)) {
        console.warn('Supabase DB view update notice:', e);
      }
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('paideutic_notes_updated'));
  }
  return loadSharedNotes();
}

export async function deleteSharedNote(noteId: string): Promise<SharedNote[]> {
  const currentNotes = loadSharedNotes();
  const target = currentNotes.find((n) => n.id === noteId);

  // Mark ID and all metadata as deleted locally
  addDeletedNoteId(noteId);
  if (target) {
    if (target.title) addDeletedNoteId(target.title);
    if (Array.isArray(target.attachments)) {
      for (const att of target.attachments) {
        if (att.name) addDeletedNoteId(att.name);
        if (att.supabasePath) {
          addDeletedNoteId(att.supabasePath);
          const fname = att.supabasePath.split('/').pop();
          if (fname) addDeletedNoteId(fname);
        }
      }
    }
  }

  // 1. Direct HTTP DELETE to central server database FIRST
  try {
    const res = await fetch(`/api/notes/${encodeURIComponent(noteId)}`, { 
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText);
      console.error(`Backend failed to delete note ${noteId} (HTTP ${res.status}):`, errorText);
    }
  } catch (e) {
    console.error('Error in deleteSharedNote API call:', e);
  }

  // 2. Supabase DB delete if configured and table exists
  const supabase = getSupabaseClient();
  if (supabase && hasSharedNotesTable) {
    try {
      const { error } = await supabase.from('shared_notes').delete().eq('id', noteId);
      if (error && !isTableMissingError(error)) {
        console.warn('Supabase note delete notice:', error.message);
      }
    } catch (e: any) {
      if (!isTableMissingError(e)) {
        console.warn('Supabase note delete exception:', e?.message || e);
      }
    }
  }

  // 3. Supabase Storage bucket file removal
  if (supabase && target && Array.isArray(target.attachments)) {
    for (const att of target.attachments) {
      if (att.supabasePath) {
        try {
          await supabase.storage.from('Material Library').remove([att.supabasePath]);
        } catch {}
      }
      if (att.name) {
        try {
          await supabase.storage.from('Material Library').remove([`Uploaded Material/${att.name}`, att.name]);
        } catch {}
      }
    }
  }

  // 4. Update local state
  const remaining = loadSharedNotes().filter((n) => n.id !== noteId && !isExcludedNote(n));
  saveSharedNotes(remaining);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('paideutic_notes_updated'));
  }

  return remaining;
}

export const deleteNote = deleteSharedNote;

// -------------------------------------------------------------
// FOCUS SESSIONS OPERATIONS
// -------------------------------------------------------------
export function loadFocusSessions(): FocusSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordFocusSession(
  durationMins: number,
  mode: 'focus' | 'short_break' | 'long_break',
  userId?: string,
  isGuest: boolean = true
): {
  profile: UserProfile;
  badges: UserBadge[];
  newUnlockedBadge: UserBadge | null;
  sessions: FocusSession[];
} {
  const sessions = loadFocusSessions();
  const profile = loadProfile(userId, isGuest);

  const newSession: FocusSession = {
    id: `sess_${Date.now()}`,
    user_id: profile.id,
    duration_mins: durationMins,
    mode,
    completed_at: new Date().toISOString(),
  };

  const updatedSessions = [newSession, ...sessions];
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updatedSessions));
  }

  // Only add minutes if focus mode
  const addedMins = mode === 'focus' ? durationMins : 0;
  const updatedProfile: UserProfile = {
    ...profile,
    total_focus_mins: profile.total_focus_mins + addedMins,
    last_active_at: new Date().toISOString(),
  };
  saveProfile(updatedProfile, isGuest);

  // Sync to Supabase
  const supabase = getSupabaseClient();
  if (supabase && mode === 'focus' && !isGuest) {
    supabase.from('focus_sessions').insert({
      id: newSession.id,
      user_id: profile.id,
      duration_mins: durationMins,
      mode,
    }).then();
  }

  // Re-evaluate Badges
  const { badges, newlyUnlocked } = evaluateBadges(
    updatedProfile,
    loadTasks(userId, isGuest),
    loadSharedNotes(),
    userId,
    isGuest
  );
  return { profile: updatedProfile, badges, newUnlockedBadge: newlyUnlocked, sessions: updatedSessions };
}

// -------------------------------------------------------------
// BADGES & GAMIFICATION ENGINE (Fully Functional & Evaluated)
// -------------------------------------------------------------
export function createCleanBadges(userId: string): UserBadge[] {
  return INITIAL_BADGES.map((b) => ({
    ...b,
    user_id: userId,
    progress: 0,
    is_unlocked: false,
    awarded_at: undefined,
  }));
}

export function loadBadges(userId?: string, isGuest: boolean = true): UserBadge[] {
  if (typeof window === 'undefined') return INITIAL_BADGES;
  try {
    if (isGuest || !userId || userId === 'guest_user') {
      const raw = localStorage.getItem(STORAGE_KEYS.GUEST_BADGES);
      if (!raw) {
        localStorage.setItem(STORAGE_KEYS.GUEST_BADGES, JSON.stringify(INITIAL_BADGES));
        return INITIAL_BADGES;
      }
      return JSON.parse(raw);
    }

    // Real authenticated user gets clean personal badges
    const userKey = `${STORAGE_KEYS.BADGES}_${userId}`;
    const raw = localStorage.getItem(userKey);
    if (!raw) {
      const fresh = createCleanBadges(userId);
      localStorage.setItem(userKey, JSON.stringify(fresh));
      return fresh;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_BADGES;
  }
}

export function saveBadges(badges: UserBadge[], userId?: string, isGuest: boolean = true): void {
  if (typeof window === 'undefined') return;
  if (isGuest || !userId || userId === 'guest_user') {
    localStorage.setItem(STORAGE_KEYS.GUEST_BADGES, JSON.stringify(badges));
  } else {
    localStorage.setItem(`${STORAGE_KEYS.BADGES}_${userId}`, JSON.stringify(badges));
  }
}

export function evaluateBadges(
  profile: UserProfile,
  tasks: Task[],
  notes: SharedNote[],
  userId?: string,
  isGuest: boolean = true
): { badges: UserBadge[]; newlyUnlocked: UserBadge | null } {
  const currentBadges = loadBadges(userId || profile.id, isGuest);
  let newlyUnlocked: UserBadge | null = null;

  const totalFocusMins = profile.total_focus_mins || 0;
  const myNotesCount = notes.filter(
    (n) =>
      n.user_id === profile.id ||
      (profile.username && n.author_name.toLowerCase() === profile.username.toLowerCase())
  ).length;
  const completedTasksCount = tasks.filter((t) => t.is_completed).length;
  const streakCount = profile.streak_count || 1;
  const aiSessionsCount = profile.ai_sessions_count || 0;
  const weakTopicsMastered = (profile as any).cleared_topics_count || 0;

  const updatedBadges = currentBadges.map((badge) => {
    let progress = badge.progress;
    let unlocked = badge.is_unlocked;

    switch (badge.badge_type) {
      case 'focus_novice':
        progress = totalFocusMins;
        if (progress >= 25 && !unlocked) {
          unlocked = true;
          badge.awarded_at = new Date().toISOString();
          newlyUnlocked = { ...badge, is_unlocked: true, progress: 25, awarded_at: badge.awarded_at };
        }
        break;

      case 'study_marathoner':
        progress = totalFocusMins;
        if (progress >= 120 && !unlocked) {
          unlocked = true;
          badge.awarded_at = new Date().toISOString();
          newlyUnlocked = { ...badge, is_unlocked: true, progress: 120, awarded_at: badge.awarded_at };
        }
        break;

      case 'knowledge_contributor':
        progress = Math.max(profile.notes_shared_count || 0, myNotesCount);
        if (progress >= 1 && !unlocked) {
          unlocked = true;
          badge.awarded_at = new Date().toISOString();
          newlyUnlocked = { ...badge, is_unlocked: true, progress: 1, awarded_at: badge.awarded_at };
        }
        break;

      case 'streak_keeper':
        progress = streakCount;
        if (progress >= 3 && !unlocked) {
          unlocked = true;
          badge.awarded_at = new Date().toISOString();
          newlyUnlocked = { ...badge, is_unlocked: true, progress: 3, awarded_at: badge.awarded_at };
        }
        break;

      case 'task_master':
        progress = completedTasksCount;
        if (progress >= 3 && !unlocked) {
          unlocked = true;
          badge.awarded_at = new Date().toISOString();
          newlyUnlocked = { ...badge, is_unlocked: true, progress: 3, awarded_at: badge.awarded_at };
        }
        break;

      case 'ai_master':
        progress = Math.max(badge.progress, aiSessionsCount);
        if (progress >= 5 && !unlocked) {
          unlocked = true;
          badge.awarded_at = new Date().toISOString();
          newlyUnlocked = { ...badge, is_unlocked: true, progress: 5, awarded_at: badge.awarded_at };
        }
        break;

      case 'concept_conqueror':
        progress = Math.max(badge.progress, weakTopicsMastered);
        if (progress >= 1 && !unlocked) {
          unlocked = true;
          badge.awarded_at = new Date().toISOString();
          newlyUnlocked = { ...badge, is_unlocked: true, progress: 1, awarded_at: badge.awarded_at };
        }
        break;
    }

    return {
      ...badge,
      progress: Math.min(progress, badge.maxProgress),
      is_unlocked: unlocked,
    };
  });

  saveBadges(updatedBadges, userId || profile.id, isGuest);

  if (typeof window !== 'undefined') {
    if (newlyUnlocked) {
      window.dispatchEvent(
        new CustomEvent('paideutic_badge_unlocked', { detail: { badge: newlyUnlocked } })
      );
    }
    window.dispatchEvent(new CustomEvent('paideutic_badges_updated'));
  }

  return { badges: updatedBadges, newlyUnlocked };
}

export function incrementBadgeProgress(
  badgeType: BadgeType,
  amount: number = 1,
  userId?: string,
  isGuest: boolean = true
): { badges: UserBadge[]; newlyUnlocked: UserBadge | null } {
  const currentBadges = loadBadges(userId, isGuest);
  let newlyUnlocked: UserBadge | null = null;

  const updatedBadges = currentBadges.map((badge) => {
    if (badge.badge_type === badgeType) {
      const newProgress = badge.progress + amount;
      let unlocked = badge.is_unlocked;
      if (newProgress >= badge.maxProgress && !unlocked) {
        unlocked = true;
        badge.awarded_at = new Date().toISOString();
        newlyUnlocked = { ...badge, is_unlocked: true, progress: badge.maxProgress, awarded_at: badge.awarded_at };
      }
      return {
        ...badge,
        progress: Math.min(newProgress, badge.maxProgress),
        is_unlocked: unlocked,
      };
    }
    return badge;
  });

  saveBadges(updatedBadges, userId, isGuest);

  if (typeof window !== 'undefined') {
    if (newlyUnlocked) {
      window.dispatchEvent(
        new CustomEvent('paideutic_badge_unlocked', { detail: { badge: newlyUnlocked } })
      );
    }
    window.dispatchEvent(new CustomEvent('paideutic_badges_updated'));
  }

  return { badges: updatedBadges, newlyUnlocked };
}

export const StorageService = {
  getProfile: loadProfile,
  saveProfile: saveProfile,
  appendWeakTopic: appendWeakTopic,
  removeWeakTopic: removeWeakTopic,
  getTasks: loadTasks,
  saveTasks: saveTasks,
  upsertTask: upsertTask,
  deleteTask: deleteTask,
  cleanCompletedTasks: cleanCompletedTasks,
  getNotes: loadSharedNotes,
  saveNotes: saveSharedNotes,
  syncSharedNotesFromServer: syncSharedNotesFromServer,
  publishSharedNote: publishSharedNote,
  publishNote: publishSharedNote,
  updateSharedNote: updateSharedNote,
  updateNote: updateSharedNote,
  toggleNoteUpvote: toggleNoteUpvote,
  incrementNoteView: incrementNoteView,
  deleteSharedNote: deleteSharedNote,
  deleteNote: deleteSharedNote,
  getBadges: loadBadges,
  saveBadges: saveBadges,
  checkAndUnlockBadges: (
    profile: UserProfile,
    tasks: Task[],
    notes: SharedNote[],
    userId?: string,
    isGuest: boolean = true
  ) => {
    return evaluateBadges(profile, tasks, notes, userId, isGuest).badges;
  },
  loadFocusSessions: loadFocusSessions,
  recordFocusSession: recordFocusSession,
  getSupabaseConfig: getSupabaseConfig,
  setSupabaseConfig: setSupabaseConfig,
};
