import { BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';

/**
 * Initialize auto-updater with event forwarding to the renderer process.
 *
 * Uses electron-updater to check GitHub Releases for updates.
 * Events are forwarded to the renderer via the main BrowserWindow.
 */
export function initUpdater(): void {
  // Disable auto-download; let the user choose
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] Update available:', info.version);
    forwardToRenderer('updater:update-available', {
      version: info.version,
      releaseDate: info.releaseDate ?? '',
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : '',
    });
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[Updater] No update available');
    forwardToRenderer('updater:update-not-available');
  });

  autoUpdater.on('download-progress', (progressInfo) => {
    console.log(`[Updater] Download progress: ${progressInfo.percent.toFixed(1)}%`);
    forwardToRenderer('updater:download-progress', {
      bytesPerSecond: progressInfo.bytesPerSecond,
      percent: progressInfo.percent,
      transferred: progressInfo.transferred,
      total: progressInfo.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] Update downloaded:', info.version);
    forwardToRenderer('updater:update-downloaded', {
      version: info.version,
      releaseDate: info.releaseDate ?? '',
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : '',
    });
  });

  autoUpdater.on('error', (error) => {
    console.error('[Updater] Error:', error?.message ?? String(error));
  });
}

/**
 * Forward an event to the renderer process.
 */
function forwardToRenderer(channel: string, ...args: unknown[]): void {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    win.webContents.send(channel, ...args);
  }
}

/**
 * Check for updates.
 */
export async function checkForUpdates(): Promise<void> {
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    console.error('[Updater] Check for updates failed:', error);
    throw error;
  }
}

/**
 * Download the available update.
 */
export async function downloadUpdate(): Promise<void> {
  try {
    await autoUpdater.downloadUpdate();
  } catch (error) {
    console.error('[Updater] Download update failed:', error);
    throw error;
  }
}

/**
 * Quit the app and install the downloaded update.
 */
export function quitAndInstall(): void {
  autoUpdater.quitAndInstall();
}
