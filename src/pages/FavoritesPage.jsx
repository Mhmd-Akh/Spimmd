import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IoHeart, IoHeartOutline, IoShuffle, IoAddCircle } from 'react-icons/io5';
import musicStore from '../store/musicStore';
import TrackList from '../components/TrackList';

export default function FavoritesPage() {
  const { t } = useTranslation();
  const { starred, fetchStarred, isLoading, playTrack, shufflePlay, addToQueue } = musicStore();

  useEffect(() => {
    fetchStarred();
  }, []);

  const allTracks = starred?.track || [];
  const hasData = allTracks.length > 0;

  return (
    <div className="favorites-page">
      <div className="page-header">
        <h1>
          <IoHeart style={{ color: '#e94560' }} /> {t('favorites.title')}
          {hasData && <span className="total-badge">{allTracks.length} {t('library.songs')}</span>}
        </h1>
      </div>

      {isLoading && !hasData && (
        <div className="loading">{t('common.loading')}</div>
      )}

      {!isLoading && !hasData && (
        <div className="favorites-empty">
          <IoHeartOutline style={{ fontSize: '60px', color: 'var(--text-secondary)', marginBottom: '16px' }} />
          <h3>{t('favorites.empty')}</h3>
          <p>{t('favorites.hint')}</p>
        </div>
      )}

      {hasData && (
        <TrackList tracks={allTracks} showAddToQueue={true} />
      )}
    </div>
  );
}