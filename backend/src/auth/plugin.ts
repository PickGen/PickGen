import type { FastifyReply, FastifyRequest } from 'fastify';
import { SESSION_COOKIE, verifySession } from './jwt.js';
import { users } from '../db/repos.js';
import type { UserRow } from '../db/index.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: UserRow;
  }
}

/** preHandler that loads the current user from the session cookie.
 *  Rejects with 401 if there is no valid session (FR-8.3). */
export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE];
  const session = token ? verifySession(token) : null;
  if (!session) {
    reply.code(401).send({ error: 'unauthorized', message: 'Требуется вход' });
    return;
  }
  const user = await users.getById(session.uid);
  if (!user) {
    reply.code(401).send({ error: 'unauthorized', message: 'Пользователь не найден' });
    return;
  }
  req.user = user;
}
