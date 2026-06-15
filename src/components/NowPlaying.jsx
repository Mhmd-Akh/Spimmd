import React from 'react';
import musicStore from '../store/musicStore';
import api from '../api/subsonic';

export default function NowPlaying() {
  const { currentTrack, isPlaying } = musicStore();

  if (!currentTrack) return null;

  return (
    <div className="now-playing-mini">
      <img src={api.getCoverUrl(currentTrack.coverArt, 60)} alt="" className="np-mini-cover" onError={e => e.target.style.display = 'none'} />
      <div className="np-mini-info">
        <span className="np-mini-title">{currentTrack.title}</span>
        <span className="np-mini-artist">{currentTrack.artist}</span>
      </div>
      <span className={`np-mini-status ${isPlaying ? 'playing' : ''}`}>
        {isPlaying ? '▶' : '⏸'}
      </span>
    </div>
  );
}