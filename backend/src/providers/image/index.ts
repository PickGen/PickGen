import { config } from '../../config.js';
import { MockProvider } from './mock.js';
import { FalProvider } from './fal.js';
import type { ImageProvider } from './types.js';

let provider: ImageProvider | null = null;

export function getImageProvider(): ImageProvider {
  if (provider) return provider;
  switch (config.aiProvider) {
    case 'fal':
      provider = new FalProvider();
      break;
    case 'mock':
    default:
      provider = new MockProvider();
      break;
  }
  return provider;
}

export * from './types.js';
