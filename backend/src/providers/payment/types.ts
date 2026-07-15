import type { Package } from '../../config.js';

export interface CheckoutSession {
  /** URL to redirect the user to, or a sentinel the frontend understands (mock). */
  url: string;
  provider: string;
}

export interface PaymentProvider {
  readonly name: string;
  /** Create a hosted checkout for a credits package (FR-6.1/6.2). */
  createCheckout(params: { user: { id: string; email: string }; pkg: Package }): Promise<CheckoutSession>;
}
