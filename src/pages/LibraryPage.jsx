import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IoAlbums, IoPeople, IoList, IoMusicalNotes } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import musicStore from '../store/musicStore';
import api from '../api/subsonic';

export default function LibraryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { playlists, artists, albums, fetchPlaylists, fetchArtists, fetchAlbums } = musicStore();
  
  const [activeTab, setActiveTab] = useState('playlists');
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    fetchPlaylists();
    fetchArtists();
    fetchAlbums('alphabeticalByName');
  }, []);

  const sortedPlaylists = [...playlists].sort((a, b) => {
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'newest') return new Date(b.created || 0) - new Date(a.created || 0);
    return 0;
  });

  const sortedArtists = [...artists].sort((a, b) => {
    if (sortBy === 'name' || sortBy === 'aToZ') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'zToA') return (b.name || '').localeCompare(a.name || '');
    return 0;
  });

  const sortedAlbums = [...albums].sort((a, b) => {
    if (sortBy === 'name' || sortBy === 'aToZ') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'zToA') return (b.name || '').localeCompare(a.name || '');
    if (sortBy === 'year' || sortBy === 'newest') return (b.year || 0) - (a.year || 0);
    if (sortBy === 'oldest') return (a.year || 0) - (b.year || 0);
    return 0;
  });

  return (
    <div className="library-page">
      <div className="page-header">
        <h1>{t('library.title')}</h1>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
          <option value="name">{t('library.name')}</option>
          <option value="newest">{t('library.newest')}</option>
        </select>
      </div>

      <div className="library-tabs">
        <button className={`tab-btn ${activeTab === 'playlists' ? 'active' : ''}`} onClick={() => setActiveTab('playlists')}>
          <IoList /> {t('library.playlists')}
        </button>
        <button className={`tab-btn ${activeTab === 'artists' ? 'active' : ''}`} onClick={() => setActiveTab('artists')}>
          <IoPeople /> {t('library.artists')}
        </button>
        <button className={`tab-btn ${activeTab === 'albums' ? 'active' : ''}`} onClick={() => setActiveTab('albums')}>
          <IoAlbums /> {t('library.albums')}
        </button>
        <button className={`tab-btn ${activeTab === 'songs' ? 'active' : ''}`} onClick={() => navigate('/all-songs')}>
          <IoMusicalNotes /> {t('library.songs')}
        </button>
      </div>

      <div className="library-content">
        {activeTab === 'playlists' && (
          <div className="lib-grid">
            {sortedPlaylists.map(pl => (
              <div key={pl.id} className="lib-card" onClick={() => navigate(`/playlist/${pl.id}`)}>
                <img src={api.getCoverUrl(pl.coverArt, 150)} alt={pl.name} className="lib-cover"
                  onError={(e) => { e.target.style.display = 'none'; }} />
                <span className="lib-name">{pl.name}</span>
                <span className="lib-count">{pl.songCount} {t('library.songs')}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'artists' && (
          <div className="lib-grid">
            {sortedArtists.map(artist => (
              <div key={artist.id} className="lib-card" onClick={() => navigate(`/artist/${artist.id}`)}>
                <img src={api.getCoverUrl(artist.coverArt, 150)} alt={artist.name} className="lib-cover lib-round"
                  onError={(e) => { e.target.style.display = 'none'; }} />
                <span className="lib-name">{artist.name}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'albums' && (
          <div className="lib-grid">
            {sortedAlbums.map(album => (
              <div key={album.id} className="lib-card" onClick={() => navigate(`/album/${album.id}`)}>
                <img src={api.getCoverUrl(album.coverArt, 150)} alt={album.name} className="lib-cover"
                  onError={(e) => { e.target.style.display = 'none'; }} />
                <span className="lib-name">{album.name}</span>
                <span className="lib-count">{album.artist}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}