import { config } from '../../config.js';
import type { CheckoutSession, PaymentProvider } from './types.js';

/**
 * LemonSqueezyProvider — real Merchant of Record checkout (FR-6.1, LIM-4).
 * Creates a hosted checkout via the Lemon Squeezy API. Product/variant ids per
 * package must be configured in the store and mapped here once available.
 */
export class LemonSqueezyProvider implements PaymentProvider {
  readonly name = 'lemonsqueezy';

  async createCheckout(params: {
    user: { id: string; email: string };
    pkg: { id: string; priceUsd: number; label: string; credits: number };
  }): Promise<CheckoutSession> {
    if (!config.lemonSqueezy.apiKey || !config.lemonSqueezy.storeId) {
      throw new Error('Lemon Squeezy не сконфигурирован (нет API-ключа/store id)');
    }
    // Map PickGen package -> LS variant id here (TODO: fill from dashboard).
    const variantId = process.env[`LS_VARIANT_${params.pkg.id.toUpperCase()}`];
    if (!variantId) throw new Error(`Нет variant id для пакета ${params.pkg.id}`);

    const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.lemonSqueezy.apiKey}`,
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email: params.user.email,
              // custom passes back on the webhook so we credit the right user
              custom: { user_id: params.user.id, package_id: params.pkg.id },
            },
            product_options: {
              // Send the buyer back to the app after a successful payment.
              redirect_url: `${config.clientOrigin.split(',')[0]}/?paid=1`,
              receipt_button_text: 'Вернуться в PickGen',
              receipt_link_url: config.clientOrigin.split(',')[0],
            },
          },
          relationships: {
            store: { data: { type: 'stores', id: config.lemonSqueezy.storeId } },
            variant: { data: { type: 'variants', id: variantId } },
          },
        },
      }),
    });
    if (!res.ok) {
      throw new Error(`Lemon Squeezy checkout failed: ${res.status}`);
    }
    const data = (await res.json()) as { data?: { attributes?: { url?: string } } };
    const url = data.data?.attributes?.url;
    if (!url) throw new Error('Lemon Squeezy не вернул URL оплаты');
    return { url, provider: 'lemonsqueezy' };
  }
}
