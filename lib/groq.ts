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

// MVP schema
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
          "teacher_note",
          "grammar_focus",
          "new_vocabulary",
        ],
        properties: {
          // Brief English description of the situation
          english_context: { type: "string" as const },
          // The NPC's name, e.g. "Marie", "Le vendeur", "Le professeur"
          character_name: { type: "string" as const },
          // The NPC's actual spoken French line (the dialogue the learner hears)
          dialogue: { type: "string" as const },
          // The correct French response the learner should produce
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
  inventory: LearnerInventory
): Promise<GroqEpisodeOutput> {
  const completion = await getGroq().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are a French language curriculum designer. Create a short conversational episode where the learner practices responding in French.

Rules:
- Each scene has a NAMED character (e.g. "Marie", "Le vendeur", "Le professeur") who says something in French ("dialogue").
- The learner must reply. The correct reply is "expected_response". Provide 3 choices total (1 correct, 2 plausible but wrong).
- "english_context" is a brief English stage direction, e.g. "Marie greets you at the door."
- The target phrase(s) must appear as the correct answer in at least 2 scenes.
- teacher_note: 1 short English sentence explaining the grammar.
- grammar_focus: 2-4 words naming the grammar point.
- new_vocabulary: 0-2 new French words introduced in this scene.
- Keep all fields short. The whole story should feel like a natural real-life conversation.`,
      },
      {
        role: "user",
        content: `Lesson objective: ${lesson.objective}
Target phrases the learner must practice: ${lesson.target_phrases.join(", ")}
Known verbs: ${inventory.verbs.join(", ") || "none"}
Known nouns: ${inventory.nouns.slice(0, 8).join(", ") || "none"}

Generate exactly 3 scenes as one continuous short story. Invent a consistent character who appears across scenes.`,
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
      character_name: string;
      dialogue: string;
      expected_response: string;
      choices: Array<{ text: string; is_correct: boolean }>;
      teacher_note: string;
      grammar_focus: string;
      new_vocabulary: string[];
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
      new_vocabulary: s.new_vocabulary,
      grammar_focus: s.grammar_focus,
      teacher_note: s.teacher_note,
      audio_direction: "",
      // Generate illustration prompt from scene context — avoids extra Groq tokens
      illustration_prompt: `${s.english_context} ${s.character_name} speaking French. Soft watercolour, warm Parisian palette.`,
      goal: "",
    })),
  };
}
