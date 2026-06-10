import { config } from '../config.js';
import type { WhatsAppProvider } from './provider.js';
import { TwoFactorProvider } from './providers/twofactor.js';
import { MetaProvider } from './providers/meta.js';

let cached: WhatsAppProvider | undefined;

export function getProvider(): WhatsAppProvider {
  if (cached) return cached;
  switch (config.WHATSAPP_PROVIDER) {
    case 'twofactor':
      cached = new TwoFactorProvider();
      break;
    case 'meta':
    case 'threesixty':
      cached = new MetaProvider();
      break;
    default:
      cached = new TwoFactorProvider();
  }
  return cached;
}

export * from './types.js';
export type { WhatsAppProvider } from './provider.js';
