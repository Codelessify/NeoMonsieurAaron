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

const MODEL = "openai/gpt-oss-20b"; // supports json_schema structured outputs, 250K TPM free tier

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

function buildSystemPrompt(): string {
  return `You are a French curriculum designer. Create one coherent conversational episode for a French learning app.

Rules:
1. Build ONE continuous story — each scene leads naturally to the next.
2. Target phrase(s) must be the MOST NATURAL response in context.
3. Use ONLY vocabulary from the learner's known inventory. Introduce at most 2 new words per scene.
4. Distractors must be grammatically correct but clearly less appropriate than the correct answer.
5. The "speaker" field is always French — never English.
6. "goal" is internal teaching intent only.
7. "illustration_prompt": soft watercolour scene, no text, warm Parisian palette.
8. "audio_direction": brief tone/speed cue for TTS (e.g. "warm, moderate pace").
9. "teacher_note": 1-2 sentences on grammar or cultural context.
10. Scenes progress from recognition (easier) to production (harder).`;
}

function buildUserPrompt(lesson: Lesson, inventory: LearnerInventory): string {
  return `Objective: ${lesson.objective}
Theme: ${lesson.theme}

Target phrases (at least one must appear as correct answer in multiple scenes):
${lesson.target_phrases.map((p) => `- ${p}`).join("\n")}

Known vocabulary:
Verbs: ${inventory.verbs.join(", ") || "none"}
Nouns: ${inventory.nouns.slice(0, 20).join(", ") || "none"}
Patterns: ${inventory.sentence_patterns.slice(0, 6).join(", ") || "none"}
Questions: ${inventory.question_patterns.join(", ") || "none"}
Time: ${inventory.time_expressions.join(", ") || "none"}
Connectors: ${inventory.connectors.join(", ") || "none"}

Generate exactly 10 scenes. Start in a familiar home setting, build toward a situation requiring the target phrase(s), include one named character, end with a satisfying resolution.`;
}

export async function generateEpisode(
  lesson: Lesson,
  inventory: LearnerInventory
): Promise<GroqEpisodeOutput> {
  const completion = await getGroq().chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildUserPrompt(lesson, inventory) },
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
    max_tokens: 6000,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Groq returned empty content");

  return JSON.parse(raw) as GroqEpisodeOutput;
}
