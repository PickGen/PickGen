import crypto from 'node:crypto';
import { nanoid } from 'nanoid';
import { config } from '../../config.js';
import type { CheckoutSession, PaymentProvider } from './types.js';

const API = 'https://api.cryptomus.com/v1';

function md5(s: string): string {
  return crypto.createHash('md5').update(s).digest('hex');
}

/** Cryptomus signs requests with md5(base64(body) + apiKey) in the `sign` header. */
async function cryptomusPost(path: string, body: Record<string, unknown>): Promise<any> {
  const { merchant, apiKey } = config.cryptomus;
  if (!merchant || !apiKey) throw new Error('Cryptomus не сконфигурирован (нет merchant/api key)');
  const payload = JSON.stringify(body);
  const sign = md5(Buffer.from(payload).toString('base64') + apiKey);
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { merchant, sign, 'Content-Type': 'application/json' },
    body: payload,
  });
  const data = (await res.json().catch(() => ({}))) as { result?: unknown; message?: string };
  if (!res.ok) throw new Error(`Cryptomus ${res.status}: ${data.message ?? 'error'}`);
  return data.result;
}

/**
 * Authoritative payment status straight from Cryptomus — used by the webhook so
 * we credit only real payments (a spoofed callback can't fake a "paid" status).
 */
export async function getCryptomusPayment(params: { uuid?: string; orderId?: string }): Promise<
  { uuid: string; order_id: string; payment_status: string; additional_data?: string } | null
> {
  const body: Record<string, unknown> = {};
  if (params.uuid) body.uuid = params.uuid;
  else if (params.orderId) body.order_id = params.orderId;
  else return null;
  try {
    return (await cryptomusPost('/payment/info', body)) as any;
  } catch {
    return null;
  }
}

/**
 * CryptomusProvider — global card + crypto checkout (works for KZ sellers).
 * Routing (user + package) is encoded in order_id: `<pkgId>~<userId>~<nonce>`.
 */
export class CryptomusProvider implements PaymentProvider {
  readonly name = 'cryptomus';

  async createCheckout(params: {
    user: { id: string; email: string };
    pkg: { id: string; priceUsd: number; credits: number };
  }): Promise<CheckoutSession> {
    const origin = config.clientOrigin.split(',')[0].trim();
    const apiBase = (config.publicApiUrl || '').replace(/\/$/, '');
    const orderId = `${params.pkg.id}~${params.user.id}~${nanoid(8)}`;

    const result = await cryptomusPost('/payment', {
      amount: String(params.pkg.priceUsd),
      currency: 'USD',
      order_id: orderId,
      url_success: `${origin}/?paid=1`,
      url_return: origin,
      url_callback: apiBase ? `${apiBase}/api/webhooks/cryptomus` : undefined,
      additional_data: JSON.stringify({ user_id: params.user.id, package_id: params.pkg.id }),
      lifetime: 3600,
    });

    const url = (result as { url?: string })?.url;
    if (!url) throw new Error('Cryptomus не вернул ссылку на оплату');
    return { url, provider: 'cryptomus' };
  }
}
