import crypto from 'node:crypto';
import type { CheckoutSession, PaymentProvider } from './types.js';

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
