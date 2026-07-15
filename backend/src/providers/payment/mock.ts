import type { CheckoutSession, PaymentProvider } from './types.js';

/**
 * MockProvider — no real money. Returns a sentinel URL the frontend turns into a
 * "confirm test purchase" action that calls the dev-only completion endpoint.
 * Lets FR-6.x flows (checkout → balance update) be tested with no MoR account.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  async createCheckout(params: {
    user: { id: string; email: string };
    pkg: { id: string };
  }): Promise<CheckoutSession> {
    return { url: `mock-checkout://${params.pkg.id}`, provider: 'mock' };
  }
}
