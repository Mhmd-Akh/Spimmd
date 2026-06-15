import config from '../config';
import { notify } from "./Notification";
import musicStore from '../store/musicStore';
import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useRef } from 'react';

const BANDS = [
  { freq: '32', label: '32' }, { freq: '64', label: '64' }, { freq: '100', label: '100' },
  { freq: '160', label: '160' }, { freq: '250', label: '250' }, { freq: '400', label: '400' },
  { freq: '630', label: '630' }, { freq: '1k', label: '1K' }, { freq: '1.6k', label: '1.6K' },
  { freq: '2.5k', label: '2.5K' }, { freq: '4k', label: '4K' }, { freq: '6.3k', label: '6.3K' },
  { freq: '10k', label: '10K' }, { freq: '16k', label: '16K' },
];

const PRESETS = [
  { key: 'normal', name: 'normal' }, { key: 'bass', name: 'bass' }, { key: 'treble', name: 'treble' },
  { key: 'pop', name: 'pop' }, { key: 'rock', name: 'rock' }, { key: 'jazz', name: 'jazz' },
  { key: 'hiphop', name: 'hiphop' }, { key: 'electronic', name: 'electronic' },
  { key: 'vocal', name: 'vocal' }, { key: 'acoustic', name: 'acoustic' },
  { key: 'piano', name: 'piano' }, { key: 'deep', name: 'deep' },
];

const VIRTUALIZER_PRESETS = [
  { key: 'studio', name: 'studio', icon: '🎙️' },
  { key: 'hall', name: 'hall', icon: '🎭' },
  { key: 'club', name: 'club', icon: '🪩' },
  { key: 'arena', name: 'arena', icon: '🏟️' },
  { key: 'cave', name: 'cave', icon: '🕳️' },
  { key: 'forest', name: 'forest', icon: '🌲' },
];

function Knob({ value, min, max, unit, label, icon, color, disabled, onChange, size = 'normal' }) {
  const knobRef = useRef(null);
  const isSmall = size === 'small';

  useEffect(() => {
    const el = knobRef.current;
    if (!el) return;
    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      const delta = e.deltaY > 0 ? -1 : 1;
      const newVal = Math.min(max, Math.max(min, value + delta));
      onChange(newVal);
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [value, min, max, disabled, onChange]);

  const range = max - min;
  const percent = ((value - min) / range) * 264;
  const size_px = isSmall ? 70 : 100;

  return (
    <div className={`knob-control ${isSmall ? 'knob-small' : ''}`} ref={knobRef}>
      <div className="knob-wrapper" style={{ width: size_px, height: size_px }}>
        <svg className="knob-svg" viewBox="0 0 100 100" style={{ width: size_px, height: size_px }}>
          <circle cx="50" cy="50" r="42" fill="none" stroke="var(--bg-tertiary)" strokeWidth={isSmall ? "8" : "6"} />
          <circle cx="50" cy="50" r="42" fill="none" stroke={disabled ? 'var(--border)' : color} strokeWidth={isSmall ? "8" : "6"}
            strokeDasharray={`${percent} 264`} strokeLinecap="round" transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dasharray 0.08s' }} />
        </svg>
        <div className="knob-value" style={{ opacity: disabled ? 0.4 : 1 }}>
          <span className="knob-number" style={{ fontSize: isSmall ? 13 : 18 }}>
            {value > 0 && (unit === 'dB' || unit === '') ? '+' : ''}{value}
          </span>
          {!isSmall && <span className="knob-unit">{unit}</span>}
        </div>
      </div>
      <span className="knob-label" style={{ fontSize: isSmall ? 10 : 12 }}>{icon ? `${icon} ` : ''}{label}</span>
      <input type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(parseInt(e.target.value))} disabled={disabled}
        className="knob-input" style={{ width: size_px, height: size_px }} />
    </div>
  );
}

