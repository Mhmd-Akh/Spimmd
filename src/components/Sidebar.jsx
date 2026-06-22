import React, { useEffect, useState, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IoHome, IoMusicalNotes, IoSearch,
  IoList, IoAlbums, IoPeople,
  IoHeart, IoChevronDown, IoChevronUp,
  IoShare, IoPerson, IoCloudOffline
} from "react-icons/io5";
import config from "../config";
import api from "../api/subsonic";
import musicStore from "../store/musicStore";

export default function Sidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { playlists, fetchPlaylists, starred } = musicStore();
  
  const [showMyPlaylists, setShowMyPlaylists] = useState(true);
  const [showSharedPlaylists, setShowSharedPlaylists] = useState(true);
  const [showMemberPlaylists, setShowMemberPlaylists] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const myPlaylistsRef = useRef(null);
  const sharedPlaylistsRef = useRef(null);
  const memberPlaylistsRef = useRef(null);

  const currentUsername = config.username || '';

  useEffect(() => {
    fetchPlaylists();
    checkAdminRole();
  }, []);

  const checkAdminRole = async () => {
    try {
      const user = await api.getUser(currentUsername);
      if (user && user.adminRole === true) {
        setIsAdmin(true);
      }
    } catch (error) {
      if (currentUsername.toLowerCase() === 'admin') {
        setIsAdmin(true);
      }
    }
  };

  const myPlaylists = playlists.filter(p => {
    if (!p.owner) return false;
    return p.owner.toLowerCase() === currentUsername.toLowerCase();
  });

  const sharedPlaylists = playlists.filter(p => {
    if (!p.public) return false;
    if (p.owner?.toLowerCase() === currentUsername.toLowerCase()) return false;
    return true;
  });

  const memberPlaylists = isAdmin ? playlists.filter(p => {
    if (!p.owner) return false;
    if (p.owner.toLowerCase() === currentUsername.toLowerCase()) return false;
    if (p.public) return false;
    return true;
  }) : [];

  const updateMaxHeight = (ref, isOpen) => {
    if (!ref?.current) return;
    if (isOpen) {
      ref.current.style.maxHeight = ref.current.scrollHeight + 'px';
    } else {
      ref.current.style.maxHeight = '0px';
    }
  };

  useEffect(() => { updateMaxHeight(myPlaylistsRef, showMyPlaylists); }, [showMyPlaylists, myPlaylists]);
  useEffect(() => { updateMaxHeight(sharedPlaylistsRef, showSharedPlaylists); }, [showSharedPlaylists, sharedPlaylists]);
  useEffect(() => { updateMaxHeight(memberPlaylistsRef, showMemberPlaylists); }, [showMemberPlaylists, memberPlaylists]);

  useEffect(() => {
    if (playlists.length > 0) {
      updateMaxHeight(myPlaylistsRef, showMyPlaylists);
      updateMaxHeight(sharedPlaylistsRef, showSharedPlaylists);
      updateMaxHeight(memberPlaylistsRef, showMemberPlaylists);
    }
  }, [playlists]);
  
  const likedTracks = starred?.track || [];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="logo">🎵 Spimmd</h1>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" className="nav-item" end>
          <IoHome className="nav-icon" />
          <span>{t("nav.home")}</span>
        </NavLink>
        <NavLink to="/search" className="nav-item">
          <IoSearch className="nav-icon" />
          <span>{t("nav.search")}</span>
        </NavLink>
        <NavLink to="/all-songs" className="nav-item">
          <IoMusicalNotes className="nav-icon" />
          <span>{t("nav.allSongs")}</span>
        </NavLink>
        <NavLink to="/offline" className="nav-item">
          <IoCloudOffline className="nav-icon" />
          <span>{t("nav.offline")}</span>
        </NavLink>
      </nav>

      <div className="sidebar-divider" />

      <div className="sidebar-card liked-card" onClick={() => navigate('/liked-songs')}>
        <div className="card-icon">
          <IoHeart />
        </div>
        <div className="card-info">
          <span className="card-title">{t('sidebar.likedSongs')}</span>
          <span className="card-sub">{likedTracks.length} {t('library.songs')}</span>
        </div>
      </div>

      <div className="sidebar-divider" />

      <div className="sidebar-section">
        <div className="sidebar-section-header" onClick={() => setShowMyPlaylists(!showMyPlaylists)}>
          <span>🎧 {t('sidebar.myPlaylists')}</span>
          {showMyPlaylists ? <IoChevronDown /> : <IoChevronUp />}
        </div>
        <div className={`sidebar-library ${showMyPlaylists ? 'open' : ''}`} ref={myPlaylistsRef}>
          {myPlaylists.length > 0 ? (
            myPlaylists.map(pl => (
              <div key={pl.id} className="lib-item" onClick={() => navigate(`/playlist/${pl.id}`)}>
                <div className="lib-item-icon"><IoList /></div>
                <div className="lib-item-info">
                  <span className="lib-item-name">{pl.name}</span>
                  <span className="lib-item-count">{pl.songCount} {t('library.songs')}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="lib-empty">{t('sidebar.noPlaylists')}</div>
          )}
        </div>
      </div>

      {sharedPlaylists.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-section-header" onClick={() => setShowSharedPlaylists(!showSharedPlaylists)}>
            <span>🌐 {t('sidebar.sharedPlaylists')}</span>
            {showSharedPlaylists ? <IoChevronDown /> : <IoChevronUp />}
          </div>
          <div className={`sidebar-library ${showSharedPlaylists ? 'open' : ''}`} ref={sharedPlaylistsRef}>
            {sharedPlaylists.map(pl => (
              <div key={pl.id} className="lib-item" onClick={() => navigate(`/playlist/${pl.id}`)}>
                <div className="lib-item-icon system-icon"><IoShare /></div>
                <div className="lib-item-info">
                  <span className="lib-item-name">{pl.name}</span>
                  <span className="lib-item-count">{pl.songCount} {t('library.songs')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAdmin && memberPlaylists.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-section-header" onClick={() => setShowMemberPlaylists(!showMemberPlaylists)}>
            <span>👥 {t('sidebar.memberPlaylists')}</span>
            {showMemberPlaylists ? <IoChevronDown /> : <IoChevronUp />}
          </div>
          <div className={`sidebar-library ${showMemberPlaylists ? 'open' : ''}`} ref={memberPlaylistsRef}>
            {memberPlaylists.map(pl => (
              <div key={pl.id} className="lib-item" onClick={() => navigate(`/playlist/${pl.id}`)}>
                <div className="lib-item-icon system-icon"><IoPerson /></div>
                <div className="lib-item-info">
                  <span className="lib-item-name">{pl.name}</span>
                  <span className="lib-item-count">{pl.songCount} {t('library.songs')} • {pl.owner}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}