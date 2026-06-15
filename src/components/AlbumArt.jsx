import React, { useState } from "react";
import { IoMusicalNotes } from "react-icons/io5";
import api from "../api/subsonic";

export default function AlbumArt({
  coverArt,
  size = 300,
  className = "",
  alt = "",
}) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const url = api.getCoverUrl(coverArt, size);

  if (!url || error) {
    return (
      <div
        className={`album-art-fallback ${className}`}
        style={{ width: size, height: size }}
      >
        <IoMusicalNotes />
      </div>
    );
  }

  return (
    <>
      {!loaded && (
        <div
          className={`album-art-fallback ${className}`}
          style={{ width: size, height: size }}
        >
          <IoMusicalNotes />
        </div>
      )}
      <img
        src={url}
        alt={alt}
        className={className}
        style={{ display: loaded ? "block" : "none" }}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </>
  );
}
