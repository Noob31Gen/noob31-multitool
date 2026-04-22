import { useState, useEffect } from 'react';

export type DoHProvider = 'google' | 'cloudflare' | 'alidns' | 'adguard';

export interface AppSettings {
  dohProvider: DoHProvider;
  corsProxyUrl: string;
  apiKeys: {
    ipinfo: string;
    spamhausDqs: string;
    virustotal: string;
  };
  theme: 'light' | 'dark' | 'system';
}

const defaultSettings: AppSettings = {
  dohProvider: 'google',
  corsProxyUrl: 'https://corsproxy.io/?',
  apiKeys: {
    ipinfo: '',
    spamhausDqs: '',
    virustotal: '',
  },
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
