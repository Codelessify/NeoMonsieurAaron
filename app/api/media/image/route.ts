import { NextRequest, NextResponse } from "next/server";
import { generateSceneIllustration } from "@/lib/image";
import crypto from "crypto";

/**
 * Scene illustration with app-wide caching.
 *
 * Uses the shared `scene_illustrations` Supabase table (keyed by
 * prompt_hash). The same illustration prompt — across episodes, lessons
 * and users — is generated ONCE via RunPod and reused forever after.
 */
export async function POST(req: NextRequest) {
  if (!process.env.RUNPOD_API_KEY) {
    console.warn("[generate-image] RUNPOD_API_KEY is not set — skipping image generation");
    return NextResponse.json({ url: null });
  }

  try {
    const body = await req.json() as { prompt: string; scene_id?: string };

    if (!body.prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const promptHash = crypto.createHash("sha256").update(body.prompt).digest("hex");

    // ── 1. Check shared cache first ────────────────────────────────────
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const { data: cached } = await supabase
        .from("scene_illustrations")
        .select("image_url")
        .eq("prompt_hash", promptHash)
        .maybeSingle();

      if (cached?.image_url) {
        return NextResponse.json({ url: cached.image_url, cached: true });
      }
    } catch (cacheErr) {
      // Cache read failure is non-fatal — fall through to generation
      console.warn("[generate-image] cache lookup failed:", cacheErr);
    }

    // ── 2. Cache miss → generate via RunPod ────────────────────────────
    console.log("[generate-image] requesting:", body.prompt.slice(0, 80));
    const url = await generateSceneIllustration(body.prompt);
    console.log("[generate-image] got url:", url);

    // ── 3. Store in shared cache (non-fatal on failure) ────────────────
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      await supabase.from("scene_illustrations").upsert(
        {
          prompt_hash: promptHash,
          prompt: body.prompt,
          image_url: url,
        },
        { onConflict: "prompt_hash" }
      );
    } catch (cacheErr) {
      console.warn("[generate-image] cache write failed:", cacheErr);
    }

    return NextResponse.json({ url, cached: false });
  } catch (err) {
    // Log the full error so it shows in Vercel function logs
    console.error("[generate-image] error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ url: null });
  }
}