import React, { useEffect, useState, useRef } from 'react';
import { IoCloudOffline, IoPlay } from 'react-icons/io5';
import musicStore from '../store/musicStore';

let offlineAudio = null;

export default function OfflinePage() {
  const [cacheList, setCacheList] = useState({});
  const [loading, setLoading] = useState(true);
  const currentAudioRef = useRef(null);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getCacheList().then(list => {
        setCacheList(list || {});
        setLoading(false);
      });
    } else {
      setLoading(false);
    }

    return () => {
      if (offlineAudio) {
        offlineAudio.pause();
        offlineAudio.src = '';
      }
    };
  }, []);

  const handlePlay = async (trackId) => {
    if (!window.electronAPI) return;

    const cached = await window.electronAPI.getCachedAudio(trackId);
    if (!cached?.exists) return;

    const result = await window.electronAPI.readCachedFile(cached.path);
    if (!result?.success) return;

    // 🔥 استاپ آهنگ قبلی
    if (offlineAudio) {
      offlineAudio.pause();
      offlineAudio.src = '';
    }

    const blob = new Blob([new Uint8Array(result.data)], { type: 'audio/opus' });
    const url = URL.createObjectURL(blob);

    // 🔥 یه Audio واحد
    offlineAudio = new Audio();
    offlineAudio.src = url;
    offlineAudio.volume = musicStore.getState().volume;

    // 🔥 وقتی تموم شد بره بعدی
    offlineAudio.addEventListener('ended', () => {
      const state = musicStore.getState();
      const tracks = Object.values(cacheList);
      const currentIndex = tracks.findIndex(t => t.id === state.currentTrack?.id);
      if (currentIndex < tracks.length - 1) {
        handlePlay(tracks[currentIndex + 1].id);
      }
    });

    offlineAudio.play().catch(e => console.log('Play error:', e));

    const tracks = Object.values(cacheList);
    const currentIndex = tracks.findIndex(t => t.id === trackId);

    const track = {
      id: trackId,
      title: cacheList[trackId]?.title || 'Unknown',
      artist: cacheList[trackId]?.artist || '',
    };

    musicStore.setState({
      currentTrack: track,
      isPlaying: true,
      queue: tracks.map(t => ({ id: t.id, title: t.title || 'Unknown', artist: t.artist || '' })),
      queueIndex: currentIndex >= 0 ? currentIndex : 0,
    });

    currentAudioRef.current = offlineAudio;
  };

  const handlePlayNext = () => {
    const state = musicStore.getState();
    const tracks = Object.values(cacheList);
    const currentIndex = tracks.findIndex(t => t.id === state.currentTrack?.id);
    if (currentIndex < tracks.length - 1) {
      handlePlay(tracks[currentIndex + 1].id);
    }
  };

  const handlePlayPrevious = () => {
    const state = musicStore.getState();
    const tracks = Object.values(cacheList);
    const currentIndex = tracks.findIndex(t => t.id === state.currentTrack?.id);
    if (currentIndex > 0) {
      handlePlay(tracks[currentIndex - 1].id);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const tracks = Object.values(cacheList);

  return (
    <div className="all-songs-page">
      <div className="page-header">
        <h1>
          <IoCloudOffline style={{ color: 'var(--accent)' }} /> آهنگ‌های آفلاین
          {!loading && <span className="total-badge">{tracks.length} آهنگ</span>}
        </h1>
      </div>

      {loading && <div className="loading">در حال بارگذاری...</div>}

      {!loading && tracks.length === 0 && (
        <div className="favorites-empty">
          <IoCloudOffline style={{ fontSize: '60px', color: 'var(--text-secondary)', marginBottom: '16px' }} />
          <h3>هیچ آهنگی کش نشده</h3>
          <p>آهنگ‌هایی که چندین بار پلی کنید، به صورت خودکار کش می‌شوند.</p>
        </div>
      )}

      {!loading && tracks.length > 0 && (
        <div className="simple-track-list">
          {tracks.map((track, index) => (
            <div
              key={track.id}
              className="simple-track-item"
              onClick={() => handlePlay(track.id)}
              style={{ cursor: 'pointer' }}
            >
              <span className="track-num">{index + 1}</span>
              <div className="track-name-group">
                <span className="track-name">{track.title || track.id}</span>
                <span className="track-artist-name">{track.artist || 'Unknown'}</span>
              </div>
              <span className="track-time">{formatBytes(track.size)}</span>
              <button
                className="play-btn"
                style={{ width: '32px', height: '32px', fontSize: '14px', flexShrink: 0 }}
                onClick={(e) => { e.stopPropagation(); handlePlay(track.id); }}
              >
                <IoPlay />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}