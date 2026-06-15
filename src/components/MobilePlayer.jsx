import React, { useState, useEffect, useRef } from "react";
import {
  IoPlay, IoPause, IoPlaySkipForward, IoPlaySkipBack,
  IoShuffle, IoRepeat, IoHeart, IoHeartOutline,
  IoAddCircle, IoEllipsisVertical, IoChevronDown,
  IoAlbums, IoPeople, IoSettings
} from "react-icons/io5";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import musicStore from "../store/musicStore";
import api from "../api/subsonic";
import { getGlobalAudio } from "../hooks/useMusicPlayer";

export default function MobilePlayer({ show, onClose }) {
  const { t } = useTranslation();
  const {
    currentTrack, isPlaying, volume,
    repeatMode, shuffleMode,
    togglePlay, playNext, playPrevious,
    toggleShuffle, cycleRepeat, setVolume,
    toggleStar, starred, addToQueue
  } = musicStore();

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const intervalRef = useRef(null);
  const touchStartY = useRef(0);
  const navigate = useNavigate();

  const isStarred = starred?.track?.some((t) => t.id === currentTrack?.id);

  useEffect(() => {
    if (show && isPlaying) {
      intervalRef.current = setInterval(() => {
        const audio = getGlobalAudio();
        if (audio && !audio.paused) {
          setCurrentTime(audio.currentTime || 0);
          if (audio.duration && isFinite(audio.duration))
            setDuration(audio.duration);
        }
      }, 200);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [show, isPlaying]);

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e) => {
    if (e.changedTouches[0].clientY - touchStartY.current > 80) onClose();
  };

  const fmt = (s) => {
    if (!s || !isFinite(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };

  const seek = (e) => {
    const audio = getGlobalAudio();
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    const time = pct * (duration || audio?.duration || 0);
    if (audio && isFinite(time) && time >= 0) {
      audio.currentTime = time;
      setCurrentTime(time);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!currentTrack || !show) return null;

  return (
    <div
      className="mobile-player-sheet show"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="mp-header">
        <button className="mp-close-btn" onClick={onClose}>
          <IoChevronDown />
        </button>
        <span className="mp-header-title">{t('player.nowPlaying')}</span>
        <button className="mp-menu-btn" onClick={() => setShowMenu(!showMenu)}>
          <IoEllipsisVertical />
        </button>
      </div>

      <div className="mp-cover-big">
        <img
          src={api.getCoverUrl(currentTrack.coverArt, 400)}
          alt={currentTrack.title}
          className="mp-cover-img"
          onError={(e) => (e.target.style.display = "none")}
        />
      </div>

      <div className="mp-info-center">
        <h2 className="mp-title-big">{currentTrack.title}</h2>
        <p className="mp-artist-big">{currentTrack.artist}</p>
      </div>

      <div className="mp-progress-section">
        <div className="mp-progress-bar" onClick={seek}>
          <div className="mp-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="mp-progress-times">
          <span className="mp-time">{fmt(duration)}</span>
          <span className="mp-time">{fmt(currentTime)}</span>
        </div>
      </div>

      <div className="mp-controls">
        <button
          className={`mp-ctrl-btn ${shuffleMode ? "active" : ""}`}
          onClick={toggleShuffle}
        >
          <IoShuffle />
        </button>
        <button className="mp-ctrl-btn" onClick={playPrevious}>
          <IoPlaySkipBack />
        </button>
        <button className="mp-play-btn-big" onClick={togglePlay}>
          {isPlaying ? <IoPause /> : <IoPlay />}
        </button>
        <button className="mp-ctrl-btn" onClick={playNext}>
          <IoPlaySkipForward />
        </button>
        <button
          className={`mp-ctrl-btn ${repeatMode !== "off" ? "active" : ""}`}
          onClick={cycleRepeat}
        >
          <IoRepeat />
          {repeatMode === "one" && <span className="repeat-one-mp">1</span>}
        </button>
      </div>

      <div className="mp-actions">
        <button className="mp-action-btn" onClick={() => {
          toggleStar(currentTrack.id, currentTrack.albumId, currentTrack.artistId);
        }}>
          {isStarred ? <IoHeart style={{color:'var(--accent)'}} /> : <IoHeartOutline />}
        </button>
        <button className="mp-action-btn" onClick={() => addToQueue(currentTrack)}>
          <IoAddCircle />
        </button>
        <button className="mp-action-btn" onClick={() => navigate('/settings')}>
          <IoSettings />
        </button>
      </div>

      <div className="mp-volume">
        <input
          type="range" min="0" max="1" step="0.01"
          value={volume}
          onChange={(e) => setVolume(+e.target.value)}
          className="mp-volume-slider"
        />
      </div>

      {showMenu && (
        <div className="mp-menu-overlay" onClick={() => setShowMenu(false)}>
          <div className="mp-menu" onClick={(e) => e.stopPropagation()}>
            <button className="mp-menu-item" onClick={() => { toggleStar(currentTrack.id, currentTrack.albumId, currentTrack.artistId); setShowMenu(false); }}>
              {isStarred ? <IoHeart style={{ color: "var(--accent)" }} /> : <IoHeartOutline />}
              {isStarred ? t('player.removeFromFavorites') : t('player.addToFavorites')}
            </button>
            <button className="mp-menu-item" onClick={() => { addToQueue(currentTrack); setShowMenu(false); }}>
              <IoAddCircle /> {t('player.addToQueue')}
            </button>
            {currentTrack.albumId && (
              <button className="mp-menu-item" onClick={() => { navigate(`/album/${currentTrack.albumId}`); setShowMenu(false); onClose(); }}>
                <IoAlbums /> {t('player.goToAlbum')}
              </button>
            )}
            {currentTrack.artistId && (
              <button className="mp-menu-item" onClick={() => { navigate(`/artist/${currentTrack.artistId}`); setShowMenu(false); onClose(); }}>
                <IoPeople /> {t('player.goToArtist')}
              </button>
            )}
            <button className="mp-menu-item" onClick={() => { navigate('/settings'); setShowMenu(false); }}>
              <IoSettings /> {t('nav.equalizer')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}