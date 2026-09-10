import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  BookOpen, 
  Target, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  BrainCircuit, 
  HelpCircle,
  Lightbulb,
  Layers,
  ArrowRight,
  RefreshCw,
  Trash2,
  RotateCcw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, AdaptiveSummaryResult, PracticeQuestion, Subject, AttachedFile } from '../types';
import { sendChatMessage, summarizeMaterial } from '../services/geminiService';
import { playAchievementFanfare } from '../utils/audio';

const DEFAULT_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'init_msg',
    sender: 'ai',
    text: `Hello! I'm **Paideutic AI**, your personal adaptive study coach.\n\nAsk me anything about your current coursework, ask for step-by-step problem walkthroughs, or test your intuition. As we study, I'll automatically detect concepts you're finding tricky and flag them in your **Weak-Point Radar** so we can turn them into strengths!`,
    timestamp: 'Just now',
    suggestedFollowUps: [
      "Quiz me on key concepts with 3 rapid-fire questions",
      "Explain Integration by Parts using an intuitive visual analogy",
      "Walk me through an AVL tree double rotation step-by-step",
      "Help me analyze and understand the core rules in Language study"
    ],
  },
];

interface AiTutorViewProps {
  weakTopics: string[];
  onAddWeakTopic: (topic: string) => void;
  onRemoveWeakTopic: (topic: string) => void;
  onLogAiSession: () => void;
  initialMaterialToSummarize?: { content: string; title: string; subject: Subject; attachments?: AttachedFile[] } | null;
  onClearInitialMaterial?: () => void;
  isGuest?: boolean;
  onOpenAuth?: (mode: 'signin' | 'signup') => void;
}

