import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { IoShuffle } from 'react-icons/io5';
import api from '../api/subsonic';
import AlbumGrid from '../components/AlbumGrid';
import TrackList from '../components/TrackList';
import musicStore from '../store/musicStore';

export default function ArtistPage() {
  const { id } = useParams();
  const [artist, setArtist] = useState(null);
  const [topSongs, setTopSongs] = useState([]);
  const [bio, setBio] = useState(null);
  const [loading, setLoading] = useState(true);
  const { shufflePlay, addToQueue } = musicStore();

  useEffect(() => {
    async function loadArtist() {
      try {
        const data = await api.getArtist(id);
        setArtist(data);
        
        if (data?.name) {
          const [songs, info] = await Promise.all([
            api.getTopSongs(data.name, 5).catch(() => []),
            api.getArtistInfo2(id).catch(() => null)
          ]);
          setTopSongs(songs);
          setBio(info);
        }
      } catch (error) {
        console.error('Error loading artist:', error);
      } finally {
        setLoading(false);
      }
    }
    loadArtist();
  }, [id]);

  if (loading) return <div className="loading">در حال بارگذاری...</div>;
  if (!artist) return <div className="error-message">هنرمند یافت نشد</div>;

  return (
    <div className="artist-page">
      <div className="artist-header" style={{
        background: `linear-gradient(180deg, rgba(0,0,0,0.3), var(--bg-primary)), url(${api.getCoverUrl(artist.coverArt, 500)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '60px 30px 30px',
        borderRadius: 'var(--radius-md)',
        marginBottom: '24px',
        minHeight: '250px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end'
      }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>{artist.name}</h1>
        {bio?.biography && (
          <p style={{ maxWidth: '600px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: bio.biography.substring(0, 300) + '...' }} />
        )}
        <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
          {topSongs.length > 0 && (
            <button className="btn-primary" onClick={() => shufflePlay(topSongs)}>
              <IoShuffle /> پخش آهنگ‌های برتر
            </button>
          )}
          {artist.album?.length > 0 && (
            <button className="btn-secondary" onClick={() => artist.album.forEach(a => addToQueue(a))}>
              افزودن آلبوم‌ها به صف
            </button>
          )}
        </div>
      </div>

      {topSongs.length > 0 && (
        <>
          <h2 className="section-title">🔥 آهنگ‌های برتر</h2>
          <TrackList tracks={topSongs} />
        </>
      )}

      {artist.album && (
        <AlbumGrid albums={artist.album} title="💿 آلبوم‌ها" />
      )}
    </div>
  );
}