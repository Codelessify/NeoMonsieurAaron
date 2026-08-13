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

// Schema for a batch of scenes (used for two 5-scene calls)
const SCENES_BATCH_SCHEMA = {
  type: "object" as const,
  additionalProperties: false,
  required: ["scenes"],
  properties: {
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

// Schema for episode metadata (title, theme, duration)
const EPISODE_META_SCHEMA = {
  type: "object" as const,
  additionalProperties: false,
  required: ["episode_title", "theme", "estimated_duration_minutes", "story_outline"],
  properties: {
    episode_title: { type: "string" as const },
    theme: { type: "string" as const },
    estimated_duration_minutes: { type: "integer" as const },
    story_outline: { type: "string" as const },
  },
};

function buildSystemPrompt(): string {
  return `You are a French curriculum designer creating episodes for a French learning app.

Rules:
1. Target phrase(s) must be the MOST NATURAL response in context.
2. Use ONLY vocabulary from the learner's known inventory. Introduce at most 2 new words per scene.
3. Distractors must be grammatically correct but clearly less appropriate than the correct answer.
4. The "speaker" field is always French — never English.
5. "goal" is internal teaching intent only.
6. "illustration_prompt": soft watercolour scene, no text, warm Parisian palette.
7. "audio_direction": brief tone/speed cue for TTS (e.g. "warm, moderate pace").
8. "teacher_note": 1-2 sentences on grammar or cultural context.`;
}

function buildVocabContext(inventory: LearnerInventory): string {
  return `Known vocabulary:
Verbs: ${inventory.verbs.join(", ") || "none"}
Nouns: ${inventory.nouns.slice(0, 15).join(", ") || "none"}
Patterns: ${inventory.sentence_patterns.slice(0, 5).join(", ") || "none"}
Connectors: ${inventory.connectors.join(", ") || "none"}`;
}

async function generateScenesBatch(
  lesson: Lesson,
  inventory: LearnerInventory,
  sceneNumbers: number[],
  storyContext: string
): Promise<GroqEpisodeOutput["scenes"]> {
  const isFirst = sceneNumbers[0] === 1;
  const userPrompt = `Objective: ${lesson.objective}
Theme: ${lesson.theme}
Target phrases: ${lesson.target_phrases.join(", ")}

${buildVocabContext(inventory)}

Story context: ${storyContext}

Generate scenes ${sceneNumbers[0]}–${sceneNumbers[sceneNumbers.length - 1]} (${sceneNumbers.length} scenes).
${isFirst
    ? "These are the opening scenes — start in a familiar home setting, introduce a named character, begin easy (recognition tasks)."
    : "These are the closing scenes — build toward production tasks, include the target phrase(s) as correct answers, end with a satisfying resolution."
  }
Each scene must flow naturally from the previous one.`;

  const completion = await getGroq().chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "scenes_batch",
        strict: true,
        schema: SCENES_BATCH_SCHEMA,
      },
    },
    temperature: 0.8,
    max_tokens: 3500,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Groq returned empty content for scenes batch");
  return (JSON.parse(raw) as { scenes: GroqEpisodeOutput["scenes"] }).scenes;
}

export async function generateEpisode(
  lesson: Lesson,
  inventory: LearnerInventory
): Promise<GroqEpisodeOutput> {
  // Step 1: generate episode metadata + story outline
  const metaCompletion = await getGroq().chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      {
        role: "user",
        content: `Create a short episode plan for a French lesson.
Objective: ${lesson.objective}
Theme: ${lesson.theme}
Target phrases: ${lesson.target_phrases.join(", ")}

Provide: episode_title, theme, estimated_duration_minutes (5-10), and a 2-3 sentence story_outline describing a 10-scene episode arc.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "episode_meta",
        strict: true,
        schema: EPISODE_META_SCHEMA,
      },
    },
    temperature: 0.8,
    max_tokens: 300,
  });

  const metaRaw = metaCompletion.choices[0]?.message?.content;
  if (!metaRaw) throw new Error("Groq returned empty content for episode meta");
  const meta = JSON.parse(metaRaw) as {
    episode_title: string;
    theme: string;
    estimated_duration_minutes: number;
    story_outline: string;
  };

  // Step 2: generate scenes 1–5 and 6–10 in parallel
  const [firstHalf, secondHalf] = await Promise.all([
    generateScenesBatch(lesson, inventory, [1, 2, 3, 4, 5], meta.story_outline),
    generateScenesBatch(lesson, inventory, [6, 7, 8, 9, 10], meta.story_outline),
  ]);

  return {
    episode_title: meta.episode_title,
    theme: meta.theme,
    estimated_duration_minutes: meta.estimated_duration_minutes,
    scenes: [...firstHalf, ...secondHalf],
  };
}