export const AiTutorView: React.FC<AiTutorViewProps> = ({
  weakTopics,
  onAddWeakTopic,
  onRemoveWeakTopic,
  onLogAiSession,
  initialMaterialToSummarize,
  onClearInitialMaterial,
  isGuest = false,
  onOpenAuth,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'summarizer'>(() => {
    return (localStorage.getItem('study_ai_active_subtab') as any) || 'chat';
  });

  // Chat State with localStorage persistence so switching tabs never loses chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const raw = localStorage.getItem('study_ai_chat_messages');
      if (raw) return JSON.parse(raw);
    } catch {}
    return DEFAULT_CHAT_MESSAGES;
  });

  const [inputQuery, setInputQuery] = useState(() => {
    return localStorage.getItem('study_ai_chat_input') || '';
  });
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Summarizer State with localStorage persistence
  const [summaryInputText, setSummaryInputText] = useState(() => {
    return localStorage.getItem('study_ai_summary_input') || '';
  });
  const [summaryTitle, setSummaryTitle] = useState(() => {
    return localStorage.getItem('study_ai_summary_title') || 'My Lecture Notes';
  });
  const [summarySubject, setSummarySubject] = useState<Subject>(() => {
    return (localStorage.getItem('study_ai_summary_subject') as Subject) || 'Mathematics';
  });
  const [selectedWeakTopicsForSummary, setSelectedWeakTopicsForSummary] = useState<string[]>(weakTopics);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<AdaptiveSummaryResult | null>(() => {
    try {
      const raw = localStorage.getItem('study_ai_summary_result');
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  });

  // Practice Questions State (in Summarizer)
  const [userSelectedAnswers, setUserSelectedAnswers] = useState<Record<number, string>>(() => {
    try {
      const raw = localStorage.getItem('study_ai_summary_answers');
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  });
  const [checkedQuestions, setCheckedQuestions] = useState<Record<number, boolean>>(() => {
    try {
      const raw = localStorage.getItem('study_ai_summary_checked');
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  });

  // Persist subtab
  useEffect(() => {
    localStorage.setItem('study_ai_active_subtab', activeSubTab);
  }, [activeSubTab]);

  // Persist Chat
  useEffect(() => {
    try {
      localStorage.setItem('study_ai_chat_messages', JSON.stringify(chatMessages));
    } catch {}
  }, [chatMessages]);

  useEffect(() => {
    localStorage.setItem('study_ai_chat_input', inputQuery);
  }, [inputQuery]);

  // Persist Summarizer
  useEffect(() => {
    localStorage.setItem('study_ai_summary_input', summaryInputText);
  }, [summaryInputText]);

  useEffect(() => {
    localStorage.setItem('study_ai_summary_title', summaryTitle);
  }, [summaryTitle]);

  useEffect(() => {
    localStorage.setItem('study_ai_summary_subject', summarySubject);
  }, [summarySubject]);

  useEffect(() => {
    try {
      if (summaryResult) {
        localStorage.setItem('study_ai_summary_result', JSON.stringify(summaryResult));
      } else {
        localStorage.removeItem('study_ai_summary_result');
      }
    } catch {}
  }, [summaryResult]);

  useEffect(() => {
    try {
      localStorage.setItem('study_ai_summary_answers', JSON.stringify(userSelectedAnswers));
    } catch {}
  }, [userSelectedAnswers]);

  useEffect(() => {
    try {
      localStorage.setItem('study_ai_summary_checked', JSON.stringify(checkedQuestions));
    } catch {}
  }, [checkedQuestions]);

  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear your AI chat history?")) {
      setChatMessages(DEFAULT_CHAT_MESSAGES);
      localStorage.removeItem('study_ai_chat_messages');
    }
  };

  const handleResetSummarizer = () => {
    setSummaryInputText('');
    setSummaryResult(null);
    setUserSelectedAnswers({});
    setCheckedQuestions({});
    localStorage.removeItem('study_ai_summary_input');
    localStorage.removeItem('study_ai_summary_result');
    localStorage.removeItem('study_ai_summary_answers');
    localStorage.removeItem('study_ai_summary_checked');
  };

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAiTyping]);

  // If initialMaterial is passed from Library View
  useEffect(() => {
    if (initialMaterialToSummarize) {
      setActiveSubTab('summarizer');
      let combinedContent = initialMaterialToSummarize.content || '';
      if (initialMaterialToSummarize.attachments && initialMaterialToSummarize.attachments.length > 0) {
        const fileDetails = initialMaterialToSummarize.attachments.map((a) => {
          const typeStr = a.type || (a.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
          const sizeStr = `${(a.size / 1024).toFixed(1)} KB`;
          const urlStr = a.storageUrl || a.dataUrl ? ` [View/Download Link](${a.storageUrl || a.dataUrl})` : '';
          return `- **Attachment**: \`${a.name}\` (${typeStr}, ${sizeStr})${urlStr}`;
        }).join('\n');

        if (!combinedContent.includes('### Attached Study Materials:')) {
          combinedContent = `${combinedContent}\n\n### Attached Study Materials & Reference Documents:\n${fileDetails}`;
        }
      }
      setSummaryInputText(combinedContent);
      setSummaryTitle(initialMaterialToSummarize.title);
      setSummarySubject(initialMaterialToSummarize.subject);
      setSelectedWeakTopicsForSummary(weakTopics);
      
      // Also prefill chat input so user can seamlessly ask questions about this material
      setInputQuery(`Can you explain the key concepts and test my understanding of "${initialMaterialToSummarize.title}"?`);

      if (onClearInitialMaterial) {
        onClearInitialMaterial();
      }
    }
  }, [initialMaterialToSummarize]);

  // Keep weak topics in sync
  useEffect(() => {
    setSelectedWeakTopicsForSummary(weakTopics);
  }, [weakTopics]);

  // -------------------------------------------------------------
  // CHAT HANDLERS
  // -------------------------------------------------------------
  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim() || isAiTyping) return;

    if (isGuest) {
      const guestWarningMsg: ChatMessage = {
        id: `ai_demo_${Date.now()}`,
        sender: 'ai',
        text: `To use the AI and summarizer, log in for free!!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, guestWarningMsg]);
      if (onOpenAuth) {
        onOpenAuth('signup');
      }
      return;
    }

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsAiTyping(true);

    try {
      // Send history context
      const history = chatMessages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('model' as const),
        text: m.text,
      }));

      const res = await sendChatMessage(query, history, weakTopics);
      onLogAiSession();

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        detectedWeakness: res.detectedWeakness,
        suggestedFollowUps: res.suggestedFollowUps,
      };

      // If weak point detected, automatically add to user profile if valid 2-3 word concept name
      if (res.detectedWeakness) {
        const rawTag = String(res.detectedWeakness).trim();
        const isQuestion = /^(what|how|why|can|could|tell|explain|is|does|where|when|which|show|help)\b/i.test(rawTag) || rawTag.includes('?');
        const isTooLong = rawTag.length > 35 || rawTag.split(/\s+/).length > 4;

        if (!isQuestion && !isTooLong && rawTag.length >= 3) {
          onAddWeakTopic(rawTag);
        }
      }

      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai_err_${Date.now()}`,
          sender: 'ai',
          text: `I had trouble connecting to the Gemini 2.5 Flash service: ${err?.message || 'Network error'}. Please check your connection or retry in a moment.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsAiTyping(false);
    }
  };

  // -------------------------------------------------------------
  // SUMMARIZER HANDLERS
  // -------------------------------------------------------------
  const handleRunSummarizer = async () => {
    if (isGuest) {
      if (onOpenAuth) {
        onOpenAuth('signup');
      }
      return;
    }

    if (!summaryInputText.trim() || isSummarizing) return;

    setIsSummarizing(true);
    setUserSelectedAnswers({});
    setCheckedQuestions({});
    setSummaryResult(null);

    try {
      const res = await summarizeMaterial(
        summaryInputText,
        selectedWeakTopicsForSummary,
        summaryTitle,
        summarySubject
      );
      setSummaryResult(res);
      onLogAiSession();
    } catch (err: any) {
      console.error('Summarize error:', err);
    } finally {
      setIsSummarizing(false);
    }
  };

  const toggleWeakTopicInSummary = (topic: string) => {
    if (selectedWeakTopicsForSummary.includes(topic)) {
      setSelectedWeakTopicsForSummary((prev) => prev.filter((t) => t !== topic));
    } else {
      setSelectedWeakTopicsForSummary((prev) => [...prev, topic]);
    }
  };

  const handleSelectOption = (qIdx: number, option: string) => {
    if (checkedQuestions[qIdx]) return;
    setUserSelectedAnswers((prev) => ({ ...prev, [qIdx]: option }));
  };

  const handleCheckAnswer = (qIdx: number, correctAnswer: string) => {
    setCheckedQuestions((prev) => ({ ...prev, [qIdx]: true }));
    if (userSelectedAnswers[qIdx] === correctAnswer) {
      playAchievementFanfare();
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Bar with Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Adaptive AI Study Assistant</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Powered by Gemini. Continuously analyzes questions & highlights your exact weak points.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl gap-1 self-start sm:self-auto text-xs font-bold transition-colors">
          <button
            onClick={() => setActiveSubTab('chat')}
            id="subtab-chat-tutor"
            className={`px-4 py-2 rounded-xl transition ${
              activeSubTab === 'chat'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Chat Analyzer
          </button>
          <button
            onClick={() => setActiveSubTab('summarizer')}
            id="subtab-adaptive-summarizer"
            className={`px-4 py-2 rounded-xl transition ${
              activeSubTab === 'summarizer'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Adaptive Summarizer
          </button>
        </div>
      </div>

      {/* Guest Mode Restriction Alert Banner */}
      {isGuest && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 border-2 border-indigo-300 dark:border-indigo-700/80 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                To use the AI and summarizer, log in for free!!
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                In instant demo mode, AI features are restricted. Sign in or create an account for 100% free access to your personal AI tutor & adaptive summarizer.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenAuth && onOpenAuth('signup')}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shrink-0 shadow-sm"
          >
            Log In For Free
          </button>
        </div>
      )}

      {/* SUBTAB 1: CHAT TUTOR */}
      {activeSubTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Chat Stream (3 cols) */}
          <div className="lift-box lg:col-span-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col h-[75vh] overflow-hidden transition-colors">
            {/* Top persistence & control bar */}
            <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40 text-xs">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active Conversation • Saved across tabs & reloads</span>
              </div>
              <button
                type="button"
                onClick={handleClearChat}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition font-semibold text-xs"
                title="Reset conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Chat</span>
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                      {msg.sender === 'user' ? 'You' : 'Paideutic AI Tutor'}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">{msg.timestamp}</span>
                  </div>

                  <div
                    className={`p-4 md:p-5 rounded-3xl max-w-[90%] md:max-w-[82%] text-xs md:text-sm leading-relaxed shadow-xs ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-xs'
                        : 'bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 rounded-bl-xs'
                    }`}
                  >
                    <div className="prose prose-slate dark:prose-invert max-w-none prose-sm">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>

                    {/* Weak Point Detection Alert Banner */}
                    {msg.detectedWeakness && (
                      <div className="mt-3.5 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 bg-amber-50/90 dark:bg-amber-950/60 -mx-2 -mb-2 p-2.5 rounded-2xl text-amber-900 dark:text-amber-200 text-xs font-semibold">
                        <div className="flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>Identified struggle area: <b>{msg.detectedWeakness}</b></span>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-200 bg-amber-200/80 dark:bg-amber-900/80 px-2 py-0.5 rounded-md shrink-0">
                          Added to Profile
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Suggested Follow-up chips if AI */}
                  {msg.sender === 'ai' && msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5 max-w-[85%]">
                      {msg.suggestedFollowUps.map((promptText, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(promptText)}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-indigo-50/70 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 hover:text-indigo-900 dark:hover:text-indigo-200 transition flex items-center gap-1"
                        >
                          <span>{promptText}</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isAiTyping && (
                <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 p-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce delay-100" />
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce delay-200" />
                  <span>Paideutic AI is synthesizing your study answer...</span>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="p-3 md:p-4 bg-slate-50/70 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Ask a question, request an analogy, or explain your confusion..."
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs md:text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={!inputQuery.trim() || isAiTyping}
                  id="chat-send-btn"
                  className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-40 transition shadow-xs"
                  title="Send query"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Right Sidebar: Active Weak Points Radar (1 col) */}
          <div className="lift-box bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 flex flex-col justify-between transition-colors">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-400 font-bold text-sm">
                <Target className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Your Weak-Point Profile</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                The AI automatically updates this list whenever you struggle with questions.
              </p>

              <div className="space-y-1.5 pt-2">
                {weakTopics.map((topic, idx) => (
                  <div
                    key={idx}
                    className="lift-card-subtle p-2 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 flex items-center justify-between text-xs text-amber-950 dark:text-amber-200"
                  >
                    <span className="font-semibold truncate max-w-[140px]">{topic}</span>
                    <button
                      onClick={() => handleSendMessage(`I need extra help understanding ${topic}. Can you test me with a problem?`)}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Quiz Me
                    </button>
                  </div>
                ))}

                {weakTopics.length === 0 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                    No weak points flagged yet.
                  </p>
                )}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-[11px] text-indigo-900 dark:text-indigo-300 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Study Tip</span>
              </span>
              <p className="text-indigo-700 dark:text-indigo-300">
                Switch to the <b>Adaptive Summarizer</b> to generate summaries specifically tailored to explain these exact concepts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: ADAPTIVE SUMMARIZER */}
      {activeSubTab === 'summarizer' && (
        <div className="space-y-6">
          {/* Input & Target Weak Points Box */}
          <div className="lift-box bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-xs space-y-5 transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Adaptive Material Input</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Paste textbook sections, peer notes, or lecture transcripts to generate a targeted breakdown.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {(summaryInputText || summaryResult) && (
                  <button
                    type="button"
                    onClick={handleResetSummarizer}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    title="Clear input and generated summary"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear Form</span>
                  </button>
                )}
                <button
                  onClick={handleRunSummarizer}
                  disabled={!summaryInputText.trim() || isSummarizing}
                  id="run-adaptive-summary-btn"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm disabled:opacity-40"
                >
                  {isSummarizing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing & Adapting...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate Adaptive Summary</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Metadata inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Document / Chapter Title
                </label>
                <input
                  type="text"
                  value={summaryTitle}
                  onChange={(e) => setSummaryTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Subject Category
                </label>
                <select
                  value={summarySubject}
                  onChange={(e) => setSummarySubject(e.target.value as Subject)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                >
                  {['Mathematics', 'Physics', 'Biology', 'Chemistry', 'Computer Science', 'History', 'Literature', 'Psychology', 'Language', 'General Study'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target Weak Topics Selectors */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Target Weak Points (The summary will specifically dive deep into these):
              </label>
              <div className="flex flex-wrap gap-2">
                {weakTopics.map((t) => {
                  const isChecked = selectedWeakTopicsForSummary.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleWeakTopicInSummary(t)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                        isChecked
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${isChecked ? 'text-amber-700 dark:text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                      <span>{t}</span>
                    </button>
                  );
                })}

                {weakTopics.length === 0 && (
                  <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                    No weak topics in your profile. You can add them in Profile or via Chat!
                  </span>
                )}
              </div>
            </div>

            {/* Content Textarea */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Study Material Text *
              </label>
              <textarea
                rows={7}
                placeholder="Paste lecture text, notes, or chapter excerpt here..."
                value={summaryInputText}
                onChange={(e) => setSummaryInputText(e.target.value)}
                className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans resize-none text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Result Section */}
          {summaryResult && (
            <div className="lift-box bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-xs space-y-6 animate-in fade-in transition-colors">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Adaptive Summary Generated</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Targeted toward your identified conceptual gaps</p>
                  </div>
                </div>

                {summaryResult.highlightedWeaknesses.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 dark:text-slate-500">Emphasized:</span>
                    {summaryResult.highlightedWeaknesses.map((w, idx) => (
                      <span key={idx} className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60">
                        {w}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Intuitive Analogy Box */}
              {summaryResult.analogies && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-950 dark:text-amber-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900 dark:text-amber-300">
                    <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Intuitive Analogy for Weak Points:</span>
                  </div>
                  <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-200 font-medium">
                    {summaryResult.analogies}
                  </p>
                </div>
              )}

              {/* Summary Text Body */}
              <div className="prose prose-slate dark:prose-invert max-w-none text-xs md:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                <ReactMarkdown>{summaryResult.summary}</ReactMarkdown>
              </div>

              {/* Practice Questions Section */}
              {summaryResult.practiceQuestions && summaryResult.practiceQuestions.length > 0 && (
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      Targeted Practice Questions ({summaryResult.practiceQuestions.length})
                    </h4>
                  </div>

                  <div className="space-y-4">
                    {summaryResult.practiceQuestions.map((pq, qIdx) => {
                      const userChoice = userSelectedAnswers[qIdx];
                      const isChecked = checkedQuestions[qIdx];
                      const isCorrect = userChoice === pq.answer;

                      return (
                        <div key={qIdx} className="lift-card-subtle p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                          <p className="text-xs md:text-sm font-bold text-slate-900 dark:text-white">
                            {qIdx + 1}. {pq.question}
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {pq.options.map((opt, oIdx) => {
                              let btnStyle = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 text-slate-800 dark:text-slate-200';
                              if (userChoice === opt) {
                                btnStyle = 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-500 text-indigo-900 dark:text-indigo-200 font-bold';
                              }
                              if (isChecked) {
                                if (opt === pq.answer) {
                                  btnStyle = 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold';
                                } else if (userChoice === opt && !isCorrect) {
                                  btnStyle = 'bg-rose-100 dark:bg-rose-950/80 border-rose-400 text-rose-900 dark:text-rose-200 line-through';
                                }
                              }

                              return (
                                <button
                                  key={oIdx}
                                  onClick={() => handleSelectOption(qIdx, opt)}
                                  disabled={isChecked}
                                  className={`p-2.5 rounded-xl border text-xs text-left transition ${btnStyle}`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            {!isChecked ? (
                              <button
                                onClick={() => handleCheckAnswer(qIdx, pq.answer)}
                                disabled={!userChoice}
                                className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-40"
                              >
                                Check Answer
                              </button>
                            ) : (
                              <div className={`text-xs font-semibold ${isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                                {isCorrect ? '✨ Correct! Great job!' : `Incorrect. The right answer is: ${pq.answer}`}
                              </div>
                            )}
                          </div>

                          {isChecked && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 leading-relaxed">
                              <b>Explanation:</b> {pq.explanation}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
