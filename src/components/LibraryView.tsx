import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  ThumbsUp, 
  Eye, 
  Plus, 
  BookOpen, 
  Sparkles, 
  Layers, 
  RotateCw, 
  Paperclip, 
  FileText, 
  X, 
  Download,
  ExternalLink, 
  Upload,
  RefreshCw,
  Lock,
  UserCheck,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { SharedNote, Subject, Flashcard, AttachedFile } from '../types';
import { extractFlashcards } from '../services/geminiService';
import { uploadMaterialToBucket } from '../services/supabaseStorage';
import { StorageService, getMyNoteIds, addMyNoteId, removeMyNoteId } from '../services/storage';

interface LibraryViewProps {
  notes: SharedNote[];
  userId: string;
  authorName: string;
  onPublishNote: (note: Omit<SharedNote, 'id' | 'created_at' | 'upvotes' | 'views'>) => Promise<SharedNote | void> | void;
  onToggleUpvote: (noteId: string) => void;
  onViewNote: (noteId: string) => void;
  onDeleteNote?: (noteId: string) => void;
  onSummarizeInAi: (content: string, title: string, subject: Subject, attachments?: AttachedFile[]) => void;
  onSyncNotes?: () => Promise<any>;
  isGuest?: boolean;
  onOpenAuth?: (mode: 'signin' | 'signup') => void;
}

