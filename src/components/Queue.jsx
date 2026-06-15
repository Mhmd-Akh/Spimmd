import React, { useState } from "react";
import { IoChevronUp, IoChevronDown, IoClose } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import musicStore from "../store/musicStore";
import AlbumArt from './AlbumArt';

export default function Queue() {
  const { t } = useTranslation();
  const {
    currentTrack,
    queue,
    queueIndex,
    playTrack,
    removeFromQueue,
    clearQueue,
  } = musicStore();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`queue-panel ${expanded ? "expanded" : ""} ${currentTrack && queue.length > 0 ? 'visible' : ''}`}>
      <div className="qp-header" onClick={() => setExpanded(!expanded)}>
        <span>🎵 {t('player.queue')} ({queue.length} {t('library.songs')})</span>
        <button>{expanded ? <IoChevronDown /> : <IoChevronUp />}</button>
      </div>

      <div className="qp-content">
        <div className="qp-actions">
          <button className="btn-secondary btn-sm" onClick={clearQueue}>
            {t('player.clearQueue')}
          </button>
        </div>
        {queue.map((track, i) => (
          <div
            key={track.id}
            className={`qp-item ${i === queueIndex ? "current" : ""}`}
            onDoubleClick={() => playTrack(track, queue)}
          >
            <span className="qp-num">{i + 1}</span>
            <AlbumArt
              coverArt={track.coverArt}
              size={30}
              className="qp-cover"
              alt={track.title}
            />
            <div className="qp-info">
              <span className="qp-title">{track.title}</span>
              <span className="qp-artist">{track.artist}</span>
            </div>
            <span className="qp-duration">
              {track.duration
                ? `${Math.floor(track.duration / 60)}:${String(Math.floor(track.duration % 60)).padStart(2, "0")}`
                : ""}
            </span>
            <button className="qp-remove" onClick={() => removeFromQueue(i)}>
              <IoClose />
            </button>
            {i === queueIndex && <span className="qp-playing">▶</span>}
          </div>
        ))}
      </div>
    </div>
  );
}