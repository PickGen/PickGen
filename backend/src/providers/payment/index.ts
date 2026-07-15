import { config } from '../../config.js';
import { MockPaymentProvider } from './mock.js';
import { LemonSqueezyProvider } from './lemonsqueezy.js';
import { CryptomusProvider } from './cryptomus.js';
import type { PaymentProvider } from './types.js';

let provider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (provider) return provider;
  switch (config.paymentProvider) {
    case 'cryptomus':
      provider = new CryptomusProvider();
      break;
    case 'lemonsqueezy':
      provider = new LemonSqueezyProvider();
      break;
    case 'mock':
    default:
      provider = new MockPaymentProvider();
      break;
  }
  return provider;
}

export * from './types.js';
