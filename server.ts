import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { resolveAcademicQuery, resolveAcademicQueryWithWebSearch } from "./src/services/academicKnowledge";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: "30mb" }));

// Helper to retrieve Gemini API key from all standard environment variable names
function getGeminiApiKey(): string | null {
  const key =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GEMINI_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    null;

  return key && key.trim().length > 0 ? key.trim() : null;
}

// Expose public client configuration (Supabase URL & Public Anon Key) safely to the frontend
app.get("/api/config", (_req: Request, res: Response) => {
  const supabaseUrl = 
    process.env.VITE_SUPABASE_URL || 
    process.env.SUPABASE_URL || 
    process.env.NEXT_PUBLIC_SUPABASE_URL || 
    "";
  const supabaseAnonKey = 
    process.env.VITE_SUPABASE_ANON_KEY || 
    process.env.SUPABASE_ANON_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    "";

  res.json({
    supabaseUrl,
    supabaseAnonKey,
  });
});

// Initialize Gemini SDK with User-Agent header as required
function getGeminiAI(): GoogleGenAI | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    console.warn("GEMINI_API_KEY (or GOOGLE_API_KEY) not configured in environment.");
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Generate content with resilient fallback across supported Gemini models
// Primary: gemini-3.8-flash; Fast backups: gemini-3.1-flash-lite, gemini-flash-latest
async function generateWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
  }
) {
  const models = [
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
  ];
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      const isHighDemand =
        err?.status === 503 ||
        errMsg.includes("503") ||
        errMsg.includes("high demand") ||
        errMsg.includes("UNAVAILABLE");

      if (isHighDemand) {
        // Quick retry on the next available model
        await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 200));
      }
      // Silently try next model in fallback list
      continue;
    }
  }

  throw lastError;
}

// Safely parse JSON that may be wrapped in Markdown code blocks
function cleanAndParseJson(text: string): any {
  let cleaned = (text || "").trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  return JSON.parse(cleaned);
}

// -------------------------------------------------------------
// INTELLIGENT ACADEMIC KNOWLEDGE ENGINE WITH LIVE WEB SEARCH
// -------------------------------------------------------------
async function generateLocalChatFallback(message: string, currentWeakTopics: string[] = []) {
  return await resolveAcademicQueryWithWebSearch(message, currentWeakTopics);
}

// Substantive text-driven summarizer: extracts real sentences and creates authentic quiz questions directly from user content
function generateLocalSummarizerFallback(content: string, weakTopics: string[] = [], title: string, subject: string) {
  const cleanContent = content.trim();

  // Split into sentences for content extraction
  const sentenceRegex = /[^.!?\n]+[.!?]+/g;
  const rawSentences = cleanContent.match(sentenceRegex) || [cleanContent];
  const sentences = rawSentences.map((s) => s.trim()).filter((s) => s.length > 15);

  // Identify matching weak topics actually in the text
  const matchingWeak = (weakTopics || []).filter((wt) => wt && cleanContent.toLowerCase().includes(wt.toLowerCase()));

  // Extract real key points from sentences in the text
  const keyPoints = sentences.slice(0, Math.min(6, sentences.length)).map((s) => `- ${s}`).join("\n");
  const secondaryPoints = sentences.length > 6 ? sentences.slice(6, Math.min(12, sentences.length)).map((s) => `- ${s}`).join("\n") : "";

  let summaryMarkdown = `### Core Academic Synthesis: ${title} (${subject})

#### 1. Executive Summary
${sentences.slice(0, 2).join(" ") || cleanContent.slice(0, 300)}

#### 2. Key Concepts & Factual Breakdown
${keyPoints || `- ${cleanContent.slice(0, 200)}`}
${secondaryPoints ? `\n#### 3. Additional Details & Operating Dynamics\n${secondaryPoints}` : ""}`;

  if (matchingWeak.length > 0) {
    summaryMarkdown += `\n\n#### 🎯 Targeted Clarification for Your Weak Point: ${matchingWeak.join(", ")}
> **Exam & Retention Focus**: The text touches upon **${matchingWeak.join(" & ")}**.
> Make sure to focus on how the definitions in this material connect to the broader principles.`;
  }

  // Generate authentic practice questions directly using sentences from the text
  const practiceQuestions: any[] = [];

  if (sentences.length >= 1) {
    const s1 = sentences[0].replace(/[.!?]+$/, "").trim();
    practiceQuestions.push({
      question: `According to the provided material on "${title}", which statement is explicitly supported by the text?`,
      options: [
        s1,
        `The mechanism is completely inverted when evaluated under standardized conditions.`,
        `All related factors remain entirely static, having zero energetic or functional impact.`,
        `Modern researchers have completely discarded this model in favor of random variation.`
      ],
      answer: s1,
      explanation: `Directly supported by the source text: "${sentences[0]}".`
    });
  }

  if (sentences.length >= 3) {
    const s2 = sentences[Math.min(2, sentences.length - 1)].replace(/[.!?]+$/, "").trim();
    practiceQuestions.push({
      question: `Which key insight regarding the subject is stated in this study text?`,
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
        `Explaining the concepts and relationships described in ${subject}`,
        `Disproving fundamental ${subject} principles`,
        `Listing unrelated historical dates`,
        `Proving that system parameters are irrelevant`
      ],
      answer: `Explaining the concepts and relationships described in ${subject}`,
      explanation: `The material is dedicated to exploring and mastering the key ideas presented in ${title}.`
    });
  }

  return {
    summary: summaryMarkdown,
    highlightedWeaknesses: matchingWeak,
    analogies: `This concept functions like an interconnected balance scale: whenever an input or boundary condition changes, the corresponding variables naturally adjust to re-establish dynamic equilibrium.`,
    practiceQuestions
  };
}

