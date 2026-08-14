"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEpisodePlayer } from "@/store/episodePlayer";
import { useProgressStore } from "@/store/progress";
import { shuffle, scoreToGrade } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { AudioPlayer } from "@/components/ui/AudioPlayer";
import { AnswerChoices } from "@/components/episode/AnswerChoices";
import { TeacherNote } from "@/components/episode/TeacherNote";
import { SceneIllustration } from "@/components/episode/SceneIllustration";
import { useMemo } from "react";
import type { AnswerChoice } from "@/types";

interface EpisodePlayerProps {
  onFinish?: () => void;
}

export function EpisodePlayer({ onFinish }: EpisodePlayerProps) {
  const {
    episode,
    current_scene_index,
    scene_status,
    selected_choice_index,
    correct_count,
    is_complete,
    is_loading,
    selectChoice,
    nextScene,
    resetPlayer,
  } = useEpisodePlayer();

  const { markComplete } = useProgressStore();

  // Shuffle choices once per scene render (stable via useMemo on scene_number)
  const scene = episode?.scenes[current_scene_index];
  const shuffledChoices: AnswerChoice[] = useMemo(() => {
    if (!scene) return [];
    return shuffle(scene.choices);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene?.scene_number]);

  if (is_loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Génération de l&apos;épisode…</p>
      </div>
    );
  }

  if (!episode || !scene) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-gray-500">Aucun épisode chargé.</p>
      </div>
    );
  }

  if (is_complete) {
    const total = episode.scenes.length;
    const pct = Math.round((correct_count / total) * 100);
    const grade = scoreToGrade(correct_count, total);

    // Persist progress
    markComplete(episode.lesson_id, correct_count, total);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4"
      >
        <div className="text-5xl">{pct >= 80 ? "🎉" : pct >= 50 ? "👍" : "💪"}</div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{grade}</h2>
          <p className="text-gray-500">
            {correct_count}/{total} réponses correctes · {pct}%
          </p>
        </div>

        <div className="w-full max-w-xs bg-gray-100 rounded-full h-3 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full rounded-full ${pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-red-400"}`}
          />
        </div>

        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Button size="lg" fullWidth onClick={() => { resetPlayer(); onFinish?.(); }}>
            Retour au cours
          </Button>
          <Button variant="secondary" size="lg" fullWidth onClick={() => resetPlayer()}>
            Rejouer l&apos;épisode
          </Button>
        </div>
      </motion.div>
    );
  }

  const isAnswered = scene_status !== "idle";

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full px-4 pb-8">
      {/* Progress bar */}
      <div className="flex items-center gap-3 pt-2">
        <span className="text-xs text-gray-400 shrink-0">
          {current_scene_index + 1}/{episode.scenes.length}
        </span>
        <ProgressBar
          current={current_scene_index}
          total={episode.scenes.length}
          className="flex-1"
        />
        <span className="text-xs text-emerald-600 font-semibold shrink-0">
          {correct_count} ✓
        </span>
      </div>

      {/* Illustration */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`scene-${current_scene_index}`}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.3 }}
        >
          <SceneIllustration scene={scene} sceneIndex={current_scene_index} />
        </motion.div>
      </AnimatePresence>

      {/* Context + NPC line */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`context-${current_scene_index}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-3"
        >
          {/* Situation text */}
          <p className="text-sm text-gray-500 leading-relaxed">
            {scene.english_context}
          </p>

          {/* NPC spoken line */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-base flex-shrink-0 mt-0.5">
              👤
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold text-gray-900">{scene.speaker}</p>
              <div className="mt-1">
                <AudioPlayer
                  src={scene.audio_url}
                  text={scene.speaker}
                  autoPlay={false}
                  label="Écouter"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Answer choices */}
      <AnswerChoices
        choices={shuffledChoices}
        selectedIndex={selected_choice_index}
        status={scene_status}
        onSelect={selectChoice}
      />

      {/* Teacher note (shown after answering) */}
      <AnimatePresence>
        {isAnswered && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <TeacherNote scene={scene} status={scene_status} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next / Continue button */}
      <AnimatePresence>
        {isAnswered && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button size="lg" fullWidth onClick={nextScene}>
              {current_scene_index + 1 >= episode.scenes.length
                ? "Voir les résultats"
                : "Continuer →"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
