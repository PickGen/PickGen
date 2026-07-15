import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/plugin.js';
import { users, generations } from '../db/repos.js';
import { config, freeDailyDraftsNow, MODES, FORMATS, type Mode, type Style, type Format } from '../config.js';
import { getImageProvider, GenerationError } from '../providers/image/index.js';
import { buildFinalPrompt } from '../services/prompt.js';
import { moderatePrompt } from '../services/moderation.js';
import { checkRateLimit } from '../services/rateLimit.js';
import { publicUser } from './auth.js';

interface GenerateBody {
  prompt?: string;
  negativePrompt?: string;
  mode?: Mode;
  style?: Style;
  format?: Format;
  seed?: number;
}

const VALID_STYLES = new Set<Style>(['photo', 'anime', '3d', 'watercolor', 'pixel', 'logo']);

export async function generateRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: GenerateBody }>(
    '/api/generate',
    { preHandler: requireAuth },
    async (req, reply) => {
      const user = req.user!;
      const body = req.body ?? {};

      // ── rate limit (FR-8.2) ──
      const rl = checkRateLimit(`${user.id}:${req.ip}`);
      if (!rl.ok) {
        return reply
          .code(429)
          .send({ error: 'rate_limited', message: `Слишком часто. Повторите через ${rl.retryAfter}с`, retryAfter: rl.retryAfter });
      }

      // ── validate ──
      const prompt = (body.prompt ?? '').trim();
      if (prompt.length < 2) {
        return reply.code(400).send({ error: 'invalid_prompt', message: 'Введите описание изображения' });
      }
      if (prompt.length > 1000) {
        return reply.code(400).send({ error: 'invalid_prompt', message: 'Слишком длинное описание' });
      }
      const mode: Mode = body.mode && MODES[body.mode] ? body.mode : 'draft';
      const style: Style = body.style && VALID_STYLES.has(body.style) ? body.style : 'photo';
      const format: Format = body.format && FORMATS[body.format] ? body.format : 'square';
      const modeSpec = MODES[mode];

      // ── moderation (FR-8.4) ──
      const mod = moderatePrompt(prompt);
      if (!mod.allowed) {
        return reply.code(400).send({ error: 'blocked', message: mod.reason });
      }

      // ── free daily draft allowance (FR-6.9 / MON-1) ──
      let cost = modeSpec.cost;
      let usedFreeDaily = false;
      if (mode === 'draft' && user.plan === 'free') {
        const usedToday = await generations.countDraftsToday(user.id);
        if (usedToday < freeDailyDraftsNow()) {
          cost = 0;
          usedFreeDaily = true;
        }
      }

      // ── credit check + atomic deduction (FR-5.3, FR-5.4, AC-3.1) ──
      if (cost > 0) {
        const updated = await users.deductCredits(user.id, cost);
        if (!updated) {
          return reply.code(402).send({
            error: 'no_credits',
            message: 'Недостаточно кредитов. Пополните баланс, чтобы продолжить.',
            required: cost,
            balance: user.credits,
          });
        }
      }

      // ── build final prompt (FR-3.x) ──
      const { finalPrompt, negativePrompt } = await buildFinalPrompt({
        prompt,
        style,
        negativePrompt: body.negativePrompt,
      });

      const fmt = FORMATS[format];
      const provider = getImageProvider();

      // ── generate with one auto-retry on retriable failure (FR-3.5) ──
      let imageUrl: string | null = null;
      let lastErr: GenerationError | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const result = await provider.generate({
            prompt,
            finalPrompt,
            negativePrompt,
            mode,
            model: modeSpec.model,
            style,
            format,
            width: fmt.width,
            height: fmt.height,
            seed: body.seed,
          });
          imageUrl = result.imageUrl;
          break;
        } catch (err) {
          lastErr = err instanceof GenerationError ? err : new GenerationError((err as Error).message, false);
          if (!lastErr.retriable) break;
        }
      }

      if (!imageUrl) {
        // refund deducted credits (NFR-2, FR-1.6)
        if (cost > 0) await users.addCredits(user.id, cost);
        return reply
          .code(502)
          .send({ error: 'generation_failed', message: `Не удалось сгенерировать: ${lastErr?.message ?? 'ошибка провайдера'}` });
      }

      // ── persist (FR-7.1) ──
      const gen = await generations.create({
        user_id: user.id,
        prompt,
        final_prompt: finalPrompt,
        mode,
        style,
        format,
        seed: body.seed ?? null,
        image_url: imageUrl,
      });

      const fresh = (await users.getById(user.id))!;
      return {
        generation: serializeGeneration(gen),
        creditsSpent: cost,
        usedFreeDaily,
        user: publicUser(fresh),
      };
    },
  );
}

export function serializeGeneration(g: {
  id: string;
  prompt: string;
  mode: string;
  style: string;
  format: string;
  seed: number | null;
  image_url: string;
  created_at: string;
}) {
  return {
    id: g.id,
    prompt: g.prompt,
    mode: g.mode,
    style: g.style,
    format: g.format,
    seed: g.seed,
    imageUrl: g.image_url,
    createdAt: g.created_at,
  };
}
