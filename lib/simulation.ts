import type { ChambreMessage, LearnerInventory, ScenarioId } from "@/types";
import { SCENARIOS } from "@/lib/scenarios";
import {
  chatWithRetry,
  vocabularyConstraint,
} from "@/lib/chambre";

type ContextLanguage = "english" | "french" | "mixed";

function contextInstruction(contextLanguage: ContextLanguage): string {
  return contextLanguage === "french"
    ? "Explanations must be written in French."
    : contextLanguage === "mixed"
    ? "Explanations must be written in a mix of English and French (mostly English)."
    : "Explanations must be written in English.";
}

function scenarioSystemPrompt(
  scenarioId: ScenarioId,
  inventory: LearnerInventory,
  contextLanguage: ContextLanguage,
  placeName?: string,
  isOpening = false
): string {
  const scenario = SCENARIOS[scenarioId];
  const placeLine = placeName
    ? `\nYou are working at "${placeName}". If natural, mention the place by name.`
    : "";
  const openingLine = isOpening
    ? "\nThis is the FIRST message: greet the learner warmly in character and start the interaction (welcome them, ask what they need, or offer help)."
    : "";

  return `You are ${scenario.npcName}, the ${scenario.role}, roleplaying with a beginner French learner inside a simulation set in a ${scenario.label}. Stay fully in character at all times.

${scenario.npcIntro}
${placeLine}
${openingLine}

${vocabularyConstraint(inventory, scenario.keyVocabulary)}
${contextInstruction(contextLanguage)}

CRITICAL BEHAVIOUR:
- You are ${scenario.npcName} at the ${scenario.label}, NOT a French teacher. Never break character, never correct the learner, never explain grammar, never write English.
- The learner drives the scene: react FIRST and specifically to what they just said or asked, then gently guide one small step towards the goal.
- VARY YOUR LINES: never repeat a sentence or question you already used in this conversation, and vary your openers (never start two messages with the same word).
- React with real personality (warmth, humour, mild impatience if they take long) so the scene feels alive.
- If the learner writes in English or in broken French, understand the intent and respond in simple French using only the allowed words.
- If the learner is stuck, ask a simple question from the allowed vocabulary to help them.
- Reply with ONLY your short French message (1-2 sentences), as spoken dialogue.`;
}

// ─── Simulation opening ──────────────────────────────────────────────────────
const FALLBACK_OPENINGS: Record<ScenarioId, string> = {
  station: "Bonjour ! Vous voulez du carburant ?",
  banque: "Bonjour ! Je peux vous aider ?",
  cafe: "Bonjour ! Qu'est-ce que vous voulez ?",
  boulangerie: "Bonjour ! Vous voulez du pain ?",
  supermarche: "Bonjour ! C'est tout pour vous ?",
  pharmacie: "Bonjour ! Vous n'êtes pas bien ?",
  marche: "Bonjour ! Ils sont beaux, mes fruits !",
  restaurant: "Bonjour ! Vous voulez une table ?",
  gare: "Bonjour ! Vous allez où ?",
};

export async function generateSimulationOpening(
  scenarioId: ScenarioId,
  inventory: LearnerInventory,
  contextLanguage: ContextLanguage = "english",
  placeName?: string
): Promise<string> {
  const raw = await chatWithRetry(
    [
      {
        role: "system",
        content: scenarioSystemPrompt(
          scenarioId,
          inventory,
          contextLanguage,
          placeName,
          true
        ),
      },
    ],
    0.9
  );

  if (!raw) {
    console.error("[sim] Groq returned empty opening — using fallback");
    return FALLBACK_OPENINGS[scenarioId];
  }
  return stripQuotes(raw);
}

// ─── Simulation reply ────────────────────────────────────────────────────────
const FALLBACK_REPLIES: Record<ScenarioId, string> = {
  station: "D'accord. Et avec ça ?",
  banque: "D'accord, un moment, s'il vous plaît.",
  cafe: "Très bien ! Et avec ça ?",
  boulangerie: "Très bien ! Et avec ça ?",
  supermarche: "D'accord... c'est tout ?",
  pharmacie: "D'accord. Vous avez encore mal ?",
  marche: "Très bien ! Vous voulez quoi ?",
  restaurant: "Très bien ! Et comme boisson ?",
  gare: "D'accord. Pour quelle heure ?",
};

export async function generateSimulationReply(
  scenarioId: ScenarioId,
  messages: ChambreMessage[],
  inventory: LearnerInventory,
  contextLanguage: ContextLanguage = "english",
  placeName?: string
): Promise<string> {
  const raw = await chatWithRetry(
    [
      {
        role: "system",
        content: scenarioSystemPrompt(
          scenarioId,
          inventory,
          contextLanguage,
          placeName,
          false
        ),
      },
      ...messages.map((m) => ({
        role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
        content: m.text,
      })),
    ],
    1.0
  );

  if (!raw) {
    console.error("[sim] Groq returned empty reply — using fallback");
    return FALLBACK_REPLIES[scenarioId];
  }
  return stripQuotes(raw);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function stripQuotes(text: string): string {
  return text.replace(/^["«»“”\s]+|["«»“”\s]+$/g, "");
}