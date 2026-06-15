import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AlbumGrid from '../components/AlbumGrid';
import SearchBar from '../components/SearchBar';
import musicStore from '../store/musicStore';
import api from '../api/subsonic';

export default function HomePage() {
  const { t } = useTranslation();
  const { albums, artists, isLoading, error, fetchAlbums, fetchArtists, fetchStarred } = musicStore();

  useEffect(() => {
    fetchAlbums();
    fetchArtists();
    fetchStarred();
  }, []);

  return (
    <div className="home-page">
      <SearchBar />
      {error && <div className="error-message">{error}</div>}
      {isLoading && <div className="loading">{t('common.loading')}</div>}
      <AlbumGrid albums={albums.slice(0, 20)} title={t('nav.albums')} />
      {albums.length > 20 && (
        <AlbumGrid albums={albums.slice(20, 40)} title="آلبوم‌های بیشتر" />
      )}
      {artists.length > 0 && (
        <section className="artists-section">
          <h2 className="section-title">{t('nav.artists')}</h2>
          <div className="artist-grid">
            {artists.slice(0, 12).map(artist => (
              <div key={artist.id} className="artist-card" onClick={() => navigate(`/artist/${artist.id}`)}>
                <img src={api.getCoverUrl(artist.coverArt, 120)} alt={artist.name} className="artist-image"
                  onError={e => e.target.style.display = 'none'} />
                <span className="artist-name">{artist.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}