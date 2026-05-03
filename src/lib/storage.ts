/**
 * Safe Storage Wrapper
 * 
 * Provides a controlled way to access localStorage.
 * If storage is disabled by the user, it prevents writing to disk
 * and returns default values for reads.
 */

const CONSENT_KEY = "mt-storage-consent";

export const safeStorage = {
  /**
   * Check if the user has enabled persistent storage
   */
  isEnabled(): boolean {
    // Consent defaults to true if not explicitly set to false
    return localStorage.getItem(CONSENT_KEY) !== "false";
  },

  /**
   * Enable or disable persistent storage
   */
  setEnabled(enabled: boolean) {
    localStorage.setItem(CONSENT_KEY, enabled.toString());
    if (!enabled) {
      this.clear(false); // Clear everything except the consent key
    }
  },

  /**
   * Get an item from storage
   */
  getItem(key: string, defaultValue: string | null = null): string | null {
    if (!this.isEnabled() && key !== CONSENT_KEY) {
      return defaultValue;
    }
    return localStorage.getItem(key) || defaultValue;
  },

  /**
   * Set an item in storage
   */
  setItem(key: string, value: string) {
    if (!this.isEnabled() && key !== CONSENT_KEY) {
      return;
    }
    localStorage.setItem(key, value);
  },

  /**
   * Remove an item from storage
   */
  removeItem(key: string) {
    if (key === CONSENT_KEY) return;
    localStorage.removeItem(key);
  },

  /**
   * Clear all storage
   * @param clearConsent If true, even the consent key is removed
   */
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