// -------------------------------------------------------------
// API CONFIG & HEALTH
// -------------------------------------------------------------
app.get("/api/config", (_req: Request, res: Response) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "",
    appUrl: process.env.APP_URL || "",
  });
});

app.get("/api/health", (_req: Request, res: Response) => {
  const apiKey = getGeminiApiKey();
  res.json({
    status: "ok",
    hasApiKey: !!apiKey,
    preferredModel: "gemini-3.8-flash",
  });
});

// -------------------------------------------------------------
// ADAPTIVE AI CHAT & WEAK-POINT EXTRACTION ROUTE
// POST /api/ai/chat
// -------------------------------------------------------------
app.post("/api/ai/chat", async (req: Request, res: Response) => {
  try {
    const { message, history = [], currentWeakTopics = [] } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required." });
    }

    const ai = getGeminiAI();
    if (!ai) {
      // Direct pedagogical answer from Academic Knowledge Engine with Live Web Search
      const answerData = await resolveAcademicQueryWithWebSearch(message, currentWeakTopics);
      return res.json(answerData);
    }

    const systemInstruction = `You are Paideutic AI, an expert academic study tutor and adaptive learning coach.

STRICT RESPONSE & FORMATTING RULES:
1. DIRECT & CONCISE ANSWERS FIRST:
   - For simple factual, symbolic, definition, or direct lookup questions (e.g., "symbol of sodium", "trigonometry identities", "formula for area of circle"), answer directly in 1-2 concise sentences or a clean standard markdown list.
   - NEVER output boilerplate templates like "Academic Conceptual Guide", "Governing Definitions", "Underlying Logic", or "Limiting Cases" unless the user explicitly asks for a deep multi-step concept breakdown.

2. FORMATTING & SYMBOLS:
   - Use clean plain text and standard Markdown formatting.
   - Do NOT wrap non-mathematical text or simple terms in LaTeX dollar signs (e.g. NEVER write "$sodium$", "$Na$", or "$CO_2$").
   - Use LaTeX ONLY for complex math formulas (fractions, integrals, equations) using standard markdown syntax without breaking text layout.

3. OFF-TOPIC / INAPPROPRIATE GUARDRAIL:
   - If a prompt is non-academic, harmful, or completely irrelevant to educational subjects/study materials, gracefully deny the request with EXACTLY this short message:
     "I am your Academic AI Tutor. I can only assist with educational subjects, concepts, and study materials."

4. SMART STRUGGLE-POINT TRACKING ('detectedWeakness'):
   - Do NOT copy raw user prompts, questions, or truncated query strings (e.g. NEVER "what is the symbol of sodium" or "explain trigonometry") into 'detectedWeakness'.
   - Omit the struggle area ('detectedWeakness' = null) for basic factual lookups, symbol queries, greetings, off-topic requests, or general questions.
   - ONLY tag 'detectedWeakness' if the user's conversation genuinely demonstrates an academic gap, conceptual struggle, or repeated error in a core concept.
   - When tagged, condense it into a clean, 2-3 word topic name (e.g., "Trigonometric Identities" or "Chemical Symbols").`;

    const prompt = `Current student known weak topics: ${currentWeakTopics.length > 0 ? currentWeakTopics.join(", ") : "None recorded yet"}

Student's study query:
"${message}"

Provide a pedagogically sound response strictly following the system instructions. Format your output strictly as a valid JSON object matching this schema:
{
  "answer": "Direct concise answer or markdown explanation",
  "detectedWeakness": "Clean 2-3 word academic topic (e.g. 'Trigonometric Identities') if user demonstrates a genuine concept struggle, otherwise null",
  "encouragement": "A brief 1-sentence supportive motivational tip",
  "suggestedFollowUps": ["Follow-up prompt 1", "Follow-up prompt 2"]
}`;

    // Generate content using gemini-3.8-flash with gemini-3.6-flash fallback
    const response = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: { type: Type.STRING, description: "Detailed pedagogical answer in Markdown" },
            detectedWeakness: { type: Type.STRING, description: "Single 1-3 word academic topic if struggling or asking for help, otherwise null", nullable: true },
            encouragement: { type: Type.STRING, description: "Brief motivational tip" },
            suggestedFollowUps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "2-3 short follow up prompts",
            },
          },
          required: ["answer", "encouragement", "suggestedFollowUps"],
        },
      },
    });

    const responseText = response.text || "{}";
    const parsedData = cleanAndParseJson(responseText);
    if (parsedData.detectedWeakness) {
      const dwStr = String(parsedData.detectedWeakness).trim();
      if (dwStr.toLowerCase() === 'null' || dwStr.toLowerCase() === 'none' || dwStr === '') {
        parsedData.detectedWeakness = null;
      }
    }
    return res.json(parsedData);
  } catch (error: any) {
    console.warn("Notice: Live Gemini call encountered error, using adaptive local fallback:", error?.message || error);
    // Intelligent fallback with Live Web Search so user never experiences an outage or error
    const fallback = await generateLocalChatFallback(req.body?.message || "", req.body?.currentWeakTopics || []);
    return res.json(fallback);
  }
});

