import { NextRequest, NextResponse } from "next/server";
import { generateTTS } from "@/lib/tts";
import crypto from "crypto";

/**
 * TTS with app-wide caching.
 *
 * Audio is cached in the shared `tts_cache` Supabase table, keyed by
 * sha256(voice::text). The same dialogue text — across episodes, lessons
 * and users — is generated ONCE via RunPod and reused forever after.
 */
export async function POST(req: NextRequest) {
  // If RunPod is not configured, return null gracefully —
  // the player will show the audio button as disabled.
  if (!process.env.RUNPOD_API_KEY || !process.env.RUNPOD_TTS_ENDPOINT_ID) {
    return NextResponse.json({ audio_url: null });
  }

  try {
    const body = await req.json() as {
      text: string;
      voice?: string;
      format?: string;
    };

    if (!body.text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const voice = body.voice ?? "male";
    const textHash = crypto.createHash("sha256").update(`${voice}::${body.text}`).digest("hex");

    // ── 1. Check shared cache first ────────────────────────────────────
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const { data: cached } = await supabase
        .from("tts_cache")
        .select("audio_url")
        .eq("text_hash", textHash)
        .maybeSingle();

      if (cached?.audio_url) {
        return NextResponse.json({ audio_url: cached.audio_url, cached: true });
      }
    } catch (cacheErr) {
      // Cache read failure is non-fatal — fall through to generation
      console.warn("[generate-tts] cache lookup failed:", cacheErr);
    }

    // ── 2. Cache miss → generate via RunPod ────────────────────────────
    const result = await generateTTS({
      text: body.text,
      voice: body.voice,
      format: body.format,
    });

    // ── 3. Store in shared cache (non-fatal on failure) ────────────────
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      await supabase.from("tts_cache").upsert(
        {
          text_hash: textHash,
          source_text: body.text,
          voice,
          audio_url: result.audio_url,
        },
        { onConflict: "text_hash" }
      );
    } catch (cacheErr) {
      console.warn("[generate-tts] cache write failed:", cacheErr);
    }

    return NextResponse.json({ audio_url: result.audio_url, cached: false });
  } catch (err) {
    console.error("[generate-tts]", err);
    // Non-fatal — app works without audio
    return NextResponse.json({ audio_url: null });
  }
}