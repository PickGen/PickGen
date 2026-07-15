import type { GenerateParams, GenerateResult, ImageProvider } from './types.js';

/** Deterministic pseudo-random from a numeric seed (for reproducible mocks, FR-4.4). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const STYLE_PALETTES: Record<string, [string, string]> = {
  photo: ['#3a6073', '#16222a'],
  anime: ['#ff6a88', '#ff99ac'],
  '3d': ['#654ea3', '#eaafc8'],
  watercolor: ['#43cea2', '#185a9d'],
  pixel: ['#f7971e', '#ffd200'],
  logo: ['#232526', '#414345'],
};

/**
 * MockProvider — renders a labelled gradient placeholder as an SVG data-URI.
 * Lets the entire app run end-to-end with no AI key or network (LIM-1 waived for dev).
 */
export class MockProvider implements ImageProvider {
  readonly name = 'mock';

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const seed = params.seed ?? hashString(params.finalPrompt);
    const rand = mulberry32(seed);
    // simulate provider latency (draft is fast, quality slower) — NFR-1
    await new Promise((r) => setTimeout(r, 400 + Math.floor(rand() * 900)));

    const [c1, c2] = STYLE_PALETTES[params.style] ?? STYLE_PALETTES.photo;
    const w = params.width;
    const h = params.height;
    const shapes: string[] = [];
    const count = 5 + Math.floor(rand() * 6);
    for (let i = 0; i < count; i++) {
      const cx = Math.floor(rand() * w);
      const cy = Math.floor(rand() * h);
      const r = Math.floor((0.05 + rand() * 0.2) * Math.min(w, h));
      const op = (0.08 + rand() * 0.22).toFixed(2);
      shapes.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff" opacity="${op}" />`);
    }

    const label = params.prompt.slice(0, 48).replace(/[<>&]/g, '');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  ${shapes.join('\n  ')}
  <text x="${w / 2}" y="${h - 60}" fill="#ffffff" opacity="0.85" font-family="system-ui, sans-serif" font-size="${Math.round(w / 24)}" text-anchor="middle">${label}</text>
  <text x="${w / 2}" y="${h - 24}" fill="#ffffff" opacity="0.55" font-family="system-ui, sans-serif" font-size="${Math.round(w / 40)}" text-anchor="middle">PickGen · ${params.mode} · ${params.style} · seed ${seed}</text>
</svg>`;

    const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    return { imageUrl: dataUri };
  }
}