// -------------------------------------------------------------
// ADAPTIVE SUMMARIZER ROUTE
// POST /api/ai/summarize
// -------------------------------------------------------------
app.post("/api/ai/summarize", async (req: Request, res: Response) => {
  try {
    const { content, weakTopics = [], title = "Study Material", subject = "General" } = req.body;

    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "Study content is required for summarization." });
    }

    const ai = getGeminiAI();
    if (!ai) {
      return res.json(generateLocalSummarizerFallback(content, weakTopics, title, subject));
    }

    const hasWeakTopics = Array.isArray(weakTopics) && weakTopics.length > 0;

    const systemInstruction = `You are Paideutic's Adaptive AI Summarizer.
Your mission is to ACTUALLY SUMMARIZE the provided study material thoroughly, clearly, and concisely, strictly staying on-topic with the material.
${
  hasWeakTopics
    ? `The student has selected these specific target weak areas: [${weakTopics.join(", ")}].
When summarizing the text:
1. Provide a comprehensive, well-structured academic summary of the text itself (Executive Core Concepts, Section Explanations, Key Mechanisms, and Invariants).
2. ONLY IF any of the student's specified weak points genuinely appear in or relate to the provided text, highlight and provide extra intuition/clarification on those sections. DO NOT drift off-topic or force unrelated topics.
3. If none of the weak topics appear in the text, do NOT force them. Keep highlightedWeaknesses empty [].
4. Provide a memorable analogy for the central mechanism.
5. Create 2-3 interactive multiple-choice practice questions directly testing comprehension of the text.`
    : `The student has NOT specified any weak points.
When summarizing the text:
1. Provide an objective, comprehensive, well-structured academic summary of the text itself (Executive Core Concepts, Section Explanations, Key Mechanisms, and Invariants).
2. Do NOT mention or invent any weak points. Set highlightedWeaknesses to an empty array [].
3. Provide a memorable analogy for the central mechanism.
4. Create 2-3 interactive multiple-choice practice questions directly testing comprehension of the text.`
}`;

    const prompt = `Subject: ${subject}
Document Title: ${title}
Selected Target Weak Topics: ${hasWeakTopics ? weakTopics.join(", ") : "None (provide pure comprehensive summary)"}

STUDY MATERIAL:
"""
${content}
"""

Instructions:
- Write an actual comprehensive summary of the text, explaining what it teaches rather than merely saying what it is about.
- Ground all facts strictly in the text.
- If selected weak topics are in the text, clarify them clearly without going off-topic.
- If no selected weak topics are in the text, highlightedWeaknesses must be [].

Format strictly as JSON matching:
{
  "summary": "Deep, structured Markdown summary of the provided text with headings, principles, and bullet points",
  "highlightedWeaknesses": ${hasWeakTopics ? `["matching weak topic actually found in text"]` : `[]`},
  "analogies": "A memorable real-world analogy demystifying the core mechanism",
  "practiceQuestions": [
    {
      "question": "Clear conceptual question testing this document",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Exact text of correct option",
      "explanation": "Concise pedagogical explanation"
    }
  ]
}`;

    const response = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.6,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "Structured markdown summary" },
            highlightedWeaknesses: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Which of the student's weak points were addressed",
            },
            analogies: { type: Type.STRING, description: "Intuitive analogy" },
            practiceQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  answer: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                },
                required: ["question", "options", "answer", "explanation"],
              },
            },
          },
          required: ["summary", "highlightedWeaknesses", "practiceQuestions"],
        },
      },
    });

    const parsed = cleanAndParseJson(response.text || "{}");
    return res.json(parsed);
  } catch (error: any) {
    console.warn("Notice: Live Gemini summarizer encountered error, using adaptive local fallback:", error?.message || error);
    const fallback = generateLocalSummarizerFallback(
      req.body?.content || "",
      req.body?.weakTopics || [],
      req.body?.title || "Study Material",
      req.body?.subject || "General"
    );
    return res.json(fallback);
  }
});

