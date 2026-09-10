import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle,
  Sparkles,
  MapPin,
  X
} from 'lucide-react';
import { ExamItem, Subject } from '../types';

interface ExamCountdownWidgetProps {
  isGuest?: boolean;
  userId?: string;
}

const GUEST_STORAGE_KEY = 'paideutic_exams_guest_v2';

const INITIAL_EXAMS: ExamItem[] = [
  {
    id: 'exam_01',
    title: 'Mathematics II Midterm (Series & Integration)',
    subject: 'Mathematics',
    examDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
    totalMarks: 100,
    locationOrRoom: 'Science Hall 301 (2:00 PM)',
    notes: 'Bring TI-84 calculator and formula card.'
  },
  {
    id: 'exam_02',
    title: 'Physics Mechanics & Harmonic Motion Exam',
    subject: 'Physics',
    examDate: new Date(Date.now() + 9 * 86400000).toISOString().split('T')[0],
    totalMarks: 80,
    locationOrRoom: 'Euler Auditorium (10:30 AM)',
    notes: 'Covers Newton\'s laws, conservation of momentum, and SHM.'
  },
  {
    id: 'exam_03',
    title: 'Cellular Biology Comprehensive Quiz',
    subject: 'Biology',
    examDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    totalMarks: 50,
    locationOrRoom: 'Online LMS (Canvas)',
    notes: '50 multiple choice questions on metabolism & genetics.'
  }
];

export const ExamCountdownWidget: React.FC<ExamCountdownWidgetProps> = ({
  isGuest = true,
  userId = '',
}) => {
  const storageKey = isGuest
    ? GUEST_STORAGE_KEY
    : `paideutic_exams_user_${userId || 'current'}`;

  const [exams, setExams] = useState<ExamItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // If logged in, strictly remove demo initial exams
          if (!isGuest) {
            return parsed.filter(
              (e) => !['exam_01', 'exam_02', 'exam_03'].includes(e.id)
            );
          }
          return parsed;
        }
      }
    } catch {}

    // Only guests get the initial demo exams
    return isGuest ? INITIAL_EXAMS : [];
  });

  // Re-sync exams when guest status or user changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          if (!isGuest) {
            setExams(parsed.filter((e) => !['exam_01', 'exam_02', 'exam_03'].includes(e.id)));
            return;
          }
          setExams(parsed);
          return;
        }
      }
    } catch {}
    setExams(isGuest ? INITIAL_EXAMS : []);
  }, [isGuest, userId, storageKey]);

  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<Subject>('Mathematics');
  const [examDate, setExamDate] = useState('');
  const [totalMarks, setTotalMarks] = useState<number | undefined>(100);
  const [locationOrRoom, setLocationOrRoom] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(exams));
  }, [exams, storageKey]);

  const handleAddExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !examDate) return;

    const newExam: ExamItem = {
      id: `exam_${Date.now()}`,
      title: title.trim(),
      subject,
      examDate,
      totalMarks: totalMarks ? Number(totalMarks) : 100,
      weightPercent: totalMarks ? Number(totalMarks) : undefined,
      locationOrRoom: locationOrRoom.trim() || undefined,
      notes: notes.trim() || undefined
    };

    setExams(prev => [...prev, newExam].sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime()));
    setIsAdding(false);
    setTitle('');
    setExamDate('');
    setTotalMarks(100);
    setLocationOrRoom('');
    setNotes('');
  };

  const handleDeleteExam = (id: string) => {
    setExams(prev => prev.filter(e => e.id !== id));
  };

  const getDaysLeft = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Sort upcoming exams
  const sortedExams = [...exams].sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());

  return (
    <div className="lift-box bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col space-y-4 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Exam & Midterm Countdown</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Track major milestones and countdown days to test day</p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs"
        >
          {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          <span>{isAdding ? 'Cancel' : 'Add Exam'}</span>
        </button>
      </div>

      {/* Add Exam Form Modal / Drawer */}
      {isAdding && (
        <form onSubmit={handleAddExam} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in">
          <div className="font-bold text-xs text-slate-800 dark:text-slate-200">New Exam / Midterm</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Exam Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Mathematics II Midterm #2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as Subject)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none font-medium"
              >
                {['Mathematics', 'Physics', 'Biology', 'Chemistry', 'Computer Science', 'History', 'Literature', 'Psychology', 'Language', 'General Study'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Exam Date *</label>
              <input
                type="date"
                required
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Total Marks</label>
              <input
                type="number"
                min={1}
                max={1000}
                placeholder="100"
                value={totalMarks || ''}
                onChange={(e) => setTotalMarks(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Room / Time / Notes</label>
            <input
              type="text"
              placeholder="e.g. Science Hall 301, 2:00 PM. Cheat sheet permitted."
              value={locationOrRoom}
              onChange={(e) => setLocationOrRoom(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
            >
              Save Exam
            </button>
          </div>
        </form>
      )}

      {/* Exam Cards Grid */}
      <div className="space-y-3">
        {sortedExams.map((exam) => {
          const daysLeft = getDaysLeft(exam.examDate);
          const isOverdue = daysLeft < 0;
          const isToday = daysLeft === 0;

          let badgeColor = 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60';
          let countdownText = `${daysLeft} days left`;

          if (isOverdue) {
            badgeColor = 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700';
            countdownText = 'Completed / Past';
          } else if (isToday) {
            badgeColor = 'bg-rose-500 text-white animate-pulse border-rose-600';
            countdownText = '⚡ TODAY!';
          } else if (daysLeft <= 2) {
            badgeColor = 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60';
            countdownText = daysLeft === 1 ? '🔥 Tomorrow!' : `🔥 ${daysLeft} days left`;
          } else if (daysLeft <= 6) {
            badgeColor = 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60';
            countdownText = `⏳ ${daysLeft} days left`;
          }

          const examMarks = exam.totalMarks || exam.weightPercent || 100;

          return (
            <div
              key={exam.id}
              className="lift-card-subtle p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 bg-slate-50/40 dark:bg-slate-800/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group cursor-pointer"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                    {exam.title}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                    {exam.subject}
                  </span>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/50">
                    {examMarks} Marks
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{exam.examDate}</span>
                  </span>
                  {exam.locationOrRoom && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{exam.locationOrRoom}</span>
                    </span>
                  )}
                </div>

                {exam.notes && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                    {exam.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                <div className={`px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider ${badgeColor}`}>
                  {countdownText}
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteExam(exam.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition opacity-80 group-hover:opacity-100"
                  title="Remove exam"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {sortedExams.length === 0 && (
          <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400 dark:text-slate-500">
            No exams scheduled. Click <b>Add Exam</b> to track your upcoming midterms and finals!
          </div>
        )}
      </div>
    </div>
  );
};
