import { dialog, ipcMain, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Register file system related IPC handlers.
 *
 * Channels:
 * - `fs:selectDirectory` — Opens a native directory selection dialog
 * - `fs:openPath` — Opens a file or directory with the system default application
 * - `fs:saveFileDialog` — Opens a native save file dialog
 * - `fs:writeFile` — Writes Base64 data to a file
 * - `fs:readFile` — Reads a file and returns its contents as Base64
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

  ipcMain.handle(
    'fs:saveFileDialog',
    async (
      _event,
      options: { title?: string; defaultPath?: string; filters?: { name: string; extensions: string[] }[] },
    ) => {
      const result = await dialog.showSaveDialog({
        title: options.title ?? '保存文件',
        defaultPath: options.defaultPath,
        filters: options.filters,
      });

      if (result.canceled || !result.filePath) {
        return null;
      }

      return result.filePath;
    },
  );

  ipcMain.handle('fs:writeFile', async (_event, filePath: string, base64Data: string) => {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, buffer);
      return { success: true };
    } catch (error) {
      console.error('[IPC/fs:writeFile] Failed to write file:', filePath, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'File not found' };
      }
      const buffer = fs.readFileSync(filePath);
      return { success: true, data: buffer.toString('base64') };
    } catch (error) {
      console.error('[IPC/fs:readFile] Failed to read file:', filePath, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
}