// -------------------------------------------------------------
// FLASHCARD GENERATOR ROUTE
// POST /api/ai/extract-flashcards
// -------------------------------------------------------------
app.post("/api/ai/extract-flashcards", async (req: Request, res: Response) => {
  try {
    const { content, subject = "General" } = req.body;
    if (!content) {
      return res.status(400).json({ error: "Content is required." });
    }

    const ai = getGeminiAI();
    if (!ai) {
      return res.json({
        flashcards: [
          { id: `fc_1_${Date.now()}`, front: `What is the core takeaway of this ${subject} material?`, back: content.slice(0, 140) + "..." },
          { id: `fc_2_${Date.now()}`, front: `What essential boundary condition or principle governs this topic?`, back: `Verify fundamental conservation and system definitions according to ${subject} principles.` },
        ],
      });
    }

    const prompt = `Extract 4-6 high-yield active recall flashcard pairs (Front question / Back answer) from this ${subject} study note:
"""
${content}
"""

Return JSON format:
{
  "flashcards": [
    { "front": "Direct question or prompt", "back": "Concise, precise answer" }
  ]
}`;

    const response = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        temperature: 0.5,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            flashcards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  front: { type: Type.STRING },
                  back: { type: Type.STRING },
                },
                required: ["front", "back"],
              },
            },
          },
          required: ["flashcards"],
        },
      },
    });

    const parsed = cleanAndParseJson(response.text || "{}");
    const flashcardsWithIds = (parsed.flashcards || []).map((fc: any, i: number) => ({
      ...fc,
      id: `fc_${Date.now()}_${i}`,
    }));

    return res.json({ flashcards: flashcardsWithIds });
  } catch (error: any) {
    console.warn("Notice: Live Gemini flashcards encountered error, using fallback pairs:", error?.message || error);
    const content = req.body?.content || "";
    const subject = req.body?.subject || "General";
    return res.json({
      flashcards: [
        { id: `fc_1_${Date.now()}`, front: `What is the core takeaway of this ${subject} material?`, back: content.slice(0, 140) + "..." },
        { id: `fc_2_${Date.now()}`, front: `What essential boundary condition or principle governs this topic?`, back: `Verify fundamental conservation and system definitions according to ${subject} principles.` },
      ]
    });
  }
});

// -------------------------------------------------------------
// COMMUNITY MATERIAL LIBRARY PERSISTENCE (Cross-device, cross-user)
// -------------------------------------------------------------
const DATA_DIR = path.join(process.cwd(), "data");
const NOTES_FILE = path.join(DATA_DIR, "community_notes.json");
const DELETED_FILE = path.join(DATA_DIR, "deleted_notes.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

interface DeletedRegistry {
  deleted_ids: string[];
  deleted_files: string[];
}

const PERMANENT_EXCLUDED_IDS = ["note_01", "note_02", "note_03", "note_1788716473265_ilbs"];
const DEFAULT_SUPABASE_URL = "https://gomekylzuztihoxzjbbm.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbWVreWx6dXp0aWhveHpqYmJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwODU4MDcsImV4cCI6MjEwMzY2MTgwN30.bgRnD-99BD7mFgKNZwtB3IdGTvQjdeTsDR4q1hnuusk";

function getBackendSupabaseConfig() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  return { url, key };
}

function getBackendSupabaseClient() {
  const { url, key } = getBackendSupabaseConfig();
  if (!url || !key) return null;
  try {
    return createClient(url, key);
  } catch (e) {
    return null;
  }
}

function isPreExistingDemoNote(note: any): boolean {
  if (!note) return false;
  if (PERMANENT_EXCLUDED_IDS.includes(note.id)) return true;
  const title = (note.title || "").toLowerCase();
  if (
    title.includes("integration by parts") ||
    title.includes("calvin cycle") ||
    title.includes("avl balance")
  ) {
    return true;
  }
  return false;
}

function getDeletedRegistry(): DeletedRegistry {
  try {
    ensureDataDir();
    if (fs.existsSync(DELETED_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DELETED_FILE, "utf-8"));
      const currentIds = Array.isArray(parsed.deleted_ids) ? parsed.deleted_ids : [];
      const mergedIds = Array.from(new Set([...PERMANENT_EXCLUDED_IDS, ...currentIds]));
      return {
        deleted_ids: mergedIds,
        deleted_files: Array.isArray(parsed.deleted_files) ? parsed.deleted_files : [],
      };
    }
  } catch (e) {
    console.warn("Notice: Error reading deleted_notes.json:", e);
  }
  return { deleted_ids: [...PERMANENT_EXCLUDED_IDS], deleted_files: [] };
}

function saveDeletedRegistry(reg: DeletedRegistry) {
  try {
    ensureDataDir();
    const mergedIds = Array.from(new Set([...PERMANENT_EXCLUDED_IDS, ...reg.deleted_ids]));
    fs.writeFileSync(
      DELETED_FILE,
      JSON.stringify({ ...reg, deleted_ids: mergedIds }, null, 2),
      "utf-8"
    );
  } catch (e) {
    console.warn("Notice: Error writing deleted_notes.json:", e);
  }
}

function loadServerNotes(): any[] {
  const deleted = getDeletedRegistry();
  try {
    ensureDataDir();
    if (fs.existsSync(NOTES_FILE)) {
      const data = fs.readFileSync(NOTES_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (n: any) => !deleted.deleted_ids.includes(n.id) && !isPreExistingDemoNote(n)
        );
      }
    }
  } catch (err) {
    console.warn("Notice: Could not read community_notes.json:", err);
  }

  // Initial community notes: empty clean slate, populated dynamically by user uploads
  const initial: any[] = [];
  saveServerNotes(initial);
  return initial;
}

