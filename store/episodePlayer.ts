import { create } from "zustand";
import type { EpisodePlayerState, Episode, SceneStatus } from "@/types";

interface EpisodePlayerStore extends EpisodePlayerState {
  loadEpisode: (episode: Episode) => void;
  selectChoice: (index: number) => void;
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

export const useEpisodePlayer = create<EpisodePlayerStore>((set, get) => ({
  ...INITIAL_STATE,

  loadEpisode: (episode) => {
    set({ ...INITIAL_STATE, episode, is_loading: false });

    // Fire TTS requests for all scenes in the background.
    // As each resolves, patch audio_url onto the scene in the store.
    episode.scenes.forEach((scene, i) => {
      fetchAudioForScene(scene.dialogue ?? scene.speaker ?? "").then((audio_url) => {
        if (!audio_url) return;
        const current = get().episode;
        if (!current) return;
        const updatedScenes = current.scenes.map((s, j) =>
          j === i ? { ...s, audio_url } : s
        );
        set({ episode: { ...current, scenes: updatedScenes } });
      });
    });
  },

  selectChoice: (index) => {
    const { episode, current_scene_index, correct_count } = get();
    if (!episode) return;
    const scene = episode.scenes[current_scene_index];
    const choice = scene.choices[index];
    const isCorrect = choice.is_correct;
    set({
      selected_choice_index: index,
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
