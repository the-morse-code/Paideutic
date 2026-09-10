import { AdaptiveSummaryResult, WebSearchSource } from '../types';
import { resolveAcademicQuery, resolveAcademicQueryWithWebSearch } from './academicKnowledge';

export interface ChatResponse {
  answer: string;
  detectedWeakness?: string | null;
  encouragement?: string;
  suggestedFollowUps?: string[];
  searchedWeb?: boolean;
  sources?: WebSearchSource[];
}

function getClientGeminiApiKey(): string {
  const metaEnv = (import.meta as any)?.env || {};
  return (
    metaEnv.VITE_GEMINI_API_KEY ||
    metaEnv.GEMINI_API_KEY ||
    metaEnv.VITE_GOOGLE_API_KEY ||
    metaEnv.GOOGLE_API_KEY ||
    ""
  );
}

function cleanAndParseJson(text: string): any {
  let cleaned = (text || "").trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  return JSON.parse(cleaned);
}

// Direct client-side Gemini fallback for static hostings (Vercel, Netlify, GitHub Pages, Firebase)
async function tryDirectClientGeminiChat(
  message: string,
  currentWeakTopics: string[] = []
): Promise<ChatResponse | null> {
  const apiKey = getClientGeminiApiKey();
  if (!apiKey) return null;

  const systemInstruction = `You are Paideutic AI, an expert academic study tutor and adaptive learning coach.
STRICT RESPONSE RULES:
1. DIRECT & CONCISE: Answer factual, conceptual, or scientific questions directly in clear markdown.
2. LATEX: Use LaTeX only for mathematical equations or complex chemical equilibrium formulas.
3. OFF-TOPIC: If the query is completely non-academic/harmful, answer: "I am your Academic AI Tutor. I can only assist with educational subjects, concepts, and study materials."
4. WEAKNESS: Set 'detectedWeakness' to a concise 2-3 word topic (e.g. 'Cell Organelles') only if student expresses struggle, otherwise null.`;

  const prompt = `Student Weak Topics: ${currentWeakTopics.join(', ') || 'None'}
Student Question: "${message}"

Output JSON strictly:
{
  "answer": "Clear markdown answer with explanations, bullet points, and key definitions",
  "detectedWeakness": "string or null",
  "encouragement": "Brief motivational tip",
  "suggestedFollowUps": ["Question 1", "Question 2"]
}`;

  const models = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: {
            temperature: 0.6,
            responseMimeType: "application/json",
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = cleanAndParseJson(text);
          if (parsed && parsed.answer) return parsed;
        }
      }
    } catch (e) {
      // Continue to next model
    }
  }
  return null;
}

/**
 * Send a message to the Gemini AI Tutor via server-side API or direct client fallback
 */
export async function sendChatMessage(
  message: string,
  history: Array<{ role: 'user' | 'model'; text: string }> = [],
  currentWeakTopics: string[] = []
): Promise<ChatResponse> {
  // 1. First try server-side Express API endpoint
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, currentWeakTopics }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.answer) {
        return data;
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      if (errData && errData.answer) {
        return errData;
      }
    }
  } catch (err) {
    console.warn('Server chat route not reached (running in static or decoupled mode):', err);
  }

  // 2. Try direct client Gemini API if VITE_GEMINI_API_KEY is configured
  try {
    const directResult = await tryDirectClientGeminiChat(message, currentWeakTopics);
    if (directResult) return directResult;
  } catch (e) {
    console.warn('Direct client Gemini call failed:', e);
  }

  // 3. Fallback to comprehensive Academic Knowledge Engine + Live Web Search
  return await resolveAcademicQueryWithWebSearch(message, currentWeakTopics);
}

/**
 * Summarize academic material adaptively via server-side API
 */
