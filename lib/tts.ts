// Expects a RunPod serverless endpoint running a French TTS model
// (e.g. XTTS-v2, Coqui TTS, or Kokoro)
// You can swap the endpoint URL to any compatible TTS API later.

export interface TTSOptions {
  text: string;
  voice?: string;          // voice ID, default "lucy"
  format?: string;         // output format, default "wav"
}

export interface TTSResult {
  audio_url: string;       // publicly accessible URL to the audio file
}

/**
 * Call the RunPod TTS endpoint.
 * The endpoint should accept { input: TTSOptions } and return { output: { audio_url: string } }
 * following the standard RunPod serverless /run + /status pattern,
 * OR return the audio URL synchronously if using a synchronous endpoint.
 */
export async function generateTTS(options: TTSOptions): Promise<TTSResult> {
  const endpointId = process.env.RUNPOD_TTS_ENDPOINT_ID;
  const apiKey = process.env.RUNPOD_API_KEY;

  if (!endpointId || !apiKey) {
    throw new Error("RunPod TTS is not configured. Set RUNPOD_TTS_ENDPOINT_ID and RUNPOD_API_KEY.");
  }

  const runUrl = `https://api.runpod.ai/v2/${endpointId}/runsync`;

  const response = await fetch(runUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
        input: {
          prompt: options.text,
          voice: options.voice ?? "lucy",
          format: options.format ?? "wav",
        },
      }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`RunPod TTS error ${response.status}: ${err}`);
  }

  const data = await response.json() as {
    id: string;
    status: string;
    output?: { audio_url?: string } | string;
    error?: string;
  };

  if (data.status === "FAILED" || data.error) {
    throw new Error(`RunPod TTS job failed: ${data.error ?? "unknown error"}`);
  }

  // Support both { output: { audio_url } } and { output: "https://..." }
  let audioUrl: string | undefined;

  if (typeof data.output === "string") {
    audioUrl = data.output;
  } else if (data.output && typeof data.output === "object") {
    audioUrl = data.output.audio_url;
  }

  if (!audioUrl) {
    throw new Error("RunPod TTS returned no audio URL");
  }

  return { audio_url: audioUrl };
}
