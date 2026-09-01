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

// gpt-oss models "think" before answering: the chain-of-thought shares the
// max_tokens budget with the final message. When the budget is small the model
// can spend everything on reasoning and return empty `content`. We therefore
// request low reasoning effort, use a generous token budget, retry once, and
// fall back to a canned line so the UI never breaks.
const CHAT_MAX_TOKENS = 1024;

type ChatMessages = Array<{
  role: "system" | "user" | "assistant";
  content: string;
}>;

type ChatJsonSchema = NonNullable<
  Parameters<Groq["chat"]["completions"]["create"]>[0]
>["response_format"];

export async function chatWithRetry(
  messages: ChatMessages,
  temperature: number,
  responseFormat?: ChatJsonSchema
): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const completion = await getGroq().chat.completions.create({
        model: MODEL,
        messages,
        temperature,
        max_tokens: CHAT_MAX_TOKENS,
        reasoning_effort: "low",
        ...(responseFormat ? { response_format: responseFormat } : {}),
      });
      const raw = completion.choices[0]?.message?.content?.trim();
      if (raw) return raw;
      console.error(
        `[groq] attempt ${attempt + 1}: empty content (reasoning consumed the budget?)`
      );
    } catch (err) {
      console.error(`[groq] attempt ${attempt + 1} failed`, err);
    }
  }
  return null;
}

type ContextLanguage = "english" | "french" | "mixed";

// ─── Shared vocabulary constraint ────────────────────────────────────────────
// Core rule: the AI speaks with the learner's own words PLUS this core A1
// survival list. Without it, a beginner's inventory (~6 words) leaves the
// model nothing to say, so every reply loops on "Bonjour, ça va ?".
const CORE_A1_WORDS: string[] = [
  "salut", "bonsoir", "merci", "beaucoup", "si", "très", "bien", "super", "génial", "cool",
  "sympa", "ça", "va", "comment", "aujourd'hui", "demain", "matin", "soir", "semaine", "weekend",
  "vacances", "famille", "mère", "père", "frère", "sœur", "ami", "amie", "copain", "copine",
  "chien", "chat", "manger", "boire", "pizza", "café", "thé", "eau", "pain", "fromage",
  "chocolat", "glace", "restaurant", "cuisine", "aimer", "adorer", "détester", "préférer", "vouloir", "pouvoir",
  "devoir", "aller", "venir", "faire", "dire", "parler", "regarder", "écouter", "jouer", "travailler",
  "étudier", "apprendre", "lire", "dormir", "sport", "football", "musique", "film", "livre", "école",
  "maison", "ville", "plage", "montagne", "content", "heureux", "heureuse", "triste", "fatigué", "faim",
  "soif", "chaud", "froid", "facile", "difficile", "nouveau", "petit", "grand", "pourquoi", "quoi",
  "qui", "où", "quand", "combien", "quel", "quelle", "peu", "trop", "presque", "maintenant",
  "après", "avant", "souvent", "toujours", "jamais", "parfois", "temps", "beau", "pleut", "neige",
  "argent", "travail", "moi", "aussi", "avec", "sans", "pour", "parce", "mais", "donc",
];

// (Exported for reuse by the Ville simulations in lib/simulation.ts)
export function vocabularyConstraint(
  inventory: LearnerInventory,
  extraVocabulary?: string[]
): string {
  const words = getKnownWordList(inventory);
  const patterns = [
    ...inventory.sentence_patterns,
    ...inventory.question_patterns,
  ];
  const allWords = [
    ...new Set([...words, ...CORE_A1_WORDS, ...(extraVocabulary ?? [])]),
  ];

  return `ABSOLUTE RULE — VOCABULARY LIMIT:
You must write French using ONLY the words from this list (plus tiny function words like "je", "tu", "il", "elle", "nous", "vous", "est", "sont", "à", "en", "pas", "c'est" needed for grammar). Words the learner learned personally come first — prefer them.
${allWords.join(", ")}
${patterns.length ? `\nFull expressions the learner knows: ${patterns.join(" | ")}` : ""}
If you cannot say something with these words, rephrase it using only them. Keep every message SHORT (max 1-2 sentences) so the learner can understand and reply.`;
}

function contextInstruction(contextLanguage: ContextLanguage): string {
  return contextLanguage === "french"
    ? "Explanations must be written in French."
    : contextLanguage === "mixed"
    ? "Explanations must be written in a mix of English and French (mostly English)."
    : "Explanations must be written in English.";
}

// ─── Opening line ────────────────────────────────────────────────────────────
const FALLBACK_OPENINGS = [
  "Bonjour ! Comment ça va aujourd'hui ?",
  "Salut ! Qu'est-ce que tu fais aujourd'hui ?",
  "Bonjour ! Tu veux parler de quoi ?",
  "Salut ! Tu aimes la musique ?",
  "Bonjour ! Tu as faim ? Moi, j'adore la pizza !",
];

// A random theme per session keeps every opening fresh instead of the same
// "Bonjour, comment ça va ?" every time.
const OPENING_THEMES = [
  "la nourriture (tu préfères la pizza ou les pâtes ?)",
  "les animaux (tu as un chien ou un chat ?)",
  "la musique (tu écoutes quoi en ce moment ?)",
  "le week-end (tu fais quoi pour t'amuser ?)",
  "les vacances (la plage ou la montagne ?)",
  "le sport (tu joues au football ou à un autre sport ?)",
  "les films (tu regardes quoi ?)",
  "la famille (tu as des frères et sœurs ?)",
  "la météo (il fait beau chez toi ?)",
  "les amis (tu vois tes copains ce week-end ?)",
];

export async function generateChambreOpening(
  inventory: LearnerInventory,
  contextLanguage: ContextLanguage = "english",
  userLocation?: string | null
): Promise<string> {
  const theme = OPENING_THEMES[Math.floor(Math.random() * OPENING_THEMES.length)];
  const locationLine = userLocation
    ? `\nThe learner lives in or near ${userLocation}. If natural, reference a familiar everyday place there.`
    : "";

  const raw = await chatWithRetry(
    [
      {
        role: "system",
        content: `You are Monsieur Aaron, a warm and playful French conversation partner for a beginner learner. You are starting a free, casual conversation (la Chambre).

${vocabularyConstraint(inventory)}
${locationLine}
${contextInstruction(contextLanguage)}

Today, open with the theme: ${theme}. Make it specific and playful — a tiny personal opinion, a fun detail, or a "tu préfères X ou Y ?" style question about it. Vary your greeting (salut, bonjour, hey...) and do NOT open with a generic "comment ça va ?".
Write exactly ONE opening message in French. Output ONLY the French message, nothing else. No corrections, no English, no explanations.`,
      },
    ],
    1.0
  );

  if (!raw) {
    // Never break the UX: fall back to a safe line built from starter vocab.
    console.error("[chambre] Groq returned empty opening — using fallback");
    return FALLBACK_OPENINGS[Math.floor(Math.random() * FALLBACK_OPENINGS.length)];
  }
  return stripQuotes(raw);
}

// ─── Conversation reply ──────────────────────────────────────────────────────
const FALLBACK_REPLIES = [
  "Ah super ! Raconte-moi encore !",
  "C'est vrai ? Moi, j'adore ça ! Et toi, tu fais ça souvent ?",
  "Ah bon ? Pourquoi tu dis ça ?",
  "Génial ! Et après, qu'est-ce que tu fais ?",
  "Moi aussi ! On est pareil, toi et moi !",
  "Pas mal ! Tu es content aujourd'hui ?",
  "Ah, j'aime beaucoup ! Tu veux parler d'autre chose ?",
  "Vraiment ? C'est fou ça !",
];

export async function generateChambreReply(
  messages: ChambreMessage[],
  inventory: LearnerInventory,
  contextLanguage: ContextLanguage = "english"
): Promise<string> {
  const raw = await chatWithRetry(
    [
      {
        role: "system",
        content: `You are Monsieur Aaron, a warm and playful French conversation partner for a beginner learner, chatting freely (la Chambre).

${vocabularyConstraint(inventory)}
${contextInstruction(contextLanguage)}

CRITICAL BEHAVIOUR — FOLLOW THE LEARNER'S LEAD:
- The learner drives the conversation. React FIRST and specifically to what they just said: pick up their exact topic, words or feeling and build on it. Do NOT redirect to a topic of your own.
- Show real personality: react with genuine emotion (surprise, joy, curiosity, playful disagreement) and share tiny opinions of your own ("moi, j'adore ça !" / "ah non, pas moi !").
- End with AT MOST one short question, and only if it moves THEIR topic forward. Never ask a question if your reaction already invites them to keep talking.
- ANTI-REPETITION: read the transcript carefully. Never repeat a question you already asked, never reuse a sentence you already wrote, and vary your openers (never start two messages with the same word like "D'accord", "C'est bien" or "Ah bon").
- NEVER correct the learner's mistakes, never point out errors, never explain grammar. If the learner makes a mistake, just understand the intent and keep the conversation flowing.
- If the learner writes something you can't fully understand, respond to the part you understood, or gently ask a simple question using only known words.
- Reply with ONLY your short French message (1-2 sentences). No English, no explanations, no corrections.`,
      },
      ...messages.map((m) => ({
        role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
        content: m.text,
      })),
    ],
    1.0
  );

  if (!raw) {
    console.error("[chambre] Groq returned empty reply — using fallback");
    return FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)];
  }
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

  const raw = await chatWithRetry(
    [
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
    0.4,
    {
      type: "json_schema",
      json_schema: {
        name: "chambre_report",
        strict: false,
        schema: REPORT_SCHEMA,
      },
    }
  );

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