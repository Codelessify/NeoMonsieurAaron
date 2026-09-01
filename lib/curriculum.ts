import type { Unit, LearnerInventory } from "@/types";

// ─── Starter vocabulary that A0 learners know from day one ───────────────────
export const STARTER_INVENTORY: LearnerInventory = {
  verbs: ["être", "avoir"],
  nouns: ["bonjour", "merci", "oui", "non"],
  sentence_patterns: [],
  question_patterns: [],
  time_expressions: [],
  connectors: [],
  adjectives: [],
};

// ─── Location-based landmarks for context injection ──────────────────────────
// Maps city names to recognizable local landmarks/areas for personalized prompts.
export const LOCATION_LANDMARKS: Record<string, string[]> = {
  ilorin: ["Tanke", "Challenge", "Unilorin", "Sabo"],
  lagos: ["Victoria Island", "Ikoyi", "Lekki", "Surulere", "Badagry"],
  abuja: ["Wuse", "Asokoro", "Maitama", "Gwarimpa"],
  paris: ["le Marais", "Champs-Élysées", "Montmartre", "le Quartier Latin"],
  marseille: ["le Vieux-Port", "Le Panier", "Prado", "Cours Julien"],
  lyon: ["Vieux Lyon", "la Presqu'île", "Croix-Rousse", "Confluence"],
  newYork: ["Times Square", "Brooklyn", "Central Park", "SoHo"],
  london: ["Oxford Street", "Camden", "Soho", "Tower Bridge"],
  yaounde: ["Boumba", "Bonanjo", "Obili", "Molykoe"],
};

export function getLandmarkForLocation(location: string): string | null {
  const key = location.toLowerCase().trim();
  for (const [city, landmarks] of Object.entries(LOCATION_LANDMARKS)) {
    if (key.includes(city)) {
      return landmarks[Math.floor(Math.random() * landmarks.length)];
    }
  }
  return null;
}

// ─── Curriculum ───────────────────────────────────────────────────────────────
// Each unit contains lessons. Each lesson has a fixed pedagogical objective.
// The AI generates the actual episode content from this blueprint.
export const CURRICULUM: Unit[] = [
  {
    id: "unit-1",
    title: "Premiers Pas",
    level: "A0",
    order: 1,
    theme: "first-steps",
    lessons: [
      {
        id: "lesson-1-1",
        unit_id: "unit-1",
        order: 1,
        title: "Au Marché",
        objective: "Express movement using aller + destination",
        level: "A0",
        theme: "market",
        target_phrases: ["Je vais au marché.", "Où vas-tu ?"],
        canonical_episode_id: null,
      },
      {
        id: "lesson-1-2",
        unit_id: "unit-1",
        order: 2,
        title: "Au Café",
        objective: "Order food and drinks using voudrais",
        level: "A1",
        theme: "cafe",
        target_phrases: ["Je voudrais un café.", "S'il vous plaît.", "Merci beaucoup."],
        canonical_episode_id: null,
      },
      {
        id: "lesson-1-3",
        unit_id: "unit-1",
        order: 3,
        title: "Se Présenter",
        objective: "Introduce yourself — name, origin, occupation",
        level: "A1",
        theme: "introductions",
        target_phrases: ["Je m'appelle...", "Je suis de...", "Je suis étudiant(e)."],
        canonical_episode_id: null,
      },
      {
        id: "lesson-1-4",
        unit_id: "unit-1",
        order: 4,
        title: "La Boulangerie",
        objective: "Buy items and ask for prices",
        level: "A1",
        theme: "bakery",
        target_phrases: ["Combien ça coûte ?", "C'est combien ?", "Je prends ça."],
        canonical_episode_id: null,
      },
    ],
  },
  {
    id: "unit-2",
    title: "La Vie Quotidienne",
    level: "A1",
    order: 2,
    theme: "daily-life",
    lessons: [
      {
        id: "lesson-2-1",
        unit_id: "unit-2",
        order: 1,
        title: "Le Matin",
        objective: "Describe morning routines using reflexive verbs",
        level: "A1",
        theme: "morning-routine",
        target_phrases: ["Je me lève à...", "Je me douche.", "Je prends mon petit-déjeuner."],
        canonical_episode_id: null,
      },
      {
        id: "lesson-2-2",
        unit_id: "unit-2",
        order: 2,
        title: "Le Transport",
        objective: "Navigate public transport — ask for directions",
        level: "A2",
        theme: "transport",
        target_phrases: ["Où est la station de métro ?", "Je prends le bus.", "C'est loin ?"],
        canonical_episode_id: null,
      },
      {
        id: "lesson-2-3",
        unit_id: "unit-2",
        order: 3,
        title: "Chez le Médecin",
        objective: "Describe symptoms and make a doctor appointment",
        level: "A2",
        theme: "doctor",
        target_phrases: ["J'ai mal à la tête.", "Je ne me sens pas bien.", "J'ai besoin d'un médecin."],
        canonical_episode_id: null,
      },
    ],
  },
  {
    id: "unit-3",
    title: "En Ville",
    level: "A2",
    order: 3,
    theme: "city-life",
    lessons: [
      {
        id: "lesson-3-1",
        unit_id: "unit-3",
        order: 1,
        title: "Au Restaurant",
        objective: "Order a full meal, handle dietary requirements",
        level: "A2",
        theme: "restaurant",
        target_phrases: ["Je voudrais la table pour deux.", "Qu'est-ce que vous recommandez ?", "L'addition, s'il vous plaît."],
        canonical_episode_id: null,
      },
      {
        id: "lesson-3-2",
        unit_id: "unit-3",
        order: 2,
        title: "À l'Hôtel",
        objective: "Check in/out of a hotel, handle a problem",
        level: "B1",
        theme: "hotel",
        target_phrases: ["J'ai une réservation.", "Il y a un problème avec ma chambre.", "À quelle heure est le check-out ?"],
        canonical_episode_id: null,
      },
    ],
  },
];

