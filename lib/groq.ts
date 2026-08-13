import Groq from "groq-sdk";
import type { GroqEpisodeOutput, LearnerInventory, Lesson } from "@/types";

let _groq: Groq | null = null;
function getGroq(): Groq {
  if (!_groq) {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
}

const MODEL = "openai/gpt-oss-20b";

// MVP schema — absolute minimum fields the player renders
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
          "speaker",
          "expected_response",
          "choices",
          "teacher_note",
          "grammar_focus",
          "new_vocabulary",
        ],
        properties: {
          english_context: { type: "string" as const },
          speaker: { type: "string" as const },
          expected_response: { type: "string" as const },
          choices: {
            type: "array" as const,
            minItems: 3,
            maxItems: 3,
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
  inventory: LearnerInventory
): Promise<GroqEpisodeOutput> {
  const completion = await getGroq().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `French curriculum designer. Create a 5-scene quiz episode.
Rules: target phrase must be the correct answer in at least 2 scenes; speaker always speaks French; distractors are plausible but wrong; teacher_note is 1 short sentence; grammar_focus is 2-4 words; new_vocabulary is 0-2 words.`,
      },
      {
        role: "user",
        content: `Objective: ${lesson.objective}
Target phrases: ${lesson.target_phrases.join(", ")}
Known verbs: ${inventory.verbs.join(", ") || "none"}
Known nouns: ${inventory.nouns.slice(0, 8).join(", ") || "none"}
Generate 3 scenes as a short story. Keep each field brief.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "french_episode",
        strict: true,
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
      speaker: string;
      expected_response: string;
      choices: Array<{ text: string; is_correct: boolean }>;
      teacher_note: string;
      grammar_focus: string;
      new_vocabulary: string[];
    }>;
  };

  // Backfill all fields required by the Episode/Scene types
  return {
    episode_title: parsed.episode_title,
    theme: lesson.theme,
    estimated_duration_minutes: 5,
    scenes: parsed.scenes.map((s, i) => ({
      scene_number: i + 1,
      english_context: s.english_context,
      french_context: "",
      speaker: s.speaker,
      expected_response: s.expected_response,
      choices: s.choices,
      new_vocabulary: s.new_vocabulary,
      grammar_focus: s.grammar_focus,
      teacher_note: s.teacher_note,
      audio_direction: "",
      illustration_prompt: "",
      goal: "",
    })),
  };
}
