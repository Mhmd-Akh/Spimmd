import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IoSettings, IoGlobe, IoLogOut } from 'react-icons/io5';
import musicStore from '../store/musicStore';
import config from '../config';

export default function TopBar({ onLogout }) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const toggleLanguage = () => {
    const newLang = currentLang === 'fa' ? 'en' : 'fa';
    
    // 🔥 انیمیشن تغییر direction
    document.documentElement.classList.add('dir-changing');
    
    setTimeout(() => {
      i18n.changeLanguage(newLang);
      localStorage.setItem('language', newLang);
      document.documentElement.dir = newLang === 'fa' ? 'rtl' : 'ltr';
      document.documentElement.lang = newLang;
      musicStore.getState().setLanguage(newLang);
      
      setTimeout(() => {
        document.documentElement.classList.remove('dir-changing');
      }, 500);
    }, 50);
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    const audio = document.querySelector('audio');
    if (audio) {
      audio.pause();
      audio.src = '';
    }
    
    musicStore.getState().setLoggedIn(false);
    musicStore.getState().clearQueue();
    musicStore.setState({ 
      currentTrack: null, 
      isPlaying: false,
      queue: [],
      queueIndex: -1
    });
    
    setShowLogoutConfirm(false);
    onLogout();
  };

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h2 className="topbar-title">🎵 Spimmd</h2>
        </div>
        
        <div className="topbar-right">
          <button 
            className="topbar-btn"
            onClick={toggleLanguage}
            title={currentLang === 'fa' ? 'English' : 'فارسی'}
          >
            <IoGlobe />
            <span>{currentLang === 'fa' ? 'EN' : 'FA'}</span>
          </button>
          
          <button 
            className="topbar-btn"
            onClick={() => navigate('/settings')}
            title={t('nav.settings')}
          >
            <IoSettings />
          </button>
          
          {onLogout && (
            <button 
              className="topbar-btn logout-btn"
              onClick={handleLogoutClick}
              title="خروج"
            >
              <IoLogOut />
            </button>
          )}
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="logout-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="logout-confirm" onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>⏻ {t('logout.title')}</p>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>{t('logout.confirm')}</p>
            <p style={{ fontSize: '11px', color: 'var(--accent)', marginBottom: '20px' }}>ℹ️ {t('logout.info')}</p>
            <div className="logout-actions">
              <button 
                className="btn-secondary" 
                onClick={() => setShowLogoutConfirm(false)}
                style={{ padding: '10px 24px', fontSize: '14px' }}
              >
              {t('common.cancel')}
              </button>
              <button 
                className="btn-primary" 
                onClick={confirmLogout}
                style={{ padding: '10px 24px', fontSize: '14px', background: '#ff4757' }}
              >
              {t('logout.button')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}