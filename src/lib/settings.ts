import { useState, useEffect } from 'react';
import type { CorsProvider } from './cors';

export type DoHProvider = 'google' | 'cloudflare' | 'alidns' | 'adguard' | 'custom';

export interface AppSettings {
  dohProvider: DoHProvider;
  customDnsUrl: string;
  corsProvider: CorsProvider;
  customCorsUrl: string;
  theme: 'light' | 'dark' | 'system';
}

export const defaultSettings: AppSettings = {
  dohProvider: 'google',
  customDnsUrl: '',
  corsProvider: 'corsproxy',
  customCorsUrl: '',
  theme: 'system',
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('url-scanner-settings');
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('url-scanner-settings', JSON.stringify(settings));
  }, [settings]);

  return { settings, setSettings };
}