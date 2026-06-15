import React, { useState, useEffect, useRef, useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  IoPlay,
  IoPause,
  IoPlaySkipForward,
  IoPlaySkipBack,
  IoShuffle,
  IoRepeat,
  IoVolumeHigh,
  IoVolumeMute,
  IoOptions,
  IoHeart,
  IoHeartOutline,
} from "react-icons/io5";
import musicStore from "../store/musicStore";
import api from "../api/subsonic";
import { getGlobalAudio } from "../hooks/useMusicPlayer";

export default function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    volume,
    repeatMode,
    shuffleMode,
    togglePlay,
    playNext,
    playPrevious,
    toggleShuffle,
    cycleRepeat,
    setVolume,
    toggleStar,
    queue, 
    queueIndex,
    starred,
  } = musicStore();

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const progressRef = useRef(null);
  const rafRef = useRef(null);
  const titleRef = useRef(null);
  const [isMarquee, setIsMarquee] = useState(false);

  const isStarred = starred?.track?.some((t) => t.id === currentTrack?.id);

useEffect(() => {
  if (currentTrack) {
    const total = queue.length || 0;
    const current = total > 0 ? queueIndex + 1 : 1;
    const info = total > 0 ? ` (${current}/${total})` : '';
    const status = isPlaying ? '' : '[ PAUSE ]';
    const title = `${status} ${info} ${currentTrack.title} - ${currentTrack.artist} | Spimmd Player`;
    document.title = title;
    
    if (window.electronAPI?.setTitle) {
      window.electronAPI.setTitle(title);
    }
  } else {
    document.title = 'Spimmd Player';
    if (window.electronAPI?.setTitle) {
      window.electronAPI.setTitle('Spimmd Player');
    }
  }
}, [currentTrack, queueIndex, queue, isPlaying]);

  useEffect(() => {
    if (titleRef.current) {
      setIsMarquee(titleRef.current.scrollWidth > titleRef.current.clientWidth);
    }
  }, [currentTrack?.title]);

  useEffect(() => {
    const audio = getGlobalAudio();
    if (!audio) return;
    const updateTime = () => {
      if (audio && !audio.paused) {
        setCurrentTime(audio.currentTime);
        if (audio.duration && isFinite(audio.duration))
          setDuration(audio.duration);
      }
      rafRef.current = requestAnimationFrame(updateTime);
    };
    const onPlay = () => updateTime();
    const onPause = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    if (!audio.paused) updateTime();
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    setCurrentTime(0);
    setDuration(currentTrack?.duration || 0);
  }, [currentTrack?.id]);

  const formatTime = (s) => {
    if (!s || !isFinite(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };

  const seek = useCallback(
    (e) => {
      const audio = getGlobalAudio();
      const bar = progressRef.current;
      if (!audio || !bar) return;
      const rect = bar.getBoundingClientRect();
      const pct = Math.max(
        0,
        Math.min((e.clientX - rect.left) / rect.width, 1),
      );
      const time = pct * (duration || audio.duration || 0);
      if (isFinite(time) && time >= 0) {
        audio.currentTime = time;
        setCurrentTime(time);
      }
    },
    [duration],
  );

  const canGoNext = repeatMode === 'one' || repeatMode === 'all' || queueIndex < queue.length - 1;
  const canGoPrevious = queue.length > 0 && queueIndex > 0;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  // if (!currentTrack) return null;

  return (
    <div className={`player-bar ${currentTrack ? 'visible' : ''}`}>
      {currentTrack && (
        <>
      <div className="player-left">
        <img
          src={api.getCoverUrl(currentTrack.coverArt, 48)}
          alt=""
          className="player-cover"
          onError={(e) => (e.target.style.display = "none")}
        />
        <div className="player-info">
<div
  className={`player-title ${isMarquee ? "marquee" : ""}`}
  ref={titleRef}
  style={{ maxWidth: '160px' }}
>
  <span>{currentTrack.title}</span>
</div>
          <div className="player-artist">{currentTrack.artist}</div>
        </div>
        <button
          className={`star-btn ${isStarred ? "starred" : ""}`}
          onClick={() => {
            if (currentTrack) {
              toggleStar(
                currentTrack.id,
                currentTrack.albumId,
                currentTrack.artistId,
              );
            }
          }}
        >
          {isStarred ? <IoHeart /> : <IoHeartOutline />}
        </button>
      </div>

      <div className="player-center">
      <div className="player-controls">
        <button className={`control-btn ${shuffleMode ? "active" : ""}`} onClick={toggleShuffle}>
          <IoShuffle />
        </button>

        {/* همیشه Previous چپ، Play وسط، Next راست */}
        <button 
          className="control-btn" 
          onClick={playPrevious}
          disabled={!canGoPrevious}
          style={{ opacity: canGoPrevious ? 1 : 0.3, cursor: canGoPrevious ? 'pointer' : 'default' }}
        >
          <IoPlaySkipBack />
        </button>
        <button className="play-btn" onClick={togglePlay}>
          {isPlaying ? <IoPause /> : <IoPlay />}
        </button>
        <button 
          className="control-btn" 
          onClick={playNext}
          disabled={!canGoNext}
          style={{ opacity: canGoNext ? 1 : 0.3, cursor: canGoNext ? 'pointer' : 'default' }}
        >
          <IoPlaySkipForward />
        </button>

        <button className={`control-btn ${repeatMode !== "off" ? "active" : ""}`} onClick={cycleRepeat}>
          <IoRepeat />
          {repeatMode === "one" && <span className="repeat-one">1</span>}
        </button>
      </div>
        <div className="progress-container">
          <span className="time-current">{formatTime(currentTime)}</span>
          <div className="progress-bar" ref={progressRef} onClick={seek}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="time-duration">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="player-right">
        <button className="control-btn">
          <NavLink to="/settings">
            <IoOptions />
          </NavLink>
        </button>

        <div className="volume-control">
          <button
            className="control-btn"
            onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
          >
            {volume === 0 ? <IoVolumeMute /> : <IoVolumeHigh />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(+e.target.value)}
            className="volume-slider"
          />
        </div>
      </div>
    </>
  )}
    </div>
  );
}
