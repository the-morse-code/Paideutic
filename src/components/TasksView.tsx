import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Calendar,
  Sparkles,
  Search
} from 'lucide-react';
import { Task, Subject, TaskPriority } from '../types';
import { playTaskDoneChime } from '../utils/audio';

interface TasksViewProps {
  tasks: Task[];
  userId: string;
  onAddTask: (task: Omit<Task, 'id' | 'created_at'>) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onCleanCompleted: () => void;
}

const ALL_SUBJECTS: Subject[] = [
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

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  userId,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onCleanCompleted,
}) => {
  const [filterSubject, setFilterSubject] = useState<string>('All');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Add Task Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<Subject>('Mathematics');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddTask({
      user_id: userId,
      title: title.trim(),
      subject,
      priority,
      is_completed: false,
      due_date: dueDate,
      notes: notes.trim(),
    });

    // Reset Form
    setTitle('');
    setNotes('');
    setIsAddModalOpen(false);
  };

  const handleToggle = (taskId: string, isCompletedCurrently: boolean) => {
    if (!isCompletedCurrently) {
      playTaskDoneChime();
    }
    onToggleTask(taskId);
  };

  // Filtering
  const filteredTasks = tasks.filter((t) => {
    if (filterSubject !== 'All' && t.subject !== filterSubject) return false;
    if (filterPriority !== 'All' && t.priority !== filterPriority) return false;
    if (filterStatus === 'pending' && t.is_completed) return false;
    if (filterStatus === 'completed' && !t.is_completed) return false;
    if (searchQuery.trim() && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const completedCount = tasks.filter(t => t.is_completed).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Smart Study To-Do</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Organized by subject & priority to keep your coursework on track.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {completedCount > 0 && (
            <button
              onClick={onCleanCompleted}
              id="clean-completed-tasks-btn"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900/60 transition"
              title="Delete all completed tasks"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clean Completed ({completedCount})</span>
            </button>
          )}

          <button
            onClick={() => setIsAddModalOpen(true)}
            id="add-task-open-modal-btn"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="lift-box p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs transition-colors">
        {/* Search */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none w-full text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400"
          />
        </div>

        {/* Status Pill Toggle */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              filterStatus === 'all' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            All ({tasks.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              filterStatus === 'pending' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Active ({tasks.length - completedCount})
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              filterStatus === 'completed' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Done ({completedCount})
          </button>
        </div>

        {/* Subject Dropdown */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 dark:text-slate-500 font-medium">Subject:</span>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none font-medium"
          >
            <option value="All">All Subjects</option>
            {ALL_SUBJECTS.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>

        {/* Priority Dropdown */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 dark:text-slate-500 font-medium">Priority:</span>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none font-medium"
          >
            <option value="All">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2.5">
        {filteredTasks.map((task) => {
          const isOverdue = !task.is_completed && new Date(task.due_date).getTime() < new Date().setHours(0,0,0,0);
          return (
            <div
              key={task.id}
              id={`task-row-${task.id}`}
              className={`lift-card-subtle p-4 rounded-2xl bg-white dark:bg-slate-900 border transition flex items-start justify-between gap-4 shadow-xs ${
                task.is_completed
                  ? 'border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/50 opacity-75'
                  : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
              }`}
            >
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                {/* Custom Checkbox */}
                <button
                  onClick={() => handleToggle(task.id, task.is_completed)}
                  className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                    task.is_completed
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                      : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500 bg-white dark:bg-slate-800'
                  }`}
                >
                  {task.is_completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-sm font-semibold transition-all ${
                        task.is_completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {task.title}
                    </span>

                    {/* Subject Tag */}
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {task.subject}
                    </span>

                    {/* Priority Badge */}
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        task.priority === 'high'
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'
                          : task.priority === 'medium'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>

                  {task.notes && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {task.notes}
                    </p>
                  )}

                  {/* Due Date Indicator */}
                  <div className="flex items-center gap-2 mt-2 text-[11px]">
                    <div
                      className={`flex items-center gap-1 ${
                        isOverdue
                          ? 'text-rose-600 dark:text-rose-400 font-bold'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      <Calendar className="w-3 h-3" />
                      <span>{isOverdue ? `Overdue (${task.due_date})` : `Due ${task.due_date}`}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delete button */}
              <button
                onClick={() => onDeleteTask(task.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                title="Delete task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <CheckCircle2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No tasks match this filter</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Add a new assignment or clear your filter criteria.
            </p>
          </div>
        )}
      </div>

      {/* CREATE TASK MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 max-w-lg w-full shadow-xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Add Academic Task</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Track homework, problem sets, and exams</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Solve Problem Set 3 (Integration by Parts)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Subject
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value as Subject)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                  >
                    {ALL_SUBJECTS.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Notes & Details (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Formulas to memorize, page numbers, or key pitfalls..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="create-task-submit-btn"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
