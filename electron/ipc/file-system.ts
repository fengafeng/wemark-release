import { app, dialog, ipcMain, shell } from 'electron';

/**
 * Register file system related IPC handlers.
 *
 * Channels:
 * - `fs:selectDirectory` — Opens a native directory selection dialog
 * - `fs:openPath` — Opens a file or directory with the system default application
 */
export function registerFileSystemHandlers(): void {
  ipcMain.handle('fs:selectDirectory', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择输出目录',
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle('fs:openPath', async (_event, filePath: string) => {
    try {
      await shell.openPath(filePath);
      return { success: true };
    } catch (error) {
      console.error('[IPC/fs:openPath] Failed to open path:', filePath, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
}
