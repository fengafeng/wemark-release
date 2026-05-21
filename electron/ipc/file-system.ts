import { app, dialog, ipcMain, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Register file system related IPC handlers.
 *
 * Channels:
 * - `fs:selectDirectory` — Opens a native directory selection dialog
 * - `fs:openPath` — Opens a file or directory with the system default application
 * - `fs:saveFileDialog` — Opens a native save file dialog
 * - `fs:writeFile` — Writes Base64 data to a file (must go through saveFileDialog first)
 * - `fs:readFile` — Reads a file and returns its contents as Base64 (restricted paths)
 */

/** Paths that are forbidden for file operations (system directories). */
const FORBIDDEN_PATHS = [
  'C:\\Windows',
  'C:\\Program Files',
  'C:\\Program Files (x86)',
  'C:\\ProgramData',
  '/usr',
  '/bin',
  '/sbin',
  '/etc',
  '/System',
  '/Library',
];

/** File extensions that are dangerous to open via shell.openPath (executable files). */
const DANGEROUS_EXTENSIONS = ['.exe', '.bat', '.cmd', '.ps1', '.vbs', '.vbe', '.wsf', '.wsh', '.msi', '.scr', '.com'];

/**
 * Validate that a file path is safe for operations.
 * Rejects paths that traverse into system directories or outside user-accessible areas.
 */
function isPathSafe(filePath: string): boolean {
  const resolved = path.resolve(filePath);

  // Block UNC paths (\\server\share) — prevent remote code execution
  if (resolved.startsWith('\\\\') || filePath.startsWith('\\\\')) {
    return false;
  }

  // Block system paths
  for (const forbidden of FORBIDDEN_PATHS) {
    if (resolved.toLowerCase().startsWith(forbidden.toLowerCase())) {
      return false;
    }
  }

  // Block app installation directory
  if (app.isPackaged && resolved.toLowerCase().startsWith(process.resourcesPath.toLowerCase())) {
    return false;
  }

  return true;
}

/**
 * Validate that a file path is safe to open via shell.openPath.
 * In addition to isPathSafe checks, also blocks executable files.
 */
function isOpenPathSafe(filePath: string): boolean {
  if (!isPathSafe(filePath)) {
    return false;
  }

  const ext = path.extname(filePath).toLowerCase();
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return false;
  }

  return true;
}

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
    if (!isOpenPathSafe(filePath)) {
      return { success: false, error: 'Access denied: path is restricted or contains dangerous file type' };
    }
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
    if (!isPathSafe(filePath)) {
      return { success: false, error: 'Access denied: path is in a restricted area' };
    }
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
    if (!isPathSafe(filePath)) {
      return { success: false, error: 'Access denied: path is in a restricted area' };
    }
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
