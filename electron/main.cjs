const { app, BrowserWindow, session, Menu, ipcMain } = require("electron");
const path = require("path");
const http = require("http");
const fs = require("fs");
const url = require("url");
const crypto = require("crypto");
const { autoUpdater } = require("electron-updater");

let mainWindow;

// ==================== CONFIG ====================
const CONFIG_PATH = path.join(app.getPath("userData"), "spimmd_secure.dat");
const ENC_KEY = "spimmd-player-2025-secure-key!!";
const IV = "spimmd-init-vect";

// ==================== AUDIO CACHE ====================
const CACHE_DIR = path.join(app.getPath("userData"), "audio_cache");
const CACHE_INDEX = path.join(CACHE_DIR, "cache_index.json");
const CACHE_CONFIG = path.join(CACHE_DIR, "cache_config.json");
const PLAY_COUNT_PATH = path.join(CACHE_DIR, "play_counts.json");

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

let maxCacheSize = 500;
if (fs.existsSync(CACHE_CONFIG)) {
  try { maxCacheSize = JSON.parse(fs.readFileSync(CACHE_CONFIG, "utf8")).maxSize || 500; } catch {}
}

function getCacheIndex() { try { return fs.existsSync(CACHE_INDEX) ? JSON.parse(fs.readFileSync(CACHE_INDEX, "utf8")) : {}; } catch { return {}; } }
function saveCacheIndex(index) { fs.writeFileSync(CACHE_INDEX, JSON.stringify(index, null, 2)); }
function getPlayCounts() { try { return fs.existsSync(PLAY_COUNT_PATH) ? JSON.parse(fs.readFileSync(PLAY_COUNT_PATH, "utf8")) : {}; } catch { return {}; } }
function savePlayCounts(counts) { fs.writeFileSync(PLAY_COUNT_PATH, JSON.stringify(counts, null, 2)); }
function getTotalCacheSize() { let total = 0; Object.values(getCacheIndex()).forEach((e) => (total += e.size || 0)); return total; }
function cleanOldestCache(neededSpace) { const index = getCacheIndex(); const entries = Object.entries(index).sort((a, b) => a[1].date - b[1].date); let freed = 0; for (const [id, entry] of entries) { if (freed >= neededSpace) break; try { fs.unlinkSync(entry.path); } catch {} delete index[id]; freed += entry.size || 0; } saveCacheIndex(index); }

// ==================== آپدیت ====================
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;
// 🔥 نیازی به setFeedURL نیست - از publish تو package.json میخونه

// ==================== رمزنگاری ====================
function encrypt(text) { try { const key = Buffer.alloc(32), iv = Buffer.alloc(16); Buffer.from(ENC_KEY).copy(key); Buffer.from(IV).copy(iv); const cipher = crypto.createCipheriv("aes-256-cbc", key, iv); return cipher.update(text, "utf8", "hex") + cipher.final("hex"); } catch { return ""; } }
function decrypt(encrypted) { try { const key = Buffer.alloc(32), iv = Buffer.alloc(16); Buffer.from(ENC_KEY).copy(key); Buffer.from(IV).copy(iv); const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv); return decipher.update(encrypted, "hex", "utf8") + decipher.final("utf8"); } catch { return "{}"; } }
function readSecureData() { try { return fs.existsSync(CONFIG_PATH) ? JSON.parse(decrypt(fs.readFileSync(CONFIG_PATH, "utf8"))) : { servers: [], activeServerId: null }; } catch { return { servers: [], activeServerId: null }; } }
function writeSecureData(data) { try { const dir = path.dirname(CONFIG_PATH); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(CONFIG_PATH, encrypt(JSON.stringify(data)), "utf8"); return true; } catch { return false; } }

// ==================== IPC ====================
ipcMain.handle("set-all-config", (e, d) => writeSecureData(d));
ipcMain.handle("get-all-config", () => readSecureData());
ipcMain.handle("get-app-version", () => app.getVersion());
ipcMain.handle("set-title", (e, t) => { if (mainWindow) mainWindow.setTitle(t); });

