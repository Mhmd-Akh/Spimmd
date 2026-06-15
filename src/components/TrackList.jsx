import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IoHeart, IoHeartOutline, IoPlay, IoAddCircle, IoShuffle } from 'react-icons/io5';
import musicStore from '../store/musicStore';
import AlbumArt from './AlbumArt';
import ContextMenu from './ContextMenu';

export default function TrackList({ tracks, showAddToQueue = true }) {
  const { t } = useTranslation();
  const { playTrack, toggleStar, starred, currentTrack, addToQueue, shufflePlay } = musicStore();
  const [contextMenu, setContextMenu] = useState(null);

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleShufflePlay = () => {
    if (!tracks?.length) return;
    shufflePlay(tracks);
  };

  const addAllToQueue = () => {
    if (!tracks?.length) return;
    tracks.forEach(t => addToQueue(t));
  };

  if (!tracks || tracks.length === 0) {
    return <div className="loading">{t('common.noResults')}</div>;
  }

  return (
    <div>
      {showAddToQueue && tracks.length > 1 && (
        <div className="track-actions">
          <button className="btn-secondary btn-sm" onClick={handleShufflePlay}>
            <IoShuffle /> {t('player.shuffle')}
          </button>
          <button className="btn-secondary btn-sm" onClick={addAllToQueue}>
            <IoAddCircle /> {t('player.addAllToQueue')}
          </button>
        </div>
      )}

      <div className="track-list">
        {tracks.map((track, index) => {
          const isStarred = starred?.track?.some(t => t.id === track.id);
          const isCurrent = currentTrack?.id === track.id;

          return (
            <div 
              key={track.id} 
              className={`track-item ${isCurrent ? 'current' : ''}`}
              onDoubleClick={() => playTrack(track)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, track, tracks });
              }}
            >
              <div className="track-number">
                <span className="track-index">{index + 1}</span>
                <button className="track-play-btn" onClick={() => playTrack(track)}>
                  <IoPlay />
                </button>
              </div>

              <div className="track-cover-wrapper">
                <AlbumArt coverArt={track.coverArt} size={40} className="track-cover" alt={track.title} />
              </div>
              
              <div className="track-info">
                <div className="track-title">{track.title || t('common.unknown')}</div>
                <div className="track-meta">
                  <span>{track.artist || t('common.unknown')}</span>
                  {track.album && <span> • {track.album}</span>}
                </div>
              </div>

              <div className="track-duration">
                {formatDuration(track.duration)}
              </div>

              <button 
                className={`star-btn ${isStarred ? 'starred' : ''}`}
                onClick={(e) => { e.stopPropagation(); toggleStar(track.id, track.albumId, track.artistId); }}
              >
                {isStarred ? <IoHeart /> : <IoHeartOutline />}
              </button>
            </div>
          );
        })}
      </div>

      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          track={contextMenu.track}
          tracks={contextMenu.tracks}
          onClose={() => setContextMenu(null)}
          showShuffle={true}
        />
      )}
    </div>
  );
}