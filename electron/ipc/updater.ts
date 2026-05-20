import { ipcMain } from 'electron';
import { checkForUpdates, downloadUpdate, initUpdater, quitAndInstall } from '../updater';

/**
 * Register updater related IPC handlers.
 *
 * Channels:
 * - `updater:checkForUpdates` — Check for available updates
 * - `updater:downloadUpdate` — Download the available update
 * - `updater:quitAndInstall` — Quit and install the downloaded update
 *
 * Events forwarded to renderer:
 * - `updater:update-available` — An update is available
 * - `updater:download-progress` — Download progress info
 * - `updater:update-downloaded` — Update has been downloaded
 */
export function registerUpdaterHandlers(): void {
  // Initialize the auto-updater with event listeners
  initUpdater();

  ipcMain.handle('updater:checkForUpdates', async () => {
    try {
      await checkForUpdates();
      return { success: true };
    } catch (error) {
      console.error('[IPC/updater:checkForUpdates] Failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle('updater:downloadUpdate', async () => {
    try {
      await downloadUpdate();
      return { success: true };
    } catch (error) {
      console.error('[IPC/updater:downloadUpdate] Failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle('updater:quitAndInstall', async () => {
    try {
      quitAndInstall();
      return { success: true };
    } catch (error) {
      console.error('[IPC/updater:quitAndInstall] Failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
}
