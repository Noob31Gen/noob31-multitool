const CONSENT_KEY = "mt-storage-consent";
export const safeStorage = {
  isEnabled(): boolean {
    return localStorage.getItem(CONSENT_KEY) !== "false";
  },
  setEnabled(enabled: boolean) {
    localStorage.setItem(CONSENT_KEY, enabled.toString());
    if (!enabled) {
      this.clear(false);
    }
  },
  getItem(key: string, defaultValue: string | null = null): string | null {
    if (!this.isEnabled() && key !== CONSENT_KEY) {
      return defaultValue;
    }
    return localStorage.getItem(key) || defaultValue;
  },
  setItem(key: string, value: string) {
    if (!this.isEnabled() && key !== CONSENT_KEY) {
      return;
    }
    localStorage.setItem(key, value);
  },
  removeItem(key: string) {
    if (key === CONSENT_KEY) return;
    localStorage.removeItem(key);
  },
  clear(clearConsent: boolean = false) {
    if (clearConsent) {
      localStorage.clear();
    } else {
      const consent = localStorage.getItem(CONSENT_KEY);
      localStorage.clear();
      if (consent !== null) {
        localStorage.setItem(CONSENT_KEY, consent);
      }
    }
  }
};