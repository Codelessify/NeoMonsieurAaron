import { NextRequest, NextResponse } from "next/server";
import { generateEpisode } from "@/lib/groq";
import { getLessonById, getKnownInventoryForLesson } from "@/lib/curriculum";
import { createClient } from "@/lib/supabase/server";
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

    // Get user's context language preference from Supabase
    let contextLanguage: "english" | "french" | "mixed" = "english";
    if (body.user_id) {
      try {
        const supabase = await createClient();
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("context_language")
          .eq("id", body.user_id)
          .single();
        if (profile?.context_language) {
          contextLanguage = profile.context_language;
        }
      } catch (err) {
        console.error("[generate-episode] failed to load user context language", err);
      }
    }

    const inventory = getKnownInventoryForLesson(body.lesson_id);
    const raw: GroqEpisodeOutput = await generateEpisode(found.lesson, inventory, contextLanguage);

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