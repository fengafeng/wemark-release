import { app, BrowserWindow, Menu, nativeImage, Tray } from 'electron';
import path from 'node:path';

/**
 * Create and configure the system tray icon.
 *
 * Features:
 * - Click tray icon to show/focus the main window
 * - Right-click context menu: show window, check updates, quit
 * - Window close hides to tray instead of quitting
 *
 * @param mainWindow - The main BrowserWindow instance
 * @returns The created Tray instance
 */
export function createTray(mainWindow: BrowserWindow): Tray {
  const iconPath = getTrayIconPath();
  let trayIcon: ReturnType<typeof nativeImage.createFromPath>;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    // On macOS, use template image for proper dark/light mode support
    if (process.platform === 'darwin') {
      trayIcon = trayIcon.resize({ width: 16, height: 16 });
      trayIcon.setTemplateImage(true);
    }
  } catch {
    // Fallback: create a minimal 16x16 transparent image
    trayIcon = nativeImage.createEmpty();
  }

  const tray = new Tray(trayIcon);
  tray.setToolTip('WeMark');

  // Context menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: 'separator' },
    {
      label: '检查更新',
      click: () => {
        mainWindow.webContents.send('updater:check-for-updates');
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Click tray icon to toggle window visibility
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      if (mainWindow.isFocused()) {
        mainWindow.hide();
      } else {
        mainWindow.focus();
      }
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Double-click to always show and focus
  tray.on('double-click', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  return tray;
}

/**
 * Get the tray icon path based on platform and packaging state.
 */
function getTrayIconPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'tray-icon.png');
  }
  // Development fallback
  return path.join(__dirname, '..', 'public', 'favicon.ico');
}
