"use client";

import { useProgressStore } from "@/store/progress";
import { CURRICULUM } from "@/lib/curriculum";
import { UnitSection } from "@/components/curriculum/UnitSection";
import { useRouter } from "next/navigation";

export default function LearnPage() {
  const { progress } = useProgressStore();
  const router = useRouter();

  const allLessonIds = CURRICULUM.flatMap((u) => u.lessons.map((l) => l.id));

  const totalLessons = allLessonIds.length;
  const completed = allLessonIds.filter((id) => !!progress[id]?.completed).length;

  return (
    <div className="px-4 pt-6 pb-4 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-gray-900">📚 Mon Cours</h1>
        <p className="text-sm text-gray-500">
          {completed}/{totalLessons} leçons complétées
        </p>
      </div>

      {/* Units */}
      {CURRICULUM.map((unit) => (
        <UnitSection
          key={unit.id}
          unit={unit}
          progress={progress}
          allLessonIds={allLessonIds}
          onLessonClick={(lessonId) => router.push(`/learn/${lessonId}`)}
        />
      ))}
    </div>
  );
}
