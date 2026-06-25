import type { CorsProvider } from './cors';

export type DoHProvider = 'auto' | 'google' | 'cloudflare' | 'alidns' | 'adguard' | 'custom';

export interface AppSettings {
  dohProvider: DoHProvider;
  customDnsUrl: string;
  corsProvider: CorsProvider;
  customCorsUrl: string;
  theme: 'light' | 'dark' | 'system';
  persistenceEnabled: boolean;
}

export const defaultSettings: AppSettings = {
  dohProvider: 'auto',
  customDnsUrl: '',
  corsProvider: 'none',
  customCorsUrl: '',
  theme: 'dark',
  persistenceEnabled: false,
};