export function getLessonById(id: string) {
  for (const unit of CURRICULUM) {
    const lesson = unit.lessons.find((l) => l.id === id);
    if (lesson) return { lesson, unit };
  }
  return null;
}

export function getKnownInventoryForLesson(lessonId: string): LearnerInventory {
  // Collect all target phrases from lessons that come before this one
  const allLessons: typeof CURRICULUM[0]["lessons"][0][] = [];
  for (const unit of CURRICULUM) {
    allLessons.push(...unit.lessons);
  }

  const idx = allLessons.findIndex((l) => l.id === lessonId);
  const prior = allLessons.slice(0, idx);

  const inventory: LearnerInventory = { ...STARTER_INVENTORY };

  for (const lesson of prior) {
    // Extract words from target phrases and add to inventory
    for (const phrase of lesson.target_phrases) {
      const words = phrase
        .toLowerCase()
        .replace(/[.,!?']/g, " ")
        .split(/\s+/)
        .filter(Boolean);
      inventory.sentence_patterns.push(phrase);
      // Basic heuristic: short common words → connectors/time; longer → nouns/verbs
      for (const w of words) {
        if (["et", "mais", "ou", "donc", "avec", "pour", "par", "de", "du", "la", "le", "les", "un", "une"].includes(w)) {
          if (!inventory.connectors.includes(w)) inventory.connectors.push(w);
        } else if (["aujourd'hui", "demain", "hier", "ce", "matin", "soir", "maintenant"].includes(w)) {
          if (!inventory.time_expressions.includes(w)) inventory.time_expressions.push(w);
        } else if (w.length > 3) {
          if (!inventory.nouns.includes(w)) inventory.nouns.push(w);
        }
      }
    }
  }

  return inventory;
}

// ─── Chambre: inventory from completed lessons ───────────────────────────────
// Builds the learner's vocabulary from the lessons they have completed
// (plus the starter inventory). Used by the Chambre free-conversation mode.
export function getInventoryFromLessons(completedLessonIds: string[]): LearnerInventory {
  const inventory: LearnerInventory = {
    verbs: [...STARTER_INVENTORY.verbs],
    nouns: [...STARTER_INVENTORY.nouns],
    sentence_patterns: [],
    question_patterns: [],
    time_expressions: [],
    connectors: [],
    adjectives: [],
  };

  const completed = new Set(completedLessonIds);

  for (const unit of CURRICULUM) {
    for (const lesson of unit.lessons) {
      if (!completed.has(lesson.id)) continue;
      for (const phrase of lesson.target_phrases) {
        const words = phrase
          .toLowerCase()
          .replace(/[.,!?']/g, " ")
          .split(/\s+/)
          .filter(Boolean);
        inventory.sentence_patterns.push(phrase);
        for (const w of words) {
          if (["et", "mais", "ou", "donc", "avec", "pour", "par", "de", "du", "la", "le", "les", "un", "une"].includes(w)) {
            if (!inventory.connectors.includes(w)) inventory.connectors.push(w);
          } else if (["aujourd'hui", "demain", "hier", "ce", "matin", "soir", "maintenant"].includes(w)) {
            if (!inventory.time_expressions.includes(w)) inventory.time_expressions.push(w);
          } else if (w.length > 3) {
            if (!inventory.nouns.includes(w)) inventory.nouns.push(w);
          }
        }
      }
    }
  }

  return inventory;
}

// Flat list of every known word — used to constrain the AI in Chambre mode.
export function getKnownWordList(inventory: LearnerInventory): string[] {
  return [
    ...inventory.verbs,
    ...inventory.nouns,
    ...inventory.connectors,
    ...inventory.adjectives,
    ...inventory.time_expressions,
  ];
}
