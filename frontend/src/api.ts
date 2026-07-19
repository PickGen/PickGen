import type { AppConfig, Generation, Package, Payment, User } from './types';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

// In production the backend lives on another domain (Render). Prefer VITE_API_URL
// when set; otherwise fall back to the known Render backend for prod builds. In
// dev the base is empty so Vite proxies /api → local backend.
const PROD_API_FALLBACK = 'https://pickgen-backend-sqru.onrender.com';
const API_BASE = (
  import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? PROD_API_FALLBACK : '')
).replace(/\/$/, '');

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    ...options,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new ApiError(data.error ?? 'error', data.message ?? 'Ошибка запроса', res.status, data);
  }
  return data as T;
}

export const api = {
  config: () => request<AppConfig>('/api/config'),
  me: () => request<{ user: User }>('/api/me'),
  login: (payload: {
    email: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    useCase?: string;
  }) =>
    request<{ user?: User; needsProfile?: boolean }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),

  generate: (payload: {
    prompt: string;
    negativePrompt?: string;
    mode: string;
    style: string;
    format: string;
    seed?: number;
  }) =>
    request<{ generation: Generation; creditsSpent: number; usedFreeDaily: boolean; user: User }>(
      '/api/generate',
      { method: 'POST', body: JSON.stringify(payload) },
    ),

  generations: () => request<{ generations: Generation[] }>('/api/generations'),
  deleteGeneration: (id: string) =>
    request<{ ok: true }>(`/api/generations/${id}`, { method: 'DELETE' }),
  clearGenerations: () => request<{ ok: true; removed: number }>('/api/generations', { method: 'DELETE' }),

  payments: () => request<{ payments: Payment[] }>('/api/payments'),
  checkout: (packageId: string) =>
    request<{ checkout: { url: string; provider: string }; package: Package }>('/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ packageId }),
    }),
  mockComplete: (packageId: string) =>
    request<{ ok: true; user: User; creditsAdded: number }>('/api/payments/mock-complete', {
      method: 'POST',
      body: JSON.stringify({ packageId }),
    }),
};
