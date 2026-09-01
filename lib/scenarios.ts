import type { ScenarioId } from "@/types";

// ─── Ville scenarios ─────────────────────────────────────────────────────────
// Each scenario is a real-life place the learner can enter on the map and play
// a roleplay simulation in French. The catalog is shared between the client
// (map markers, suggestion chips) and the server (Groq prompts).
export interface Scenario {
  id: ScenarioId;
  emoji: string;
  label: string;             // French display name (marker label / UI)
  role: string;              // the NPC the AI plays
  npcName: string;           // character name used in prompts
  missionFr: string;         // learner's mission, shown in French
  missionEn: string;         // learner's mission, shown in English
  npcIntro: string;          // English context for the AI's opening
  // Extra words the AI may use (place-specific vocabulary the learner needs).
  keyVocabulary: string[];
  // Clickable suggestion chips for beginners.
  suggestions: string[];
  // OpenStreetMap tags used to find real places nearby (Overpass API).
  osmFilters: Array<{ key: string; value: string }>;
  // Fallback names when no real place is found.
  fallbackNames: string[];
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  station: {
    id: "station",
    emoji: "⛽",
    label: "Station-service",
    role: "pompiste (petrol station attendant)",
    npcName: "Le pompiste",
    missionFr: "Acheter de l'essence et payer",
    missionEn: "Buy fuel and pay",
    npcIntro:
      "The learner drives up to a petrol station and you greet them at the pump. Guide them to choose their fuel (sans-plomb or gazole), say how many litres (or 'faire le plein'), and pay (cash or card).",
    keyVocabulary: [
      "essence", "gazole", "diesel", "sans-plomb", "litres", "le plein",
      "pompe", "carte", "espèces", "prix", "versez", "réservoir",
    ],
    suggestions: [
      "Bonjour, je voudrais du sans-plomb.",
      "Faire le plein, s'il vous plaît.",
      "Ça fait combien ?",
      "Je peux payer par carte ?",
    ],
    osmFilters: [{ key: "amenity", value: "fuel" }],
    fallbackNames: ["Station Total", "Station Shell", "Station Esso"],
  },
  banque: {
    id: "banque",
    emoji: "🏦",
    label: "Banque",
    role: "employé de banque (bank clerk)",
    npcName: "L'employé de banque",
    missionFr: "Déposer de l'argent et vérifier le solde",
    missionEn: "Deposit money and check the balance",
    npcIntro:
      "The learner walks into a bank branch. You are the clerk at the counter. Help them deposit money, check their account balance, or withdraw cash. Ask for their card or account number.",
    keyVocabulary: [
      "banque", "compte", "dépôt", "déposer", "retirer", "solde",
      "argent", "carte bancaire", "guichet", "virement", "euros", "code",
    ],
    suggestions: [
      "Bonjour, je voudrais déposer de l'argent.",
      "Je voudrais retirer cent euros.",
      "Quel est mon solde ?",
      "Voici ma carte.",
    ],
    osmFilters: [{ key: "amenity", value: "bank" }],
    fallbackNames: ["BNP Paribas", "Société Générale", "Crédit Agricole"],
  },
  cafe: {
    id: "cafe",
    emoji: "☕",
    label: "Café",
    role: "serveur / serveuse (waiter)",
    npcName: "Le serveur",
    missionFr: "Commander un café et payer l'addition",
    missionEn: "Order a coffee and pay the bill",
    npcIntro:
      "The learner sits down at a café terrace. You are the waiter. Take their order (coffee, tea, croissant…), bring it, then bring the bill (l'addition).",
    keyVocabulary: [
      "café", "thé", "croissant", "eau", "addition", "table",
      "commander", "l'ardoise", "pourboire", "chaud", "froid", "sucre",
    ],
    suggestions: [
      "Bonjour, je voudrais un café, s'il vous plaît.",
      "Un croissant aussi, merci.",
      "L'addition, s'il vous plaît.",
      "Merci beaucoup !",
    ],
    osmFilters: [{ key: "amenity", value: "cafe" }],
    fallbackNames: ["Café de la Paix", "Le Petit Café", "Café Central"],
  },
  boulangerie: {
    id: "boulangerie",
    emoji: "🥖",
    label: "Boulangerie",
    role: "boulanger / boulangère (baker)",
    npcName: "La boulangère",
    missionFr: "Acheter une baguette et des croissants",
    missionEn: "Buy a baguette and croissants",
    npcIntro:
      "The learner enters your bakery. Greet them, ask what they want (une baguette, des croissants, un pain au chocolat), tell them the price, and say goodbye politely.",
    keyVocabulary: [
      "baguette", "pain", "croissants", "pain au chocolat", "prix",
      "euros", "ça sera tout", "bien cuite", "pas cuite", "votre monnaie",
    ],
    suggestions: [
      "Bonjour, une baguette, s'il vous plaît.",
      "Deux croissants aussi.",
      "Ça fait combien ?",
      "Merci, au revoir !",
    ],
    osmFilters: [{ key: "shop", value: "bakery" }],
    fallbackNames: ["Boulangerie Saint-Michel", "La Mie Dorée", "Aux Pains Perdus"],
  },
  supermarche: {
    id: "supermarche",
    emoji: "🛒",
    label: "Supermarché",
    role: "caissier / caissière (cashier)",
    npcName: "La caissière",
    missionFr: "Payer les courses à la caisse",
    missionEn: "Pay for groceries at the checkout",
    npcIntro:
      "The learner arrives at your checkout with their groceries. Scan their items, tell them the total, ask how they pay (card or cash), and hand over the receipt.",
    keyVocabulary: [
      "caisse", "panier", "total", "tickets", "sacs", "carte de fidélité",
      "espèces", "rendez la monnaie", "offres", "fruits", "légumes",
    ],
    suggestions: [
      "Bonjour, je voudrais payer.",
      "Je peux payer par carte ?",
      "Un sac, s'il vous plaît.",
      "Merci, au revoir !",
    ],
    osmFilters: [{ key: "shop", value: "supermarket" }],
    fallbackNames: ["Carrefour City", "Monoprix", "Super U"],
  },
  pharmacie: {
    id: "pharmacie",
    emoji: "💊",
    label: "Pharmacie",
    role: "pharmacien / pharmacienne (pharmacist)",
    npcName: "Le pharmacien",
    missionFr: "Demander un médicament à la pharmacie",
    missionEn: "Ask for medicine at the pharmacy",
    npcIntro:
      "The learner comes into your pharmacy feeling unwell. Ask what's wrong (headache, cough, sore throat…), recommend a simple medicine, explain the price and say get well soon.",
    keyVocabulary: [
      "mal", "tête", "toux", "gorge", "fièvre", "médicament",
      "ordonnance", "comprimés", "sirop", "dose", "malade", "guérir",
    ],
    suggestions: [
      "Bonjour, j'ai mal à la tête.",
      "Je voudrais un médicament.",
      "C'est combien ?",
      "Merci beaucoup, au revoir.",
    ],
    osmFilters: [{ key: "amenity", value: "pharmacy" }],
    fallbackNames: ["Pharmacie Centrale", "Pharmacie de la Gare", "Pharmacie du Marché"],
  },
  marche: {
    id: "marche",
    emoji: "🧺",
    label: "Marché",
    role: "vendeur / vendeuse du marché (market vendor)",
    npcName: "Le vendeur",
    missionFr: "Acheter des fruits et légumes au marché",
    missionEn: "Buy fruit and vegetables at the market",
    npcIntro:
      "The learner stops at your market stall full of fruit and vegetables. Invite them to look, ask what they want and how much, tell them the price per kilo, and be cheerful and persuasive.",
    keyVocabulary: [
      "tomates", "pommes", "bananes", "légumes", "fruits", "kilo",
      "demi-kilo", "frais", "prix", "mûres", "goûter", "plus",
    ],
    suggestions: [
      "Bonjour ! Je voudrais un kilo de tomates.",
      "C'est combien, les pommes ?",
      "Ils sont frais ?",
      "Voilà, merci !",
    ],
    osmFilters: [{ key: "amenity", value: "marketplace" }],
    fallbackNames: ["Marché Central", "Marché de la Place", "Marché Couvert"],
  },
  restaurant: {
    id: "restaurant",
    emoji: "🍽️",
    label: "Restaurant",
    role: "serveur / serveuse (waiter)",
    npcName: "La serveuse",
    missionFr: "Commander un plat et demander l'addition",
    missionEn: "Order a dish and ask for the bill",
    npcIntro:
      "The learner arrives at your restaurant for dinner. Welcome them, give them a table, present today's dishes (plat du jour), take their order and dessert choice, then bring the bill.",
    keyVocabulary: [
      "menu", "plat du jour", "entrée", "dessert", "réservation",
      "boisson", "verre d'eau", "délicieux", "l'addition", "pourboire",
    ],
    suggestions: [
      "Bonjour, une table pour deux, s'il vous plaît.",
      "Qu'est-ce que le plat du jour ?",
      "Je voudrais le poulet, s'il vous plaît.",
      "L'addition, s'il vous plaît.",
    ],
    osmFilters: [{ key: "amenity", value: "restaurant" }],
    fallbackNames: ["Le Petit Bistrot", "Chez Marie", "La Table Ronde"],
  },
  gare: {
    id: "gare",
    emoji: "🚉",
    label: "Gare",
    role: "agent de la gare (train station agent)",
    npcName: "L'agent de la gare",
    missionFr: "Acheter un billet de train",
    missionEn: "Buy a train ticket",
    npcIntro:
      "The learner is at the train station ticket counter. Ask where they want to go, at what time, one-way or return, then tell them the price and the platform number.",
    keyVocabulary: [
      "billet", "train", "aller", "retour", "aller-retour", "quai",
      "horaire", "prochain", "siège", "réduction", "composter", "voie",
    ],
    suggestions: [
      "Bonjour, je voudrais un billet pour Paris.",
      "Aller simple ou aller-retour ?",
      "Quel est le prix ?",
      "C'est quel quai ?",
    ],
    osmFilters: [{ key: "railway", value: "station" }],
    fallbackNames: ["Gare Centrale", "Gare du Nord", "Gare Saint-Lazare"],
  },
};

export const SCENARIO_LIST: Scenario[] = Object.values(SCENARIOS);
