import 'dotenv/config';

function env(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}
function envInt(key: string, fallback: number): number {
  const v = process.env[key];
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  port: envInt('PORT', 8787),
  nodeEnv: env('NODE_ENV', 'development'),
  isProd: env('NODE_ENV', 'development') === 'production',
  clientOrigin: env('CLIENT_ORIGIN', 'http://localhost:5173'),
  jwtSecret: env('JWT_SECRET', 'dev-secret-change-me'),
  dbPath: env('DB_PATH', './data/pickgen.db'),
  // When set, use Postgres (Neon) instead of local SQLite.
  databaseUrl: env('DATABASE_URL'),

  aiProvider: env('AI_PROVIDER', 'mock'),
  falKey: env('FAL_KEY'),
  openaiKey: env('OPENAI_API_KEY'),
  // fal.ai model endpoints per internal model id — overridable without code changes
  falModels: {
    'flux-schnell': env('FAL_MODEL_DRAFT', 'fal-ai/flux/schnell'),
    'flux-2-pro': env('FAL_MODEL_QUALITY', 'fal-ai/flux-pro/v1.1'),
    'ideogram-v2': env('FAL_MODEL_TEXT', 'fal-ai/ideogram/v2'),
  } as Record<string, string>,

  paymentProvider: env('PAYMENT_PROVIDER', 'mock'),
  // Public URL of THIS backend (Render) — used for payment webhooks/callbacks.
  publicApiUrl: env('PUBLIC_API_URL'),
  lemonSqueezy: {
    apiKey: env('LEMONSQUEEZY_API_KEY'),
    storeId: env('LEMONSQUEEZY_STORE_ID'),
    webhookSecret: env('LEMONSQUEEZY_WEBHOOK_SECRET'),
  },
  cryptomus: {
    merchant: env('CRYPTOMUS_MERCHANT'),
    apiKey: env('CRYPTOMUS_API_KEY'),
  },

  freeSignupCredits: envInt('FREE_SIGNUP_CREDITS', 0),
  freeDailyDrafts: envInt('FREE_DAILY_DRAFTS', 1),
  // Paid-only launch window: before this ISO date there are NO free drafts.
  // Empty = free tier active immediately.
  freeTierStart: env('FREE_TIER_START'),
  rateLimitPerMin: envInt('RATE_LIMIT_PER_MIN', 12),
} as const;

/** Effective free daily drafts right now — 0 during the paid-only launch window. */
export function freeDailyDraftsNow(): number {
  if (config.freeTierStart) {
    const start = Date.parse(config.freeTierStart);
    if (Number.isFinite(start) && Date.now() < start) return 0;
  }
  return config.freeDailyDrafts;
}

// ── Generation modes (FR-2.x, 8.5) ──────────────────────────────────
export type Mode = 'draft' | 'quality' | 'text';

export interface ModeSpec {
  id: Mode;
  label: string;
  /** credits deducted per generation (8.5) */
  cost: number;
  /** underlying model id used by the AI provider */
  model: string;
  approxCostUsd: number;
}

export const MODES: Record<Mode, ModeSpec> = {
  draft: { id: 'draft', label: 'Черновик', cost: 1, model: 'flux-schnell', approxCostUsd: 0.003 },
  quality: { id: 'quality', label: 'Качество', cost: 5, model: 'flux-2-pro', approxCostUsd: 0.03 },
  text: { id: 'text', label: 'Текст на картинке', cost: 10, model: 'ideogram-v2', approxCostUsd: 0.04 },
};

export const DEFAULT_MODE: Mode = 'draft'; // FR-2.4

// ── Styles / presets (FR-4.2) ───────────────────────────────────────
export type Style =
  | 'photo'
  | 'anime'
  | '3d'
  | 'watercolor'
  | 'pixel'
  | 'logo';

export const STYLES: { id: Style; label: string }[] = [
  { id: 'photo', label: 'Фотореализм' },
  { id: 'anime', label: 'Аниме / арт' },
  { id: '3d', label: '3D' },
  { id: 'watercolor', label: 'Акварель' },
  { id: 'pixel', label: 'Пиксель-арт' },
  { id: 'logo', label: 'Логотип' },
];

// ── Aspect / formats (FR-4.1) ───────────────────────────────────────
export type Format = 'square' | 'portrait' | 'landscape';

export const FORMATS: Record<Format, { label: string; width: number; height: number }> = {
  square: { label: 'Квадрат 1:1', width: 1024, height: 1024 },
  portrait: { label: 'Портрет 3:4', width: 896, height: 1152 },
  landscape: { label: 'Ландшафт 4:3', width: 1152, height: 896 },
};

// ── Pricing packages (FR-6.7/6.8, 8.3/8.4) ──────────────────────────
export interface Package {
  id: string;
  line: 'standard' | 'quality';
  credits: number;
  priceUsd: number;
  label: string;
}

export const PACKAGES: Package[] = [
  { id: 'std_200', line: 'standard', credits: 200, priceUsd: 9.99, label: '200 генераций' },
  { id: 'std_500', line: 'standard', credits: 500, priceUsd: 19.99, label: '500 генераций' },
  { id: 'std_1000', line: 'standard', credits: 1000, priceUsd: 34.99, label: '1000 генераций' },
  { id: 'qual_200', line: 'quality', credits: 200, priceUsd: 19.99, label: '200 генераций' },
  { id: 'qual_500', line: 'quality', credits: 500, priceUsd: 44.99, label: '500 генераций' },
  { id: 'qual_1000', line: 'quality', credits: 1000, priceUsd: 79.99, label: '1000 генераций' },
];

export function findPackage(id: string): Package | undefined {
  return PACKAGES.find((p) => p.id === id);
}
