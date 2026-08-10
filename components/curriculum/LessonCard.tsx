"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Lesson } from "@/types";
import type { LessonProgress } from "@/types";
import { Badge } from "@/components/ui/Badge";

const THEME_EMOJI: Record<string, string> = {
  market: "🛒",
  cafe: "☕",
  introductions: "👋",
  bakery: "🥖",
  "morning-routine": "🌅",
  transport: "🚇",
  doctor: "🏥",
  restaurant: "🍽️",
  hotel: "🏨",
  default: "📚",
};

interface LessonCardProps {
  lesson: Lesson;
  progress: LessonProgress | null;
  isUnlocked: boolean;
  onClick: () => void;
}

export function LessonCard({ lesson, progress, isUnlocked, onClick }: LessonCardProps) {
  const emoji = THEME_EMOJI[lesson.theme] ?? THEME_EMOJI.default;
  const isCompleted = progress?.completed ?? false;
  const bestScore = progress?.best_score ?? null;

  return (
    <motion.button
      whileHover={isUnlocked ? { scale: 1.02 } : {}}
      whileTap={isUnlocked ? { scale: 0.98 } : {}}
      onClick={() => isUnlocked && onClick()}
      className={cn(
        "relative w-full text-left p-4 rounded-2xl border-2 transition-all duration-200",
        isCompleted
          ? "border-emerald-300 bg-emerald-50"
          : isUnlocked
          ? "border-blue-200 bg-white hover:border-blue-400 hover:shadow-md shadow-sm"
          : "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
      )}
    >
      {/* Lock / Check overlay */}
      <div className="absolute top-3 right-3 text-lg">
        {isCompleted ? "✅" : !isUnlocked ? "🔒" : null}
      </div>

      <div className="flex items-start gap-3">
        {/* Emoji icon */}
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0",
            isCompleted ? "bg-emerald-100" : isUnlocked ? "bg-blue-50" : "bg-gray-100"
          )}
        >
          {emoji}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-sm">{lesson.title}</h3>
            <Badge label={lesson.level} variant="level" />
          </div>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{lesson.objective}</p>

          {/* Target phrases preview */}
          <div className="flex flex-wrap gap-1 mt-2">
            {lesson.target_phrases.slice(0, 2).map((phrase) => (
              <span
                key={phrase}
                className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100"
              >
                {phrase}
              </span>
            ))}
          </div>

          {/* Best score if completed */}
          {isCompleted && bestScore !== null && (
            <p className="text-xs text-emerald-600 font-semibold mt-1.5">
              Meilleur score : {bestScore}%
            </p>
          )}
        </div>
      </div>
    </motion.button>
  );
}
