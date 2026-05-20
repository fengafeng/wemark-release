import { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray } from 'electron';
import path from 'node:path';
import { startNitroServer } from './server';
import { registerFileSystemHandlers } from './ipc/file-system';
import { registerStoreHandlers } from './ipc/store';
import { registerUpdaterHandlers } from './ipc/updater';
import { createTray } from './tray';

let mainWindow: BrowserWindow | null = null;
let serverPort: number = 3000;
let tray: Tray | null = null;
let isQuitting = false;

/**
 * Create the main BrowserWindow.
 */
function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
    icon: getAppIcon(),
  });

  // Load the app
  if (app.isPackaged) {
    // Production: load from Nuxt build output served by embedded Nitro
    mainWindow.loadURL(`http://localhost:${serverPort}`);
  } else {
    // Development: load from Nuxt dev server
    mainWindow.loadURL(`http://localhost:3000`);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Show window when ready to avoid visual flash
  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  // Minimize to tray instead of closing (unless app is quitting)
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

/**
 * Get the application icon path.
 */
function getAppIcon(): nativeImage | undefined {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icon.png')
    : path.join(__dirname, '..', 'public', 'favicon.ico');
  try {
    return nativeImage.createFromPath(iconPath);
  } catch {
    return undefined;
  }
}

/**
 * Register all IPC handlers.
 */
function registerIpcHandlers(): void {
  registerFileSystemHandlers();
  registerStoreHandlers();
  registerUpdaterHandlers();

  // App-level IPC
  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });

  ipcMain.handle('app:getPlatform', () => {
    return process.platform;
  });

  ipcMain.handle('app:isPackaged', () => {
    return app.isPackaged;
  });

  // Window control IPC (for frameless window)
  ipcMain.on('window:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on('window:close', () => {
    mainWindow?.close();
  });

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow?.isMaximized() ?? false;
  });

  // Deep link IPC (placeholder for future use)
  ipcMain.on('app:deepLink', (_event, url: string) => {
    mainWindow?.webContents.send('app:deepLink', url);
  });
}

/**
 * Bootstrap the Electron application.
 */
async function bootstrap(): Promise<void> {
  // Single instance lock
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  await app.whenReady();

  // Start embedded Nitro server (production mode only)
  if (app.isPackaged) {
    try {
      serverPort = await startNitroServer();
      console.log(`[Electron] Nitro server started on port ${serverPort}`);
    } catch (error) {
      console.error('[Electron] Failed to start Nitro server:', error);
      app.quit();
      return;
    }
  }

  // Register IPC handlers before creating window
  registerIpcHandlers();

  // Create the main window
  createMainWindow();

  // Create system tray
  tray = createTray(mainWindow!);

  // Handle app quit
  app.on('before-quit', () => {
    isQuitting = true;
  });

  // macOS: re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else {
      mainWindow?.show();
    }
  });

  // Handle all windows closed (except macOS)
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

// Handle protocol for deep links (placeholder)
app.setAsDefaultProtocolClient('wemark');

bootstrap().catch((error) => {
  console.error('[Electron] Bootstrap failed:', error);
  app.quit();
});

export { mainWindow, serverPort };