const ALL_SUBJECTS: (Subject | 'All')[] = [
  'All',
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

// Staged file representation inside the publish/upload dialog before actual upload
interface StagedAttachment {
  id: string;
  file?: File; // Present if newly selected and waiting for user confirmation before upload
  name: string;
  size: number;
  type: string;
  previewUrl: string; // Local preview dataUrl or object URL
  storageType?: 'supabase' | 'server' | 'local';
  storageUrl?: string;
  supabasePath?: string;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  notes,
  userId,
  authorName,
  onPublishNote,
  onToggleUpvote,
  onViewNote,
  onDeleteNote,
  onSummarizeInAi,
  onSyncNotes,
  isGuest = false,
  onOpenAuth,
}) => {
  // Search & Filter State
  const [selectedSubject, setSelectedSubject] = useState<Subject | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNoteModal, setActiveNoteModal] = useState<SharedNote | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  // Local responsive notes state synchronized with parent props
  const [localNotes, setLocalNotes] = useState<SharedNote[]>(notes);

  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  // Track notes created on this device/session so user can always edit & delete them
  const [myNoteIds, setMyNoteIds] = useState<Set<string>>(() => StorageService.getMyNoteIds());

  useEffect(() => {
    const syncMyIds = () => setMyNoteIds(StorageService.getMyNoteIds());
    syncMyIds();
    window.addEventListener('paideutic_notes_updated', syncMyIds);
    return () => window.removeEventListener('paideutic_notes_updated', syncMyIds);
  }, []);

  // Guest Limiting State
  const [guestViewedIds, setGuestViewedIds] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem('paideutic_guest_viewed_notes');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [showPreviewLimitModal, setShowPreviewLimitModal] = useState(false);
  const [authRequiredReason, setAuthRequiredReason] = useState<'upload' | 'download' | null>(null);

  // Note Reader Sub-mode (Content vs Flashcards)
  const [readerMode, setReaderMode] = useState<'content' | 'flashcards'>('content');
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);

  // Status Notification Banner
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Delete Confirmation Modal State
  const [noteToDelete, setNoteToDelete] = useState<SharedNote | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Publish / Edit Form State
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgressText, setSubmitProgressText] = useState<string>('');
  const [pubTitle, setPubTitle] = useState('');
  const [pubSubject, setPubSubject] = useState<Subject>('Mathematics');
  const [pubContent, setPubContent] = useState('');
  const [pubFlashcards, setPubFlashcards] = useState<Array<{ front: string; back: string }>>([]);
  const [isExtractingCards, setIsExtractingCards] = useState(false);
  const [stagedAttachments, setStagedAttachments] = useState<StagedAttachment[]>([]);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      if (onSyncNotes) {
        await onSyncNotes();
      }
      setStatusMessage({ text: 'Study library synchronized successfully.', type: 'info' });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (e) {
      console.warn('Sync notice:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Keep active note modal updated if notes state changes
  useEffect(() => {
    if (activeNoteModal) {
      const fresh = localNotes.find((n) => n.id === activeNoteModal.id);
      if (fresh) {
        setActiveNoteModal(fresh);
      }
    }
  }, [localNotes]);

  // Open Publish / Upload Modal (Clean Staging, no immediate upload)
  const handleOpenPublish = (autoTriggerPicker = false) => {
    if (isGuest) {
      setAuthRequiredReason('upload');
      return;
    }
    setEditingNoteId(null);
    setPubTitle('');
    setPubSubject('Mathematics');
    setPubContent('');
    setPubFlashcards([]);
    setStagedAttachments([]);
    setSubmitProgressText('');
    setIsPublishModalOpen(true);

    if (autoTriggerPicker) {
      setTimeout(() => {
        modalFileInputRef.current?.click();
      }, 150);
    }
  };

  const handleOpenEdit = (note: SharedNote, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isGuest) {
      setAuthRequiredReason('upload');
      return;
    }
    setEditingNoteId(note.id);
    setPubTitle(note.title);
    setPubSubject(note.subject);
    setPubContent(note.content);
    setPubFlashcards((note.flashcards || []).map((fc) => ({ front: fc.front, back: fc.back })));
    
    // Map existing attachments to staged representations
    const existingStaged: StagedAttachment[] = (note.attachments || []).map((att) => ({
      id: att.id || `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: att.name,
      size: att.size,
      type: att.type,
      previewUrl: att.storageUrl || att.dataUrl,
      storageType: att.storageType,
      storageUrl: att.storageUrl,
      supabasePath: att.supabasePath,
    }));
    setStagedAttachments(existingStaged);
    setSubmitProgressText('');
    setIsPublishModalOpen(true);
  };

  // Staging selected files in memory without triggering network/database upload
  const handleStageFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (isGuest) {
      setAuthRequiredReason('upload');
      if (e.target) e.target.value = '';
      return;
    }

    const fileList = Array.from(files);
    const newItems: StagedAttachment[] = [];

    for (const file of fileList) {
      if (file.size > 50 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds the 50MB limit.`);
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        id: `staged_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        previewUrl,
      });
    }

    if (newItems.length > 0) {
      setStagedAttachments((prev) => [...prev, ...newItems]);
      const first = newItems[0];
      const isPdf = first.name.toLowerCase().endsWith('.pdf');
      const isImg = /\.(png|jpe?g|webp|gif|svg)$/i.test(first.name);
      const cleanTitle = first.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9 _-]/g, ' ').trim();

      // Auto-populate title if currently empty
      setPubTitle((prev) => (prev.trim() ? prev : cleanTitle));

      // Auto-detect subject if currently default
      setPubSubject((prev) => {
        if (prev !== 'Mathematics') return prev;
        const lower = first.name.toLowerCase();
        if (lower.includes('phys') || lower.includes('quantum') || lower.includes('mech')) return 'Physics';
        if (lower.includes('bio') || lower.includes('cell') || lower.includes('gene') || lower.includes('organ')) return 'Biology';
        if (lower.includes('chem') || lower.includes('react') || lower.includes('organic')) return 'Chemistry';
        if (lower.includes('cs') || lower.includes('code') || lower.includes('algo') || lower.includes('prog') || isPdf) return 'Computer Science';
        if (lower.includes('hist') || lower.includes('war') || lower.includes('civil')) return 'History';
        if (lower.includes('lit') || lower.includes('poem') || lower.includes('book')) return 'Literature';
        if (lower.includes('psych') || lower.includes('mind') || lower.includes('cog')) return 'Psychology';
        if (lower.includes('lang') || lower.includes('vocab') || lower.includes('gramm')) return 'Language';
        return 'General Study';
      });

      // Auto-populate draft content if empty
      setPubContent((prev) => {
        if (prev.trim()) return prev;
        return `### ${first.name}\n\nStudy material uploaded to the shared library by **${authorName || 'Scholar'}**.\n\n- **File Name**: \`${first.name}\`\n- **File Size**: ${(first.size / 1024).toFixed(1)} KB\n- **Format**: ${isPdf ? 'PDF Document' : isImg ? 'Image / Diagram Asset' : 'Study Resource'}\n\n*Review the attached material and test your understanding with active recall flashcards.*`;
      });
    }

    if (e.target) e.target.value = '';
  };

  const handleRemoveStagedAttachment = (id: string) => {
    setStagedAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // User confirms upload / publish action by submitting the form
  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSubmitting) return;

    if (isGuest) {
      setAuthRequiredReason('upload');
      return;
    }

    const hasAttachments = stagedAttachments && stagedAttachments.length > 0;
    const finalTitle = pubTitle.trim() || (hasAttachments ? stagedAttachments[0].name.replace(/\.[^/.]+$/, '') : '');
    const finalContent = pubContent.trim() || (hasAttachments ? `Study resource and materials attached by ${authorName || 'Scholar'}.` : '');

    if (!finalTitle || !finalContent) return;

    setIsSubmitting(true);
    setSubmitProgressText('Uploading materials to library database...');

    try {
      const finalAttachments: AttachedFile[] = [];

      // Process staged attachments: upload newly added files only now upon submit
      for (const item of stagedAttachments) {
        if (item.file) {
          setSubmitProgressText(`Uploading ${item.name}...`);
          const uploadRes = await uploadMaterialToBucket(item.file, authorName, userId);
          finalAttachments.push({
            id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: uploadRes.name || item.name,
            size: uploadRes.size || item.size,
            type: uploadRes.type || item.type,
            dataUrl: uploadRes.publicUrl || uploadRes.dataUrl || item.previewUrl || '',
            storageType: uploadRes.storageType,
            storageUrl: uploadRes.publicUrl,
            supabasePath: uploadRes.supabasePath,
          });
        } else {
          // Existing attachment retained during edit
          finalAttachments.push({
            id: item.id,
            name: item.name,
            size: item.size,
            type: item.type,
            dataUrl: item.storageUrl || item.previewUrl || '',
            storageType: item.storageType,
            storageUrl: item.storageUrl,
            supabasePath: item.supabasePath,
          });
        }
      }

      if (editingNoteId) {
        // IN-PLACE EDIT: Update existing note in database
        setSubmitProgressText('Saving updates to database...');
        const updated = await StorageService.updateNote(editingNoteId, {
          title: finalTitle,
          content: finalContent,
          subject: pubSubject,
          flashcards: pubFlashcards.map((fc, i) => ({ id: `fc_${Date.now()}_${i}`, ...fc })),
          attachments: finalAttachments,
        });

        if (updated) {
          StorageService.addMyNoteId(updated.id);
          setMyNoteIds(StorageService.getMyNoteIds());
          setLocalNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
          if (activeNoteModal && activeNoteModal.id === editingNoteId) {
            setActiveNoteModal(updated);
          }
        }
        setStatusMessage({ text: `"${finalTitle}" updated successfully!`, type: 'success' });
      } else {
        // NEW NOTE: Save to database & Supabase
        setSubmitProgressText('Publishing to study library...');
        const payload = {
          user_id: userId || 'community_user',
          author_name: authorName || 'Scholar',
          title: finalTitle,
          content: finalContent,
          subject: pubSubject,
          flashcards: pubFlashcards.map((fc, i) => ({ id: `fc_${Date.now()}_${i}`, ...fc })),
          attachments: finalAttachments,
        };

        const published = await onPublishNote(payload);
        if (published) {
          StorageService.addMyNoteId(published.id);
          setMyNoteIds(StorageService.getMyNoteIds());
          setLocalNotes((prev) => {
            const exists = prev.some((n) => n.id === published.id);
            if (exists) return prev.map((n) => (n.id === published.id ? published : n));
            return [published, ...prev];
          });
        }
        setStatusMessage({ text: `"${finalTitle}" uploaded and published to library!`, type: 'success' });
      }

      // Reset subject filter to 'All' so new/edited note is IMMEDIATELY visible on screen
      setSelectedSubject('All');
      setEditingNoteId(null);
      setPubTitle('');
      setPubContent('');
      setPubFlashcards([]);
      setStagedAttachments([]);
      setIsPublishModalOpen(false);
      setTimeout(() => setStatusMessage(null), 6000);

      if (onSyncNotes) {
        await onSyncNotes();
      }
    } catch (err: any) {
      console.error('Error saving study material:', err);
      alert(`Save failed: ${err?.message || 'Please check your connection and try again.'}`);
    } finally {
      setIsSubmitting(false);
      setSubmitProgressText('');
    }
  };

  const handleAIExtractCards = async () => {
    if (!pubContent.trim()) return;
    setIsExtractingCards(true);
    try {
      const extracted = await extractFlashcards(pubContent, pubSubject);
      if (extracted.length > 0) {
        setPubFlashcards(extracted);
      }
    } catch (e) {
      console.warn('Flashcard extraction notice:', e);
    } finally {
      setIsExtractingCards(false);
    }
  };

  const filteredNotes = localNotes.filter((n) => {
    if (selectedSubject !== 'All' && n.subject !== selectedSubject) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inTitle = n.title.toLowerCase().includes(q);
      const inContent = n.content.toLowerCase().includes(q);
      const inAuthor = n.author_name.toLowerCase().includes(q);
      if (!inTitle && !inContent && !inAuthor) return false;
    }
    return true;
  });

  const handleToggleUpvoteDirect = (noteId: string) => {
    setLocalNotes((prev) =>
      prev.map((n) => {
        if (n.id === noteId || decodeURIComponent(n.id) === decodeURIComponent(noteId)) {
          const willBeUpvoted = !n.has_upvoted;
          const newUpvotes = willBeUpvoted ? (n.upvotes || 0) + 1 : Math.max(0, (n.upvotes || 1) - 1);
          return { ...n, has_upvoted: willBeUpvoted, upvotes: newUpvotes };
        }
        return n;
      })
    );

    if (activeNoteModal && (activeNoteModal.id === noteId || decodeURIComponent(activeNoteModal.id) === decodeURIComponent(noteId))) {
      const willBeUpvoted = !activeNoteModal.has_upvoted;
      const newUpvotes = willBeUpvoted ? (activeNoteModal.upvotes || 0) + 1 : Math.max(0, (activeNoteModal.upvotes || 1) - 1);
      setActiveNoteModal({ ...activeNoteModal, has_upvoted: willBeUpvoted, upvotes: newUpvotes });
    }

    onToggleUpvote(noteId);
  };

  const handleOpenNote = (note: SharedNote) => {
    if (isGuest) {
      const isAlreadyUnlocked = guestViewedIds.includes(note.id);
      if (!isAlreadyUnlocked && guestViewedIds.length >= 3) {
        setShowPreviewLimitModal(true);
        return;
      }
      if (!isAlreadyUnlocked) {
        const updated = [...guestViewedIds, note.id];
        setGuestViewedIds(updated);
        try {
          sessionStorage.setItem('paideutic_guest_viewed_notes', JSON.stringify(updated));
        } catch {}
      }
    }
    const nextViews = (note.views || 0) + 1;
    setLocalNotes((prev) =>
      prev.map((n) =>
        n.id === note.id || decodeURIComponent(n.id) === decodeURIComponent(note.id)
          ? { ...n, views: nextViews }
          : n
      )
    );
    setActiveNoteModal({ ...note, views: nextViews });
    onViewNote(note.id);
    setReaderMode('content');
    setCurrentFlashcardIndex(0);
    setIsCardFlipped(false);
  };

  const handleDownloadAttempt = (e: React.MouseEvent) => {
    if (isGuest) {
      e.preventDefault();
      e.stopPropagation();
      setAuthRequiredReason('download');
    }
  };

  // Comprehensive ownership check: Allows editing and deleting if published on this browser/session OR by the authenticated user
  const canManageNote = (note: SharedNote | null): boolean => {
    if (!note) return false;
    if (isGuest) return false;

    // 1. Saved in my notes ID registry for this session/browser
    if (myNoteIds.has(note.id)) return true;

    // 2. User ID match
    const currentUid = (userId || '').trim();
    const noteUid = (note.user_id || '').trim();
    if (currentUid && noteUid && (currentUid === noteUid || noteUid === 'community_user')) return true;

    // 3. Author Name match
    const currentAuthor = (authorName || '').trim().toLowerCase();
    const noteAuthor = (note.author_name || '').trim().toLowerCase();
    if (currentAuthor && noteAuthor && currentAuthor === noteAuthor) return true;

    // 4. Default author match when logged in
    if (currentAuthor && noteAuthor === 'scholar') return true;

    return false;
  };

  const isUploader = canManageNote;

  const handleDeleteClick = (e: React.MouseEvent, note: SharedNote) => {
    e.stopPropagation();
    setNoteToDelete(note);
  };

  const handleConfirmDelete = async () => {
    if (!noteToDelete) return;
    const idToDelete = noteToDelete.id;
    const titleToDelete = noteToDelete.title;

    // 1. Immediately remove item from UI state
    setLocalNotes((prev) => prev.filter((n) => n.id !== idToDelete));
    if (activeNoteModal?.id === idToDelete) {
      setActiveNoteModal(null);
    }

    setIsDeleting(true);
    try {
      if (onDeleteNote) {
        await onDeleteNote(idToDelete);
      } else {
        await StorageService.deleteSharedNote(idToDelete);
      }
      StorageService.removeMyNoteId(idToDelete);
      setMyNoteIds(StorageService.getMyNoteIds());
      setStatusMessage({ text: `"${titleToDelete}" has been deleted from the library.`, type: 'info' });
      setTimeout(() => setStatusMessage(null), 5000);
      if (onSyncNotes) {
        await onSyncNotes();
      }
    } catch (err) {
      console.warn('Error deleting note:', err);
    } finally {
      setIsDeleting(false);
      setNoteToDelete(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Study Library</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Open-access peer notes & flashcard decks for collaborative learning.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            id="sync-materials-btn"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs cursor-pointer"
            title="Refresh shared study notes"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-500 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>
          <button
            onClick={() => handleOpenPublish(false)}
            id="publish-study-note-btn"
            className="flex items-center gap-2 px-4.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Publish Note or Deck</span>
          </button>
        </div>
      </div>

      {/* Status Notification */}
      {statusMessage && (
        <div className={`p-3 px-4 rounded-xl border text-xs font-semibold flex items-center justify-between animate-in fade-in ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
            : 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="lift-box flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        {/* Search */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search notes, concepts, authors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none w-full text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
          />
        </div>
        {/* Subject Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 md:pb-0 scrollbar-none text-xs">
          {ALL_SUBJECTS.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedSubject === sub
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredNotes.map((note) => {
          const isLockedForGuest = isGuest && guestViewedIds.length >= 3 && !guestViewedIds.includes(note.id);
          return (
            <div
              key={note.id}
              id={`note-card-${note.id}`}
              className="lift-box bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all p-5 shadow-xs flex flex-col justify-between group cursor-pointer relative"
              onClick={() => handleOpenNote(note)}
            >
              <div className="space-y-3">
                {/* Header: Subject & Views */}
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold">
                    {note.subject}
                  </span>
                  <div className="flex items-center gap-2">
                    {isLockedForGuest && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                        <Lock className="w-3 h-3" />
                        <span>Sign In</span>
                      </span>
                    )}
                    <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{note.views}</span>
                    </div>
                  </div>
                </div>
                {/* Title & Preview */}
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition text-base leading-snug">
                    {note.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mt-1.5 leading-relaxed">
                    {note.content.replace(/[#*`$\\]/g, '').slice(0, 140)}...
                  </p>
                </div>
                {/* Image attachment thumbnail if available */}
                {(() => {
                  const firstImg = note.attachments?.find((a) =>
                    (a.type && a.type.startsWith('image/')) ||
                    /\.(png|jpe?g|webp|gif|svg)$/i.test(a.name)
                  );
                  if (!firstImg) return null;
                  const src = firstImg.storageUrl || firstImg.dataUrl;
                  if (!src) return null;
                  return (
                    <div className="w-full h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 relative my-2">
                      <img
                        src={src}
                        alt={firstImg.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        loading="lazy"
                      />
                    </div>
                  );
                })()}
                {/* Badges / Flashcards & Attachments indicator */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {note.flashcards && note.flashcards.length > 0 && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 text-[11px] font-semibold">
                      <Layers className="w-3 h-3" />
                      <span>{note.flashcards.length} Flashcards</span>
                    </div>
                  )}
                  {note.attachments && note.attachments.length > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 text-[11px] font-semibold">
                      <Paperclip className="w-3 h-3" />
                      <span>{note.attachments.length} {note.attachments.length === 1 ? 'file' : 'files'}</span>
                    </div>
                  )}
                </div>
              </div>
              {/* Footer: Author & Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-700 dark:text-slate-300">
                    {note.author_name.charAt(0)}
                  </div>
                  <span className="font-medium text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
                    {note.author_name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {canManageNote(note) && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleOpenEdit(note, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer"
                        title="Edit this material"
                        id={`edit-note-${note.id}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteClick(e, note)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title="Delete this material"
                        id={`delete-note-${note.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleUpvoteDirect(note.id);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition font-semibold cursor-pointer ${
                      note.has_upvoted
                        ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                    title="Upvote study note"
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${note.has_upvoted ? 'fill-indigo-600 dark:fill-indigo-400 text-indigo-600 dark:text-indigo-400' : ''}`} />
                    <span>{note.upvotes}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* NOTE READER MODAL */}
      {activeNoteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                    {activeNoteModal.subject}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    by {activeNoteModal.author_name}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                  {activeNoteModal.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 mr-2">
                  <span className="flex items-center gap-1 text-xs text-slate-400 font-semibold px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{activeNoteModal.views || 0}</span>
                  </span>
                  <button
                    onClick={() => handleToggleUpvoteDirect(activeNoteModal.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition border cursor-pointer ${
                      activeNoteModal.has_upvoted
                        ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                    }`}
                    title="Upvote note"
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${activeNoteModal.has_upvoted ? 'fill-indigo-600 dark:fill-indigo-400' : ''}`} />
                    <span>{activeNoteModal.upvotes}</span>
                  </button>
                </div>
                {canManageNote(activeNoteModal) && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(activeNoteModal)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-900 transition cursor-pointer"
                      title="Edit this material"
                      id="edit-modal-note-btn"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(e, activeNoteModal)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900 transition cursor-pointer"
                      title="Delete this material"
                      id="delete-modal-note-btn"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setActiveNoteModal(null)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold text-xl p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
            {/* Mode Switcher: Content vs Flashcards */}
            {activeNoteModal.flashcards && activeNoteModal.flashcards.length > 0 && (
              <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 px-6 py-2 gap-2">
                <button
                  onClick={() => setReaderMode('content')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    readerMode === 'content'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Notes & Explanations</span>
                </button>
                <button
                  onClick={() => {
                    setReaderMode('flashcards');
                    setCurrentFlashcardIndex(0);
                    setIsCardFlipped(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    readerMode === 'flashcards'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Active Recall Deck ({activeNoteModal.flashcards.length})</span>
                </button>
              </div>
            )}
            {/* Content Area */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6">
              {readerMode === 'content' ? (
                <>
                  <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 text-sm leading-relaxed space-y-4">
                    <ReactMarkdown>{activeNoteModal.content}</ReactMarkdown>
                  </div>
                  {/* Attached Files Section (PDF / Images) */}
                  {activeNoteModal.attachments && activeNoteModal.attachments.length > 0 && (
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Paperclip className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Attached Study Materials ({activeNoteModal.attachments.length})
                          </h4>
                        </div>
                        {isGuest && (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Sign in to download materials
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeNoteModal.attachments.map((file) => {
                          const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                          const fileUrl = file.storageUrl || file.dataUrl;
                          const sizeKb = Math.round(file.size / 1024);

                          return (
                            <div
                              key={file.id}
                              className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex flex-col justify-between gap-3 group"
                            >
                              <div className="flex items-start gap-3">
                                {isPdf ? (
                                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center shrink-0">
                                    <FileText className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-white">
                                    <img
                                      src={fileUrl}
                                      alt={file.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                                <div className="overflow-hidden">
                                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {file.name}
                                  </p>
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                    {isPdf ? 'PDF Document' : 'Image File'} • {sizeKb} KB
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                                {fileUrl ? (
                                  <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex-1 text-center py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition flex items-center justify-center gap-1.5"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Preview</span>
                                  </a>
                                ) : null}
                                <a
                                  href={fileUrl}
                                  download={file.name}
                                  onClick={handleDownloadAttempt}
                                  className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                                  title="Download File"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* Send to AI Summarizer Action */}
                  <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        onSummarizeInAi(
                          activeNoteModal.content,
                          activeNoteModal.title,
                          activeNoteModal.subject,
                          activeNoteModal.attachments
                        );
                        setActiveNoteModal(null);
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold transition cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>Summarize & Tutor with AI</span>
                    </button>
                    <button
                      onClick={() => setActiveNoteModal(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                    >
                      Close Reader
                    </button>
                  </div>
                </>
              ) : (
                /* FLASHCARD ACTIVE RECALL VIEW */
                <div className="flex flex-col items-center justify-center py-6 space-y-6">
                  {activeNoteModal.flashcards && activeNoteModal.flashcards.length > 0 ? (
                    <>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Card {currentFlashcardIndex + 1} of {activeNoteModal.flashcards.length}
                      </div>
                      <div
                        onClick={() => setIsCardFlipped(!isCardFlipped)}
                        className={`w-full max-w-lg min-h-[220px] p-8 rounded-3xl border transition-all duration-300 flex flex-col justify-center items-center text-center cursor-pointer select-none shadow-sm ${
                          isCardFlipped
                            ? 'bg-indigo-600 text-white border-indigo-500 scale-[1.01]'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                        }`}
                      >
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-2">
                          {isCardFlipped ? 'Answer (Back)' : 'Question (Click to reveal answer)'}
                        </span>
                        <p className="text-base font-bold leading-snug">
                          {isCardFlipped
                            ? activeNoteModal.flashcards[currentFlashcardIndex].back
                            : activeNoteModal.flashcards[currentFlashcardIndex].front}
                        </p>
                      </div>
                      {/* Navigation Controls */}
                      <div className="flex items-center gap-4">
                        <button
                          disabled={currentFlashcardIndex === 0}
                          onClick={() => {
                            setIsCardFlipped(false);
                            setCurrentFlashcardIndex((prev) => Math.max(0, prev - 1));
                          }}
                          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-300 transition cursor-pointer"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setIsCardFlipped(!isCardFlipped)}
                          className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>Flip Card</span>
                        </button>
                        <button
                          disabled={currentFlashcardIndex === activeNoteModal.flashcards.length - 1}
                          onClick={() => {
                            setIsCardFlipped(false);
                            setCurrentFlashcardIndex((prev) =>
                              Math.min(activeNoteModal.flashcards!.length - 1, prev + 1)
                            );
                          }}
                          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-30 hover:bg-indigo-700 transition cursor-pointer"
                        >
                          Next Card
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD & PUBLISH STUDY MATERIAL MODAL */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl p-6 md:p-8 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editingNoteId ? 'Edit Study Material' : 'Upload & Publish Material'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {editingNoteId
                    ? 'Update the title, subject, notes, or attachments for this study resource.'
                    : 'Select files, edit details, and upload to the shared study library.'}
                </p>
              </div>
              <button
                onClick={() => {
                  if (!isSubmitting) setIsPublishModalOpen(false);
                }}
                disabled={isSubmitting}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold text-xl cursor-pointer disabled:opacity-30"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handlePublishSubmit} className="space-y-4 pt-4 overflow-y-auto flex-1 pr-1">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Material Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cell Biology & Lysosomes Summary"
                  value={pubTitle}
                  onChange={(e) => setPubTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Subject *
                </label>
                <select
                  value={pubSubject}
                  onChange={(e) => setPubSubject(e.target.value as Subject)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium cursor-pointer"
                >
                  {ALL_SUBJECTS.filter((s) => s !== 'All').map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Content & Study Notes (Markdown supported) *
                  </label>
                  <button
                    type="button"
                    onClick={handleAIExtractCards}
                    disabled={!pubContent.trim() || isExtractingCards}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{isExtractingCards ? 'Generating Cards...' : 'Auto-Generate Flashcards with AI'}</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  required
                  placeholder="# Key Points&#10;- Main concept: ...&#10;- Summary formulas: ..."
                  value={pubContent}
                  onChange={(e) => setPubContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono resize-none"
                />
              </div>

              {/* Supporting File Attachments Section */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Selected Files & Attachments</span>
                  </label>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">Max 50MB each</span>
                </div>
                {/* File Dropzone Trigger */}
                <div
                  onClick={() => modalFileInputRef.current?.click()}
                  className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 rounded-2xl bg-slate-50/50 dark:bg-slate-800/50 flex flex-col items-center justify-center cursor-pointer transition text-center group"
                >
                  <Upload className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform mb-1.5" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Click to select PDF notes, diagrams, slides, or documents
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Files are staged locally and will upload when you press Publish below.
                  </p>
                </div>
                <input
                  type="file"
                  ref={modalFileInputRef}
                  onChange={handleStageFiles}
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.md,.docx,.pptx"
                  className="hidden"
                />
                {/* Staged Attachments List */}
                {stagedAttachments.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {stagedAttachments.map((file) => {
                      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                      const sizeKb = Math.round(file.size / 1024);
                      return (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            {isPdf ? (
                              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                              </div>
                            ) : (
                              <img
                                src={file.previewUrl}
                                alt={file.name}
                                className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-white"
                              />
                            )}
                            <div className="overflow-hidden">
                              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[240px] sm:max-w-xs">
                                {file.name}
                              </p>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                                {isPdf ? 'PDF' : 'Image'} • {sizeKb} KB {file.file ? '(Ready to upload)' : '(Uploaded)'}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveStagedAttachment(file.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Remove attachment"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Flashcards Preview */}
              {pubFlashcards.length > 0 && (
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 space-y-2">
                  <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    AI Flashcards ({pubFlashcards.length} Generated)
                  </span>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {pubFlashcards.map((fc, i) => (
                      <div key={i} className="text-[11px] bg-white dark:bg-slate-800 p-2 rounded-lg border border-purple-100 dark:border-purple-900/40">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Q: {fc.front}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Progress Feedback */}
              {isSubmitting && submitProgressText && (
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  <span>{submitProgressText}</span>
                </div>
              )}

              {/* Form Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsPublishModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingNoteId ? 'Save Changes' : 'Upload & Publish Material'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {noteToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Material</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-white">"{noteToDelete.title}"</span>? It will be removed from the library and storage for all users.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setNoteToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GUEST PREVIEW LIMIT MODAL */}
      {showPreviewLimitModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-6 text-center shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Guest Limit Reached
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                You have previewed your 3 free study materials in guest mode. Create a free scholar account to unlock unlimited access.
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setShowPreviewLimitModal(false);
                  if (onOpenAuth) onOpenAuth('signup');
                }}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Create Free Scholar Account
              </button>
              <button
                onClick={() => setShowPreviewLimitModal(false)}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
              >
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTH REQUIRED PROMPT MODAL */}
      {authRequiredReason && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-6 text-center shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
              <UserCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Scholar Sign-In Required
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {authRequiredReason === 'upload'
                  ? 'Sign in to share notes, upload slide materials, and earn contributor badges.'
                  : 'Sign in to download materials and full lecture slide packages.'}
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setAuthRequiredReason(null);
                  if (onOpenAuth) onOpenAuth('signin');
                }}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Sign In to Paideutic
              </button>
              <button
                onClick={() => setAuthRequiredReason(null)}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
