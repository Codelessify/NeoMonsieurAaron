"use client";

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useEpisodePlayer } from "@/store/episodePlayer";
import { useUserStore } from "@/store/user";
import { EpisodePlayer } from "@/components/episode/EpisodePlayer";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getLessonById } from "@/lib/curriculum";
import type { Episode } from "@/types";

interface LessonPageProps {
  params: Promise<{ lessonId: string }>;
}

export default function LessonPage({ params }: LessonPageProps) {
  const { lessonId } = use(params);
  const router = useRouter();
  const { episode, is_loading, loadEpisode, resetPlayer } = useEpisodePlayer();
  const { profile } = useUserStore();
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const found = getLessonById(lessonId);

  const handleStart = useCallback(async () => {
    setError(null);
    setStarted(true);

    // Set loading state via the store
    useEpisodePlayer.setState({ is_loading: true });

    try {
      const res = await fetch("/api/episode/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_id: lessonId, user_id: profile?.id }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to generate episode");
      }

      const data = await res.json() as { episode: Episode };
      loadEpisode(data.episode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      useEpisodePlayer.setState({ is_loading: false });
      setStarted(false);
    }
  }, [lessonId, loadEpisode]);

  const handleFinish = useCallback(() => {
    resetPlayer();
    setStarted(false);
    router.push("/learn");
  }, [resetPlayer, router]);

  if (!found) {
    return (
      <div className="px-4 pt-8 text-center">
        <p className="text-gray-500">Leçon introuvable.</p>
        <Button variant="secondary" onClick={() => router.push("/learn")} className="mt-4">
          Retour
        </Button>
      </div>
    );
  }

  const { lesson } = found;

  // Show episode player once started
  if (started || episode) {
    return (
      <div className="pt-4">
        {/* Minimal header */}
        <div className="flex items-center gap-2 px-4 mb-4">
          <button
            onClick={() => { resetPlayer(); setStarted(false); }}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ← Retour
          </button>
          <span className="text-sm font-semibold text-gray-700 flex-1 text-center">
            {episode?.episode_title ?? lesson.title}
          </span>
        </div>
        <EpisodePlayer onFinish={handleFinish} />
      </div>
    );
  }

  // Lesson intro screen
  return (
    <div className="px-4 pt-6 flex flex-col gap-6">
      {/* Back */}
      <button
        onClick={() => router.push("/learn")}
        className="self-start text-sm text-gray-500 hover:text-gray-700"
      >
        ← Cours
      </button>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900">{lesson.title}</h1>
          <Badge label={lesson.level} variant="level" />
        </div>
        <p className="text-sm text-gray-600">{lesson.objective}</p>
      </div>

      {/* Target phrases */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Phrases cibles
        </h3>
        <div className="flex flex-col gap-2">
          {lesson.target_phrases.map((phrase) => (
            <div
              key={phrase}
              className="flex items-center gap-2 p-2.5 bg-indigo-50 rounded-xl border border-indigo-100"
            >
              <span className="text-indigo-400 text-base">🇫🇷</span>
              <span className="text-sm font-semibold text-indigo-800">{phrase}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">3</p>
          <p className="text-xs text-gray-500">scènes</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">~2</p>
          <p className="text-xs text-gray-500">minutes</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* CTA */}
      <Button size="lg" fullWidth onClick={handleStart}>
        Commencer l&apos;épisode ✨
      </Button>

      <p className="text-xs text-gray-400 text-center">
        L&apos;épisode est généré par l&apos;IA — environ 5–10 secondes
      </p>
    </div>
  );
}
