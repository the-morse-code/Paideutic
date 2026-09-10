import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Copy, 
  Check, 
  Trash2, 
  PlusCircle, 
  BookMarked, 
  Download,
  Sparkles,
  Eye,
  Edit3
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Subject } from '../types';

interface QuickScratchpadProps {
  onAddTaskFromScratchpad?: (title: string, subject: Subject) => void;
}

const STORAGE_KEY = 'paideutic_quick_scratchpad_v1';

const FORMULA_CATEGORIES = [
  {
    category: 'Mathematics & Math',
    formulas: [
      { name: 'Integration by Parts', latex: '∫ u dv = u v - ∫ v du', desc: 'Reverse product rule (LIATE)' },
      { name: 'Derivative of Quotient', latex: 'd/dx [u/v] = (u\'v - uv\') / v²', desc: 'Low d-high minus high d-low' },
      { name: 'Quadratic Formula', latex: 'x = (-b ± √(b² - 4ac)) / (2a)', desc: 'Roots of ax² + bx + c = 0' },
      { name: 'Euler\'s Identity', latex: 'e^(iπ) + 1 = 0', desc: 'Complex analysis fundamental' },
      { name: 'Chain Rule', latex: 'd/dx [f(g(x))] = f\'(g(x)) · g\'(x)', desc: 'Composite derivative' }
    ]
  },
  {
    category: 'Physics & Mechanics',
    formulas: [
      { name: 'Kinematic Position', latex: 'x = x₀ + v₀t + ½at²', desc: 'Constant acceleration position' },
      { name: 'Kinematic Velocity', latex: 'v² = v₀² + 2a(x - x₀)', desc: 'Time-independent kinematic' },
      { name: 'Work-Energy Theorem', latex: 'W_net = ΔKE = ½mv_f² - ½mv_i²', desc: 'Kinetic energy transformation' },
      { name: 'Ohm\'s Law', latex: 'V = I · R', desc: 'Voltage = Current × Resistance' },
      { name: 'Wave Equation', latex: 'v = f · λ', desc: 'Wave speed = Frequency × Wavelength' }
    ]
  },
  {
    category: 'Chemistry & Biology',
    formulas: [
      { name: 'Ideal Gas Law', latex: 'P · V = n · R · T', desc: 'R = 0.0821 L·atm/(mol·K)' },
      { name: 'Henderson-Hasselbalch', latex: 'pH = pKa + log₁₀([A⁻] / [HA])', desc: 'Buffer solution pH calculation' },
      { name: 'Gibbs Free Energy', latex: 'ΔG = ΔH - T · ΔS', desc: 'Spontaneity: ΔG < 0 is spontaneous' },
      { name: 'Michaelis-Menten', latex: 'v₀ = (V_max · [S]) / (K_m + [S])', desc: 'Enzyme kinetics velocity' }
    ]
  },
  {
    category: 'Computer Science',
    formulas: [
      { name: 'Binary Search', latex: 'O(log n) time, O(1) space', desc: 'Requires sorted array' },
      { name: 'Merge Sort', latex: 'O(n log n) best/avg/worst', desc: 'Divide and conquer, stable' },
      { name: 'Hash Map Lookup', latex: 'O(1) average, O(n) worst-case', desc: 'Key-value amortized access' },
      { name: 'Master Theorem', latex: 'T(n) = aT(n/b) + O(n^d)', desc: 'Recurrence relation bounds' }
    ]
  }
];

