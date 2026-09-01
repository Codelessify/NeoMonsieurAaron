import Groq from "groq-sdk";
import type {
  ChambreMessage,
  ChambreReport,
  LearnerInventory,
} from "@/types";
import { getKnownWordList } from "@/lib/curriculum";

let _groq: Groq | null = null;
function getGroq(): Groq {
  if (!_groq) {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
}

const MODEL = "openai/gpt-oss-20b";

type ContextLanguage = "english" | "french" | "mixed";

// ─── Shared vocabulary constraint ────────────────────────────────────────────
// The core rule of Chambre: the AI speaks ONLY with words the learner knows.
function vocabularyConstraint(inventory: LearnerInventory): string {
  const words = getKnownWordList(inventory);
  const patterns = [
    ...inventory.sentence_patterns,
    ...inventory.question_patterns,
  ];

  return `ABSOLUTE RULE — VOCABULARY LIMIT:
You must write French using ONLY the words from this list (plus tiny function words like "je", "tu", "il", "elle", "nous", "vous", "est", "sont", "à", "en", "que", "qui", "pas", "c'est" needed for grammar):
${words.join(", ")}
${patterns.length ? `\nFull expressions the learner knows: ${patterns.join(" | ")}` : ""}
Do NOT introduce any new vocabulary, even simple words. If you cannot say something with these words, rephrase it using only them. Keep every message SHORT (max 1-2 sentences) so the learner can understand and reply.`;
}

function contextInstruction(contextLanguage: ContextLanguage): string {
  return contextLanguage === "french"
    ? "Explanations must be written in French."
    : contextLanguage === "mixed"
    ? "Explanations must be written in a mix of English and French (mostly English)."
    : "Explanations must be written in English.";
}

// ─── Opening line ────────────────────────────────────────────────────────────
export async function generateChambreOpening(
  inventory: LearnerInventory,
  contextLanguage: ContextLanguage = "english",
  userLocation?: string | null
): Promise<string> {
  const locationLine = userLocation
    ? `\nThe learner lives in or near ${userLocation}. If natural, reference a familiar everyday place.`
    : "";

  const completion = await getGroq().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are Monsieur Aaron, a warm and playful French conversation partner for a beginner learner. You are starting a free, casual conversation (la Chambre).

${vocabularyConstraint(inventory)}
${locationLine}
Write exactly ONE opening message in French: a short sentence, question, or friendly comment that naturally invites the learner to respond. Output ONLY the French message, nothing else. No corrections, no English, no explanations.`,
      },
    ],
    temperature: 0.9,
    max_tokens: 120,
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error("Groq returned empty opening");
  return stripQuotes(raw);
}

// ─── Conversation reply ──────────────────────────────────────────────────────
export async function generateChambreReply(
  messages: ChambreMessage[],
  inventory: LearnerInventory,
  contextLanguage: ContextLanguage = "english"
): Promise<string> {
  const completion = await getGroq().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are Monsieur Aaron, a warm and playful French conversation partner for a beginner learner, chatting freely (la Chambre).

${vocabularyConstraint(inventory)}
${contextInstruction(contextLanguage)}

CRITICAL BEHAVIOUR:
- Continue the conversation naturally based on what the learner says.
- NEVER correct the learner's mistakes, never point out errors, never explain grammar. If the learner makes a mistake, just understand the intent and keep the conversation flowing.
- If the learner writes something you can't fully understand, respond to the part you understood, or gently ask a simple question using only known words.
- Reply with ONLY your short French message (1-2 sentences). No English, no explanations, no corrections.`,
      },
      ...messages.map((m) => ({
        role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
        content: m.text,
      })),
    ],
    temperature: 0.8,
    max_tokens: 150,
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error("Groq returned empty reply");
  return stripQuotes(raw);
}

// ─── End-of-session report ───────────────────────────────────────────────────
const REPORT_SCHEMA = {
  type: "object" as const,
  additionalProperties: false,
  required: ["corrections", "overall_feedback", "vocabulary_used"],
  properties: {
    corrections: {
      type: "array" as const,
      items: {
        type: "object" as const,
        additionalProperties: false,
        required: ["original", "corrected", "explanation"],
        properties: {
          original: { type: "string" as const },
          corrected: { type: "string" as const },
          explanation: { type: "string" as const },
        },
      },
    },
    overall_feedback: { type: "string" as const },
    vocabulary_used: {
      type: "array" as const,
      items: { type: "string" as const },
    },
  },
};

export async function generateChambreReport(
  messages: ChambreMessage[],
  inventory: LearnerInventory,
  contextLanguage: ContextLanguage = "english"
): Promise<ChambreReport> {
  const userMessages = messages
    .filter((m) => m.role === "user")
    .map((m) => m.text);

  if (userMessages.length === 0) {
    return {
      corrections: [],
      overall_feedback:
        contextLanguage === "french"
          ? "Vous n'avez pas encore écrit de message. Revenez quand vous voulez !"
          : "You didn't write any messages yet. Come back anytime!",
      vocabulary_used: [],
    };
  }

  const knownWords = getKnownWordList(inventory);

  const completion = await getGroq().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are a kind French teacher reviewing a beginner learner's free conversation (la Chambre) AFTER it ended. Now is the time to give corrections.

${contextInstruction(contextLanguage)}

Rules:
- Review ONLY the learner's messages (they are listed below).
- corrections: one entry per learner message that contains a real mistake (spelling, grammar, word choice). Keep the learner's intended meaning. If a message is already correct, do NOT include it. If there are no mistakes at all, return an empty array.
- explanation: one short, encouraging sentence about what to fix and why.
- overall_feedback: 2-3 encouraging sentences summarising how the conversation went.
- vocabulary_used: list the words from the learner's known vocabulary that they actually used correctly: ${knownWords.slice(0, 60).join(", ")}`,
      },
      {
        role: "user",
        content: `Learner's messages during the conversation:\n${userMessages
          .map((m, i) => `${i + 1}. ${m}`)
          .join("\n")}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "chambre_report",
        strict: false,
        schema: REPORT_SCHEMA,
      },
    },
    temperature: 0.4,
    max_tokens: 1200,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Groq returned empty report");

  const parsed = JSON.parse(raw) as Partial<ChambreReport>;
  return {
    corrections: parsed.corrections ?? [],
    overall_feedback: parsed.overall_feedback ?? "",
    vocabulary_used: parsed.vocabulary_used ?? [],
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function stripQuotes(text: string): string {
  return text.replace(/^["«»“”\s]+|["«»“”\s]+$/g, "");
}