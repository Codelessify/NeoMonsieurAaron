import { create } from "zustand";
import type { EpisodePlayerState, Episode, SceneStatus, AnswerChoice } from "@/types";

interface EpisodePlayerStore extends EpisodePlayerState {
  loadEpisode: (episode: Episode) => void;
  selectChoice: (choice: AnswerChoice) => void;
  nextScene: () => void;
  resetPlayer: () => void;
  setAudioPlaying: (playing: boolean) => void;
}

const INITIAL_STATE: EpisodePlayerState = {
  episode: null,
  current_scene_index: 0,
  scene_status: "idle",
  selected_choice_index: null,
  correct_count: 0,
  is_complete: false,
  is_loading: false,
  audio_playing: false,
};

async function fetchAudioForScene(text: string): Promise<string | null> {
  try {
    const res = await fetch("/api/media/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { audio_url: string | null };
    return data.audio_url ?? null;
  } catch {
    return null;
  }
}

async function fetchImageForScene(prompt: string): Promise<string | null> {
  try {
    const res = await fetch("/api/media/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { url: string | null };
    return data.url ?? null;
  } catch {
    return null;
  }
}

// Persist the full episode (with media URLs) to Supabase so it's cached
async function persistEpisodeToSupabase(episode: Episode) {
  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.from("episodes").upsert({
      id: episode.id,
      lesson_id: episode.lesson_id,
      user_id: episode.user_id,
      episode_title: episode.episode_title,
      theme: episode.theme,
      estimated_duration_minutes: episode.estimated_duration_minutes,
      scenes: episode.scenes,
    }, { onConflict: "id" });
  } catch (err) {
    console.error("[persist-episode]", err);
  }
}

export const useEpisodePlayer = create<EpisodePlayerStore>((set, get) => ({
  ...INITIAL_STATE,

  loadEpisode: (episode) => {
    set({ ...INITIAL_STATE, episode, is_loading: false });

    // Fire TTS + image requests for all scenes in the background.
    // As each resolves, patch the url onto the scene in the store.
    episode.scenes.forEach((scene, i) => {
      // Skip fetching if audio_url already exists (cached episode)
      if (scene.audio_url) return;
      fetchAudioForScene(scene.dialogue ?? scene.speaker ?? "").then((audio_url) => {
        if (!audio_url) return;
        const current = get().episode;
        if (!current) return;
        const updatedScenes = current.scenes.map((s, j) =>
          j === i ? { ...s, audio_url } : s
        );
        const updatedEpisode = { ...current, scenes: updatedScenes };
        set({ episode: updatedEpisode, audio_playing: false });
        persistEpisodeToSupabase(updatedEpisode);
      });

      if (scene.illustration_prompt) {
        // Skip fetching if illustration_url already exists (cached episode)
        if (scene.illustration_url) return;
        fetchImageForScene(scene.illustration_prompt).then((illustration_url) => {
          if (!illustration_url) return;
          const current = get().episode;
          if (!current) return;
          const updatedScenes = current.scenes.map((s, j) =>
            j === i ? { ...s, illustration_url } : s
          );
          const updatedEpisode = { ...current, scenes: updatedScenes };
          set({ episode: updatedEpisode });
          persistEpisodeToSupabase(updatedEpisode);
        });
      }
    });
  },

  // Accept the actual choice object — no index mismatch risk after shuffle.
  // IDEMPOTENT: once a scene is answered, further calls are ignored.
  // This guarantees correct_count can never be double-counted or corrupted
  // by duplicate mic events / rapid clicks.
  selectChoice: (choice: AnswerChoice) => {
    const { episode, current_scene_index, correct_count, scene_status } = get();
    if (!episode || scene_status !== "idle") return; // already answered — ignore
    const scene = episode.scenes[current_scene_index];
    if (!scene) return;

    // Find the index of this choice in the original (unshuffled) choices array
    // to set selected_choice_index for AnswerChoices display
    const selectedIndex = scene.choices.findIndex(
      (c) => c === choice || (c.text === choice.text && c.is_correct === choice.is_correct)
    );

    const isCorrect = !!choice.is_correct;
    set({
      selected_choice_index: selectedIndex >= 0 ? selectedIndex : null,
      scene_status: isCorrect ? "answered_correct" : "answered_wrong",
      correct_count: isCorrect ? correct_count + 1 : correct_count,
    });
  },

  nextScene: () => {
    const { episode, current_scene_index } = get();
    if (!episode) return;
    const nextIndex = current_scene_index + 1;
    if (nextIndex >= episode.scenes.length) {
      set({ is_complete: true });
    } else {
      set({
        current_scene_index: nextIndex,
        scene_status: "idle",
        selected_choice_index: null,
        audio_playing: false,
      });
    }
  },

  resetPlayer: () => set(INITIAL_STATE),

  setAudioPlaying: (playing) => set({ audio_playing: playing }),
}));
