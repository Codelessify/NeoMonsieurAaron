"use client";

import { useProgressStore } from "@/store/progress";
import { CURRICULUM } from "@/lib/curriculum";

export default function ProgressPage() {
  const { progress } = useProgressStore();

  const allLessons = CURRICULUM.flatMap((u) => u.lessons);
  const completed = allLessons.filter((l) => !!progress[l.id]?.completed);
  const totalXP = completed.reduce((sum, l) => sum + (progress[l.id]?.best_score ?? 0), 0);
  const avgScore =
    completed.length > 0
      ? Math.round(completed.reduce((s, l) => s + (progress[l.id]?.best_score ?? 0), 0) / completed.length)
      : 0;

  return (
    <div className="px-4 pt-6 flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">📈 Mon Progrès</h1>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 p-3 text-center shadow-sm">
          <p className="text-3xl font-bold text-blue-600">{completed.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Leçons</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-3 text-center shadow-sm">
          <p className="text-3xl font-bold text-amber-500">{totalXP}</p>
          <p className="text-xs text-gray-500 mt-0.5">Points</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-3 text-center shadow-sm">
          <p className="text-3xl font-bold text-emerald-600">{avgScore}%</p>
          <p className="text-xs text-gray-500 mt-0.5">Moy.</p>
        </div>
      </div>

      {/* Completed lessons list */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-gray-600">Leçons complétées</h2>
        {completed.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center text-sm text-gray-400">
            Complétez votre première leçon pour voir votre progrès ici.
          </div>
        ) : (
          completed.map((lesson) => {
            const p = progress[lesson.id];
            return (
              <div
                key={lesson.id}
                className="bg-white rounded-xl border border-emerald-200 p-3 flex items-center gap-3"
              >
                <span className="text-xl">✅</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{lesson.title}</p>
                  <p className="text-xs text-gray-500">
                    {p?.scenes_correct}/{p?.total_scenes} correctes · score {p?.best_score}%
                  </p>
                </div>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: `conic-gradient(#10b981 ${p?.best_score ?? 0}%, #f3f4f6 0)`,
                  }}
                >
                  <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-xs font-bold text-emerald-600">
                    {p?.best_score}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
