import { NextRequest, NextResponse } from "next/server";
import { generateSceneIllustration } from "@/lib/replicate";

export async function POST(req: NextRequest) {
  // If Replicate is not configured, return null gracefully —
  // the player will show the emoji placeholder instead.
  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json({ url: null });
  }

  try {
    const body = await req.json() as { prompt: string; scene_id?: string };

    if (!body.prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const url = await generateSceneIllustration(body.prompt);

    return NextResponse.json({ url });
  } catch (err) {
    console.error("[generate-image]", err);
    // Return null rather than 500 — a missing image is non-fatal
    return NextResponse.json({ url: null });
  }
}
