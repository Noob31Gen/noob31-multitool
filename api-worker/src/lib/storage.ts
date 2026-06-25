const memoryStore = new Map<string, string>();

export const safeStorage = {
  isEnabled(): boolean {
    return true;
  },
  setEnabled(enabled: boolean) {
    // No-op in worker
  },
  getItem(key: string, defaultValue: string | null = null): string | null {
    return memoryStore.get(key) ?? defaultValue;
  },
  setItem(key: string, value: string) {
    memoryStore.set(key, value);
  },
  removeItem(key: string) {
    memoryStore.delete(key);
  },
  clear(clearConsent: boolean = false) {
    memoryStore.clear();
  }
};