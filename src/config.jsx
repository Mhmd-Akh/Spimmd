import { notify } from "./components/Notification";

class Config {
  constructor() {
    this.EXPIRY_DAYS = 7;
    this.servers = [];
    this.activeServerId = null;
    this._loaded = false;
  }

async load() {
  if (this._loaded) return;
  
  try {
    if (window.electronAPI) {
      const data = await window.electronAPI.getAllConfig();
  
      if (data && data.servers && data.servers.length > 0) {
        this.servers = data.servers;
        this.activeServerId = data.activeServerId;
        this._loaded = true;
        return;
      }
      notify('✅ Loaded All Settings')
    } else {
      notify('⚠️ electronAPI not available', 'error')
    }
    
    // fallback
    const saved = localStorage.getItem('navidrome_servers');
    if (saved) {
      this.servers = JSON.parse(saved);
      this.activeServerId = localStorage.getItem('activeServerId') || this.servers[0]?.id || null;
    }
  } catch (e) {
    console.error('❌ Config.load error:', e);
  }
  this._loaded = true;
}

async save() {
  const data = {
    servers: this.servers,
    activeServerId: this.activeServerId
  };
  
  if (window.electronAPI) {
    console.log('📡 Sending to electronAPI...');
    const result = await window.electronAPI.setAllConfig(data);
    console.log('📡 Result:', result);
  } else {
    console.log('⚠️ electronAPI not available!');
  }
  
  localStorage.setItem('navidrome_servers', JSON.stringify(this.servers));
  localStorage.setItem('activeServerId', this.activeServerId || '');
}

  get activeServer() {
    return this.servers.find(s => s.id === this.activeServerId) || {};
  }

  get server() { return this.activeServer.server || ''; }
  get username() { return this.activeServer.username || ''; }
  get password() { return this.activeServer.password || ''; }

  get eqSettings() {
    const server = this.activeServer;

    return server.eqSettings || {
      equalizerEnabled: false,
      equalizerBands: { '32': 0, '64': 0, '100': 0, '160': 0, '250': 0, '400': 0, '630': 0, '1k': 0, '1.6k': 0, '2.5k': 0, '4k': 0, '6.3k': 0, '10k': 0, '16k': 0 },
      equalizerPreset: "normal",
      bassBoost: 0, volumeBoost: 0,
      threeDEnabled: false, threeDDepth: 50,
      virtualizerEnabled: false, virtualizerPreset: 'studio',
    };
  }

  async saveEqSettings(settings) {
    const idx = this.servers.findIndex(s => s.id === this.activeServerId);
    if (idx >= 0) {
      this.servers[idx] = { ...this.servers[idx], eqSettings: settings };
      await this.save();
    }
  }

  isExpired() {
    const server = this.activeServer;
    if (!server.savedAt || !server.password) return true;
    const elapsed = Date.now() - server.savedAt;
    return (elapsed / (1000 * 60 * 60 * 24)) >= this.EXPIRY_DAYS;
  }

  async refreshPassword(password) {
    const idx = this.servers.findIndex(s => s.id === this.activeServerId);
    if (idx >= 0) {
      this.servers[idx] = { ...this.servers[idx], password, savedAt: Date.now() };
      await this.save();
    }
  }

  async addServer(serverUrl, username, password, name = '') {
    const id = Date.now().toString(36);
    this.servers.push({
      id, server: serverUrl.replace(/\/$/, ''), username, password,
      name: name || serverUrl, savedAt: Date.now()
    });
    this.activeServerId = id;
    await this.save();
    return id;
  }

  async removeServer(id) {
    this.servers = this.servers.filter(s => s.id !== id);
    if (this.activeServerId === id) this.activeServerId = this.servers[0]?.id || null;
    await this.save();
  }

  async setCredentials(server, username, password) {
    if (this.servers.length === 0) {
      await this.addServer(server, username, password);
    } else if (this.activeServerId) {
      const idx = this.servers.findIndex(s => s.id === this.activeServerId);
      if (idx >= 0) {
        this.servers[idx] = { ...this.servers[idx], server: server.replace(/\/$/, ''), username, password, savedAt: Date.now() };
      }
    }
    await this.save();
  }

  isConfigured() { return !!(this.server && this.username && this.password); }

  getAuth() { return { server: this.server, username: this.username, password: this.password }; }

  getServers() {
    return this.servers.map(s => ({ id: s.id, name: s.name || s.server, server: s.server, username: s.username, isActive: s.id === this.activeServerId }));
  }

  async logout() {
    await this.removeServer(this.activeServerId);
    localStorage.removeItem('navidrome_config');
  }
}

const config = new Config();
export default config;