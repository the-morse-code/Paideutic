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
  Image as ImageIcon, 
  X, 
  Download,
  ExternalLink, 
  Upload,
  RefreshCw,
  Lock,
  UserCheck,
  Trash2,
  Edit3,
  Check
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { SharedNote, Subject, Flashcard, AttachedFile } from '../types';
import { extractFlashcards } from '../services/geminiService';
import { uploadMaterialToBucket } from '../services/supabaseStorage';
import { StorageService } from '../services/storage';

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

  // Guest Limiting State
  // Guest can only view a maximum of 3 distinct materials
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

  // Direct Material Upload State
  const [isUploadingDirect, setIsUploadingDirect] = useState(false);
  const [directUploadMessage, setDirectUploadMessage] = useState<string | null>(null);
  const directUploadInputRef = useRef<HTMLInputElement>(null);

  // Delete Confirmation Modal State
  const [noteToDelete, setNoteToDelete] = useState<SharedNote | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Publish / Edit Form State
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pubTitle, setPubTitle] = useState('');
  const [pubSubject, setPubSubject] = useState<Subject>('Mathematics');
  const [pubContent, setPubContent] = useState('');
  const [pubFlashcards, setPubFlashcards] = useState<Array<{ front: string; back: string }>>([]);
  const [isExtractingCards, setIsExtractingCards] = useState(false);
  const [pubAttachments, setPubAttachments] = useState<AttachedFile[]>([]);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track notes uploaded in this session/browser for robust author permissions
  const [myUploadedIds, setMyUploadedIds] = useState<Set<string>>(() =>
    StorageService.getMyUploadedNoteIds()
  );

  useEffect(() => {
    const handleSyncUploaded = () => {
      setMyUploadedIds(StorageService.getMyUploadedNoteIds());
    };
    window.addEventListener('paideutic_notes_updated', handleSyncUploaded);
    return () => window.removeEventListener('paideutic_notes_updated', handleSyncUploaded);
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      if (onSyncNotes) {
        await onSyncNotes();
      }
    } catch (e) {
      console.warn('Sync notice:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Keep active note modal updated if notes state changes, without view regression
  useEffect(() => {
    if (activeNoteModal) {
      const fresh = notes.find((n) => n.id === activeNoteModal.id);
      if (fresh) {
        setActiveNoteModal((prev) =>
          prev
            ? {
                ...fresh,
                views: Math.max(prev.views || 0, fresh.views || 0),
                upvotes: Math.max(prev.upvotes || 0, fresh.upvotes || 0),
              }
            : null
        );
      }
    }
  }, [notes]);

  const handleOpenPublish = (defaultFiles?: File[]) => {
    if (isGuest) {
      setAuthRequiredReason('upload');
      return;
    }
    setEditingNoteId(null);
    setPubTitle('');
    setPubSubject('Mathematics');
    setPubContent('');
    setPubFlashcards([]);
    setPubAttachments([]);
    setStagedFiles(defaultFiles || []);
    setIsPublishModalOpen(true);
  };

  const handleOpenEdit = (note: SharedNote, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Dismiss reader modal so edit dialog is displayed directly in front
    setActiveNoteModal(null);
    setEditingNoteId(note.id);
    setPubTitle(note.title);
    setPubSubject(note.subject);
    setPubContent(note.content);
    setPubFlashcards((note.flashcards || []).map((fc) => ({ front: fc.front, back: fc.back })));
    setPubAttachments(note.attachments || []);
    setStagedFiles([]);
    setIsPublishModalOpen(true);
  };

  // Stage files selected inside the dialog box (DO NOT upload immediately; let user edit details first!)
  const handleStageFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (isGuest) {
      setAuthRequiredReason('upload');
      if (e.target) e.target.value = '';
      return;
    }

    const fileList = Array.from(files);
    const validFiles: File[] = [];

    for (const file of fileList) {
      if (file.size > 25 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds the 25MB limit.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      const first = validFiles[0];
      const cleanName = first.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[_\-]+/g, ' ')
        .trim();

      // Automatically prefill note Title if user hasn't typed one yet
      setPubTitle((prev) => (prev.trim() ? prev : cleanName));

      // Automatically prefill note Content if user hasn't typed one yet
      setPubContent((prev) =>
        prev.trim()
          ? prev
          : `### ${first.name}\n\nStudy material uploaded to the shared library by ${
              authorName || 'Scholar'
            }.\n\n- **File Name**: \`${first.name}\`\n- **File Size**: ${(
              first.size / (1024 * 1024)
            ).toFixed(2)} MB\n- **Uploaded By**: ${authorName || 'Scholar'}`
      );

      setStagedFiles((prev) => [...prev, ...validFiles]);
    }

    if (e.target) e.target.value = '';
  };

  const handleRemoveStagedFile = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveAttachment = (id: string) => {
    setPubAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Guard against multiple clicks / double submission
    if (isSubmitting) return;

    if (isGuest) {
      setAuthRequiredReason('upload');
      return;
    }
    const hasAttachments = pubAttachments && pubAttachments.length > 0;
    const hasStaged = stagedFiles && stagedFiles.length > 0;
    const defaultName = hasStaged ? stagedFiles[0].name.replace(/\.[^/.]+$/, '') : hasAttachments ? pubAttachments[0].name.replace(/\.[^/.]+$/, '') : '';
    const finalTitle = pubTitle.trim() || defaultName;
    const finalContent = pubContent.trim() || (defaultName ? `Study resource and materials for ${defaultName} shared by ${authorName || 'Scholar'}.` : '');

    if (!finalTitle) return;

    setIsSubmitting(true);
    try {
      // 1. Upload staged files now that the user has reviewed & submitted
      const uploadedAttachments: AttachedFile[] = [];
      if (stagedFiles.length > 0) {
        setIsUploadingAttachment(true);
        for (const file of stagedFiles) {
          try {
            const res = await uploadMaterialToBucket(file, authorName, userId);
            uploadedAttachments.push({
              id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              name: res.name,
              size: res.size,
              type: res.type,
              dataUrl: res.publicUrl || res.dataUrl,
              storageType: res.storageType,
              storageUrl: res.publicUrl,
              supabasePath: res.supabasePath,
            });
          } catch (uploadErr) {
            console.error('Error uploading staged file:', uploadErr);
          }
        }
        setIsUploadingAttachment(false);
      }

      const allAttachments = [...pubAttachments, ...uploadedAttachments];

      if (editingNoteId) {
        // IN-PLACE EDIT: Update exact object in backend by matching note.id
        const updated = await StorageService.updateNote(editingNoteId, {
          title: finalTitle,
          content: finalContent || 'Updated study materials.',
          subject: pubSubject,
          flashcards: pubFlashcards.map((fc, i) => ({ id: `fc_${Date.now()}_${i}`, ...fc })),
          attachments: allAttachments,
        });

        if (updated) {
          StorageService.recordMyUploadedNoteId(updated.id);
          setMyUploadedIds(StorageService.getMyUploadedNoteIds());
          // Immediately update local React state so UI reflects changes instantly
          setLocalNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
          if (activeNoteModal && activeNoteModal.id === editingNoteId) {
            setActiveNoteModal(updated);
          }
          setDirectUploadMessage(`Changes saved successfully for "${updated.title}"!`);
          setTimeout(() => setDirectUploadMessage(null), 5000);
        }
      } else {
        // NEW NOTE: Append via onPublishNote and update local state cleanly
        const payload = {
          user_id: userId || 'community_user',
          author_name: authorName || 'Scholar',
          title: finalTitle,
          content: finalContent || 'Shared study note.',
          subject: pubSubject,
          flashcards: pubFlashcards.map((fc, i) => ({ id: `fc_${Date.now()}_${i}`, ...fc })),
          attachments: allAttachments,
        };

        const published = await onPublishNote(payload);
        if (published) {
          StorageService.recordMyUploadedNoteId(published.id);
          setMyUploadedIds(StorageService.getMyUploadedNoteIds());
          setLocalNotes((prev) => {
            const exists = prev.some((n) => n.id === published.id);
            if (exists) return prev.map((n) => (n.id === published.id ? published : n));
            return [published, ...prev];
          });
          setDirectUploadMessage(`"${published.title}" successfully published to the library!`);
          setTimeout(() => setDirectUploadMessage(null), 5000);
        }
      }

      setSelectedSubject('All');
      setEditingNoteId(null);
      setPubTitle('');
      setPubContent('');
      setPubFlashcards([]);
      setPubAttachments([]);
      setStagedFiles([]);
      setIsPublishModalOpen(false);
      if (onSyncNotes) await onSyncNotes();
    } catch (err) {
      console.error('Save material error:', err);
      setDirectUploadMessage('Failed to save material details. Please try again.');
      setTimeout(() => setDirectUploadMessage(null), 5000);
    } finally {
      setIsSubmitting(false);
      setIsUploadingAttachment(false);
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

  const handleOpenNote = (note: SharedNote) => {
    if (isGuest) {
      const isAlreadyUnlocked = guestViewedIds.includes(note.id);
      if (!isAlreadyUnlocked && guestViewedIds.length >= 3) {
        // Enforce maximum of 3 materials viewed in guest mode
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
    onViewNote(note.id);
    setActiveNoteModal({ ...note, views: (note.views || 0) + 1 });
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

  const canDeleteNote = (note: SharedNote | null | undefined): boolean => {
    if (!note) return false;
    // 1. Any note uploaded or edited in this browser
    if (myUploadedIds.has(note.id)) return true;

    // 2. Matching user ID
    const currentUid = (userId || '').trim();
    const noteUid = (note.user_id || '').trim();
    if (currentUid && noteUid && currentUid === noteUid) return true;

    // 3. Matching author name
    const currentAuthor = (authorName || '').trim().toLowerCase();
    const noteAuthor = (note.author_name || '').trim().toLowerCase();
    if (currentAuthor && noteAuthor && currentAuthor === noteAuthor) return true;

    return false;
  };

  const isUploader = canDeleteNote;

  const handleDeleteClick = (e: React.MouseEvent, note: SharedNote) => {
    e.stopPropagation();
    setNoteToDelete(note);
  };

  const handleConfirmDelete = async () => {
    if (!noteToDelete) return;
    const idToDelete = noteToDelete.id;

    // 3. FIX DELETION: Immediately remove item from UI state
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
            onClick={() => {
              if (isGuest) {
                setAuthRequiredReason('upload');
                return;
              }
              handleOpenPublish();
              setTimeout(() => fileInputRef.current?.click(), 120);
            }}
            id="upload-material-btn"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 transition shadow-xs cursor-pointer"
            title="Upload lecture slides, PDFs, or diagram images"
          >
            <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Upload Material</span>
          </button>
          <button
            onClick={() => handleOpenPublish()}
            id="publish-study-note-btn"
            className="flex items-center gap-2 px-4.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Publish Note</span>
          </button>
        </div>
      </div>

      {/* Direct Upload Status Notification */}
      {directUploadMessage && (
        <div className="p-3 px-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            {isUploadingDirect ? (
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
            ) : (
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            )}
            <span>{directUploadMessage}</span>
          </div>
          {!isUploadingDirect && (
            <button
              onClick={() => setDirectUploadMessage(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
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
              {/* Footer: Author & Upvote & Delete */}
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
                  {isUploader(note) && (
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
                      onToggleUpvote(note.id);
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
                    onClick={() => onToggleUpvote(activeNoteModal.id)}
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
                {isUploader(activeNoteModal) && (
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
                            Attached Files ({activeNoteModal.attachments.length})
                          </h4>
                        </div>
                        {isGuest && (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            <span>Sign in to download</span>
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeNoteModal.attachments.map((file) => {
                          const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
                          const isImage = (file.type && file.type.startsWith('image/')) || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
                          const sizeKb = Math.round(file.size / 1024);
                          const downloadLink = file.storageUrl || file.dataUrl;
                          const previewSrc = file.storageUrl || file.dataUrl;
                          return (
                            <div
                              key={file.id}
                              className="lift-card-subtle p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 flex items-center justify-between gap-3 group hover:border-indigo-300 dark:hover:border-indigo-700 transition"
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                {isImage ? (
                                  <img
                                    src={previewSrc}
                                    alt={file.name}
                                    className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-white"
                                  />
                                ) : (
                                  <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center shrink-0">
                                    <FileText className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                                  </div>
                                )}
                                <div className="overflow-hidden">
                                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={file.name}>
                                    {file.name}
                                  </p>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5 block">
                                    {isPdf ? 'PDF Document' : 'Image Asset'} • {sizeKb} KB
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {isImage && (
                                  <a
                                    href={previewSrc}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 transition border border-slate-200/80 dark:border-slate-700 shadow-2xs inline-flex items-center gap-1"
                                    title="Open image preview"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>View</span>
                                  </a>
                                )}
                                {isPdf && (
                                  <a
                                    href={downloadLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 transition border border-slate-200/80 dark:border-slate-700 shadow-2xs inline-flex items-center gap-1"
                                    title="Open PDF in viewer"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Open PDF</span>
                                  </a>
                                )}
                                <a
                                  href={downloadLink}
                                  download={file.name}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-2xs"
                                  title="Download file"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* AI Summarize Action */}
                  <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        Summarize with Paideutic AI Tutor
                      </span>
                      <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                        Generate quiz drills and targeted review notes tailored to your weak points.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onSummarizeInAi(activeNoteModal.content, activeNoteModal.title, activeNoteModal.subject, activeNoteModal.attachments);
                        setActiveNoteModal(null);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shrink-0 shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Launch in AI</span>
                    </button>
                  </div>
                </>
              ) : (
                /* FLASHCARD DRILL VIEW */
                <div className="flex flex-col items-center justify-center py-8 space-y-6">
                  {activeNoteModal.flashcards && activeNoteModal.flashcards.length > 0 ? (
                    <>
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                        Card {currentFlashcardIndex + 1} of {activeNoteModal.flashcards.length}
                      </div>
                      {/* Flashcard Component */}
                      <div
                        onClick={() => setIsCardFlipped(!isCardFlipped)}
                        className={`w-full max-w-md min-h-[220px] p-6 rounded-3xl border text-center flex flex-col justify-center items-center cursor-pointer transition-all duration-300 transform shadow-md select-none ${
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

      {/* PUBLISH / EDIT STUDY NOTE MODAL */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl p-6 md:p-8 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editingNoteId ? 'Edit Study Material' : stagedFiles.length > 0 ? 'Upload & Share Material' : 'Publish Study Note'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {editingNoteId
                    ? 'Update the title, subject, notes, or attachments for this study resource.'
                    : stagedFiles.length > 0
                    ? 'Review and edit title and subject before confirming upload.'
                    : 'Share course notes, lecture slides, formulas, and diagrams.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsPublishModalOpen(false);
                  setStagedFiles([]);
                  setEditingNoteId(null);
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handlePublishSubmit} className="space-y-4 pt-4 overflow-y-auto flex-1 pr-1">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Material / Note Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Organic Chemistry Reactions & Mechanisms"
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
                    Content & Notes (Markdown supported) *
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
                  placeholder="# Summary & Key Formulas&#10;- Key Takeaway 1: ...&#10;- Core Principle: ..."
                  value={pubContent}
                  onChange={(e) => setPubContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono resize-none"
                />
              </div>

              {/* File Selection (PDF, Images) Section */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Attach Study Files (PDF Lecture Slides, Diagrams, Images)</span>
                  </label>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">Max 25MB each</span>
                </div>
                {/* File picker drop area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 rounded-2xl bg-slate-50/50 dark:bg-slate-800/50 flex flex-col items-center justify-center cursor-pointer transition text-center group"
                >
                  <Upload className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform mb-1.5" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Click to select or drop PDF slides and diagram images
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Supports .pdf, .png, .jpg, .jpeg, .webp (Uploads only when you click submit below)
                  </p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleStageFiles}
                  multiple
                  accept="application/pdf, image/png, image/jpeg, image/webp"
                  className="hidden"
                />

                {/* Staged Files (Ready to upload on confirmation) */}
                {stagedFiles.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                        <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Selected for Upload ({stagedFiles.length} file{stagedFiles.length > 1 ? 's' : ''})</span>
                      </span>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                        Will upload upon confirmation
                      </span>
                    </div>
                    {stagedFiles.map((file, idx) => {
                      const isPdf = file.name.toLowerCase().endsWith('.pdf');
                      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
                      return (
                        <div
                          key={`staged_${idx}`}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/60 dark:bg-indigo-950/40 text-xs shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0">
                              {isPdf ? (
                                <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                              ) : (
                                <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                              )}
                            </div>
                            <div className="overflow-hidden">
                              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[240px] sm:max-w-xs">
                                {file.name}
                              </p>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                                {isPdf ? 'PDF Document' : 'Image Asset'} • {sizeMb} MB • Ready to upload
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveStagedFile(idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Already Attached Files (Saved) */}
                {pubAttachments.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      Existing Attached Files ({pubAttachments.length})
                    </span>
                    {pubAttachments.map((file) => {
                      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
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
                                src={file.dataUrl}
                                alt={file.name}
                                className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-white"
                              />
                            )}
                            <div className="overflow-hidden">
                              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[240px] sm:max-w-xs">
                                {file.name}
                              </p>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                                {isPdf ? 'PDF' : 'Image'} • {sizeKb} KB
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(file.id)}
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

              {/* Flashcards Preview inside form */}
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

              {/* Form Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsPublishModalOpen(false);
                    setStagedFiles([]);
                    setEditingNoteId(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingAttachment}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting || isUploadingAttachment ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : editingNoteId ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : stagedFiles.length > 0 ? (
                    <Upload className="w-3.5 h-3.5" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isSubmitting || isUploadingAttachment
                      ? 'Uploading & Saving...'
                      : editingNoteId
                      ? 'Save Changes'
                      : stagedFiles.length > 0
                      ? 'Upload & Publish Material'
                      : 'Publish Note'}
                  </span>
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
              Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-white">"{noteToDelete.title}"</span>? It will be removed from the shared library for all users.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setNoteToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GUEST LIMITATION / AUTH MODAL */}
      {(showPreviewLimitModal || authRequiredReason) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Sign In Required</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Unlock full access to Paideutic Library</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {showPreviewLimitModal
                ? 'Guest accounts can view a maximum of 3 shared study materials. Sign in or create a free account to unlock unlimited access to all notes, flashcard decks, and attachments.'
                : authRequiredReason === 'upload'
                ? 'Sign in or create a free account to publish notes, upload study materials, and share resources with fellow students.'
                : 'Sign in or create a free account to download shared PDF documents, images, and study attachments.'}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowPreviewLimitModal(false);
                  setAuthRequiredReason(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Close
              </button>
              {onOpenAuth && (
                <button
                  onClick={() => {
                    setShowPreviewLimitModal(false);
                    setAuthRequiredReason(null);
                    onOpenAuth('signin');
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Sign In / Register
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};