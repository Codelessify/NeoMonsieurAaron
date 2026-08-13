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

// Minimal schema — only fields the player actually renders
const EPISODE_SCHEMA = {
  type: "object" as const,
  additionalProperties: false,
  required: ["episode_title", "theme", "estimated_duration_minutes", "scenes"],
  properties: {
    episode_title: { type: "string" as const },
    theme: { type: "string" as const },
    estimated_duration_minutes: { type: "integer" as const },
    scenes: {
      type: "array" as const,
      items: {
        type: "object" as const,
        additionalProperties: false,
        required: [
          "scene_number",
          "english_context",
          "speaker",
          "expected_response",
          "choices",
          "new_vocabulary",
          "grammar_focus",
          "teacher_note",
          "illustration_prompt",
        ],
        properties: {
          scene_number: { type: "integer" as const },
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
          new_vocabulary: { type: "array" as const, items: { type: "string" as const } },
          grammar_focus: { type: "string" as const },
          teacher_note: { type: "string" as const },
          illustration_prompt: { type: "string" as const },
        },
      },
    },
  },
};

export async function generateEpisode(
  lesson: Lesson,
  inventory: LearnerInventory
): Promise<GroqEpisodeOutput> {
  const systemPrompt = `You are a French curriculum designer. Create a short conversational episode for a French learning app.

Rules:
1. Target phrase(s) must be the MOST NATURAL response in context.
2. Use ONLY vocabulary from the known inventory. Introduce at most 1 new word per scene.
3. Distractors must be grammatically correct but clearly less appropriate than the correct answer.
4. "speaker" is the NPC's French spoken line — never English.
5. "illustration_prompt": soft watercolour, no text, warm Parisian palette, 1 sentence.
6. "teacher_note": 1 short sentence on grammar or culture.
7. "grammar_focus": the grammar point in 2-4 words (e.g. "aller + destination").
8. Scenes go from easy recognition (1-2) to active production (4-5).`;

  const userPrompt = `Objective: ${lesson.objective}
Theme: ${lesson.theme}
Target phrases: ${lesson.target_phrases.join(", ")}

Vocabulary: verbs=${inventory.verbs.join(",")||"none"} nouns=${inventory.nouns.slice(0,10).join(",")||"none"} patterns=${inventory.sentence_patterns.slice(0,3).join(",")||"none"}

Generate exactly 5 scenes as one continuous story. Include one named character.`;

  const completion = await getGroq().chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
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
    max_tokens: 3000,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Groq returned empty content");

  // Fill in unused fields so the Episode type stays consistent
  const parsed = JSON.parse(raw) as Omit<GroqEpisodeOutput, "scenes"> & {
    scenes: Array<Omit<GroqEpisodeOutput["scenes"][number], "goal" | "french_context" | "audio_direction">>;
  };

  return {
    ...parsed,
    scenes: parsed.scenes.map((s) => ({
      ...s,
      goal: "",
      french_context: "",
      audio_direction: "",
    })),
  };
}
