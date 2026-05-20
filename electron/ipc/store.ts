import { ipcMain } from 'electron';
import ElectronStore from 'electron-store';

/**
 * Persistent key-value store backed by electron-store.
 * Data is stored in the user's app data directory as a JSON file.
 */
const store = new ElectronStore({
  name: 'wemark-store',
  defaults: {},
});

/**
 * Register store related IPC handlers.
 *
 * Channels:
 * - `store:get` — Get a value by key
 * - `store:set` — Set a key-value pair
 * - `store:delete` — Delete a key
 * - `store:getEncrypted` — Get an encrypted value (placeholder, T02 will implement)
 * - `store:setEncrypted` — Set an encrypted value (placeholder, T02 will implement)
 */
export function registerStoreHandlers(): void {
  ipcMain.handle('store:get', async (_event, key: string) => {
    try {
      return store.get(key);
    } catch (error) {
      console.error(`[IPC/store:get] Failed to get key "${key}":`, error);
      return undefined;
    }
  });

  ipcMain.handle('store:set', async (_event, key: string, value: unknown) => {
    try {
      store.set(key, value);
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
      store.delete(key);
      return { success: true };
    } catch (error) {
      console.error(`[IPC/store:delete] Failed to delete key "${key}":`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Encrypted store — placeholder implementation
  // T02 will implement actual encryption using safeStorage or node-machine-id
  ipcMain.handle('store:getEncrypted', async (_event, key: string) => {
    try {
      // For now, read from a separate encrypted store namespace
      const encryptedKey = `__encrypted__${key}`;
      return store.get(encryptedKey);
    } catch (error) {
      console.error(`[IPC/store:getEncrypted] Failed to get encrypted key "${key}":`, error);
      return undefined;
    }
  });

  ipcMain.handle('store:setEncrypted', async (_event, key: string, value: unknown) => {
    try {
      // For now, store in a separate namespace (plaintext — T02 will add encryption)
      const encryptedKey = `__encrypted__${key}`;
      store.set(encryptedKey, value);
      return { success: true };
    } catch (error) {
      console.error(`[IPC/store:setEncrypted] Failed to set encrypted key "${key}":`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
}
