/**
 * Server-side secure storage abstraction.
 *
 * When running inside Electron (detected via process.versions.electron),
 * delegates to the globalThis.__wemarkSecureStore bridge that the
 * Electron main process sets up before starting the Nitro server.
 *
 * When running in Web/Cloudflare mode, falls back to Nitro KV storage
 * (useStorage('kv')), which provides the same key-value API but without
 * encryption.
 *
 * Cookie data is migrated lazily: if a value is found in KV but not in
 * the encrypted store, it is automatically migrated to the encrypted store
 * and the KV copy is left in place (for safety; it can be cleaned up later).
 */

/**
 * Check if the app is running inside Electron.
 */
function isElectron(): boolean {
  return typeof process !== 'undefined' && !!process.versions?.electron;
}

/**
 * Get the secure store bridge from globalThis.
 * Returns null if not available (Web mode or bridge not set up).
 */
function getBridge() {
  return globalThis.__wemarkSecureStore ?? null;
}

/**
 * Read a value from the secure store (Electron) or KV (Web).
 *
 * In Electron mode, if the value is not found in the encrypted store
 * but exists in KV, it is automatically migrated to the encrypted store.
 */
export async function secureGet<T>(key: string): Promise<T | null> {
  if (isElectron()) {
    const bridge = getBridge();
    if (bridge) {
      const result = await bridge.getEncrypted(key);
      if (result !== undefined && result !== null) {
        return result as T;
      }

      // Fallback: try KV and auto-migrate if found
      const kv = useStorage('kv');
      const kvValue = await kv.get<T>(key);
      if (kvValue !== null) {
        // Auto-migrate to encrypted store (fire and forget, log errors)
        bridge.setEncrypted(key, kvValue).catch((error: unknown) => {
          console.error(`[secureStorage] Auto-migration failed for key "${key}":`, error);
        });
        return kvValue;
      }

      return null;
    }
  }

  // Web fallback: use KV storage
  const kv = useStorage('kv');
  return await kv.get<T>(key);
}

/**
 * Write a value to the secure store (Electron) or KV (Web).
 *
 * In Electron mode, also writes to KV as a backup during the migration period.
 */
export async function secureSet<T>(key: string, value: T, ttl?: number): Promise<boolean> {
  try {
    if (isElectron()) {
      const bridge = getBridge();
      if (bridge) {
        const result = await bridge.setEncrypted(key, value);
        if (!result.success) {
          console.error(`[secureStorage] setEncrypted failed for key "${key}":`, result.error);
          // Fall through to KV as fallback
        } else {
          // Also write to KV as backup during migration period
          const kv = useStorage('kv');
          if (ttl) {
            await kv.set(key, value, { expirationTtl: ttl });
          } else {
            await kv.set(key, value);
          }
          return true;
        }
      }
    }

    // Web fallback or Electron fallback: use KV storage
    const kv = useStorage('kv');
    if (ttl) {
      await kv.set(key, value, { expirationTtl: ttl });
    } else {
      await kv.set(key, value);
    }
    return true;
  } catch (error) {
    console.error(`[secureStorage] secureSet failed for key "${key}":`, error);
    return false;
  }
}

/**
 * Delete a value from the secure store (Electron) and KV.
 */
export async function secureDelete(key: string): Promise<boolean> {
  try {
    if (isElectron()) {
      const bridge = getBridge();
      if (bridge) {
        await bridge.deleteEncrypted(key);
      }
    }

    // Also delete from KV
    const kv = useStorage('kv');
    await kv.removeItem(key);
    return true;
  } catch (error) {
    console.error(`[secureStorage] secureDelete failed for key "${key}":`, error);
    return false;
  }
}

// ─── Cookie-specific helpers ────────────────────────────────────────

/** KV key prefix for cookie data, matching the existing format. */
const COOKIE_KEY_PREFIX = 'cookie:';

/**
 * Build the storage key for a cookie entry.
 */
export function cookieKey(authKey: string): string {
  return `${COOKIE_KEY_PREFIX}${authKey}`;
}

/**
 * Read cookie data from secure storage.
 * Uses a generic type parameter to avoid circular imports with cookie.ts.
 */
export async function getSecureCookie<T = unknown>(authKey: string): Promise<T | null> {
  return secureGet<T>(cookieKey(authKey));
}

/**
 * Write cookie data to secure storage.
 * Uses a generic type parameter to avoid circular imports with cookie.ts.
 */
export async function setSecureCookie<T = unknown>(authKey: string, data: T, ttl?: number): Promise<boolean> {
  return secureSet(cookieKey(authKey), data, ttl);
}