export async function summarizeMaterial(
  content: string,
  weakTopics: string[] = [],
  title: string = 'Study Material',
  subject: string = 'General Study'
): Promise<AdaptiveSummaryResult> {
  try {
    const res = await fetch('/api/ai/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, weakTopics, title, subject }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.summary) {
        return data;
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      if (errData && errData.summary) {
        return errData;
      }
    }
  } catch (err) {
    console.warn('Server summarize route communication issue:', err);
  }

  // Substantive text-driven parser: extracts real sentences and builds authentic quiz questions
  const cleanContent = content.trim();
  const sentenceRegex = /[^.!?\n]+[.!?]+/g;
  const rawSentences = cleanContent.match(sentenceRegex) || [cleanContent];
  const sentences = rawSentences.map((s) => s.trim()).filter((s) => s.length > 15);

  const matchingWeak = (weakTopics || []).filter(
    (wt) => wt && cleanContent.toLowerCase().includes(wt.toLowerCase())
  );

  const keyPoints = sentences.slice(0, Math.min(6, sentences.length)).map((s) => `- ${s}`).join('\n');
  const secondaryPoints = sentences.length > 6 ? sentences.slice(6, Math.min(12, sentences.length)).map((s) => `- ${s}`).join('\n') : '';

  let summaryMarkdown = `### Core Academic Synthesis: ${title} (${subject})

#### 1. Executive Summary
${sentences.slice(0, 2).join(' ') || cleanContent.slice(0, 300)}

#### 2. Key Concepts & Factual Breakdown
${keyPoints || `- ${cleanContent.slice(0, 200)}`}
${secondaryPoints ? `\n#### 3. Additional Details & Mechanism Dynamics\n${secondaryPoints}` : ''}`;

  if (matchingWeak.length > 0) {
    summaryMarkdown += `\n\n#### 🎯 Targeted Clarification for Your Weak Point: ${matchingWeak.join(', ')}
> **Exam Focus**: The material directly explores **${matchingWeak.join(' & ')}**. Focus on how the definitions in this document relate to the governing system rules.`;
  }

  // Generate authentic practice questions derived directly from the user's text
  const practiceQuestions = [];

  if (sentences.length >= 1) {
    const s1 = sentences[0].replace(/[.!?]+$/, '').trim();
    practiceQuestions.push({
      question: `According to the provided material on "${title}", which statement is explicitly supported by the text?`,
      options: [
        s1,
        `The process occurs in reverse under standard atmospheric conditions.`,
        `All related variables remain entirely constant and non-reactive.`,
        `This concept only applies to hypothetical mathematical models without real-world application.`
      ],
      answer: s1,
      explanation: `Directly supported by the source text: "${sentences[0]}".`
    });
  }

  if (sentences.length >= 3) {
    const s2 = sentences[Math.min(2, sentences.length - 1)].replace(/[.!?]+$/, '').trim();
    practiceQuestions.push({
      question: `Which key insight regarding ${subject} is confirmed in this study text?`,
      options: [
        s2,
        `External feedback loops completely negate the primary interaction described.`,
        `The described phenomenon only functions within purely theoretical models.`,
        `No observable difference is detected when modifying system parameters.`
      ],
      answer: s2,
      explanation: `Explicitly confirmed in the document: "${sentences[Math.min(2, sentences.length - 1)]}".`
    });
  } else {
    practiceQuestions.push({
      question: `What is the primary academic focus of "${title}"?`,
      options: [
        `Mastering the foundational principles and relationships described in ${subject}`,
        `Disproving established ${subject} laws without evidence`,
        `Cataloging random historical dates`,
        `Assuming system variables have zero relationship`
      ],
      answer: `Mastering the foundational principles and relationships described in ${subject}`,
      explanation: `The material is dedicated to exploring and mastering the key ideas presented in ${title}.`
    });
  }

  return {
    summary: summaryMarkdown,
    highlightedWeaknesses: matchingWeak,
    analogies: 'This concept functions like an interconnected balance scale: whenever an input or boundary condition changes, the corresponding variables naturally adjust to re-establish dynamic equilibrium.',
    practiceQuestions
  };
}

/**
 * Extract flashcards from notes via server-side API
 */
export async function extractFlashcards(
  content: string,
  subject: string = 'General Study'
): Promise<Array<{ id: string; front: string; back: string }>> {
  try {
    const res = await fetch('/api/ai/extract-flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, subject }),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.flashcards) && data.flashcards.length > 0) {
        return data.flashcards;
      }
    }
  } catch (err) {
    console.warn('Server flashcard route communication issue, using fallback cards:', err);
  }

  // Extract from sentences
  const sentenceRegex = /[^.!?\n]+[.!?]+/g;
  const rawSentences = content.match(sentenceRegex) || [content];
  const sentences = rawSentences.map((s) => s.trim()).filter((s) => s.length > 15);

  return [
    {
      id: `fc_1_${Date.now()}`,
      front: `What is the core principle taught in this ${subject} material?`,
      back: sentences[0] || (content.length > 120 ? content.slice(0, 120) + '...' : content),
    },
    {
      id: `fc_2_${Date.now()}`,
      front: `What additional mechanism or detail is established in this note?`,
      back: sentences[1] || 'Verify initial conditions, dimensional consistency, and non-violation of governing laws.',
    },
  ];
}
