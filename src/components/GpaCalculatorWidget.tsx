import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Plus, 
  Trash2, 
  GraduationCap, 
  TrendingUp, 
  Sparkles,
  HelpCircle,
  Award
} from 'lucide-react';
import { CourseGrade } from '../types';

const STORAGE_KEY = 'paideutic_gpa_courses_v1';

const GRADE_POINTS: Record<string, number> = {
  'A+': 4.0,
  'A': 4.0,
  'A-': 3.7,
  'B+': 3.3,
  'B': 3.0,
  'B-': 2.7,
  'C+': 2.3,
  'C': 2.0,
  'C-': 1.7,
  'D': 1.0,
  'F': 0.0
};

const INITIAL_COURSES: CourseGrade[] = [
  { id: 'c1', courseName: 'Mathematics II (MATH 201)', credits: 4, grade: 'A' },
  { id: 'c2', courseName: 'Physics for Engineers (PHYS 140)', credits: 4, grade: 'B+' },
  { id: 'c3', courseName: 'Biomedical Engineering Intro', credits: 3, grade: 'A-' },
  { id: 'c4', courseName: 'General Chemistry II (CHEM 102)', credits: 4, grade: 'A' },
  { id: 'c5', courseName: 'Academic Technical Writing', credits: 2, grade: 'A' }
];

