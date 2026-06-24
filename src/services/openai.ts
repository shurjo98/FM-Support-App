// src/services/openai.ts
import OpenAI from "openai";
import { toFile } from "openai/uploads";

// Real OpenAI calls are switched off for now (no product-trained model yet —
// ticket suggestions already use canned responses in aiService.ts). Flip
// OPENAI_DEMO_MODE to "false" and set OPENAI_API_KEY once a real key/model
// is ready to wire back in.
function isOpenAiEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY) && process.env.OPENAI_DEMO_MODE !== "true";
}

// Constructed lazily (only once a caller has already confirmed AI is
// enabled) — the OpenAI SDK throws immediately at construction time if no
// API key is present, which would crash the server at boot if this ran
// eagerly at module load.
let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

export type AiDiagnosis = {
  likelyCauses: string[];
  quickChecks: { title: string; steps: string[] }[];
  whenToCallTechnician: string[];
  safetyNote?: string;
};

function fallbackDiagnosis(question: string): AiDiagnosis {
  return {
    likelyCauses: [
      "Needle damaged, bent, or the wrong size/type for this fabric.",
      "Thread path, tension, or bobbin setup is off.",
      "Machine timing or a worn part (hook, feed dog) needs adjustment.",
    ],
    quickChecks: [
      { title: "Re-thread the machine", steps: ["Remove and re-thread top and bobbin thread", "Check the thread path isn't catching anywhere"] },
      { title: "Inspect the needle", steps: ["Replace if bent or blunt", "Confirm needle size matches the fabric"] },
      { title: "Clean the machine", steps: ["Remove lint around the feed dog and needle plate", "Check presser foot pressure is appropriate"] },
    ],
    whenToCallTechnician: [
      "If the issue persists after re-threading and a needle change.",
      "If you hear unusual noises or see visible part damage.",
    ],
    safetyNote: `AI diagnosis is not active yet (training on our own product data first) — this is a general checklist for: "${question}".`,
  };
}

export async function diagnoseText(params: {
  question: string;
  machineModel?: string;
  serialNumber?: string;
}): Promise<AiDiagnosis> {
  const { question, machineModel, serialNumber } = params;

  if (!isOpenAiEnabled()) {
    return fallbackDiagnosis(question);
  }

  const schema = {
    name: "diagnosis_schema",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        likelyCauses: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 8 },
        quickChecks: {
          type: "array",
          minItems: 3,
          maxItems: 7,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              steps: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 },
            },
            required: ["title", "steps"],
          },
        },
        whenToCallTechnician: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 },
        safetyNote: { type: "string" },
      },
      required: ["likelyCauses", "quickChecks", "whenToCallTechnician"],
    },
  } as const;

  const resp = await getClient().chat.completions.create({
    model: process.env.OPENAI_DIAGNOSE_MODEL || "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_schema", json_schema: schema },
    messages: [
      {
        role: "system",
        content:
          "You are a senior industrial sewing machine service engineer in Bangladesh. Always respond in Bangla (বাংলা). Output ONLY valid JSON that matches the schema. No markdown.",
      },
      {
        role: "user",
        content: `মেশিন মডেল: ${machineModel ?? "Unknown"}
সিরিয়াল: ${serialNumber ?? "Unknown"}
সমস্যা: ${question}

গার্মেন্টস ফ্যাক্টরির অপারেটর/মেকানিক যেন সহজে বুঝতে পারে—এভাবে সংক্ষিপ্ত, বাস্তবসম্মত চেকলিস্ট দাও।`,
      },
    ],
  });

  const raw = resp.choices[0]?.message?.content || "{}";
  return JSON.parse(raw) as AiDiagnosis;
}

export type PortalSearchResult = {
  action: "navigate" | "answer";
  section?: "overview" | "sewing" | "automated" | "needles" | "spareparts" | "garments" | "tickets" | "purchases" | "settings";
  message: string;
};

const PORTAL_SECTIONS = [
  "overview — dashboard home with stats and recent activity",
  "sewing — Sewing Machines (Jack lockstitch/overlock models), browse + report issues",
  "automated — Automated Machines (template, interlock, pocket welting), browse + report issues",
  "needles — Groz-Beckert needle catalog, order history, reorder needles",
  "spareparts — Spare parts catalog (bobbin cases, presser feet, etc.), order history, reorder parts",
  "garments — Garment Guide: which machine/needle to use for shirts/pants/jeans, with a Jeans production-process breakdown",
  "tickets — Ticket History, past issues raised and their status/timeline",
  "purchases — Purchase History, machines/parts bought, searchable by model/serial",
  "settings — account/profile settings",
].join("\n");

