import { ipcMain } from 'electron';
import ElectronStore from 'electron-store';
import { machineIdSync } from 'node-machine-id';
import { decrypt, deriveKey, encrypt } from '../utils/crypto';
import type { EncryptedData } from '../../types/secure-store';

type StoreSchema = Record<string, unknown>;

/**
 * Persistent key-value store backed by electron-store.
 * Data is stored in the user's app data directory as a JSON file.
 */
const store = new ElectronStore<StoreSchema>({
  name: 'wemark-store',
  defaults: {},
});

// Cast to any to bypass overly strict generic constraints from Conf v10+
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const storeAny = store as any;

/** Salt used for PBKDF2 key derivation. Tied to the encryption scheme version. */
const ENCRYPTION_SALT = 'wemark-secure-store-salt-v1';

/** Internal prefix for encrypted keys to avoid collision with plaintext keys. */
const ENCRYPTED_KEY_PREFIX = '__enc__';

// Derive the encryption key from the machine ID at module load time.
// This ensures the key is available before any IPC handler is called.
const machineId = machineIdSync();
const encryptionKey = deriveKey(machineId, ENCRYPTION_SALT);

// ─── Secure Store Bridge ───────────────────────────────────────────
// Exported so that electron/main.ts can attach it to globalThis
// for the embedded Nitro server to access.

export const secureStoreBridge = {
  async getEncrypted(key: string): Promise<unknown> {
    try {
      const storeKey = `${ENCRYPTED_KEY_PREFIX}${key}`;
      const encrypted = storeAny.get(storeKey) as EncryptedData | undefined;
      if (!encrypted) return undefined;
      const plaintext = decrypt(encrypted, encryptionKey);
      return JSON.parse(plaintext);
    } catch (error) {
      console.error(`[SecureBridge/getEncrypted] Failed for key "${key}":`, error);
      return undefined;
    }
  },

  async setEncrypted(key: string, value: unknown): Promise<{ success: boolean; error?: string }> {
    try {
      const storeKey = `${ENCRYPTED_KEY_PREFIX}${key}`;
      const plaintext = JSON.stringify(value);
      const encrypted = encrypt(plaintext, encryptionKey);
      storeAny.set(storeKey, encrypted);
      return { success: true };
    } catch (error) {
      console.error(`[SecureBridge/setEncrypted] Failed for key "${key}":`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  async deleteEncrypted(key: string): Promise<{ success: boolean; error?: string }> {
    try {
      const storeKey = `${ENCRYPTED_KEY_PREFIX}${key}`;
      storeAny.delete(storeKey);
      return { success: true };
    } catch (error) {
      console.error(`[SecureBridge/deleteEncrypted] Failed for key "${key}":`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

// ─── IPC Handlers ──────────────────────────────────────────────────

/**
 * Register store related IPC handlers.
 *
 * Channels:
 * - `store:get` — Get a value by key (plaintext)
 * - `store:set` — Set a key-value pair (plaintext)
 * - `store:delete` — Delete a key (plaintext)
 * - `store:getEncrypted` — Get an encrypted value (AES-256-GCM)
 * - `store:setEncrypted` — Set an encrypted value (AES-256-GCM)
 * - `store:deleteEncrypted` — Delete an encrypted value
 */
export function registerStoreHandlers(): void {
  ipcMain.handle('store:get', async (_event, key: string) => {
    try {
      return storeAny.get(key);
    } catch (error) {
      console.error(`[IPC/store:get] Failed to get key "${key}":`, error);
      return undefined;
    }
  });

  ipcMain.handle('store:set', async (_event, key: string, value: unknown) => {
    try {
      storeAny.set(key, value);
      return { success: true };
    } catch (error) {
      console.error(`[IPC/store:set] Failed to set key "${key}":`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle('store:delete', async (_event, key: string) => {
    try {
      storeAny.delete(key);
      return { success: true };
    } catch (error) {
      console.error(`[IPC/store:delete] Failed to delete key "${key}":`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // ─── Encrypted store handlers (AES-256-GCM) ──────────────────────
  // All encryption/decryption happens in the main process.
  // The renderer never has access to the encryption key.

  ipcMain.handle('store:getEncrypted', async (_event, key: string) => {
    return secureStoreBridge.getEncrypted(key);
  });

  ipcMain.handle('store:setEncrypted', async (_event, key: string, value: unknown) => {
    return secureStoreBridge.setEncrypted(key, value);
  });

  ipcMain.handle('store:deleteEncrypted', async (_event, key: string) => {
    return secureStoreBridge.deleteEncrypted(key);
  });
}