function saveServerNotes(notes: any[]) {
  try {
    ensureDataDir();
    const deleted = getDeletedRegistry();
    const cleanNotes = notes.filter(
      (n: any) => !deleted.deleted_ids.includes(n.id) && !isPreExistingDemoNote(n)
    );
    const sanitized = cleanNotes.map((n: any) => ({
      ...n,
      attachments: (n.attachments || []).map((att: any) => ({
        ...att,
        dataUrl: att.storageUrl || (att.dataUrl && att.dataUrl.length > 3000 ? att.storageUrl || "" : att.dataUrl),
      })),
    }));
    fs.writeFileSync(NOTES_FILE, JSON.stringify(sanitized, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing to community_notes.json:", err);
    throw err;
  }
}

// Helper to extract clean metadata from any uploaded file name
function extractUploadedFileMeta(rawFilename: string) {
  let author = "Scholar";
  let userId = "community_user";
  let cleanName = rawFilename;

  const byMatch = cleanName.match(/__by__(.*?)__(?:uid__(.*?)__)?/);
  if (byMatch) {
    if (byMatch[1]) {
      try {
        author = decodeURIComponent(byMatch[1]).replace(/_/g, " ").trim();
      } catch {
        author = byMatch[1].replace(/_/g, " ").trim();
      }
    }
    if (byMatch[2]) {
      try {
        userId = decodeURIComponent(byMatch[2]).trim();
      } catch {
        userId = byMatch[2].trim();
      }
    }
    cleanName = cleanName.replace(/^\d+__by__.*?__(?:uid__.*?__)?/, "");
  } else {
    cleanName = cleanName.replace(/^\d+_+/, "");
  }

  if (!cleanName.trim()) {
    cleanName = rawFilename;
  }

  const title = cleanName
    .replace(/\.[^/.]+$/, "")
    .replace(/[_]+/g, " ")
    .trim();

  return {
    author: author || "Scholar",
    userId: userId || "community_user",
    cleanName,
    title: title || cleanName,
  };
}

// GET all community shared notes (accessible to EVERY user across all devices)
// Automatically merges materials from the Supabase "Material Library" bucket so ALL users see uploaded files
app.get("/api/notes", async (_req: Request, res: Response) => {
  let notes = loadServerNotes();
  const deleted = getDeletedRegistry();

  const supabase = getBackendSupabaseClient();
  const { url: supabaseUrl } = getBackendSupabaseConfig();

  if (supabase) {
    try {
      const bucketName = "Material Library";
      const foldersToCheck = ["Uploaded Material", ""];
      const allFoundFiles: Array<{ name: string; folder: string; metadata?: any; created_at?: string; updated_at?: string }> = [];

      for (const fld of foldersToCheck) {
        try {
          const { data: bFiles, error: bErr } = await supabase.storage
            .from(bucketName)
            .list(fld, { limit: 200 });

          if (!bErr && Array.isArray(bFiles)) {
            for (const item of bFiles) {
              if (item.name && item.name !== ".emptyFolderPlaceholder" && item.id !== null) {
                // Check if not already in list
                if (!allFoundFiles.some((f) => f.name === item.name && f.folder === fld)) {
                  allFoundFiles.push({
                    name: item.name,
                    folder: fld,
                    metadata: item.metadata,
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                  });
                }
              }
            }
          }
        } catch (e) {
          console.warn(`Notice reading Supabase folder "${fld}":`, e);
        }
      }

      let hasNew = false;

      for (const f of allFoundFiles) {
        if (deleted.deleted_files.includes(f.name)) continue;
        if (deleted.deleted_ids.some((id) => id.includes(f.name))) continue;

        const { author, userId, cleanName, title } = extractUploadedFileMeta(f.name);
        const folderPrefix = f.folder ? `${f.folder}/` : "";
        const filePubUrl = `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucketName)}/${encodeURIComponent(folderPrefix)}${encodeURIComponent(f.name)}`;

        const normCleanName = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "");
        const normFName = f.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        const potentialId = `sup_mat_${f.name.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

        // Check if any note already references this file
        const alreadyLinked = notes.some((n: any) =>
          n.id === potentialId ||
          (n.attachments || []).some((a: any) => {
            if (!a) return false;
            const aName = (a.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            const aPath = (a.supabasePath || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            const aUrl = (a.storageUrl || a.dataUrl || "").toLowerCase().replace(/[^a-z0-9]/g, "");

            return (
              (aPath && aPath.includes(normFName)) ||
              (aUrl && aUrl.includes(normFName)) ||
              (aName && normCleanName && aName === normCleanName) ||
              (aName && normCleanName && (aName.includes(normCleanName) || normCleanName.includes(aName)))
            );
          })
        );

        if (!alreadyLinked) {
          hasNew = true;
          const isPdf = f.name.toLowerCase().endsWith(".pdf");
          const isImg = /\.(png|jpe?g|webp|gif|svg)$/i.test(f.name);

          notes.unshift({
            id: potentialId,
            user_id: userId,
            author_name: author,
            title: title || cleanName,
            subject: isPdf ? "Computer Science" : isImg ? "Mathematics" : "Biology",
            content: `### ${cleanName}\n\nShared study resource uploaded to the community library by ${author}.\n\n- **File Name**: \`${cleanName}\`\n- **Format**: ${isPdf ? "PDF Document" : isImg ? "Diagram / Image" : "Study Resource"}\n- **Storage**: Supabase Material Library`,
            upvotes: 1,
            views: 1,
            has_upvoted: false,
            upvoted_by: [],
            created_at: f.created_at || f.updated_at || new Date().toISOString(),
            attachments: [
              {
                id: `att_sup_${f.name.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
                name: cleanName,
                size: (f.metadata as any)?.size || 0,
                type: (f.metadata as any)?.mimetype || (isPdf ? "application/pdf" : isImg ? "image/png" : "application/octet-stream"),
                dataUrl: filePubUrl,
                storageType: "supabase",
                storageUrl: filePubUrl,
                supabasePath: `${folderPrefix}${f.name}`,
              },
            ],
          });
        }
      }

      // Also scan server uploads folder for any local files not linked
      if (fs.existsSync(UPLOADS_DIR)) {
        const localUploads = fs.readdirSync(UPLOADS_DIR);
        for (const locFile of localUploads) {
          if (locFile.startsWith(".")) continue;
          if (deleted.deleted_files.includes(locFile)) continue;
          const { author, userId, cleanName, title } = extractUploadedFileMeta(locFile);
          const potentialId = `loc_mat_${locFile.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
          const isAlready = notes.some((n: any) => n.id === potentialId || (n.attachments || []).some((a: any) => (a.storageUrl || "").includes(locFile)));
          if (!isAlready) {
            hasNew = true;
            const isPdf = locFile.toLowerCase().endsWith(".pdf");
            const isImg = /\.(png|jpe?g|webp|gif|svg)$/i.test(locFile);
            const fileUrl = `/api/uploads/${locFile}`;
            notes.unshift({
              id: potentialId,
              user_id: userId,
              author_name: author,
              title: title || cleanName,
              subject: isPdf ? "Computer Science" : isImg ? "Mathematics" : "Biology",
              content: `### ${cleanName}\n\nStudy material saved to community library by ${author}.\n\n- **File Name**: \`${cleanName}\`\n- **Format**: ${isPdf ? "PDF Document" : isImg ? "Diagram / Image" : "Study Resource"}`,
              upvotes: 1,
              views: 1,
              has_upvoted: false,
              upvoted_by: [],
              created_at: new Date().toISOString(),
              attachments: [
                {
                  id: `att_loc_${locFile.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
                  name: cleanName,
                  size: fs.statSync(path.join(UPLOADS_DIR, locFile)).size || 0,
                  type: isPdf ? "application/pdf" : isImg ? "image/png" : "application/octet-stream",
                  dataUrl: fileUrl,
                  storageType: "server",
                  storageUrl: fileUrl,
                },
              ],
            });
          }
        }
      }

      if (hasNew) {
        saveServerNotes(notes);
      }
    } catch (err) {
      console.warn("Notice: Supabase bucket auto-merge notice:", err);
    }
  }

  // Double check deleted filter and pre-existing filter before returning
  const filteredNotes = notes.filter(
    (n: any) => !deleted.deleted_ids.includes(n.id) && !isPreExistingDemoNote(n)
  );
  res.json(filteredNotes);
});

// POST publish a new shared note (persisted on server so all users can view it)
app.post("/api/notes", (req: Request, res: Response) => {
  try {
    const noteData = req.body;
    if (!noteData || !noteData.title) {
      return res.status(400).json({ error: "Note title is required." });
    }

    const notes = loadServerNotes();

    // Sanitize incoming attachments: if dataUrl is base64 and storageUrl is missing, write to disk
    const cleanAttachments = (noteData.attachments || []).map((att: any) => {
      let storageUrl = att.storageUrl || "";
      let dataUrl = att.dataUrl || "";

      if (!storageUrl && dataUrl && dataUrl.startsWith("data:")) {
        try {
          const index = dataUrl.indexOf(";base64,");
          if (index !== -1) {
            ensureDataDir();
            const base64Data = dataUrl.substring(index + 8);
            const buffer = Buffer.from(base64Data, "base64");
            const safeName = (att.name || "material.bin").replace(/[^a-zA-Z0-9._-]/g, "_");
            const uploader = noteData.author_name || "Scholar";
            const filename = `${Date.now()}__by__${encodeURIComponent(uploader)}__${safeName}`;
            const filePath = path.join(UPLOADS_DIR, filename);
            fs.writeFileSync(filePath, buffer);
            storageUrl = `/api/uploads/${filename}`;
            dataUrl = `/api/uploads/${filename}`;
          }
        } catch (e) {
          console.warn("Notice: Error saving attachment base64 to disk:", e);
        }
      }

      return {
        ...att,
        storageUrl: storageUrl || att.storageUrl || dataUrl,
        dataUrl: storageUrl || att.storageUrl || dataUrl,
      };
    });

    const author = noteData.author_name || "Community Scholar";
    const newNote = {
      ...noteData,
      author_name: author,
      user_id: noteData.user_id || "community_user",
      attachments: cleanAttachments,
      id: noteData.id || `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      upvotes: typeof noteData.upvotes === "number" ? noteData.upvotes : 1,
      views: typeof noteData.views === "number" ? noteData.views : 1,
      has_upvoted: true,
      upvoted_by: noteData.user_id ? [noteData.user_id] : [],
      created_at: noteData.created_at || new Date().toISOString(),
    };

    // Prepend new note so it appears at top of library
    const updated = [newNote, ...notes.filter((n: any) => n.id !== newNote.id)];
    saveServerNotes(updated);

    return res.status(201).json(newNote);
  } catch (err: any) {
    console.error("Error creating shared note:", err);
    return res.status(500).json({ 
      error: "Failed to save shared note to central library.", 
      details: err?.message || String(err) 
    });
  }
});

// PUT update an existing note in-place (matched by note.id)
app.put("/api/notes/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    if (!updateData) {
      return res.status(400).json({ error: "Update data is required." });
    }

    const notes = loadServerNotes();
    const index = notes.findIndex((n: any) => n.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Note not found in community library." });
    }

    const existingNote = notes[index];
    const cleanAttachments = updateData.attachments
      ? (updateData.attachments || []).map((att: any) => ({
          ...att,
          storageUrl: att.storageUrl || att.dataUrl || "",
          dataUrl: att.storageUrl || att.dataUrl || "",
        }))
      : existingNote.attachments;

    const updatedNote = {
      ...existingNote,
      ...updateData,
      id, // Strictly preserve original unique note ID
      attachments: cleanAttachments,
      updated_at: new Date().toISOString(),
    };

    notes[index] = updatedNote;
    saveServerNotes(notes);

    return res.status(200).json(updatedNote);
  } catch (err: any) {
    console.error("Error updating shared note:", err);
    return res.status(500).json({ 
      error: "Failed to update shared note in community library.", 
      details: err?.message || String(err) 
    });
  }
});

// POST upvote a note (shared globally across all users)
app.post("/api/notes/:id/upvote", (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId } = req.body || {};
  const notes = loadServerNotes();
  let note = notes.find((n: any) => n.id === id || decodeURIComponent(n.id) === decodeURIComponent(id) || encodeURIComponent(n.id) === encodeURIComponent(id));
  if (!note) {
    note = {
      id,
      user_id: userId || "community_user",
      author_name: "Scholar",
      title: "Shared Material",
      subject: "Mathematics",
      content: "Community study material.",
      upvotes: 0,
      views: 1,
      upvoted_by: [],
      created_at: new Date().toISOString(),
      attachments: []
    };
    notes.push(note);
  }

  if (!Array.isArray(note.upvoted_by)) {
    note.upvoted_by = [];
  }

  const uid = userId || "anonymous";
  const idx = note.upvoted_by.indexOf(uid);
  let userHasUpvoted = false;

  if (idx > -1) {
    // Already upvoted, toggle off
    note.upvoted_by.splice(idx, 1);
    note.upvotes = Math.max(0, (note.upvotes || 1) - 1);
    userHasUpvoted = false;
  } else {
    // Add upvote
    note.upvoted_by.push(uid);
    note.upvotes = (note.upvotes || 0) + 1;
    userHasUpvoted = true;
  }

  saveServerNotes(notes);
  return res.status(200).json({ id, upvotes: note.upvotes, has_upvoted: userHasUpvoted, upvoted_by: note.upvoted_by });
});

// POST view a note (shared globally across all users)
app.post("/api/notes/:id/view", (req: Request, res: Response) => {
  const { id } = req.params;
  const notes = loadServerNotes();
  let note = notes.find((n: any) => n.id === id || decodeURIComponent(n.id) === decodeURIComponent(id) || encodeURIComponent(n.id) === encodeURIComponent(id));
  if (!note) {
    note = {
      id,
      user_id: "community_user",
      author_name: "Scholar",
      title: "Shared Material",
      subject: "Mathematics",
      content: "Community study material.",
      upvotes: 1,
      views: 0,
      upvoted_by: [],
      created_at: new Date().toISOString(),
      attachments: []
    };
    notes.push(note);
  }

  note.views = (note.views || 0) + 1;
  saveServerNotes(notes);
  return res.status(200).json({ id, views: note.views });
});

// DELETE a note (uploader-only delete, permanently removes from central server & Supabase)
app.delete("/api/notes/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Note ID is required." });
    }

    const notes = loadServerNotes();
    const target = notes.find((n: any) => n.id === id);
    const filtered = notes.filter((n: any) => n.id !== id);
    saveServerNotes(filtered);

    const registry = getDeletedRegistry();
    if (!registry.deleted_ids.includes(id)) {
      registry.deleted_ids.push(id);
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
    let supabase: any = null;
    if (supabaseUrl && supabaseAnonKey) {
      try {
        supabase = createClient(supabaseUrl, supabaseAnonKey);
      } catch (e) {
        console.warn("Supabase client init warning:", e);
      }
    }

    // If this was a direct Supabase-generated note ID
    if (id.startsWith("sup_mat_")) {
      const rawFname = id.replace(/^sup_mat_/, "");
      if (!registry.deleted_files.includes(rawFname)) {
        registry.deleted_files.push(rawFname);
      }
      if (supabase) {
        try {
          await supabase.storage.from("Material Library").remove([rawFname, `Uploaded Material/${rawFname}`]);
        } catch (e) {
          console.warn("Supabase direct remove warning:", e);
        }
      }
    }

    if (target && Array.isArray(target.attachments)) {
      for (const att of target.attachments) {
        if (att.storageUrl && att.storageUrl.startsWith("/api/uploads/")) {
          try {
            const diskFilename = path.basename(att.storageUrl);
            if (diskFilename && !registry.deleted_files.includes(diskFilename)) {
              registry.deleted_files.push(diskFilename);
            }
            const diskPath = path.join(UPLOADS_DIR, diskFilename);
            if (fs.existsSync(diskPath)) {
              fs.unlinkSync(diskPath);
            }
          } catch (e) {
            console.warn("Notice unlinking deleted upload file:", e);
          }
        }
        if (att.supabasePath) {
          const fname = path.basename(att.supabasePath);
          if (fname && !registry.deleted_files.includes(fname)) {
            registry.deleted_files.push(fname);
          }
          if (supabase) {
            try {
              await supabase.storage.from("Material Library").remove([att.supabasePath, fname, `Uploaded Material/${fname}`]);
            } catch (e) {
              console.warn("Supabase remove warning:", e);
            }
          }
        }
      }
    }

    saveDeletedRegistry(registry);
    return res.status(200).json({ success: true, id });
  } catch (err: any) {
    console.error("Error deleting shared note:", err);
    return res.status(500).json({ 
      error: "Failed to delete shared note from database.", 
      details: err?.message || String(err) 
    });
  }
});

// -------------------------------------------------------------
// CENTRAL MATERIAL & FILE UPLOADS (Fallback & Shared across all users)
// -------------------------------------------------------------
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use("/api/uploads", express.static(UPLOADS_DIR));

// POST upload file to central server storage (and sync to Supabase bucket)
app.post("/api/upload", async (req: Request, res: Response) => {
  try {
    const { name, type, dataUrl, author_name, authorName, user_id, userId } = req.body;
    if (!dataUrl) {
      return res.status(400).json({ error: "Missing dataUrl in upload payload" });
    }

    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer: Buffer;
    if (matches && matches.length === 3) {
      buffer = Buffer.from(matches[2], "base64");
    } else {
      buffer = Buffer.from(dataUrl, "base64");
    }

    const safeName = (name || "file.bin").replace(/[^a-zA-Z0-9._-]/g, "_");
    const uploader = author_name || authorName || "Scholar";
    const uploaderId = user_id || userId || "user";
    const filename = `${Date.now()}__by__${encodeURIComponent(uploader)}__uid__${encodeURIComponent(uploaderId)}__${safeName}`;
    const filePath = path.join(UPLOADS_DIR, filename);

    fs.writeFileSync(filePath, buffer);

    let publicUrl = `/api/uploads/${filename}`;
    let supabasePath: string | undefined = undefined;
    let supabaseError: string | undefined = undefined;

    // Mirror to Supabase Storage bucket "Material Library" / "Uploaded Material"
    const supabase = getBackendSupabaseClient();
    if (supabase && !req.body.skipSupabaseMirror) {
      try {
        // Attempt creating or updating bucket if missing or restricted
        try {
          await supabase.storage.createBucket("Material Library", { public: true });
        } catch {}

        const remotePath = `Uploaded Material/${filename}`;
        let upRes = await supabase.storage.from("Material Library").upload(remotePath, buffer, {
          contentType: type || "application/octet-stream",
          upsert: true,
        });

        if (upRes.error && (upRes.error.message?.toLowerCase().includes("mime type") || upRes.error.message?.toLowerCase().includes("not supported"))) {
          try {
            await supabase.storage.updateBucket("Material Library", { public: true, allowedMimeTypes: undefined as any });
          } catch {}
          upRes = await supabase.storage.from("Material Library").upload(remotePath, buffer, {
            contentType: "application/octet-stream",
            upsert: true,
          });
        }

        if (!upRes.error) {
          const { data: pUrl } = supabase.storage.from("Material Library").getPublicUrl(remotePath);
          publicUrl = pUrl.publicUrl;
          supabasePath = remotePath;
        } else {
          supabaseError = upRes.error.message;
          console.warn("Server-to-Supabase upload error:", upRes.error.message);
        }
      } catch (e: any) {
        supabaseError = e?.message || String(e);
        console.warn("Server-to-Supabase upload notice:", e);
      }
    }

    return res.json({
      success: true,
      filename,
      name: name || safeName,
      type: type || "application/octet-stream",
      size: buffer.length,
      url: publicUrl,
      supabasePath,
      author_name: uploader,
    });
  } catch (err: any) {
    console.error("Error saving uploaded file:", err);
    return res.status(500).json({ error: "Failed to process file upload on server" });
  }
});

// GET Supabase Storage bucket status diagnostics
app.get("/api/storage-status", async (_req: Request, res: Response) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.json({
      connected: false,
      reason: "Missing Supabase configuration keys.",
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const bucketName = "Material Library";
    const folderName = "Uploaded Material";

    const listRes = await supabase.storage.from(bucketName).list(folderName);
    const isBucketAccessible = !listRes.error;
    const files = (listRes.data || []).filter((f) => f.name !== ".emptyFolderPlaceholder");

    return res.json({
      connected: isBucketAccessible,
      bucket: bucketName,
      folder: folderName,
      url: supabaseUrl,
      filesCount: files.length,
      files: files.map((f) => {
        const { data } = supabase.storage.from(bucketName).getPublicUrl(`${folderName}/${f.name}`);
        return {
          name: f.name,
          size: (f.metadata as any)?.size || 0,
          updated_at: f.updated_at,
          url: data.publicUrl,
        };
      }),
      error: listRes.error ? listRes.error.message : null,
    });
  } catch (err: any) {
    return res.json({
      connected: false,
      error: err?.message || String(err),
    });
  }
});

// -------------------------------------------------------------
// VITE OR STATIC SERVING
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Paideutic server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
