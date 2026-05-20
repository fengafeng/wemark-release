import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI, DownloadProgressInfo, UpdateInfo } from '../types/electron';

/**
 * Preload script: exposes a safe, limited API to the renderer process
 * via contextBridge under `window.electronAPI`.
 */
const electronAPI: ElectronAPI = {
  isElectron: () => true,

  // --- Store ---
  store: {
    get: (key: string) => ipcRenderer.invoke('store:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value),
    delete: (key: string) => ipcRenderer.invoke('store:delete', key),
    getEncrypted: (key: string) => ipcRenderer.invoke('store:getEncrypted', key),
    setEncrypted: (key: string, value: unknown) => ipcRenderer.invoke('store:setEncrypted', key, value),
  },

  // --- File System ---
  fs: {
    selectDirectory: () => ipcRenderer.invoke('fs:selectDirectory'),
    openPath: (path: string) => ipcRenderer.invoke('fs:openPath', path),
  },

  // --- Updater ---
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:checkForUpdates'),
    downloadUpdate: () => ipcRenderer.invoke('updater:downloadUpdate'),
    quitAndInstall: () => ipcRenderer.invoke('updater:quitAndInstall'),
    onUpdateAvailable: (callback: (info: UpdateInfo) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, info: UpdateInfo) => callback(info);
      ipcRenderer.on('updater:update-available', handler);
      return () => ipcRenderer.removeListener('updater:update-available', handler);
    },
    onDownloadProgress: (callback: (progress: DownloadProgressInfo) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, progress: DownloadProgressInfo) => callback(progress);
      ipcRenderer.on('updater:download-progress', handler);
      return () => ipcRenderer.removeListener('updater:download-progress', handler);
    },
    onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, info: UpdateInfo) => callback(info);
      ipcRenderer.on('updater:update-downloaded', handler);
      return () => ipcRenderer.removeListener('updater:update-downloaded', handler);
    },
  },

  // --- App Info ---
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
    isPackaged: () => ipcRenderer.invoke('app:isPackaged'),
  },

  // --- Deep Link (placeholder) ---
  onDeepLink: (callback: (url: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, url: string) => callback(url);
    ipcRenderer.on('app:deepLink', handler);
    return () => ipcRenderer.removeListener('app:deepLink', handler);
  },

  // --- Window Controls (frameless window) ---
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, isMaximized: boolean) => callback(isMaximized);
      ipcRenderer.on('window:maximizeChange', handler);
      return () => ipcRenderer.removeListener('window:maximizeChange', handler);
    },
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
