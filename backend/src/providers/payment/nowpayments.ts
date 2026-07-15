import { nanoid } from 'nanoid';
import { config } from '../../config.js';
import type { CheckoutSession, PaymentProvider } from './types.js';

const API = 'https://api.nowpayments.io/v1';

/** Authoritative payment status from NOWPayments — the webhook re-checks here so
 *  a spoofed callback can't grant credits. */
export async function getNowPayment(
  paymentId: string,
): Promise<{ payment_id: number; payment_status: string; order_id: string } | null> {
  const apiKey = config.nowPayments.apiKey;
  if (!apiKey) return null;
  try {
    const res = await fetch(`${API}/payment/${paymentId}`, { headers: { 'x-api-key': apiKey } });
    if (!res.ok) return null;
    return (await res.json()) as any;
  } catch {
    return null;
  }
}

/**
 * NOWPaymentsProvider — crypto checkout (USDT settlement, works for KZ payout).
 * Routing (user + package) is encoded in order_id: `<pkgId>~<userId>~<nonce>`.
 */
export class NowPaymentsProvider implements PaymentProvider {
  readonly name = 'nowpayments';

  async createCheckout(params: {
    user: { id: string; email: string };
    pkg: { id: string; priceUsd: number; credits: number };
  }): Promise<CheckoutSession> {
    const apiKey = config.nowPayments.apiKey;
    if (!apiKey) throw new Error('NOWPayments не сконфигурирован (нет API key)');
    const origin = config.clientOrigin.split(',')[0].trim();
    const apiBase = (config.publicApiUrl || '').replace(/\/$/, '');
    const orderId = `${params.pkg.id}~${params.user.id}~${nanoid(8)}`;

    const res = await fetch(`${API}/invoice`, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        price_amount: params.pkg.priceUsd,
        price_currency: 'usd',
        order_id: orderId,
        order_description: `PickGen · ${params.pkg.credits} credits`,
        ipn_callback_url: apiBase ? `${apiBase}/api/webhooks/nowpayments` : undefined,
        success_url: `${origin}/?paid=1`,
        cancel_url: origin,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { invoice_url?: string; message?: string };
    if (!res.ok) throw new Error(`NOWPayments ${res.status}: ${data.message ?? 'error'}`);
    if (!data.invoice_url) throw new Error('NOWPayments не вернул ссылку на оплату');
    return { url: data.invoice_url, provider: 'nowpayments' };
  }
}
