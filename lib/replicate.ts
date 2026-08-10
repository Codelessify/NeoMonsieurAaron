import Replicate from "replicate";

// Lazy singleton to avoid module-evaluation errors at build time
let _replicate: Replicate | null = null;
function getReplicate(): Replicate {
  if (!_replicate) {
    _replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
  }
  return _replicate;
}

const STYLE_PREFIX =
  "soft watercolour illustration, warm Parisian colours, French lifestyle, minimal detail, flat design, no text, no words, cozy atmosphere";

const NEGATIVE_PROMPT =
  "photorealistic, photo, 3d render, ugly, blurry, text, watermark, signature, border, frame";

export async function generateSceneIllustration(
  illustrationPrompt: string
): Promise<string> {
  const prompt = `${STYLE_PREFIX}, ${illustrationPrompt}`;

  // Using FLUX Schnell — fastest and cheapest (~$0.003/image)
  const output = await getReplicate().run(
    "black-forest-labs/flux-schnell",
    {
      input: {
        prompt,
        negative_prompt: NEGATIVE_PROMPT,
        num_outputs: 1,
        aspect_ratio: "16:9",
        output_format: "webp",
        output_quality: 80,
      },
    }
  );

  // FLUX Schnell returns an array of URLs or ReadableStream objects
  const result = Array.isArray(output) ? output[0] : output;

  if (!result) throw new Error("Replicate returned no output");

  // If it's a ReadableStream (file object), convert to URL string
  if (typeof result === "string") return result;

  // Handle Replicate FileOutput objects
  if (result && typeof result === "object" && "url" in result) {
    return (result as { url: () => string }).url();
  }

  throw new Error("Unexpected Replicate output format");
}
