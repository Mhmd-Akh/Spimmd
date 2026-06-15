import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

let addNotificationFn = null;

export function notify(message, type = 'info', duration = 5000, params = {}) {
  if (addNotificationFn) {
    addNotificationFn(message, type, duration, params);
  }
}

export default function Notification() {
  const { t, i18n } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [dir, setDir] = useState(document.documentElement.dir || 'rtl');

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDir(document.documentElement.dir || 'rtl');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] });

    const handleLanguageChanged = () => {
      setDir(document.documentElement.dir || 'rtl');
    };
    i18n.on('languageChanged', handleLanguageChanged);

    return () => {
      observer.disconnect();
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n]);

  const addNotification = useCallback((message, type = 'info', duration = 5000, params = {}) => {
    const id = Date.now() + Math.random();
    let translatedMessage = message;

    if (message.startsWith('t:')) {
      translatedMessage = t(message.slice(2), params);
    }

    setNotifications(prev => [...prev, { id, message: translatedMessage, type, duration, closing: false }]);

    setTimeout(() => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, closing: true } : n));
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 300);
    }, duration);
  }, [t]);

  // 🔥 کلیک → موشن بسته شدن
  const dismiss = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, closing: true } : n));
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 300);
  };

  useEffect(() => {
    addNotificationFn = addNotification;
    return () => { addNotificationFn = null; };
  }, [addNotification]);

  if (notifications.length === 0) return null;

  const isRTL = dir === 'rtl';
  const positionStyle = isRTL
    ? { top: '20px', left: '20px' }
    : { top: '20px', right: '20px' };

  return (
    <div style={{
      position: 'fixed',
      ...positionStyle,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none'
    }}>
      {notifications.map(n => (
        <div
          key={n.id}
          onClick={() => dismiss(n.id)}
          style={{
          background: n.type === 'error' ? 'rgba(233, 69, 96, 0.6)' :
                      n.type === 'success' ? 'rgba(46, 213, 115, 0.6)' :
                      n.type === 'warning' ? 'rgba(255, 165, 2, 0.6)' :
                      'rgba(26, 26, 46, 0.6)',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: 500,
          opacity: 0.9,
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          animation: n.closing
            ? 'slideOut 0.3s ease forwards'
            : isRTL ? 'slideInLeft 0.3s ease' : 'slideInRight 0.3s ease',
          minWidth: '250px',
          maxWidth: '400px',
          cursor: 'pointer',
          pointerEvents: 'auto',
          userSelect: 'none'
        }}
        >
          {n.type === 'error' && '❌ '}
          {n.type === 'success' && '✅ '}
          {n.type === 'warning' && '⚠️ '}
          {n.message}
        </div>
      ))}
    </div>
  );
}