const SECTION_KEYWORDS: { section: NonNullable<PortalSearchResult["section"]>; keywords: string[] }[] = [
  { section: "tickets", keywords: ["ticket", "issue", "complaint", "status", "raised"] },
  { section: "purchases", keywords: ["purchase", "order history", "bought", "history"] },
  { section: "needles", keywords: ["needle"] },
  { section: "spareparts", keywords: ["spare", "part", "bobbin", "presser foot", "feed dog", "rotary hook", "belt", "looper"] },
  { section: "garments", keywords: ["garment", "shirt", "pant", "jeans", "denim", "guide"] },
  { section: "automated", keywords: ["automated", "template machine", "interlock", "welting"] },
  { section: "sewing", keywords: ["sewing machine", "lockstitch", "overlock", "jack"] },
  { section: "settings", keywords: ["setting", "profile", "account", "logout", "language"] },
  { section: "overview", keywords: ["overview", "dashboard", "home"] },
];

// Simple keyword router used while real AI is switched off (see
// isOpenAiEnabled above). Not as flexible as the LLM version, but keeps the
// search bar usable with zero API dependency.
function fallbackPortalQuery(query: string, lang: "en" | "bn"): PortalSearchResult {
  const q = query.toLowerCase();
  for (const { section, keywords } of SECTION_KEYWORDS) {
    if (keywords.some((k) => q.includes(k))) {
      return {
        action: "navigate",
        section,
        message: lang === "bn" ? "সংশ্লিষ্ট সেকশনে নিয়ে যাচ্ছি।" : `Taking you to ${section}.`,
      };
    }
  }
  return {
    action: "answer",
    message:
      lang === "bn"
        ? "AI সহায়ক এখনো চালু নেই (আমাদের নিজস্ব প্রোডাক্ট ডেটায় প্রশিক্ষণ চলছে)। সাইডবার থেকে সরাসরি সেকশনে যান।"
        : "AI search isn't active yet (we're training it on our own product data) — try a keyword like \"needles\", \"tickets\", or \"purchases\", or use the sidebar.",
  };
}

export async function routePortalQuery(params: { query: string; lang: "en" | "bn" }): Promise<PortalSearchResult> {
  const { query, lang } = params;

  if (!isOpenAiEnabled()) {
    return fallbackPortalQuery(query, lang);
  }

  const schema = {
    name: "portal_search_schema",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        action: { type: "string", enum: ["navigate", "answer"] },
        section: {
          type: "string",
          enum: ["overview", "sewing", "automated", "needles", "spareparts", "garments", "tickets", "purchases", "settings"],
        },
        message: { type: "string" },
      },
      required: ["action", "message"],
    },
  } as const;

  const resp = await getClient().chat.completions.create({
    model: process.env.OPENAI_PORTAL_SEARCH_MODEL || "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_schema", json_schema: schema },
    messages: [
      {
        role: "system",
        content: `You are the AI search agent for FM Factory Support, a portal for Bangladesh garment factory customers who use Jack sewing machines and Groz-Beckert needles. Decide what the customer wants and respond with JSON only.

Available portal sections:
${PORTAL_SECTIONS}

Rules:
- If the customer clearly wants to go somewhere in the portal (e.g. "show me my purchases", "I need needles", "where are my tickets"), set action="navigate" and pick the closest matching section. Keep "message" short (one sentence) confirming where you're taking them.
- If the customer is asking a troubleshooting/general question (e.g. "why does my machine skip stitches", "what needle for denim"), set action="answer" and put a helpful, concise (2-4 sentences) answer in "message". Do not set section in this case.
- Respond in ${lang === "bn" ? "Bangla (বাংলা)" : "English"}.
- Never invent ticket or order data you don't have; for account-specific questions, point them to the relevant section instead.`,
      },
      { role: "user", content: query },
    ],
  });

  const raw = resp.choices[0]?.message?.content || "{}";
  return JSON.parse(raw) as PortalSearchResult;
}

export async function textToSpeechBangla(text: string): Promise<Buffer> {
  if (!isOpenAiEnabled()) {
    throw new Error("Voice features are disabled while AI is switched off.");
  }

  const response = await getClient().audio.speech.create({
    model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
    voice: process.env.OPENAI_TTS_VOICE || "nova",
    // ✅ IMPORTANT: no prefix like "বাংলায় পড়ো:" (it gets spoken)
    input: text,
  });

  return Buffer.from(await response.arrayBuffer());
}

/**
 * ✅ iPhone voice input fallback:
 * recorded audio bytes -> Bangla transcript text
 */
export async function transcribeBanglaAudio(audio: Buffer, mimeType: string): Promise<string> {
  if (!isOpenAiEnabled()) {
    throw new Error("Voice features are disabled while AI is switched off.");
  }

  // choose extension for OpenAI upload metadata
  const ext =
    mimeType.includes("mp4") ? "mp4" :
    mimeType.includes("mpeg") ? "mp3" :
    mimeType.includes("mp3") ? "mp3" :
    mimeType.includes("wav") ? "wav" :
    mimeType.includes("webm") ? "webm" :
    "webm";

  const file = await toFile(audio, `speech.${ext}`, { type: mimeType });

  const resp = await getClient().audio.transcriptions.create({
    model: process.env.OPENAI_STT_MODEL || "gpt-4o-mini-transcribe",
    file,
    language: "bn",
  });

  return (resp as any).text || "";
}
