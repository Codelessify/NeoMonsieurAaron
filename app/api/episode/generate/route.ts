import { NextRequest, NextResponse } from "next/server";
import { generateEpisode } from "@/lib/groq";
import { getLessonById, getKnownInventoryForLesson } from "@/lib/curriculum";
import type { Episode, GroqEpisodeOutput } from "@/types";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { lesson_id: string; user_id?: string };

    if (!body.lesson_id) {
      return NextResponse.json({ error: "lesson_id is required" }, { status: 400 });
    }

    const found = getLessonById(body.lesson_id);
    if (!found) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const inventory = getKnownInventoryForLesson(body.lesson_id);
    const raw: GroqEpisodeOutput = await generateEpisode(found.lesson, inventory);

    const episode: Episode = {
      id: crypto.randomUUID(),
      lesson_id: body.lesson_id,
      user_id: body.user_id ?? null,
      episode_title: raw.episode_title,
      theme: raw.theme,
      estimated_duration_minutes: raw.estimated_duration_minutes,
      scenes: raw.scenes.map((s) => ({
        ...s,
        illustration_url: undefined,
        audio_url: undefined,
      })),
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({ episode });
  } catch (err) {
    console.error("[generate-episode]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
