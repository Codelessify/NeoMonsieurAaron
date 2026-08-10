"use client";

import { motion } from "framer-motion";
import type { Unit } from "@/types";
import type { LessonProgress } from "@/types";
import { LessonCard } from "./LessonCard";
import { Badge } from "@/components/ui/Badge";

interface UnitSectionProps {
  unit: Unit;
  progress: Record<string, LessonProgress>;
  allLessonIds: string[];
  onLessonClick: (lessonId: string) => void;
}

function isLessonUnlocked(lessonId: string, allIds: string[], progress: Record<string, LessonProgress>): boolean {
  const idx = allIds.indexOf(lessonId);
  if (idx === 0) return true;
  return !!progress[allIds[idx - 1]]?.completed;
}

export function UnitSection({ unit, progress, allLessonIds, onLessonClick }: UnitSectionProps) {
  const completedCount = unit.lessons.filter((l) => !!progress[l.id]?.completed).length;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3"
    >
      {/* Unit header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-gray-900">{unit.title}</h2>
          <Badge label={unit.level} variant="level" />
        </div>
        <span className="text-xs text-gray-400">
          {completedCount}/{unit.lessons.length}
        </span>
      </div>

      {/* Progress bar for unit */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${(completedCount / unit.lessons.length) * 100}%` }}
        />
      </div>

      {/* Lesson cards */}
      <div className="flex flex-col gap-2.5">
        {unit.lessons.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            progress={progress[lesson.id] ?? null}
            isUnlocked={isLessonUnlocked(lesson.id, allLessonIds, progress)}
            onClick={() => onLessonClick(lesson.id)}
          />
        ))}
      </div>
    </motion.section>
  );
}
