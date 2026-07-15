import type { FastifyInstance } from 'fastify';
import { users } from '../db/repos.js';
import { SESSION_COOKIE, signSession } from '../auth/jwt.js';
import { config } from '../config.js';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // Dev-simple email login: creates the user on first sight (FR-5.1, FR-5.6).
  // Replace with magic-link / OAuth for production.
  app.post<{ Body: { email?: string } }>('/api/auth/login', async (req, reply) => {
    const email = (req.body?.email ?? '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return reply.code(400).send({ error: 'invalid_email', message: 'Введите корректный email' });
    }
    const user = await users.findOrCreate(email);
    const token = signSession({ uid: user.id, email: user.email });
    reply
      .setCookie(SESSION_COOKIE, token, {
        httpOnly: true,
        // Prod: frontend (Vercel) and backend (Render) are on different domains,
        // so the session cookie must be SameSite=None; Secure to be sent cross-site.
        sameSite: config.isProd ? 'none' : 'lax',
        secure: config.isProd,
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      })
      .send({ user: publicUser(user) });
  });

  app.post('/api/auth/logout', async (_req, reply) => {
    reply
      .clearCookie(SESSION_COOKIE, {
        path: '/',
        sameSite: config.isProd ? 'none' : 'lax',
        secure: config.isProd,
      })
      .send({ ok: true });
  });
}

export function publicUser(u: { id: string; email: string; credits: number; plan: string; created_at: string }) {
  return { id: u.id, email: u.email, credits: u.credits, plan: u.plan, createdAt: u.created_at };
}
