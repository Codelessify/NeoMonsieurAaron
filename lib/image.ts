// RunPod Public Endpoint — FLUX Schnell
// Docs: https://docs.runpod.io/public-endpoints/models/flux-schnell

const STYLE_PREFIX =
  "soft watercolour illustration, warm Parisian colours, French lifestyle, no text, no words, cozy atmosphere";

export async function generateSceneIllustration(
  illustrationPrompt: string
): Promise<string> {
  const apiKey = process.env.RUNPOD_API_KEY;
  if (!apiKey) throw new Error("RUNPOD_API_KEY is not set");

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
          width: 1024,
          height: 576,
          num_inference_steps: 4,
          guidance: 7.5,
          seed: -1,
          image_format: "jpeg",
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
    output?: {
      image_url?: string;
      url?: string;
    } | string;
    error?: string;
  };

  if (data.status === "FAILED" || data.error) {
    throw new Error(`RunPod image failed: ${data.error ?? "unknown error"}`);
  }

  // Response shape: { output: { image_url: "https://..." } }
  if (typeof data.output === "string") return data.output;
  if (data.output && typeof data.output === "object") {
    const url = data.output.image_url ?? data.output.url;
    if (url) return url;
  }

  throw new Error("RunPod image returned no URL");
}
