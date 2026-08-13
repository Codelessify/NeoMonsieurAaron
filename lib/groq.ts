import Groq from "groq-sdk";
import type { GroqEpisodeOutput, LearnerInventory, Lesson } from "@/types";

// Lazy singleton — instantiated on first use so build-time collection
// doesn't throw when GROQ_API_KEY is absent.
let _groq: Groq | null = null;
function getGroq(): Groq {
  if (!_groq) {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
}

const MODEL = "openai/gpt-oss-20b"; // supports json_schema structured outputs

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
          "scene_number", "goal", "english_context", "french_context",
          "speaker", "expected_response", "choices", "new_vocabulary",
          "grammar_focus", "teacher_note", "audio_direction", "illustration_prompt",
        ],
        properties: {
          scene_number: { type: "integer" as const },
          goal: { type: "string" as const },
          english_context: { type: "string" as const },
          french_context: { type: "string" as const },
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
          audio_direction: { type: "string" as const },
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
4. The "speaker" field is always French — never English.
5. "goal" is internal teaching intent only.
6. "illustration_prompt": soft watercolour scene, no text, warm Parisian palette.
7. "audio_direction": brief tone/speed cue for TTS (e.g. "warm, moderate pace").
8. "teacher_note": 1 sentence on grammar or cultural context.
9. Scenes progress from recognition (scene 1-2) to production (scene 4-5).`;

  const userPrompt = `Objective: ${lesson.objective}
Theme: ${lesson.theme}
Target phrases: ${lesson.target_phrases.join(", ")}

Known vocabulary:
Verbs: ${inventory.verbs.join(", ") || "none"}
Nouns: ${inventory.nouns.slice(0, 12).join(", ") || "none"}
Patterns: ${inventory.sentence_patterns.slice(0, 4).join(", ") || "none"}
Connectors: ${inventory.connectors.join(", ") || "none"}

Generate exactly 5 scenes forming one continuous story. Start in a familiar setting, build toward using the target phrase(s), include one named character.`;

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
    max_tokens: 4000,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Groq returned empty content");

  return JSON.parse(raw) as GroqEpisodeOutput;
}
