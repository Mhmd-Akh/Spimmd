const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  platform: process.platform,
  setTitle: (title) => ipcRenderer.invoke("set-title", title),
  getAllConfig: () => ipcRenderer.invoke("get-all-config"),
  setAllConfig: (data) => ipcRenderer.invoke("set-all-config", data),

  onUpdateAvailable: (cb) =>
    ipcRenderer.on("update-available", (e, i) => cb(i)),
  onDownloadProgress: (cb) =>
    ipcRenderer.on("download-progress", (e, p) => cb(p)),
  onUpdateDownloaded: (cb) => ipcRenderer.on("update-downloaded", () => cb()),
  checkUpdate: () => ipcRenderer.invoke("check-update"),
  downloadUpdate: (v) => ipcRenderer.invoke("download-update", v),
  installUpdate: () => ipcRenderer.invoke("install-update"),

  // 🔥 Audio Cache
  cacheAudio: (trackId, audioBuffer, title, artist) =>
    ipcRenderer.invoke("cache-audio", { trackId, audioBuffer, title, artist }),
  getCachedAudio: (trackId) => ipcRenderer.invoke("get-cached-audio", trackId),
  getCacheList: () => ipcRenderer.invoke("get-cache-list"),
  getCacheSize: () => ipcRenderer.invoke("get-cache-size"),
  getCachePath: () => ipcRenderer.invoke("get-cache-path"),
  setMaxCacheSize: (size) => ipcRenderer.invoke("set-max-cache-size", size),
  getPlayCount: (trackId) => ipcRenderer.invoke("get-play-count", trackId),
  setPlayCount: (trackId, count) =>
    ipcRenderer.invoke("set-play-count", trackId, count),
  clearCache: () => ipcRenderer.invoke("clear-cache"),
  readCachedFile: (path) => ipcRenderer.invoke('read-cached-file', path),
});
