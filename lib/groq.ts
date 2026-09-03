import Groq from "groq-sdk";
import type { GroqEpisodeOutput, LearnerInventory, Lesson } from "@/types";

let _groq: Groq | null = null;
function getGroq(): Groq {
  if (!_groq) {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
}

const MODEL = "openai/gpt-oss-120b";

// Core fields only in required — optional enrichment fields left out so
// the model can omit them if it runs close to the token limit.
// strict: false to allow optional properties.
const EPISODE_SCHEMA = {
  type: "object" as const,
  additionalProperties: false,
  required: ["episode_title", "scenes"],
  properties: {
    episode_title: { type: "string" as const },
    scenes: {
      type: "array" as const,
      items: {
        type: "object" as const,
        additionalProperties: false,
        required: [
          "english_context",
          "character_name",
          "dialogue",
          "expected_response",
          "choices",
        ],
        properties: {
          english_context: { type: "string" as const },
          character_name: { type: "string" as const },
          dialogue: { type: "string" as const },
          expected_response: { type: "string" as const },
          choices: {
            type: "array" as const,
            items: {
              type: "object" as const,
              additionalProperties: false,
              required: ["text", "is_correct"],
              properties: {
                text: { type: "string" as const },
                is_correct: { type: "boolean" as const },
              },
            },
          },
          teacher_note: { type: "string" as const },
          grammar_focus: { type: "string" as const },
          new_vocabulary: { type: "array" as const, items: { type: "string" as const } },
        },
      },
    },
  },
};

export async function generateEpisode(
  lesson: Lesson,
  inventory: LearnerInventory,
  contextLanguage: "english" | "french" | "mixed" = "english",
  userLocation?: string | null
): Promise<GroqEpisodeOutput> {
  const contextInstruction =
    contextLanguage === "french"
      ? "Write the english_context field in French."
      : contextLanguage === "mixed"
      ? "Write the english_context field in a mix of English and French (start in English, gradually introduce French)."
      : "Write the english_context field in English.";

  const locationInstruction = userLocation
    ? `\nThe learner is in ${userLocation}. Incorporate local landmarks and locations naturally into the situations (e.g. "tu vas au Tanke" if in Ilorin, "tu vas au marché Central" if in Yaoundé, "tu vas au quartier Latin" if in Paris).`
    : "";

  const completion = await getGroq().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `French curriculum designer. Create a 3-scene conversational episode for a French learner.

Each scene: a named character speaks French, the learner must choose the correct French reply.
- character_name: short name like "Marie" or "Le vendeur"
- dialogue: the character's French sentence
- english_context: one sentence describing the situation (language depends on learner preference)
- expected_response: the correct French reply
- choices: exactly 3 options (1 correct, 2 wrong but plausible)
- teacher_note: one short English sentence on the grammar (optional)
- grammar_focus: 2-4 word grammar label (optional)
- new_vocabulary: 0-2 new words (optional)
Keep every field short.`,
      },
      {
        role: "user",
        content: `Objective: ${lesson.objective}
Target phrases: ${lesson.target_phrases.join(", ")}
Known verbs: ${inventory.verbs.join(", ") || "none"}
Known nouns: ${inventory.nouns.slice(0, 8).join(", ") || "none"}
${contextInstruction}
${locationInstruction}
Generate exactly 3 scenes as one continuous story with a consistent character.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "french_episode",
        strict: false,
        schema: EPISODE_SCHEMA,
      },
    },
    temperature: 0.8,
    max_tokens: 2500,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Groq returned empty content");

  const parsed = JSON.parse(raw) as {
    episode_title: string;
    scenes: Array<{
      english_context: string;
      character_name: string;
      dialogue: string;
      expected_response: string;
      choices: Array<{ text: string; is_correct: boolean }>;
      teacher_note?: string;
      grammar_focus?: string;
      new_vocabulary?: string[];
    }>;
  };

  return {
    episode_title: parsed.episode_title,
    theme: lesson.theme,
    estimated_duration_minutes: 5,
    scenes: parsed.scenes.map((s, i) => ({
      scene_number: i + 1,
      english_context: s.english_context,
      french_context: "",
      character_name: s.character_name,
      dialogue: s.dialogue,
      expected_response: s.expected_response,
      choices: s.choices,
      new_vocabulary: s.new_vocabulary ?? [],
      grammar_focus: s.grammar_focus ?? "",
      teacher_note: s.teacher_note ?? "",
      audio_direction: "",
      illustration_prompt: `${s.english_context} ${s.character_name} speaking French. Soft watercolour, warm Parisian palette.`,
      goal: "",
    })),
  };
}
