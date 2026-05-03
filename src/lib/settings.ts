import { useState, useEffect } from 'react';
import type { CorsProvider } from './cors';
import { safeStorage } from './storage';

export type DoHProvider = 'google' | 'cloudflare' | 'alidns' | 'adguard' | 'custom';

export interface AppSettings {
  dohProvider: DoHProvider;
  customDnsUrl: string;
  corsProvider: CorsProvider;
  customCorsUrl: string;
  theme: 'light' | 'dark' | 'system';
  persistenceEnabled: boolean;
}

export const defaultSettings: AppSettings = {
  dohProvider: 'google',
  customDnsUrl: '',
  corsProvider: 'corsproxy',
  customCorsUrl: '',
  theme: 'system',
  persistenceEnabled: safeStorage.isEnabled(),
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = safeStorage.getItem('url-scanner-settings');
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved), persistenceEnabled: safeStorage.isEnabled() };
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
    return { ...defaultSettings, persistenceEnabled: safeStorage.isEnabled() };
  });

  useEffect(() => {
    safeStorage.setItem('url-scanner-settings', JSON.stringify(settings));
    // Sync the global storage toggle if it was changed via settings
    if (settings.persistenceEnabled !== safeStorage.isEnabled()) {
      safeStorage.setEnabled(settings.persistenceEnabled);
    }
  }, [settings]);

  return { settings, setSettings };
}