// Cache IPC
ipcMain.handle("read-cached-file", (e, fp) => { try { return { success: true, data: Array.from(new Uint8Array(fs.readFileSync(fp))) }; } catch { return { success: false }; } });
ipcMain.handle("get-play-count", (e, id) => getPlayCounts()[id] || 0);
ipcMain.handle("set-play-count", (e, id, c) => { const p = getPlayCounts(); p[id] = c; savePlayCounts(p); return true; });
ipcMain.handle("cache-audio", (e, { trackId, audioBuffer, title, artist }) => { try { const filePath = path.join(CACHE_DIR, `${trackId}.opus`); const buffer = Buffer.from(audioBuffer); const totalSize = getTotalCacheSize(); if (totalSize + buffer.length > maxCacheSize * 1024 * 1024) cleanOldestCache(buffer.length); fs.writeFileSync(filePath, buffer); const index = getCacheIndex(); index[trackId] = { id: trackId, size: buffer.length, date: Date.now(), path: filePath, title: title || trackId, artist: artist || "" }; saveCacheIndex(index); return { success: true, size: buffer.length }; } catch (err) { return { success: false, error: err.message }; } });
ipcMain.handle("get-cached-audio", (e, trackId) => { const opusPath = path.join(CACHE_DIR, `${trackId}.opus`); const mp3Path = path.join(CACHE_DIR, `${trackId}.mp3`); const filePath = fs.existsSync(opusPath) ? opusPath : mp3Path; if (fs.existsSync(filePath)) return { exists: true, path: filePath, size: fs.statSync(filePath).size }; return { exists: false }; });
ipcMain.handle("get-cache-list", () => getCacheIndex());
ipcMain.handle("get-cache-size", () => ({ size: getTotalCacheSize(), maxSize: maxCacheSize }));
ipcMain.handle("get-cache-path", () => ({ path: CACHE_DIR }));
ipcMain.handle("set-max-cache-size", (e, s) => { maxCacheSize = s; fs.writeFileSync(CACHE_CONFIG, JSON.stringify({ maxSize: s })); if (getTotalCacheSize() > s * 1024 * 1024) cleanOldestCache(getTotalCacheSize() - s * 1024 * 1024); return { success: true }; });
ipcMain.handle("clear-cache", () => { try { fs.readdirSync(CACHE_DIR).forEach((f) => { try { fs.unlinkSync(path.join(CACHE_DIR, f)); } catch {} }); return { success: true }; } catch { return { success: false }; } });

// 🔥 آپدیت IPC
ipcMain.handle("check-update", async () => { try { await autoUpdater.checkForUpdates(); return null; } catch { return null; } });
ipcMain.handle("download-update", async () => { try { await autoUpdater.downloadUpdate(); return true; } catch { return false; } });
ipcMain.handle("install-update", () => { autoUpdater.quitAndInstall(); });

autoUpdater.on("update-available", (i) => { if (mainWindow) mainWindow.webContents.send("update-available", i); });
autoUpdater.on("download-progress", (p) => { if (mainWindow) mainWindow.webContents.send("download-progress", p.percent); });
autoUpdater.on("update-downloaded", () => { if (mainWindow) mainWindow.webContents.send("update-downloaded"); });
autoUpdater.on("error", (e) => console.error("Update error:", e));

// ==================== پنجره ====================
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366, height: 768, minWidth: 1200, minHeight: 800,
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false, webSecurity: false, allowRunningInsecureContent: true, autoplayPolicy: "no-user-gesture-required" },
    icon: path.join(__dirname, "icon.ico"), show: true, backgroundColor: "#0f0f1a",
  });
  const ses = mainWindow.webContents.session;
  ses.setPermissionRequestHandler((w, p, cb) => cb(true));
  ses.webRequest.onHeadersReceived((d, cb) => cb({ responseHeaders: { ...d.responseHeaders, "Content-Security-Policy": ["default-src * data: blob: 'unsafe-inline' 'unsafe-eval'"], "Access-Control-Allow-Origin": ["*"] } }));
  
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) {
    ses.clearStorageData({ storages: ["serviceworkers", "cachestorage", "indexdb"] });
    mainWindow.loadURL("http://localhost:5173/#/user");
    mainWindow.webContents.openDevTools();
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: 'http://localhost:5173/'
    });
    setTimeout(() => autoUpdater.checkForUpdates(), 2000);

  } else {
    ses.clearStorageData({ storages: ["serviceworkers", "cachestorage", "indexdb"] });
    const distPath = path.join(__dirname, "../dist");
    const server = http.createServer((req, res) => {
      const pu = url.parse(req.url);
      let fp = path.join(distPath, pu.pathname === "/" ? "index.html" : pu.pathname);
      const ext = path.extname(fp).toLowerCase();
      const mime = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
      fs.readFile(fp, (err, data) => { if (err) { res.writeHead(200, { "Content-Type": "text/html" }); fs.createReadStream(path.join(distPath, "index.html")).pipe(res); return; } res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream", "Cache-Control": "max-age=3600" }); res.end(data); });
    });
    server.listen(5173, "127.0.0.1", () => mainWindow.loadURL("http://127.0.0.1:5173/#/user"));
  }
  
  // 🔥 چک آپدیت بعد از لود (فقط تو build)
  if (!isDev) {
    setTimeout(() => autoUpdater.checkForUpdates(), 3000);
  }
}

Menu.setApplicationMenu(null);
app.commandLine.appendSwitch("ignore-certificate-errors");
process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";
app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });