// RunPod managed FLUX Schnell endpoint for scene illustration generation.
// Endpoint: https://api.runpod.ai/v2/black-forest-labs-flux-1-schnell/runsync

const STYLE_PREFIX =
  "soft watercolour illustration, warm Parisian colours, French lifestyle, minimal detail, flat design, no text, no words, cozy atmosphere";

const NEGATIVE_PROMPT =
  "photorealistic, photo, 3d render, ugly, blurry, text, watermark, signature, border, frame";

export async function generateSceneIllustration(
  illustrationPrompt: string
): Promise<string> {
  const apiKey = process.env.RUNPOD_API_KEY;

  if (!apiKey) {
    throw new Error("RUNPOD_API_KEY is not set");
  }

  const prompt = `${STYLE_PREFIX}, ${illustrationPrompt}`;

  const response = await fetch(
    "https://api.runpod.ai/v2/black-forest-labs-flux-1-schnell/runsync",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: {
          prompt,
          negative_prompt: NEGATIVE_PROMPT,
          seed: -1,
          num_inference_steps: 4,
          guidance: 7,
          image_format: "png",
          width: 1024,
          height: 576, // 16:9 aspect ratio
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`RunPod image error ${response.status}: ${err}`);
  }

  const data = await response.json() as {
    id: string;
    status: string;
    output?: string | { image_url?: string; url?: string };
    error?: string;
  };

  if (data.status === "FAILED" || data.error) {
    throw new Error(`RunPod image job failed: ${data.error ?? "unknown error"}`);
  }

  // Support both direct URL string and object with image_url/url
  if (typeof data.output === "string") return data.output;
  if (data.output && typeof data.output === "object") {
    const url = data.output.image_url ?? data.output.url;
    if (url) return url;
  }

  throw new Error("RunPod image returned no output URL");
}
