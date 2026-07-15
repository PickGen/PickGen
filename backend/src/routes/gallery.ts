import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/plugin.js';
import { generations } from '../db/repos.js';
import { serializeGeneration } from './generate.js';

export async function galleryRoutes(app: FastifyInstance): Promise<void> {
  // history (FR-7.1)
  app.get('/api/generations', { preHandler: requireAuth }, async (req) => {
    const rows = await generations.listByUser(req.user!.id);
    return { generations: rows.map(serializeGeneration) };
  });

  // single full-size (FR-7.2)
  app.get<{ Params: { id: string } }>('/api/generations/:id', { preHandler: requireAuth }, async (req, reply) => {
    const row = await generations.getOwned(req.params.id, req.user!.id);
    if (!row) return reply.code(404).send({ error: 'not_found' });
    return { generation: serializeGeneration(row) };
  });

  // delete one (FR-7.6)
  app.delete<{ Params: { id: string } }>('/api/generations/:id', { preHandler: requireAuth }, async (req, reply) => {
    const ok = await generations.delete(req.params.id, req.user!.id);
    if (!ok) return reply.code(404).send({ error: 'not_found' });
    return { ok: true };
  });

  // clear all history (FR-7.6)
  app.delete('/api/generations', { preHandler: requireAuth }, async (req) => {
    const removed = await generations.clear(req.user!.id);
    return { ok: true, removed };
  });
}
