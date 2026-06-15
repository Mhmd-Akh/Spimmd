const { app, BrowserWindow, session, Menu, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const url = require('url');
const crypto = require('crypto');
const { autoUpdater } = require('electron-updater');

let mainWindow;

// ==================== CONFIG ====================
const CONFIG_PATH = path.join(app.getPath('userData'), 'spimmd_secure.dat');
const ENC_KEY = 'spimmd-player-2025-secure-key!!';
const IV = 'spimmd-init-vect';

// 🔥 لینک آپدیت
const UPDATE_SERVER = 'http://130.185.72.221:4465/files/spimmd-desktop';
const UPDATE_INFO_URL = `${UPDATE_SERVER}/UpdateInfo.json`;

// ==================== آپدیت ====================
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

autoUpdater.setFeedURL({
  provider: 'generic',
  url: UPDATE_SERVER + '/'
});

// ==================== رمزنگاری ====================
function encrypt(text) {
  try {
    const key = Buffer.alloc(32), iv = Buffer.alloc(16);
    Buffer.from(ENC_KEY).copy(key);
    Buffer.from(IV).copy(iv);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  } catch { return ''; }
}

function decrypt(encrypted) {
  try {
    const key = Buffer.alloc(32), iv = Buffer.alloc(16);
    Buffer.from(ENC_KEY).copy(key);
    Buffer.from(IV).copy(iv);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch { return '{}'; }
}

function readSecureData() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(decrypt(fs.readFileSync(CONFIG_PATH, 'utf8')));
    }
  } catch {}
  return { servers: [], activeServerId: null };
}

function writeSecureData(data) {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, encrypt(JSON.stringify(data)), 'utf8');
    return true;
  } catch { return false; }
}

// ==================== IPC handlers ====================
ipcMain.handle('set-all-config', (event, data) => writeSecureData(data));
ipcMain.handle('get-all-config', () => readSecureData());
ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('set-title', (event, title) => {
  if (mainWindow) mainWindow.setTitle(title);
});

// 🔥 چک آپدیت - اول UpdateInfo.json رو میخونه، بعد autoUpdater
ipcMain.handle('check-update', async () => {
  try {
    const response = await fetch(UPDATE_INFO_URL);
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    console.error('Check update error:', e);
    return null;
  }
});

// 🔥 دانلود از طریق autoUpdater
ipcMain.handle('download-update', async () => {
  try {
    await autoUpdater.checkForUpdates();
    autoUpdater.downloadUpdate();
    return true;
  } catch (e) {
    console.error('Download error:', e);
    return false;
  }
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});

// ==================== رویدادهای آپدیت ====================
autoUpdater.on('update-available', (info) => {
  if (mainWindow) mainWindow.webContents.send('update-available', info);
});

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow) mainWindow.webContents.send('download-progress', progressObj.percent);
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) mainWindow.webContents.send('update-downloaded');
});

autoUpdater.on('error', (err) => {
  console.error('Update error:', err);
});

// ==================== پنجره اصلی ====================
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
      autoplayPolicy: 'no-user-gesture-required',
    },
    icon: path.join(__dirname, 'icon.ico'),
    show: true,
    backgroundColor: '#0f0f1a',
  });

  const ses = mainWindow.webContents.session;
  ses.setPermissionRequestHandler((webContents, permission, callback) => callback(true));

  ses.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src * data: blob: 'unsafe-inline' 'unsafe-eval'"],
        'Access-Control-Allow-Origin': ['*'],
      }
    });
  });

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    ses.clearStorageData({ storages: ['serviceworkers', 'cachestorage', 'indexdb'] });
    mainWindow.loadURL('http://localhost:5173/#/user');
    mainWindow.webContents.openDevTools();
  } else {
    ses.clearStorageData({ storages: ['serviceworkers', 'cachestorage', 'indexdb'] });
    mainWindow.webContents.openDevTools();

    const distPath = path.join(__dirname, '../dist');
    const server = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url);
      let filePath = path.join(distPath, parsedUrl.pathname === '/' ? 'index.html' : parsedUrl.pathname);
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
        '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
      };
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          fs.createReadStream(path.join(distPath, 'index.html')).pipe(res);
          return;
        }
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream', 'Cache-Control': 'max-age=3600' });
        res.end(data);
      });
    });

    server.listen(5173, '127.0.0.1', () => {
      mainWindow.loadURL('http://127.0.0.1:5173/#/user');
    });
  }
}

Menu.setApplicationMenu(null);
app.commandLine.appendSwitch('ignore-certificate-errors');
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});