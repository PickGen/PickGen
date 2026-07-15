import { config } from '../config.js';
import type { Style } from '../config.js';

/** Quality modifiers appended per style preset (FR-3.2, FR-3.3). */
const STYLE_TEMPLATES: Record<Style, string> = {
  photo:
    'photorealistic, ultra detailed, sharp focus, professional lighting, 50mm lens, high dynamic range',
  anime: 'anime style, vibrant colors, clean line art, cel shading, detailed illustration, studio quality',
  '3d': '3D render, octane render, physically based materials, soft global illumination, high detail',
  watercolor: 'watercolor painting, soft washes, textured paper, delicate brush strokes, artistic',
  pixel: 'pixel art, 16-bit, crisp pixels, limited palette, retro game aesthetic',
  logo: 'clean vector logo, minimal, flat design, centered, high contrast, professional branding',
};

const BASE_QUALITY = 'high quality, best quality, masterpiece';

/** Detect whether the text is predominantly non-Latin (needs translation). */
function isMostlyNonLatin(text: string): boolean {
  const letters = text.replace(/[^\p{L}]/gu, '');
  if (!letters) return false;
  const latin = letters.replace(/[^A-Za-z]/g, '');
  return latin.length / letters.length < 0.4;
}

/** Translate to English via an OpenAI-compatible endpoint when a key is configured. */
async function translateToEnglish(text: string): Promise<string> {
  if (!config.openaiKey) return text; // no key → keep as-is; models still cope reasonably
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'You translate image-generation prompts into concise, vivid English. Output ONLY the translated prompt, no quotes, no commentary.',
          },
          { role: 'user', content: text },
        ],
      }),
    });
    if (!res.ok) return text;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() || text;
  } catch {
    return text; // never fail generation because translation broke
  }
}

export interface EnhanceInput {
  prompt: string;
  style: Style;
  negativePrompt?: string;
}

export interface EnhanceOutput {
  finalPrompt: string;
  negativePrompt: string;
}

const DEFAULT_NEGATIVE = 'lowres, blurry, jpeg artifacts, watermark, text, deformed, extra limbs';

/**
 * Normalize + translate + enhance a user prompt (FR-3.1..3.4).
 * Invisible to the user: they type plainly, we build the model-facing prompt.
 */
export async function buildFinalPrompt(input: EnhanceInput): Promise<EnhanceOutput> {
  let base = input.prompt.trim();
  if (isMostlyNonLatin(base)) {
    base = await translateToEnglish(base);
  }
  const template = STYLE_TEMPLATES[input.style] ?? '';
  const finalPrompt = [base, template, BASE_QUALITY].filter(Boolean).join(', ');
  const negativePrompt = input.negativePrompt?.trim()
    ? `${input.negativePrompt.trim()}, ${DEFAULT_NEGATIVE}`
    : DEFAULT_NEGATIVE;
  return { finalPrompt, negativePrompt };
}
