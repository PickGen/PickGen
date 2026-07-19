import type { FastifyInstance } from 'fastify';
import { users } from '../db/repos.js';
import { SESSION_COOKIE, signSession } from '../auth/jwt.js';
import { config } from '../config.js';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // Email login/signup (FR-5.1, FR-5.6). Two-step for new users:
  //   1) email only, user is new → { needsProfile: true } (frontend shows the form)
  //   2) email + profile         → create account and sign in
  // Returning users sign in immediately from step 1.
  app.post<{
    Body: { email?: string; firstName?: string; lastName?: string; username?: string; useCase?: string };
  }>('/api/auth/login', async (req, reply) => {
    const b = req.body ?? {};
    const email = (b.email ?? '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return reply.code(400).send({ error: 'invalid_email', message: 'Введите корректный email' });
    }

    const existing = await users.getByEmail(email);
    // New user without a profile yet → ask the frontend to collect it.
    if (!existing && !b.firstName) {
      return reply.send({ needsProfile: true });
    }

    const user =
      existing ??
      (await users.findOrCreate(email, {
        firstName: (b.firstName ?? '').trim() || undefined,
        lastName: (b.lastName ?? '').trim() || undefined,
        username: (b.username ?? '').trim() || undefined,
        useCase: (b.useCase ?? '').trim() || undefined,
      }));

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

export function publicUser(u: {
  id: string;
  email: string;
  credits: number;
  plan: string;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  use_case?: string | null;
  created_at: string;
}) {
  return {
    id: u.id,
    email: u.email,
    credits: u.credits,
    plan: u.plan,
    firstName: u.first_name ?? null,
    lastName: u.last_name ?? null,
    username: u.username ?? null,
    useCase: u.use_case ?? null,
    createdAt: u.created_at,
  };
}
