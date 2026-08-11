import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LessonProgress } from "@/types";
import { createClient } from "@/lib/supabase/client";

interface ProgressStore {
  progress: Record<string, LessonProgress>; // keyed by lesson_id
  markComplete: (lessonId: string, scenesCorrect: number, totalScenes: number, userId?: string) => void;
  getProgress: (lessonId: string) => LessonProgress | null;
  isUnlocked: (lessonId: string, allLessonIds: string[]) => boolean;
  loadFromSupabase: (userId: string) => Promise<void>;
  clearProgress: () => void;
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      progress: {},

      markComplete: (lessonId, scenesCorrect, totalScenes, userId) => {
        const { progress } = get();
        const existing = progress[lessonId];
        const newScore = Math.round((scenesCorrect / totalScenes) * 100);
        const updated: LessonProgress = {
          lesson_id: lessonId,
          completed: true,
          best_score: Math.max(existing?.best_score ?? 0, newScore),
          last_played_at: new Date().toISOString(),
          scenes_correct: scenesCorrect,
          total_scenes: totalScenes,
        };
        set({ progress: { ...progress, [lessonId]: updated } });

        // Persist to Supabase if user is logged in
        if (userId) {
          const supabase = createClient();
          supabase.from("learner_progress").upsert({
            user_id: userId,
            lesson_id: lessonId,
            score: updated.best_score,
            scenes_correct: scenesCorrect,
            total_scenes: totalScenes,
            completed: true,
            completed_at: updated.last_played_at,
          }, { onConflict: "user_id,lesson_id" });
        }
      },

      getProgress: (lessonId) => get().progress[lessonId] ?? null,

      // A lesson is unlocked if it's the first lesson OR the previous lesson is completed
      isUnlocked: (lessonId, allLessonIds) => {
        const idx = allLessonIds.indexOf(lessonId);
        if (idx === 0) return true;
        const prevId = allLessonIds[idx - 1];
        return !!get().progress[prevId]?.completed;
      },

      loadFromSupabase: async (userId: string) => {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("learner_progress")
          .select("*")
          .eq("user_id", userId);
        if (error || !data) return;

        const loaded: Record<string, LessonProgress> = {};
        for (const row of data) {
          loaded[row.lesson_id] = {
            lesson_id: row.lesson_id,
            completed: row.completed,
            best_score: row.score,
            last_played_at: row.completed_at ?? null,
            scenes_correct: row.scenes_correct,
            total_scenes: row.total_scenes,
          };
        }
        set({ progress: loaded });
      },

      clearProgress: () => set({ progress: {} }),
    }),
    { name: "monsieur-aaron-progress" }
  )
);
