import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, Tray } from 'electron';
import path from 'node:path';
import Store from 'electron-store';
import { startNitroServer } from './server';
import { registerFileSystemHandlers } from './ipc/file-system';
import { registerStoreHandlers, secureStoreBridge } from './ipc/store';
import { registerUpdaterHandlers } from './ipc/updater';
import { createTray } from './tray';
import { logger } from './utils/logger';

let mainWindow: BrowserWindow | null = null;
let serverPort: number = 3000;
let tray: Tray | null = null;
let isQuitting = false;

// ─── Window State Persistence ──────────────────────────────────────

type WindowStateSchema = {
  bounds: { x: number; y: number; width: number; height: number };
  isMaximized: boolean;
};

const windowStateStore = new Store<WindowStateSchema>({
  name: 'window-state',
  defaults: {
    bounds: { x: -1, y: -1, width: 1280, height: 800 },
    isMaximized: false,
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wsAny = windowStateStore as any;

/**
 * Create the main BrowserWindow.
 */
function createMainWindow(): BrowserWindow {
  const savedBounds = wsAny.get('bounds') as WindowStateSchema['bounds'];
  const savedIsMaximized = wsAny.get('isMaximized') as boolean;

  mainWindow = new BrowserWindow({
    width: savedBounds.width,
    height: savedBounds.height,
    x: savedBounds.x >= 0 ? savedBounds.x : undefined,
    y: savedBounds.y >= 0 ? savedBounds.y : undefined,
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

  // Restore maximized state if previously maximized
  if (savedIsMaximized) {
    mainWindow.maximize();
  }

  // Load the app
  if (app.isPackaged) {
    // Production: load from Nuxt build output served by embedded Nitro
    mainWindow.loadURL(`http://localhost:${serverPort}`);
  } else {
    // Development: load from Nuxt dev server
    mainWindow.loadURL(`http://localhost:3000`);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Intercept downloads and show save dialog
  mainWindow.webContents.session.on('will-download', async (event, item) => {
    event.preventDefault();
    const defaultPath = item.getFilename();
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: '保存文件',
      defaultPath,
      filters: [
        {
          name: '所有文件',
          extensions: ['*'],
        },
      ],
    });
    if (!result.canceled && result.filePath) {
      item.setSavePath(result.filePath);
    }
  });

  // Show window when ready to avoid visual flash
  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  // Forward maximize/unmaximize state changes to renderer
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximizeChange', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximizeChange', false);
  });

  // Security: prevent navigation away from the app (anti-phishing / anti-XSS)
  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  // Security: prevent new windows from being opened
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Minimize to tray instead of closing (unless app is quitting)
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    } else {
      // Save window state on quit
      try {
        const bounds = mainWindow!.getBounds();
        const isMaximized = mainWindow!.isMaximized();
        wsAny.set('bounds', bounds);
        wsAny.set('isMaximized', isMaximized);
      } catch {
        // Ignore errors during state save on close
      }
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
function getAppIcon(): ReturnType<typeof nativeImage.createFromPath> | undefined {
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

  // Deep link IPC
  ipcMain.on('app:deepLink', (_event, url: string) => {
    mainWindow?.webContents.send('app:deepLink', url);
  });
}

/**
 * Bootstrap the Electron application.
 */
async function bootstrap(): Promise<void> {
  // Global error handlers
  process.on('uncaughtException', (error) => {
    logger.error('[Electron] Uncaught exception:', error);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('[Electron] Unhandled rejection:', reason);
  });

  // Register deep link protocol
  app.setAsDefaultProtocolClient('wemark');

  // Single instance lock
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
    return;
  }

  app.on('second-instance', (_event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }

    // Handle deep link from second instance (Windows/Linux)
    const deepLinkUrl = argv.find((arg) => arg.startsWith('wemark://'));
    if (deepLinkUrl) {
      mainWindow?.webContents.send('app:deepLink', deepLinkUrl);
    }
  });

  // Handle deep link on macOS (open-url event)
  app.on('open-url', (_event, url) => {
    if (url.startsWith('wemark://')) {
      if (mainWindow) {
        mainWindow.webContents.send('app:deepLink', url);
      }
    }
  });

  await app.whenReady();

  // Expose the secure store bridge on globalThis so the embedded Nitro server
  // can access encrypted storage without importing Electron modules.
  globalThis.__wemarkSecureStore = secureStoreBridge;
  logger.info('[Electron] Secure store bridge attached to globalThis');

  // Start embedded Nitro server (production mode only)
  if (app.isPackaged) {
    try {
      serverPort = await startNitroServer();
      logger.info(`[Electron] Nitro server started on port ${serverPort}`);
    } catch (error) {
      logger.error('[Electron] Failed to start Nitro server:', error);
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

bootstrap().catch((error) => {
  logger.error('[Electron] Bootstrap failed:', error);
  app.quit();
});

export { mainWindow, serverPort };
