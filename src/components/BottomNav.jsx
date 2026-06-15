import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IoHome, IoLibrary, IoSearch, IoHeart, IoSettings } from 'react-icons/io5';

export default function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <nav className="bottom-nav">
      <NavLink to="/" className={`bottom-nav-item ${location.pathname === '/' ? 'active' : ''}`}>
        <IoHome />
        <span>{t('nav.home')}</span>
      </NavLink>
      
      <NavLink to="/library" className={`bottom-nav-item ${location.pathname.startsWith('/library') ? 'active' : ''}`}>
        <IoLibrary />
        <span>{t('nav.library')}</span>
      </NavLink>
      
      <NavLink to="/search" className={`bottom-nav-item ${location.pathname === '/search' ? 'active' : ''}`}>
        <IoSearch />
        <span>{t('nav.search')}</span>
      </NavLink>
      
      <NavLink to="/liked-songs" className={`bottom-nav-item ${location.pathname === '/liked-songs' ? 'active' : ''}`}>
        <IoHeart />
        <span>{t('nav.favorites')}</span>
      </NavLink>
      
      <NavLink to="/settings" className={`bottom-nav-item ${location.pathname === '/settings' ? 'active' : ''}`}>
        <IoSettings />
        <span>{t('nav.settings')}</span>
      </NavLink>
    </nav>
  );
}