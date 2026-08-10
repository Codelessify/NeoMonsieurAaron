import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LessonProgress } from "@/types";

interface ProgressStore {
  progress: Record<string, LessonProgress>; // keyed by lesson_id
  markComplete: (lessonId: string, scenesCorrect: number, totalScenes: number) => void;
  getProgress: (lessonId: string) => LessonProgress | null;
  isUnlocked: (lessonId: string, allLessonIds: string[]) => boolean;
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      progress: {},

      markComplete: (lessonId, scenesCorrect, totalScenes) => {
        const { progress } = get();
        const existing = progress[lessonId];
        const newScore = Math.round((scenesCorrect / totalScenes) * 100);
        set({
          progress: {
            ...progress,
            [lessonId]: {
              lesson_id: lessonId,
              completed: true,
              best_score: Math.max(existing?.best_score ?? 0, newScore),
              last_played_at: new Date().toISOString(),
              scenes_correct: scenesCorrect,
              total_scenes: totalScenes,
            },
          },
        });
      },

      getProgress: (lessonId) => get().progress[lessonId] ?? null,

      // A lesson is unlocked if it's the first lesson OR the previous lesson is completed
      isUnlocked: (lessonId, allLessonIds) => {
        const idx = allLessonIds.indexOf(lessonId);
        if (idx === 0) return true;
        const prevId = allLessonIds[idx - 1];
        return !!get().progress[prevId]?.completed;
      },
    }),
    { name: "monsieur-aaron-progress" }
  )
);
