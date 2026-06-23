// src/services/openai.ts
import OpenAI from "openai";
import { toFile } from "openai/uploads";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type AiDiagnosis = {
  likelyCauses: string[];
  quickChecks: { title: string; steps: string[] }[];
  whenToCallTechnician: string[];
  safetyNote?: string;
};

export async function diagnoseText(params: {
  question: string;
  machineModel?: string;
  serialNumber?: string;
}): Promise<AiDiagnosis> {
  const { question, machineModel, serialNumber } = params;

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

  const resp = await client.chat.completions.create({
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

export async function textToSpeechBangla(text: string): Promise<Buffer> {
  const response = await client.audio.speech.create({
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
  // choose extension for OpenAI upload metadata
  const ext =
    mimeType.includes("mp4") ? "mp4" :
    mimeType.includes("mpeg") ? "mp3" :
    mimeType.includes("mp3") ? "mp3" :
    mimeType.includes("wav") ? "wav" :
    mimeType.includes("webm") ? "webm" :
    "webm";

  const file = await toFile(audio, `speech.${ext}`, { type: mimeType });

  const resp = await client.audio.transcriptions.create({
    model: process.env.OPENAI_STT_MODEL || "gpt-4o-mini-transcribe",
    file,
    language: "bn",
  });

  return (resp as any).text || "";
}
