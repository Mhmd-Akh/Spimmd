import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IoAlbums } from 'react-icons/io5';
import api from '../api/subsonic';
import TrackList from '../components/TrackList';

export default function GenresPage() {
  const { t } = useTranslation();
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getGenres().then(g => {
      setGenres(g || []);
      setLoading(false);
    });
  }, []);

  const selectGenre = async (genre) => {
    setSelectedGenre(genre);
    setLoading(true);
    const s = await api.getSongsByGenre(genre, 50);
    setSongs(s);
    setLoading(false);
  };

  return (
    <div className="genres-page">
      <div className="page-header">
        <h1><IoAlbums /> ژانرها</h1>
      </div>

      {!selectedGenre ? (
        <div className="genre-grid">
          {genres.map(genre => (
            <button key={genre} className="genre-card" onClick={() => selectGenre(genre)}>
              {genre}
            </button>
          ))}
        </div>
      ) : (
        <>
          <button className="btn-secondary btn-sm" onClick={() => setSelectedGenre(null)} style={{ marginBottom: '16px' }}>
            ← بازگشت به ژانرها
          </button>
          <h2 className="section-title">{selectedGenre}</h2>
          {loading ? <div className="loading">در حال بارگذاری...</div> : <TrackList tracks={songs} />}
        </>
      )}
    </div>
  );
}