export const QuickScratchpad: React.FC<QuickScratchpadProps> = ({
  onAddTaskFromScratchpad,
}) => {
  const [activeTab, setActiveTab] = useState<'notes' | 'formulas'>('notes');
  const [scratchText, setScratchText] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || `# Quick Scratchpad & Working
- [ ] Review Integration by Parts proof
- [ ] Office hours with Prof. Miller on Thursday (2:00 PM)
- Note: Key constant R = 8.314 J/(mol·K) or 0.08206 L·atm/(mol·K)

*Use this pad to jot formulas, brainstorm problem solutions, or paste lecture excerpts.*`;
  });

  const [copiedNote, setCopiedNote] = useState(false);
  const [copiedFormula, setCopiedFormula] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [taskConverted, setTaskConverted] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, scratchText);
  }, [scratchText]);

  const handleCopyAll = () => {
    navigator.clipboard.writeText(scratchText);
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 2000);
  };

  const handleCopyFormula = (latex: string) => {
    navigator.clipboard.writeText(latex);
    setCopiedFormula(latex);
    setTimeout(() => setCopiedFormula(null), 2000);
  };

  const handleClear = () => {
    if (window.confirm('Clear your scratchpad contents?')) {
      setScratchText('');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([scratchText], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `study_scratchpad_${new Date().toISOString().split('T')[0]}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendToTasks = () => {
    if (!onAddTaskFromScratchpad || !scratchText.trim()) return;
    // Extract first line or summary as task
    const lines = scratchText.split('\n').filter(l => l.trim().length > 0);
    const firstLine = lines[0]?.replace(/^[#\-\*\[\]\s]+/, '').trim() || 'Study session review notes';
    onAddTaskFromScratchpad(firstLine, 'General Study');
    setTaskConverted(true);
    setTimeout(() => setTaskConverted(false), 2500);
  };

  return (
    <div className="lift-box bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col space-y-4 transition-colors">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Student Scratchpad & Reference</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Quick-capture thoughts, rough equations & high-yield formulas</p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'notes'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Scratchpad
          </button>
          <button
            onClick={() => setActiveTab('formulas')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'formulas'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Formula Sheet
          </button>
        </div>
      </div>

      {/* TAB 1: NOTES SCRATCHPAD */}
      {activeTab === 'notes' && (
        <div className="space-y-3">
          {/* Controls toolbar */}
          <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPreviewMode(!previewMode)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium transition"
              >
                {previewMode ? <Edit3 className="w-3 h-3 text-indigo-600" /> : <Eye className="w-3 h-3 text-indigo-600" />}
                <span>{previewMode ? 'Edit Mode' : 'Markdown Preview'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyAll}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium transition"
              >
                {copiedNote ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                <span>{copiedNote ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium transition"
                title="Download as Markdown"
              >
                <Download className="w-3 h-3 text-slate-500" />
                <span className="hidden sm:inline">Export .md</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {onAddTaskFromScratchpad && (
                <button
                  type="button"
                  onClick={handleSendToTasks}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-bold transition hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
                  title="Create a study task from the first line of your scratchpad"
                >
                  <PlusCircle className="w-3 h-3 text-indigo-600" />
                  <span>{taskConverted ? '✓ Added to Tasks!' : 'Send to Tasks'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                title="Clear scratchpad"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Text Area or Preview */}
          {previewMode ? (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 min-h-[160px] max-h-[260px] overflow-y-auto text-xs md:text-sm text-slate-800 dark:text-slate-200 prose prose-slate dark:prose-invert max-w-none">
              <ReactMarkdown>{scratchText || '*Scratchpad is empty.*'}</ReactMarkdown>
            </div>
          ) : (
            <textarea
              rows={6}
              value={scratchText}
              onChange={(e) => setScratchText(e.target.value)}
              placeholder="Type notes, formulas, brainstorms, or lecture bullet points..."
              className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs md:text-sm leading-relaxed text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none font-mono"
            />
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-1">
            <span>Auto-saved to browser storage</span>
            <span>{scratchText.length} characters</span>
          </div>
        </div>
      )}

      {/* TAB 2: FORMULA QUICK REFERENCE */}
      {activeTab === 'formulas' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Click any formula to instantly copy it for homework or paste into the AI Tutor.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
            {FORMULA_CATEGORIES.map((cat, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2.5"
              >
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block">
                  {cat.category}
                </span>

                <div className="space-y-2">
                  {cat.formulas.map((f, fIdx) => (
                    <div
                      key={fIdx}
                      onClick={() => handleCopyFormula(f.latex)}
                      className="lift-card-subtle p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 transition cursor-pointer group flex items-start justify-between gap-2 shadow-2xs"
                    >
                      <div>
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                          {f.name}
                        </span>
                        <code className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 block mt-0.5">
                          {f.latex}
                        </code>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">
                          {f.desc}
                        </span>
                      </div>

                      <div className="shrink-0 pt-1">
                        {copiedFormula === f.latex ? (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded">
                            Copied
                          </span>
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
