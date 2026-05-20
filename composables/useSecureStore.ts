/**
 * Composable for secure (encrypted) key-value storage.
 *
 * In Electron: uses the IPC bridge to read/write encrypted values
 * via the main process's electron-store + AES-256-GCM.
 *
 * In Web: falls back to localStorage (no encryption, but API-compatible).
 * Sensitive credentials should only be stored in Electron mode.
 */
export function useSecureStore() {
  const { isElectron, api } = useElectron();

  /**
   * Read a value from the secure store.
   * Returns null if the key does not exist.
   */
  async function getSecure<T>(key: string): Promise<T | null> {
    try {
      if (isElectron.value && api.value) {
        const result = await api.value.store.getEncrypted(key);
        return result !== undefined && result !== null ? (result as T) : null;
      }
      // Web fallback: localStorage
      const raw = localStorage.getItem(`__secure__${key}`);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (error) {
      console.error(`[useSecureStore/getSecure] Failed for key "${key}":`, error);
      return null;
    }
  }

  /**
   * Write a value to the secure store.
   * The value is automatically JSON-serialized.
   */
  async function setSecure<T>(key: string, value: T): Promise<void> {
    try {
      if (isElectron.value && api.value) {
        const result = await api.value.store.setEncrypted(key, value);
        if (!result.success) {
          console.error(`[useSecureStore/setSecure] Failed for key "${key}":`, result.error);
        }
        return;
      }
      // Web fallback: localStorage
      localStorage.setItem(`__secure__${key}`, JSON.stringify(value));
    } catch (error) {
      console.error(`[useSecureStore/setSecure] Failed for key "${key}":`, error);
    }
  }

  /**
   * Remove a value from the secure store.
   */
  async function removeSecure(key: string): Promise<void> {
    try {
      if (isElectron.value && api.value) {
        const result = await api.value.store.deleteEncrypted(key);
        if (!result.success) {
          console.error(`[useSecureStore/removeSecure] Failed for key "${key}":`, result.error);
        }
        return;
      }
      // Web fallback: localStorage
      localStorage.removeItem(`__secure__${key}`);
    } catch (error) {
      console.error(`[useSecureStore/removeSecure] Failed for key "${key}":`, error);
    }
  }

  return {
    getSecure,
    setSecure,
    removeSecure,
  };
}
