import React from "react";
import { useNavigate } from "react-router-dom";
import AlbumArt from './AlbumArt';

export default function AlbumGrid({ albums, title }) {
  const navigate = useNavigate();

  return (
    <section className="album-section">
      {title && <h2 className="section-title">{title}</h2>}
      <div className="album-grid">
        {albums.map((album) => (
          <div
            key={album.id}
            className="album-card"
            onClick={() => navigate(`/album/${album.id}`)}
          >
            <div className="album-cover-wrapper">
              <AlbumArt
                coverArt={album.coverArt}
                size={300}
                className="album-cover"
                alt={album.name}
              />
              <div className="album-overlay">
                <button className="play-album-btn">▶</button>
              </div>
            </div>
            <h3 className="album-name">{album.name}</h3>
            <p className="album-artist">{album.artist}</p>
          </div>
        ))}
      </div>
    </section>
  );
}