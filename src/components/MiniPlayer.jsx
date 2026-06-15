import React from 'react';
import { IoPlay, IoPause, IoPlaySkipForward } from 'react-icons/io5';
import musicStore from '../store/musicStore';
import api from '../api/subsonic';

export default function MiniPlayer({ onClick }) {
  const { currentTrack, isPlaying, togglePlay, playNext } = musicStore();

  if (!currentTrack) return null;

  // فقط روی موبایل نشون بده
  if (window.innerWidth > 768) return null;

  return (
    <div className="mini-player" onClick={onClick}>
      <img 
        src={api.getCoverUrl(currentTrack.coverArt, 48)} 
        alt="" 
        className="mini-player-cover"
        onError={e => e.target.style.display = 'none'}
      />
      <div className="mini-player-info">
        <span className="mini-player-title">{currentTrack.title}</span>
        <span className="mini-player-artist">{currentTrack.artist}</span>
      </div>
      <button className="mini-player-btn" onClick={e => { e.stopPropagation(); togglePlay(); }}>
        {isPlaying ? <IoPause /> : <IoPlay />}
      </button>
      <button className="mini-player-btn" onClick={e => { e.stopPropagation(); playNext(); }}>
        <IoPlaySkipForward />
      </button>
    </div>
  );
}