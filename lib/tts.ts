// Uses Minimax Speech 02 HD via RunPod
// The endpoint ID points to a RunPod serverless endpoint running Minimax Speech 02 HD

export interface TTSOptions {
  text: string;
  voice?: string;          // voice ID, default "male" (or "female")
  format?: string;         // output format, default "wav"
}

export interface TTSResult {
  audio_url: string;       // publicly accessible URL to the audio file
}

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
        voice_id: options.voice ?? "male",
        output_format: options.format ?? "wav",
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
