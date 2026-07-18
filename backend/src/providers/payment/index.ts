import { config } from '../../config.js';
import { MockPaymentProvider } from './mock.js';
import { LemonSqueezyProvider } from './lemonsqueezy.js';
import { CryptomusProvider } from './cryptomus.js';
import { NowPaymentsProvider } from './nowpayments.js';
import { PaddleProvider } from './paddle.js';
import type { PaymentProvider } from './types.js';

let provider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (provider) return provider;
  switch (config.paymentProvider) {
    case 'paddle':
      provider = new PaddleProvider();
      break;
    case 'nowpayments':
      provider = new NowPaymentsProvider();
      break;
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
