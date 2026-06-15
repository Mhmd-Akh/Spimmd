const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  platform: process.platform,
  setTitle: (title) => ipcRenderer.invoke('set-title', title),
  getAllConfig: () => ipcRenderer.invoke('get-all-config'),
  setAllConfig: (data) => ipcRenderer.invoke('set-all-config', data),
  
  // 🔥 این ۴ خط رو اضافه کن:
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, info) => callback(info)),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (event, pct) => callback(pct)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', () => callback()),

  checkUpdate: () => ipcRenderer.invoke('check-update'),
  downloadUpdate: (version) => ipcRenderer.invoke('download-update', version),
  installUpdate: () => ipcRenderer.invoke('install-update'),
});