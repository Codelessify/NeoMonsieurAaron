"use client";

import { CURRICULUM } from "@/lib/curriculum";
import { useProgressStore } from "@/store/progress";
import { Badge } from "@/components/ui/Badge";

// Flatten all unique vocabulary introduced across the curriculum
function getAllVocabulary() {
  const seen = new Set<string>();
  const items: { phrase: string; lesson: string; unit: string }[] = [];

  for (const unit of CURRICULUM) {
    for (const lesson of unit.lessons) {
      for (const phrase of lesson.target_phrases) {
        if (!seen.has(phrase)) {
          seen.add(phrase);
          items.push({ phrase, lesson: lesson.title, unit: unit.title });
        }
      }
    }
  }
  return items;
}

export default function VocabPage() {
  const { progress } = useProgressStore();

  // Find which lessons are completed so we can show vocab as "learned"
  const completedLessonIds = new Set(
    CURRICULUM.flatMap((u) => u.lessons)
      .filter((l) => !!progress[l.id]?.completed)
      .map((l) => l.id)
  );

  const completedTitles = new Set(
    CURRICULUM.flatMap((u) => u.lessons)
      .filter((l) => completedLessonIds.has(l.id))
      .map((l) => l.title)
  );

  const vocab = getAllVocabulary();

  const learned = vocab.filter((v) => completedTitles.has(v.lesson));
  const upcoming = vocab.filter((v) => !completedTitles.has(v.lesson));

  return (
    <div className="px-4 pt-6 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">💬 Mon Vocabulaire</h1>
        <p className="text-sm text-gray-500 mt-1">{learned.length} expressions apprises</p>
      </div>

      {/* Learned */}
      {learned.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Appris</h2>
          <div className="flex flex-col gap-2">
            {learned.map((item) => (
              <div
                key={item.phrase}
                className="bg-white rounded-xl border border-emerald-200 p-3 flex items-center gap-3"
              >
                <span className="text-lg">🇫🇷</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{item.phrase}</p>
                  <p className="text-xs text-gray-400">{item.lesson} · {item.unit}</p>
                </div>
                <Badge label="✓" variant="level" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">À venir</h2>
          <div className="flex flex-col gap-2">
            {upcoming.map((item) => (
              <div
                key={item.phrase}
                className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3 opacity-60"
              >
                <span className="text-lg grayscale">🇫🇷</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-500 blur-sm select-none">
                    {item.phrase}
                  </p>
                  <p className="text-xs text-gray-400">{item.lesson}</p>
                </div>
                <span className="text-gray-300 text-lg">🔒</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {vocab.length === 0 && (
        <div className="text-center text-sm text-gray-400 py-10">
          Commencez une leçon pour voir votre vocabulaire ici.
        </div>
      )}
    </div>
  );
}
