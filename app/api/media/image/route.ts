import { NextRequest, NextResponse } from "next/server";
import { generateSceneIllustration } from "@/lib/image";

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

    console.log("[generate-image] requesting:", body.prompt.slice(0, 80));
    const url = await generateSceneIllustration(body.prompt);
    console.log("[generate-image] got url:", url);

    return NextResponse.json({ url });
  } catch (err) {
    // Log the full error so it shows in Vercel function logs
    console.error("[generate-image] error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ url: null });
  }
}
