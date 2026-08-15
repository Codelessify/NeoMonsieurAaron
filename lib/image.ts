// Replicate FLUX Schnell endpoint for scene illustration generation.
// Docs: https://replicate.com/black-forest-labs/flux-schnell

const STYLE_PREFIX =
  "soft watercolour illustration, warm Parisian colours, French lifestyle, no text, no words, cozy atmosphere";

export async function generateSceneIllustration(
  illustrationPrompt: string
): Promise<string> {
  const apiKey = process.env.REPLICATE_API_TOKEN;
  if (!apiKey) throw new Error("REPLICATE_API_TOKEN is not set");

  const prompt = `${STYLE_PREFIX}, ${illustrationPrompt}`;

  // Use the synchronous predictions endpoint with FLUX Schnell
  const response = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      Prefer: "wait", // wait for result synchronously (up to 60s)
    },
    body: JSON.stringify({
      input: {
        prompt,
        num_outputs: 1,
        aspect_ratio: "16:9",
        output_format: "webp",
        output_quality: 80,
        num_inference_steps: 4,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Replicate image error ${response.status}: ${err}`);
  }

  const data = await response.json() as {
    id: string;
    status: string;
    output?: string[];
    error?: string | null;
  };

  if (data.error) throw new Error(`Replicate image failed: ${data.error}`);

  const url = data.output?.[0];
  if (!url) throw new Error("Replicate returned no image URL");

  return url;
}
