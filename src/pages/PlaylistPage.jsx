import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IoShuffle, IoAddCircle } from 'react-icons/io5';
import api from '../api/subsonic';
import TrackList from '../components/TrackList';
import AlbumArt from '../components/AlbumArt';
import musicStore from '../store/musicStore';

export default function PlaylistPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const { playTrack, addToQueue, shufflePlay } = musicStore();

  useEffect(() => {
    api.getPlaylist(id).then(setPlaylist).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">{t('common.loading')}</div>;
  if (!playlist) return <div className="error-message">{t('common.noResults')}</div>;

  return (
    <div className="playlist-page">
      <div className="playlist-header">
        <AlbumArt coverArt={playlist.coverArt} size={250} className="playlist-header-cover" alt={playlist.name} />
        <div className="album-header-info">
          <h1>{playlist.name}</h1>
          <p>{playlist.songCount} {t('library.songs')}</p>
          <div className="album-actions">
          <button className="btn-primary" onClick={() => playTrack(playlist.entry?.[0], playlist.entry)}>
            ▶ {t('player.play')}
          </button>
          </div>
        </div>
      </div>
      <TrackList tracks={playlist.entry || []} />
    </div>
  );
}