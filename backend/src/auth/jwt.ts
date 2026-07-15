import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface SessionPayload {
  uid: string;
  email: string;
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '30d' });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as SessionPayload;
    if (!decoded?.uid) return null;
    return decoded;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = 'pg_session';
