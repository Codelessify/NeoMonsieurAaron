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

const MODEL = "llama-3.3-70b-specdec"; // supports json_schema structured outputs

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
      minItems: 10,
      maxItems: 10,
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
  return `You are an expert French curriculum designer with deep knowledge of Michel Thomas, Pimsleur, and Comprehensible Input methodology.

Your task is to create one coherent conversational episode for a French language learning app.

RULES — follow every rule exactly:
1. Build ONE continuous story. Each scene must naturally lead into the next.
2. The target phrase(s) must be the MOST NATURAL response in context — not just a possible response.
3. Use ONLY vocabulary from the learner's known inventory. Introduce at most 2 new words per scene.
4. Every distractor answer must be grammatically correct and plausible in context — but clearly less appropriate than the correct answer.
5. NEVER put English in the "speaker" field — the NPC always speaks French.
6. The "goal" field is for your internal teaching intent only — the learner never sees it.
7. The "illustration_prompt" should describe a soft watercolour scene for image generation. No text in image. Warm Parisian palette.
8. The "audio_direction" should be a brief tone/speed cue for text-to-speech synthesis (e.g. "warm and friendly, moderate pace").
9. The "teacher_note" should give a 1–2 sentence insight about the grammar or cultural context of the correct answer.
10. Scenes should progress from recognition (easier) to production (harder) across the episode.`;
}

function buildUserPrompt(lesson: Lesson, inventory: LearnerInventory): string {
  return `Lesson objective: ${lesson.objective}

Target phrase(s) — at least one must appear as the correct answer in multiple scenes:
${lesson.target_phrases.map((p) => `- ${p}`).join("\n")}

Learner's known vocabulary:
Verbs: ${inventory.verbs.join(", ") || "none"}
Nouns: ${inventory.nouns.slice(0, 30).join(", ") || "none"}
Sentence patterns: ${inventory.sentence_patterns.slice(0, 10).join(", ") || "none"}
Question patterns: ${inventory.question_patterns.join(", ") || "none"}
Time expressions: ${inventory.time_expressions.join(", ") || "none"}
Connectors: ${inventory.connectors.join(", ") || "none"}

Episode theme: ${lesson.theme}

Story requirements:
- Start in a home or familiar environment
- Build naturally toward a situation that requires the target phrase(s)
- Include at least one exchange with a named character
- End with a satisfying resolution
- Each scene should feel like a mini-moment in a real conversation

Generate exactly 10 scenes.`;
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
    max_tokens: 4096,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Groq returned empty content");

  return JSON.parse(raw) as GroqEpisodeOutput;
}
