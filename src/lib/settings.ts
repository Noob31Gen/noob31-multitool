import React, { createContext, useContext, useState, useEffect } from 'react';
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
  corsProvider: 'none',
  customCorsUrl: '',
  theme: 'system',
  persistenceEnabled: safeStorage.isEnabled(),
};

interface SettingsContextType {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
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
    // Sync the global storage toggle if it was changed
    if (settings.persistenceEnabled !== safeStorage.isEnabled()) {
      safeStorage.setEnabled(settings.persistenceEnabled);
    }
  }, [settings]);

  // Listen for storage changes (e.g. from other tabs or direct safeStorage calls)
  useEffect(() => {
    const handleStorageChange = () => {
      const isEnabled = safeStorage.isEnabled();
      if (isEnabled !== settings.persistenceEnabled) {
        setSettings(prev => ({ ...prev, persistenceEnabled: isEnabled }));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [settings.persistenceEnabled]);

  return React.createElement(
    SettingsContext.Provider,
    { value: { settings, setSettings } },
    children
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}