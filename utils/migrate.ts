/**
 * Data migration utilities for moving from plaintext storage to encrypted storage.
 *
 * Migrations are idempotent — running them multiple times has no side effects.
 * Only runs in the renderer process (uses window.electronAPI and localStorage).
 */

/** Keys in localStorage that should be migrated to encrypted storage. */
const MIGRATABLE_KEYS = [
  'auto-detect-credentials:credentials',
  'credentials',
  'login',
] as const;

/** Key used to track whether migration has been completed. */
const MIGRATION_FLAG = '__migrated_to_secure_store__';

/**
 * Migrate sensitive data from localStorage to the encrypted secure store.
 *
 * This function is designed to be called once on app startup when running
 * inside Electron. It detects old plaintext data in localStorage, moves it
 * to the encrypted store via IPC, and then removes the plaintext copy.
 *
 * In Web mode this is a no-op (no encrypted store available).
 *
 * @returns true if any data was migrated, false otherwise
 */
export async function migrateFromLocalStorage(): Promise<boolean> {
  const { isElectron, api } = useElectron();
  if (!isElectron.value || !api.value) {
    return false;
  }

  // Check if migration has already been completed
  const { getSecure, setSecure } = useSecureStore();
  const alreadyMigrated = await getSecure<boolean>(MIGRATION_FLAG);
  if (alreadyMigrated) {
    return false;
  }

  let migrated = false;

  for (const key of MIGRATABLE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) continue;

      const value = JSON.parse(raw);
      await setSecure(key, value);
      localStorage.removeItem(key);
      migrated = true;
      console.log(`[migrate] Migrated localStorage key "${key}" to secure store`);
    } catch (error) {
      console.error(`[migrate] Failed to migrate key "${key}":`, error);
    }
  }

  // Also scan for any __secure__ prefixed keys in localStorage
  // (from previous Web-mode useSecureStore fallback) and migrate them
  const securePrefix = '__secure__';
  for (let i = 0; i < localStorage.length; i++) {
    const storageKey = localStorage.key(i);
    if (!storageKey || !storageKey.startsWith(securePrefix)) continue;

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === null) continue;

      const value = JSON.parse(raw);
      // Strip the __secure__ prefix for the encrypted store key
      const targetKey = storageKey.slice(securePrefix.length);
      await setSecure(targetKey, value);
      localStorage.removeItem(storageKey);
      migrated = true;
      console.log(`[migrate] Migrated localStorage key "${storageKey}" to secure store as "${targetKey}"`);
    } catch (error) {
      console.error(`[migrate] Failed to migrate key "${storageKey}":`, error);
    }
  }

  // Mark migration as complete
  await setSecure(MIGRATION_FLAG, true);

  return migrated;
}

/**
 * Migrate cookie data from the server-side KV storage to the encrypted store.
 *
 * This is called from the renderer process. It fetches all known cookie keys
 * from the server API and stores them in the encrypted electron-store.
 * The server-side CookieStore will then read from the encrypted store on
 * subsequent requests.
 *
 * This migration is lazy — it relies on the CookieStore's fallback behavior:
 * when it can't find a cookie in the encrypted store, it checks KV, and if
 * found, migrates it automatically. See `server/utils/secureStorage.ts`.
 *
 * For now this function is a placeholder. The actual KV → encrypted store
 * migration happens transparently in the server-side CookieStore adapter.
 *
 * @returns true if any data was migrated, false otherwise
 */
export async function migrateFromKV(): Promise<boolean> {
  // KV migration happens lazily on the server side via the
  // server/utils/secureStorage.ts fallback mechanism.
  // No explicit action is needed from the renderer.
  return false;
}

/**
 * Run all data migrations. Should be called once during app initialization.
 *
 * @returns true if any data was migrated, false otherwise
 */
export async function runMigrations(): Promise<boolean> {
  const lsMigrated = await migrateFromLocalStorage();
  const kvMigrated = await migrateFromKV();
  return lsMigrated || kvMigrated;
}
