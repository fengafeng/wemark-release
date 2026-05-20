/**
 * Electron IPC type definitions.
 *
 * These types describe the `window.electronAPI` object exposed
 * by the preload script via contextBridge.
 */

// ─── IPC Channel Names ─────────────────────────────────────────────

export const IPC_CHANNELS = {
  // Store
  STORE_GET: 'store:get',
  STORE_SET: 'store:set',
  STORE_DELETE: 'store:delete',
  STORE_GET_ENCRYPTED: 'store:getEncrypted',
  STORE_SET_ENCRYPTED: 'store:setEncrypted',

  // File System
  FS_SELECT_DIRECTORY: 'fs:selectDirectory',
  FS_OPEN_PATH: 'fs:openPath',

  // Updater
  UPDATER_CHECK_FOR_UPDATES: 'updater:checkForUpdates',
  UPDATER_DOWNLOAD_UPDATE: 'updater:downloadUpdate',
  UPDATER_QUIT_AND_INSTALL: 'updater:quitAndInstall',

  // Updater Events (main → renderer)
  UPDATER_UPDATE_AVAILABLE: 'updater:update-available',
  UPDATER_DOWNLOAD_PROGRESS: 'updater:download-progress',
  UPDATER_UPDATE_DOWNLOADED: 'updater:update-downloaded',

  // App Info
  APP_GET_VERSION: 'app:getVersion',
  APP_GET_PLATFORM: 'app:getPlatform',
  APP_IS_PACKAGED: 'app:isPackaged',

  // Deep Link
  APP_DEEP_LINK: 'app:deepLink',

  // Window Controls
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:isMaximized',
  WINDOW_MAXIMIZE_CHANGE: 'window:maximizeChange',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

// ─── Event Data Types ──────────────────────────────────────────────

/** Information about an available update. */
export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
}

/** Download progress information. */
export interface DownloadProgressInfo {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

/** Result of a store set/delete operation. */
export interface StoreResult {
  success: boolean;
  error?: string;
}

/** Result of opening a path. */
export interface OpenPathResult {
  success: boolean;
  error?: string;
}

// ─── ElectronAPI Interface ─────────────────────────────────────────

export interface ElectronAPI {
  /** Always returns `true` in Electron context. Used to detect Electron vs Web. */
  isElectron: () => true;

  /** Persistent key-value store (electron-store). */
  store: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<StoreResult>;
    delete: (key: string) => Promise<StoreResult>;
    getEncrypted: (key: string) => Promise<unknown>;
    setEncrypted: (key: string, value: unknown) => Promise<StoreResult>;
  };

  /** File system operations. */
  fs: {
    /** Open a native directory selection dialog. Returns the selected path or null. */
    selectDirectory: () => Promise<string | null>;
    /** Open a file or directory with the system default application. */
    openPath: (path: string) => Promise<OpenPathResult>;
  };

  /** Auto-updater controls. */
  updater: {
    checkForUpdates: () => Promise<StoreResult>;
    downloadUpdate: () => Promise<StoreResult>;
    quitAndInstall: () => Promise<StoreResult>;
    /** Subscribe to update-available events. Returns an unsubscribe function. */
    onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
    /** Subscribe to download-progress events. Returns an unsubscribe function. */
    onDownloadProgress: (callback: (progress: DownloadProgressInfo) => void) => () => void;
    /** Subscribe to update-downloaded events. Returns an unsubscribe function. */
    onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => () => void;
  };

  /** Application information. */
  app: {
    getVersion: () => Promise<string>;
    getPlatform: () => Promise<string>;
    isPackaged: () => Promise<boolean>;
  };

  /** Deep link event listener (placeholder for future use). */
  onDeepLink: (callback: (url: string) => void) => () => void;

  /** Window controls for frameless window. */
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
  };
}

// ─── Window Global Augmentation ────────────────────────────────────

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
