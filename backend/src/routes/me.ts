import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/plugin.js';
import { publicUser } from './auth.js';
import { config, freeDailyDraftsNow, MODES, STYLES, FORMATS, DEFAULT_MODE, PACKAGES } from '../config.js';

export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/me', { preHandler: requireAuth }, async (req) => {
    return { user: publicUser(req.user!) };
  });

  // Static catalog for the frontend: modes, styles, formats, packages (FR-2.5, 4.x).
  app.get('/api/config', async () => {
    // For Paddle, attach the Paddle price id to each package so the frontend
    // can open the Paddle.js checkout overlay.
    const packages =
      config.paymentProvider === 'paddle'
        ? PACKAGES.map((p) => ({ ...p, paddlePriceId: config.paddle.priceMap[p.id] }))
        : PACKAGES;
    return {
      modes: Object.values(MODES),
      defaultMode: DEFAULT_MODE,
      styles: STYLES,
      formats: Object.entries(FORMATS).map(([id, f]) => ({ id, ...f })),
      packages,
      freeSignupCredits: config.freeSignupCredits,
      freeDailyDrafts: freeDailyDraftsNow(),
      paymentProvider: config.paymentProvider,
      aiProvider: config.aiProvider,
      paddle:
        config.paymentProvider === 'paddle'
          ? { clientToken: config.paddle.clientToken, env: config.paddle.env }
          : undefined,
    };
  });
}
