// ─── CEFR Levels ────────────────────────────────────────────────────────────
export type CEFRLevel = "A0" | "A1" | "A2" | "B1" | "B2";

// ─── Learner Vocabulary Inventory ───────────────────────────────────────────
export interface InventoryItem {
  word: string;
  type: "verb" | "noun" | "pattern" | "question_pattern" | "time" | "connector" | "adjective" | "other";
  english?: string;
  times_seen: number;
  last_seen: string; // ISO date
}

export interface LearnerInventory {
  verbs: string[];
  nouns: string[];
  sentence_patterns: string[];
  question_patterns: string[];
  time_expressions: string[];
  connectors: string[];
  adjectives: string[];
}

// ─── Episode / Scene ─────────────────────────────────────────────────────────
export interface AnswerChoice {
  text: string;
  is_correct: boolean;
}

export interface Scene {
  scene_number: number;
  goal: string;                   // teaching intent (never shown to user)
  english_context: string;        // situation in English
  french_context: string;         // situation in French
  speaker: string;                // NPC's spoken French line
  expected_response: string;      // target phrase
  choices: AnswerChoice[];        // exactly 3
  new_vocabulary: string[];
  grammar_focus: string;
  teacher_note: string;
  audio_direction: string;        // tone cue for TTS
  illustration_prompt: string;    // image generation prompt
  // Media (populated after generation)
  illustration_url?: string;
  audio_url?: string;
}

export interface Episode {
  id: string;
  lesson_id: string;
  user_id: string | null;         // null = canonical
  episode_title: string;
  theme: string;
  estimated_duration_minutes: number;
  scenes: Scene[];
  created_at: string;
}

// ─── Lesson / Unit / Curriculum ──────────────────────────────────────────────
export interface LessonBlueprint {
  target_phrases: string[];
  story_requirements: string[];
  level: CEFRLevel;
  theme: string;
}

export interface Lesson {
  id: string;
  unit_id: string;
  order: number;
  title: string;
  objective: string;
  level: CEFRLevel;
  theme: string;
  target_phrases: string[];
  canonical_episode_id: string | null;
}

export interface Unit {
  id: string;
  title: string;
  level: CEFRLevel;
  order: number;
  theme: string;
  lessons: Lesson[];
}

// ─── Learner Progress ────────────────────────────────────────────────────────
export interface LessonProgress {
  lesson_id: string;
  completed: boolean;
  best_score: number;            // 0–100
  last_played_at: string | null;
  scenes_correct: number;
  total_scenes: number;
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  level: CEFRLevel;
  xp: number;
  streak: number;
  last_active: string;
  daily_goal_minutes: number;
  context_language: "english" | "french" | "mixed";
  audio_autoplay: boolean;
}

// ─── Episode Player State ────────────────────────────────────────────────────
export type SceneStatus = "idle" | "answered_correct" | "answered_wrong";

export interface EpisodePlayerState {
  episode: Episode | null;
  current_scene_index: number;
  scene_status: SceneStatus;
  selected_choice_index: number | null;
  correct_count: number;
  is_complete: boolean;
  is_loading: boolean;
  audio_playing: boolean;
}

// ─── API Request / Response ──────────────────────────────────────────────────
export interface GenerateEpisodeRequest {
  lesson_id: string;
  user_id?: string;               // omit for canonical generation
}

export interface GenerateEpisodeResponse {
  episode: Episode;
}

export interface GenerateImageRequest {
  scene_id: string;
  prompt: string;
  episode_id: string;
}

export interface GenerateTTSRequest {
  text: string;
  scene_id: string;
  episode_id: string;
  language?: string;
}

export interface GenerateTTSResponse {
  audio_url: string;
}

// ─── Groq Structured Output ──────────────────────────────────────────────────
export interface GroqEpisodeOutput {
  episode_title: string;
  theme: string;
  estimated_duration_minutes: number;
  scenes: Array<{
    scene_number: number;
    goal: string;
    english_context: string;
    french_context: string;
    speaker: string;
    expected_response: string;
    choices: Array<{ text: string; is_correct: boolean }>;
    new_vocabulary: string[];
    grammar_focus: string;
    teacher_note: string;
    audio_direction: string;
    illustration_prompt: string;
  }>;
}
