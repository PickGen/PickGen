import crypto from 'node:crypto';
import { config } from '../../config.js';
import type { CheckoutSession, PaymentProvider } from './types.js';

const apiBase = () =>
  config.paddle.env === 'production' ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com';

/**
 * Authoritative transaction status from Paddle — the webhook re-checks here so
 * a spoofed callback can't grant credits (and it sidesteps raw-body signature
 * fragility). Returns status + custom_data.
 */
export async function getPaddleTransaction(
  id: string,
): Promise<{ status: string; custom_data?: { user_id?: string; package_id?: string } } | null> {
  if (!config.paddle.apiKey) return null;
  try {
    const res = await fetch(`${apiBase()}/transactions/${id}`, {
      headers: { Authorization: `Bearer ${config.paddle.apiKey}` },
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { data?: { status: string; custom_data?: Record<string, string> } };
    return j.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Verify a Paddle webhook signature.
 * Header format: `Paddle-Signature: ts=<unix>;h1=<hmac-sha256-hex>`
 * Signed payload is `${ts}:${rawBody}` using the webhook secret.
 */
export function verifyPaddleSignature(rawBody: Buffer, signatureHeader: string | undefined, secret: string): boolean {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(';').map((kv) => {
      const [k, v] = kv.split('=');
      return [k?.trim(), v?.trim()];
    }),
  ) as { ts?: string; h1?: string };
  if (!parts.ts || !parts.h1) return false;
  const digest = crypto.createHmac('sha256', secret).update(`${parts.ts}:${rawBody.toString('utf8')}`).digest('hex');
  const a = Buffer.from(digest);
  const b = Buffer.from(parts.h1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * PaddleProvider — checkout runs client-side via Paddle.js overlay (see the
 * frontend), so there's no server-side checkout URL. Kept for the provider
 * selector; crediting happens in the webhook.
 */
export class PaddleProvider implements PaymentProvider {
  readonly name = 'paddle';
  async createCheckout(): Promise<CheckoutSession> {
    // Frontend opens Paddle.Checkout.open() directly with the price id.
    return { url: 'paddle-overlay', provider: 'paddle' };
  }
}
