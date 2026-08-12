import { NextRequest, NextResponse } from "next/server";
import { generateTTS } from "@/lib/tts";

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

    const result = await generateTTS({
      text: body.text,
      voice: body.voice,
      format: body.format,
    });

    return NextResponse.json({ audio_url: result.audio_url });
  } catch (err) {
    console.error("[generate-tts]", err);
    // Non-fatal — app works without audio
    return NextResponse.json({ audio_url: null });
  }
}
