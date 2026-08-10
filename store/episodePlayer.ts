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

export const useEpisodePlayer = create<EpisodePlayerStore>((set, get) => ({
  ...INITIAL_STATE,

  loadEpisode: (episode) =>
    set({ ...INITIAL_STATE, episode, is_loading: false }),

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
