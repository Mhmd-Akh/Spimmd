import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IoEye, IoEyeOff } from 'react-icons/io5';
import config from '../config';
import musicStore from '../store/musicStore';

export default function Login({ onLogin, expiredMode = false, savedServer = '', savedUsername = '' }) {
  const { t, i18n } = useTranslation();
  const [server, setServer] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [servers, setServers] = useState([]);
  const [selectedServerId, setSelectedServerId] = useState(null);
  const [showAddNew, setShowAddNew] = useState(false);

  const currentLang = i18n.language;

  useEffect(() => {
    if (expiredMode) {
      setServer(savedServer);
      setUsername(savedUsername);
      return;
    }
    loadServers();
  }, []);

  const loadServers = async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    const serverList = config.getServers();
    setServers(serverList);

    if (serverList.length > 0) {
      const activeServer = serverList.find(s => s.isActive) || serverList[serverList.length - 1];
      setSelectedServerId(activeServer.id);
      setServer(activeServer.server);
      setUsername(activeServer.username);
      setPassword('');
      setShowAddNew(false);
    } else {
      setShowAddNew(true);
    }
  };

  const selectServer = (srv) => {
    setSelectedServerId(srv.id);
    setServer(srv.server);
    setUsername(srv.username);
    setPassword('');
    setError('');
  };

  const handleAddNew = () => {
    setShowAddNew(true);
    setSelectedServerId(null);
    setServer('');
    setUsername('');
    setPassword('');
    setError('');
  };

  const toggleLanguage = () => {
    const newLang = currentLang === 'fa' ? 'en' : 'fa';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
    document.documentElement.dir = newLang === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
    musicStore.getState().setLanguage(newLang);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (expiredMode) {
      try {
        const cleanServer = (server || savedServer).replace(/\/$/, '');
        const finalUsername = username || savedUsername;

        const response = await fetch(
          `${cleanServer}/rest/ping?u=${encodeURIComponent(finalUsername)}&p=${encodeURIComponent(password)}&v=1.16.1&c=NavidromePlayer&f=json`
        );

        if (!response.ok) throw new Error('Server not responding');

        const data = await response.json();

        if (data['subsonic-response']?.status === 'ok') {
          await config.refreshPassword(password);
          onLogin();
        } else {
          setError(data['subsonic-response']?.error?.message || t('login.error'));
        }
      } catch {
        setError(t('login.error'));
      } finally {
        setLoading(false);
      }
      return;
    }

    const finalServer = server || (selectedServerId ? servers.find(s => s.id === selectedServerId)?.server : '');
    const finalUsername = username || (selectedServerId ? servers.find(s => s.id === selectedServerId)?.username : '');

    if (!finalServer || !finalUsername || !password) {
      setError(t('login.error'));
      setLoading(false);
      return;
    }

    try {
      const cleanServer = finalServer.replace(/\/$/, '');

      const response = await fetch(
        `${cleanServer}/rest/ping?u=${encodeURIComponent(finalUsername)}&p=${encodeURIComponent(password)}&v=1.16.1&c=NavidromePlayer&f=json`
      );

      if (!response.ok) throw new Error('Server not responding');

      const data = await response.json();

      if (data['subsonic-response']?.status === 'ok') {
        if (selectedServerId && !showAddNew) {
          await config.setCredentials(cleanServer, finalUsername, password, remember);
        } else {
          await config.addServer(cleanServer, finalUsername, password, cleanServer);
        }
        onLogin();
      } else {
        setError(data['subsonic-response']?.error?.message || t('login.error'));
      }
    } catch (err) {
      setError(t('login.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteServer = async (id) => {
    await config.removeServer(id);
    loadServers();
  };

  return (
    <div className="login-wrapper">
      <div className="language-toggle-top">
        <button onClick={toggleLanguage} className="lang-btn">
          {currentLang === 'fa' ? '🇬🇧 English' : '🇮🇷 فارسی'}
        </button>
      </div>

      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon">🎵</div>
          <h1>Spimmd Player</h1>
          <p className="login-subtitle">{t('login.title')}</p>
        </div>

        {/* 🔒 پاپ‌آپ امنیتی برای حالت منقضی */}
        {expiredMode && (
          <div className="security-notice" style={{
            background: 'rgba(233, 69, 96, 0.1)',
            border: '1px solid rgba(233, 69, 96, 0.3)',
            borderRadius: '14px',
            padding: '16px 18px',
            marginBottom: '24px',
            textAlign: 'center',
            fontSize: '13px',
            color: 'var(--text-primary)',
            lineHeight: '1.7'
          }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔒</div>
            <strong>تأیید امنیتی</strong>
            <p style={{ color: 'var(--text-secondary)', marginTop: '6px', fontSize: '12px' }}>
              برای حفظ امنیت حساب شما، لطفاً هر {config.EXPIRY_DAYS} روز یکبار رمز عبور خود را وارد کنید.
            </p>
          </div>
        )}

        {/* لیست اکانت‌های قبلی */}
        {!expiredMode && servers.length > 0 && !showAddNew && (
          <div className="servers-list" style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
              اکانت‌های قبلی:
            </p>
            {servers.map(srv => (
              <div
                key={srv.id}
                className={`server-card ${selectedServerId === srv.id ? 'active' : ''}`}
                onClick={() => selectServer(srv)}
                style={{
                  padding: '10px 14px',
                  background: selectedServerId === srv.id ? 'var(--bg-tertiary)' : 'transparent',
                  border: `1px solid ${selectedServerId === srv.id ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: '8px',
                  marginBottom: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{srv.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{srv.username}@{srv.server}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteServer(srv.id); }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '18px',
                    padding: '4px 8px'
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={handleAddNew}
              style={{
                width: '100%',
                padding: '10px',
                background: 'transparent',
                border: '1px dashed var(--border)',
                borderRadius: '8px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                marginTop: '8px',
                fontSize: '14px'
              }}
            >
              + اکانت جدید
            </button>
          </div>
        )}

        {/* فرم لاگین (اکانت جدید) */}
        {!expiredMode && (showAddNew || servers.length === 0) && (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>{t('login.server')}</label>
              <input
                type="url"
                value={server}
                onChange={(e) => setServer(e.target.value)}
                placeholder="https://your-server.com"
                required
              />
            </div>

            <div className="form-group">
              <label>{t('login.username')}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                required
              />
            </div>

            <div className="form-group" style={{ position: 'relative' }}>
              <label>{t('login.password')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password"
                  required
                  style={{ paddingLeft: '45px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '20px',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <IoEyeOff /> : <IoEye />}
                </button>
              </div>
            </div>

            <div className="form-group remember-me">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>{t('login.remember')}</span>
              </label>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              type="submit"
              className="btn-primary login-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="btn-loading">
                  <span className="spinner">⏳</span>
                  {t('common.loading')}
                </span>
              ) : (
                t('login.login')
              )}
            </button>

            {servers.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAddNew(false)}
                className="btn-secondary"
                style={{ width: '100%', marginTop: '10px' }}
              >
                بازگشت
              </button>
            )}
          </form>
        )}

        {/* فرم پسورد فقط (اکانت قبلی + حالت منقضی) */}
        {(expiredMode || (!showAddNew && servers.length > 0 && selectedServerId)) && (
          <form onSubmit={handleSubmit} className="login-form">
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              {username || savedUsername} @ {server || savedServer}
            </p>

            <div className="form-group" style={{ position: 'relative' }}>
              <label>{t('login.password')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password"
                  required
                  autoFocus
                  style={{ paddingLeft: '45px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '20px',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <IoEyeOff /> : <IoEye />}
                </button>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              type="submit"
              className="btn-primary login-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="btn-loading">
                  <span className="spinner">⏳</span>
                  {t('common.loading')}
                </span>
              ) : (
                t('login.login')
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}