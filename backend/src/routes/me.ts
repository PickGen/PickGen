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
    return {
      modes: Object.values(MODES),
      defaultMode: DEFAULT_MODE,
      styles: STYLES,
      formats: Object.entries(FORMATS).map(([id, f]) => ({ id, ...f })),
      packages: PACKAGES,
      freeSignupCredits: config.freeSignupCredits,
      freeDailyDrafts: freeDailyDraftsNow(),
      paymentProvider: config.paymentProvider,
      aiProvider: config.aiProvider,
    };
  });
}
