import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { IoMusicalNotes, IoChevronBack, IoChevronForward } from 'react-icons/io5';
import musicStore from '../store/musicStore';
import api from '../api/subsonic';
import ContextMenu from '../components/ContextMenu';

const PAGE_SIZES = [25, 50, 75, 100];

export default function AllSongs() {
  const { t } = useTranslation();
  const { allSongs, totalSongs, fetchAllSongs, isLoading, playTrack } = musicStore();
  const [contextMenu, setContextMenu] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState('title');

  useEffect(() => {
    if (allSongs.length === 0) {
      fetchAllSongs();
    }
  }, []);

  const sortedTracks = useMemo(() => {
    return [...(allSongs || [])].sort((a, b) => {
      switch(sortBy) {
        case 'artist': return (a.artist || '').localeCompare(b.artist || '');
        case 'album': return (a.album || '').localeCompare(b.album || '');
        case 'duration': return (a.duration || 0) - (b.duration || 0);
        default: return (a.title || '').localeCompare(b.title || '');
      }
    });
  }, [allSongs, sortBy]);

  const totalPages = Math.ceil((totalSongs || allSongs.length) / pageSize);
  const pageTracks = sortedTracks.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const loadedCount = allSongs.length;
  const totalCount = totalSongs || loadedCount;

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="all-songs-page">
      <div className="page-header">
        <h1>
          <IoMusicalNotes /> {t('nav.allSongs')}
          {loadedCount > 0 && (
            <span className="total-badge">
              {loadedCount}{totalCount > loadedCount ? ` / ${totalCount}` : ''} {t('library.songs')}
            </span>
          )}
        </h1>
        <div className="header-controls">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
            <option value="title">{t('library.name')}</option>
            <option value="artist">{t('library.artist')}</option>
            <option value="album">{t('library.album')}</option>
            <option value="duration">{t('library.duration')}</option>
          </select>
          
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className="sort-select">
            {PAGE_SIZES.map(s => (
              <option key={s} value={s}>{s} {t('library.perPage')}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && loadedCount === 0 && (
        <div className="loading">
          <div className="loading-spinner">🎵</div>
          <p>{t('common.loading')}</p>
        </div>
      )}

      {loadedCount > 0 && (
        <>
          <div className="simple-track-list">
            {pageTracks.map((track, index) => (
              <div 
                key={track.id} 
                className="simple-track-item"
                onDoubleClick={() => playTrack(track, sortedTracks)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, track, tracks: sortedTracks });
                }}
              >
                <span className="track-num">{(currentPage - 1) * pageSize + index + 1}</span>
                <div className="track-img-small">
                  <img src={api.getCoverUrl(track.coverArt, 40)} alt="" className="track-thumb"
                    onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
                <div className="track-name-group">
                  <span className="track-name">{track.title || t('common.unknown')}</span>
                  <span className="track-artist-name">{track.artist || t('common.unknown')}</span>
                </div>
                <span className="track-album-name">{track.album || ''}</span>
                <span className="track-time">{formatDuration(track.duration)}</span>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <>
              <div className="pagination">
                <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                  <IoChevronBack />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let page;
                  if (totalPages <= 7) page = i + 1;
                  else if (currentPage <= 4) page = i + 1;
                  else if (currentPage >= totalPages - 3) page = totalPages - 6 + i;
                  else page = currentPage - 3 + i;
                  return (
                    <button key={page} className={`page-btn ${currentPage === page ? 'active' : ''}`}
                      onClick={() => setCurrentPage(page)}>{page}</button>
                  );
                })}
                <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                  <IoChevronForward />
                </button>
              </div>
              <div className="page-info">{t('library.page')} {currentPage} {t('library.of')} {totalPages}</div>
            </>
          )}
        </>
      )}

      {!isLoading && loadedCount === 0 && (
        <div className="loading">{t('common.noResults')}</div>
      )}
      
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