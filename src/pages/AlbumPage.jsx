import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IoShuffle, IoAddCircle } from 'react-icons/io5';
import api from '../api/subsonic';
import TrackList from '../components/TrackList';
import AlbumArt from '../components/AlbumArt';
import musicStore from '../store/musicStore';

export default function AlbumPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const { playTrack, addToQueue, shufflePlay } = musicStore();

  useEffect(() => {
    api.getAlbum(id)
      .then(data => setAlbum(data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">{t('common.loading')}</div>;
  if (!album) return <div className="error-message">{t('common.noResults')}</div>;

  // 🔥 اینو تغییر بده - از album.song استفاده کن، نه musicStore.playlist
  const handlePlayAlbum = () => {
    const tracks = album.song || [];
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks);
    }
  };

  const handleShufflePlay = () => {
    const tracks = album.song || [];
    if (tracks.length > 0) {
      shufflePlay(tracks);
    }
  };

  const handleAddToQueue = () => {
    const tracks = album.song || [];
    tracks.forEach(track => addToQueue(track));
  };

  return (
    <div className="album-page"
      onContextMenu={(e) => {
        e.preventDefault();
      }}
    >
      <div className="album-header">
        <AlbumArt coverArt={album.coverArt} size={250} className="album-header-cover" alt={album.name} />
        <div className="album-header-info">
          <h1>{album.name}</h1>
          <h2>{album.artist}</h2>
          <p>{album.year} • {album.songCount} {t('library.songs')}</p>
          <div className="album-actions">
            <button className="btn-primary" onClick={handlePlayAlbum}>
              ▶ {t('player.play')}
            </button>
          </div>
        </div>
      </div>
      
      <TrackList tracks={album.song || []} />
    </div>
  );
}