export default function Settings() {
  const { t } = useTranslation();
  const {
    equalizerEnabled, equalizerBands, equalizerPreset,
    bassBoost, volumeBoost, threeDEnabled, threeDDepth,
    virtualizerEnabled, virtualizerPreset,
    setEqualizerEnabled, setEqualizerBand, setEqualizerPreset,
    setBassBoost, setVolumeBoost, setThreeDEnabled, setThreeDDepth,
    setVirtualizerEnabled, setVirtualizerPreset,
    saveEqToConfig,
  } = musicStore();

  const [activeTab, setActiveTab] = useState('connection');
  const [server, setServer] = useState(config.server || '');
  const [username, setUsername] = useState(config.username || '');
  const [password, setPassword] = useState('');
  const [saved, setSaved] = useState(false);
  const eqGraphicRef = useRef(null);

  const [servers, setServers] = useState(config.getServers());
  const [showAddServer, setShowAddServer] = useState(false);
  const [newServer, setNewServer] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const saveTimer = useRef(null);
  const scheduleSave = () => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveEqToConfig(), 300);
  };

  useEffect(() => {
    const el = eqGraphicRef.current;
    if (!el) return;
    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!equalizerEnabled) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const bandWidth = rect.width / BANDS.length;
      const bandIndex = Math.floor(x / bandWidth);
      if (bandIndex >= 0 && bandIndex < BANDS.length) {
        const band = BANDS[bandIndex];
        const currentVal = equalizerBands[band.freq] || 0;
        const delta = e.deltaY > 0 ? -1 : 1;
        const newVal = Math.min(12, Math.max(-12, currentVal + delta));
        setEqualizerBand(band.freq, newVal);
        scheduleSave();
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [equalizerEnabled, equalizerBands, setEqualizerBand]);

  const handleSave = (e) => {
    e.preventDefault();
    config.setCredentials(server, username, password);
    setSaved(true);
    notify('t:notifications.settingsSaved', 'success');
    setServers(config.getServers());
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddServer = async () => {
    if (newServer && newUsername && newPassword) {
      await config.addServer(newServer, newUsername, newPassword);
      setServers(config.getServers());
      setNewServer(''); setNewUsername(''); setNewPassword('');
      setShowAddServer(false);
      notify('t:notifications.serverAdded', 'success');
    }
  };

  const handleSwitchServer = async (id) => {
    await config.switchServer(id);
    setServers(config.getServers());
    setServer(config.server);
    setUsername(config.username);
    notify('t:notifications.serverSwitched', 'success');
  };

  const handleDeleteServer = async (id) => {
    await config.removeServer(id);
    setServers(config.getServers());
    notify('t:notifications.serverDeleted', 'warning');
  };

  return (
    <div className="settings-page">
      <h1>{t('nav.settings')}</h1>

      <div className="settings-tabs">
        <button className={`tab-btn ${activeTab === 'connection' ? 'active' : ''}`} onClick={() => setActiveTab('connection')}>{t('settings.connection')}</button>
        <button className={`tab-btn ${activeTab === 'equalizer' ? 'active' : ''}`} onClick={() => setActiveTab('equalizer')}>{t('nav.equalizer')}</button>
      </div>

      {activeTab === 'connection' && (
        <div className="settings-form">
          <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>اکانت‌های متصل</h3>
          <div className="servers-list" style={{ marginBottom: '20px' }}>
            {servers.map((srv, i) => (
              <div key={srv.id} className="server-card" style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', background: srv.isActive ? 'var(--bg-tertiary)' : 'transparent',
                border: `1px solid ${srv.isActive ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '10px', marginBottom: '8px',
                animation: `fadeSlideIn 0.4s ease both`, animationDelay: `${i * 0.1}s`
              }}>
                <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => handleSwitchServer(srv.id)}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{srv.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{srv.username}@{srv.server}</div>
                </div>
                {srv.isActive && <span style={{ fontSize: '11px', color: 'var(--accent)', marginRight: '10px' }}>● فعال</span>}
                {!srv.isActive && (
                  <button onClick={() => handleDeleteServer(srv.id)} style={{ color: 'var(--text-secondary)', padding: '4px 8px', fontSize: '18px' }}>×</button>
                )}
              </div>
            ))}
          </div>

          {!showAddServer && (
            <button className="btn-secondary" onClick={() => setShowAddServer(true)} style={{ width: '100%', marginBottom: '16px' }}>
              + افزودن اکانت جدید
            </button>
          )}

          {showAddServer && (
            <div style={{ animation: 'fadeSlideIn 0.4s ease' }}>
              <div className="form-group" style={{ animation: 'fadeSlideIn 0.4s ease both', animationDelay: '0.1s' }}>
                <label>آدرس سرور</label>
                <input type="text" value={newServer} onChange={e => setNewServer(e.target.value)} className="input-field" placeholder="https://..." />
              </div>
              <div className="form-group" style={{ animation: 'fadeSlideIn 0.4s ease both', animationDelay: '0.2s' }}>
                <label>نام کاربری</label>
                <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="input-field" />
              </div>
              <div className="form-group" style={{ animation: 'fadeSlideIn 0.4s ease both', animationDelay: '0.3s' }}>
                <label>رمز عبور</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input-field" />
              </div>
              <button className="btn-primary" onClick={handleAddServer} style={{ marginRight: '10px' }}>ذخیره</button>
              <button className="btn-secondary" onClick={() => setShowAddServer(false)}>انصراف</button>
            </div>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />
        </div>
      )}

      {activeTab === 'equalizer' && (
        <div className="eq-settings" style={{ animation: 'fadeSlideIn 0.5s ease' }}>
          <div className="eq-toggle">
            <label className="switch"><input type="checkbox" checked={equalizerEnabled} onChange={(e) => { setEqualizerEnabled(e.target.checked); scheduleSave(); }} /><span className="slider"></span></label>
            <span>{t('equalizer.enable')}</span>
          </div>

          <div className="eq-presets-grid">
            {PRESETS.map((p) => (
              <button key={p.key} className={`preset-btn ${equalizerPreset === p.key ? 'active' : ''}`} onClick={() => { setEqualizerPreset(p.key); scheduleSave(); }}>
                {t(`equalizer.presets.${p.name}`)}
              </button>
            ))}
          </div>

          <div className="eq-graphic" ref={eqGraphicRef} style={{ animation: 'fadeIn 0.6s ease' }}>
            {BANDS.map(({ freq, label }) => (
              <div key={freq} className="eq-channel" style={{ transition: 'transform 0.2s ease' }}>
                <span className="eq-value-display">{equalizerBands[freq] > 0 ? '+' : ''}{equalizerBands[freq]}</span>
                <div className="eq-slider-wrapper">
                  <div className="eq-fill-bar" style={{
                    height: `${((equalizerBands[freq] + 12) / 24) * 100}%`,
                    opacity: equalizerEnabled ? 1 : 0.3,
                    background: parseInt(freq) >= 630 || freq.includes('k') ? 'linear-gradient(to top, #4fc3f7, #29b6f6)' : parseInt(freq) <= 160 ? 'linear-gradient(to top, #ef5350, #e53935)' : 'linear-gradient(to top, #66bb6a, #43a047)'
                  }} />
                  <input type="range" min="-12" max="12" value={equalizerBands[freq]} onChange={(e) => { setEqualizerBand(freq, parseInt(e.target.value)); scheduleSave(); }} className="eq-range-input" disabled={!equalizerEnabled} />
                </div>
                <span className="eq-freq-label">{label}</span>
              </div>
            ))}
          </div>

          <div className="knobs-row">
            <Knob value={bassBoost} min={-12} max={24} unit="dB" label={t('equalizer.bassBoost')} icon="🔊" color="#ef5350" disabled={false} onChange={(v) => { setBassBoost(v); scheduleSave(); }} />
            <Knob value={volumeBoost} min={0} max={100} unit="%" label={t('equalizer.volumeBoost')} icon="📢" color="#66bb6a" disabled={false} onChange={(v) => { setVolumeBoost(v); scheduleSave(); }} />
            <Knob value={threeDDepth} min={0} max={100} unit="%" label={t('equalizer.depth')} icon="🎧" color="#42a5f5" disabled={!threeDEnabled} onChange={(v) => { setThreeDDepth(v); scheduleSave(); }} />
          </div>

          <div className="eq-extra-controls">
            <div className="eq-toggle">
              <label className="switch"><input type="checkbox" checked={threeDEnabled} onChange={(e) => { setThreeDEnabled(e.target.checked); scheduleSave(); }} /><span className="slider"></span></label>
              <span>🎧 {t('equalizer.audio8d')}</span>
            </div>
          </div>

          <div className="eq-extra-controls">
            <div className="eq-toggle">
              <label className="switch"><input type="checkbox" checked={virtualizerEnabled} onChange={(e) => { setVirtualizerEnabled(e.target.checked); scheduleSave(); }} /><span className="slider"></span></label>
              <span>🏛️ {t('equalizer.virtualizer')}</span>
            </div>
            {virtualizerEnabled && (
              <div className="eq-slider-group">
                <div className="virtualizer-presets">
                  {VIRTUALIZER_PRESETS.map((v) => (
                    <button key={v.key} className={`preset-btn ${virtualizerPreset === v.key ? 'active' : ''}`} onClick={() => { setVirtualizerPreset(v.key); scheduleSave(); }}>
                      {v.icon} {t(`equalizer.virtualizerPresets.${v.name}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}