export const GpaCalculatorWidget: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'gpa' | 'finalTarget'>('gpa');
  
  // Courses for GPA calculator
  const [courses, setCourses] = useState<CourseGrade[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_COURSES;
      }
    }
    return INITIAL_COURSES;
  });

  const [newCourseName, setNewCourseName] = useState('');
  const [newCredits, setNewCredits] = useState(3);
  const [newGrade, setNewGrade] = useState('A');

  // Final Exam Target Estimator states
  const [currentCourseStanding, setCurrentCourseStanding] = useState(86);
  const [targetCourseGrade, setTargetCourseGrade] = useState(90);
  const [finalWeight, setFinalWeight] = useState(25);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
  }, [courses]);

  // Calculate GPA
  const totalCredits = courses.reduce((acc, c) => acc + c.credits, 0);
  const totalPoints = courses.reduce((acc, c) => acc + (GRADE_POINTS[c.grade] || 0) * c.credits, 0);
  const projectedGpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';

  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;

    const newCourse: CourseGrade = {
      id: `course_${Date.now()}`,
      courseName: newCourseName.trim(),
      credits: Number(newCredits) || 3,
      grade: newGrade
    };

    setCourses(prev => [...prev, newCourse]);
    setNewCourseName('');
  };

  const handleRemoveCourse = (id: string) => {
    setCourses(prev => prev.filter(c => c.id !== id));
  };

  const handleUpdateGrade = (id: string, grade: string) => {
    setCourses(prev => prev.map(c => c.id === id ? { ...c, grade } : c));
  };

  // Final Exam Score Calculation
  // Target = Current * (1 - Weight/100) + Final * (Weight/100)
  // Final = (Target - Current * (1 - Weight/100)) / (Weight/100)
  const weightFrac = finalWeight / 100;
  const currentPortion = currentCourseStanding * (1 - weightFrac);
  const requiredScore = weightFrac > 0 ? ((targetCourseGrade - currentPortion) / weightFrac).toFixed(1) : '0';
  const reqScoreNum = parseFloat(requiredScore);

  return (
    <div className="lift-box bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-xs space-y-6 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Academic GPA & Grade Projector</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Calculate semester GPA and forecast exact scores needed on final exams
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('gpa')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'gpa'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            GPA Calculator
          </button>
          <button
            onClick={() => setActiveTab('finalTarget')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'finalTarget'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Final Exam Target
          </button>
        </div>
      </div>

      {/* TAB 1: SEMESTER GPA CALCULATOR */}
      {activeTab === 'gpa' && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/50 dark:to-slate-800 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 block">Projected GPA</span>
                <span className="text-3xl font-black text-indigo-950 dark:text-white mt-0.5 block">{projectedGpa}</span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">4.0 Scale</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 text-xl shadow-xs">
                {parseFloat(projectedGpa) >= 3.8 ? '🌟' : parseFloat(projectedGpa) >= 3.5 ? '✨' : '📚'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Enrolled Credits</span>
              <span className="text-3xl font-black text-slate-900 dark:text-white mt-0.5 block">{totalCredits}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Across {courses.length} courses</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Honors Standing</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-2 block">
                {parseFloat(projectedGpa) >= 3.8 ? "Dean's List / Summa Cum Laude" :
                 parseFloat(projectedGpa) >= 3.5 ? "Dean's List / Magna Cum Laude" :
                 parseFloat(projectedGpa) >= 3.0 ? "Good Academic Standing" : "Academic Review"}
              </span>
            </div>
          </div>

          {/* Courses Table / List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 px-2">
              <span>Course Name</span>
              <div className="flex items-center gap-8 pr-4">
                <span>Credits</span>
                <span>Expected Grade</span>
                <span>Actions</span>
              </div>
            </div>

            {courses.map((c) => (
              <div
                key={c.id}
                className="lift-card-subtle p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 flex items-center justify-between gap-3 shadow-2xs"
              >
                <span className="text-xs font-semibold text-slate-900 dark:text-white truncate flex-1">
                  {c.courseName}
                </span>

                <div className="flex items-center gap-6 shrink-0">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-10 text-center">
                    {c.credits} cr
                  </span>

                  <select
                    value={c.grade}
                    onChange={(e) => handleUpdateGrade(c.id, e.target.value)}
                    className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  >
                    {Object.keys(GRADE_POINTS).map((g) => (
                      <option key={g} value={g}>{g} ({GRADE_POINTS[g].toFixed(1)})</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => handleRemoveCourse(c.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition"
                    title="Remove course"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Course Inline Form */}
          <form onSubmit={handleAddCourse} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              placeholder="Course name (e.g. Organic Chemistry I)"
              value={newCourseName}
              onChange={(e) => setNewCourseName(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none w-full"
            />

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="number"
                min={1}
                max={6}
                placeholder="3"
                value={newCredits}
                onChange={(e) => setNewCredits(Number(e.target.value))}
                className="w-16 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none text-center"
                title="Credit hours"
              />

              <select
                value={newGrade}
                onChange={(e) => setNewGrade(e.target.value)}
                className="px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white outline-none"
              >
                {Object.keys(GRADE_POINTS).map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>

              <button
                type="submit"
                disabled={!newCourseName.trim()}
                className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: FINAL EXAM TARGET ESTIMATOR */}
      {activeTab === 'finalTarget' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-300 leading-relaxed">
            Wondering what score you need on your upcoming final exam to maintain or achieve a specific letter grade?
            Adjust the sliders below to calculate your target!
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Input 1: Current standing */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Current Class Standing</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-black">{currentCourseStanding}%</span>
              </div>
              <input
                type="range"
                min={40}
                max={100}
                value={currentCourseStanding}
                onChange={(e) => setCurrentCourseStanding(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <span className="text-[11px] text-slate-400 block">Your average before entering the final</span>
            </div>

            {/* Input 2: Desired Grade */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Target Final Grade</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black">{targetCourseGrade}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                value={targetCourseGrade}
                onChange={(e) => setTargetCourseGrade(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <span className="text-[11px] text-slate-400 block">e.g. 90% for A, 85% for B+, 80% for B</span>
            </div>

            {/* Input 3: Final Weight / Total Marks */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Total Marks (Weight %)</span>
                <span className="text-amber-600 dark:text-amber-400 font-black">{finalWeight}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={60}
                value={finalWeight}
                onChange={(e) => setFinalWeight(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <span className="text-[11px] text-slate-400 block">Total marks percentage allocated to the final exam</span>
            </div>
          </div>

          {/* Outcome Card */}
          <div className="lift-card-subtle p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1.5 text-center sm:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Required Final Exam Score
              </span>
              <div className="flex items-baseline gap-2 justify-center sm:justify-start">
                <span className={`text-4xl font-black ${
                  reqScoreNum > 100 ? 'text-rose-600 dark:text-rose-400' :
                  reqScoreNum > 85 ? 'text-amber-600 dark:text-amber-400' :
                  'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {requiredScore}%
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  on the final exam
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-md">
                {reqScoreNum > 100 ? (
                  `⚠️ Achieving ${targetCourseGrade}% overall requires over 100% on the final. Extra credit would be required.`
                ) : reqScoreNum <= 60 ? (
                  `✨ You have comfortable margin! A score of ${requiredScore}% secures your target ${targetCourseGrade}%.`
                ) : (
                  `🎯 Fully achievable! Score at least ${requiredScore}% on your final exam to lock in your desired ${targetCourseGrade}%.`
                )}
              </p>
            </div>

            <div className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider border shrink-0 text-center ${
              reqScoreNum > 100 ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200' :
              reqScoreNum > 85 ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200' :
              'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200'
            }`}>
              {reqScoreNum > 100 ? 'Ambitious Target' : reqScoreNum > 85 ? 'Intensive Study Needed' : 'Well Within Reach'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
