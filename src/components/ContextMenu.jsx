import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  IoAddCircle,
  IoHeart,
  IoHeartOutline,
  IoShuffle,
  IoShareOutline,
  IoTrash,
  IoCreate,
  IoList,
  IoPlay,
  IoPause,
  IoClose,
} from "react-icons/io5";
import api from "../api/subsonic";
import { notify } from "./Notification";
import musicStore from "../store/musicStore";

export default function ContextMenu({
  x,
  y,
  track,
  tracks,
  albumName,
  playlistId,
  playlistName,
  onClose,
  showShuffle = false,
  isPlaylist = false,
  isAlbum = false,
}) {
  const { t } = useTranslation();
  const menuRef = useRef(null);
  const {
    addToQueue,
    toggleStar,
    starred,
    shufflePlay,
    playTrack,
    queue,
    isPlaying,
    currentTrack,
    fetchPlaylists,
  } = musicStore();

  const isStarred =
    starred?.track?.some((t) => t.id === track?.id) ||
    starred?.album?.some((a) => a.id === track?.albumId) ||
    starred?.artist?.some((a) => a.id === track?.artistId);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const copyLink = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
    onClose();
  };

  const deletePlaylist = async () => {
    if (!playlistId) return;
    try {
      await api.deletePlaylist(playlistId);
      await fetchPlaylists();
      notify('t:notifications.playlistDeleted', 'warning');
      onClose();
    } catch (e) {
      console.error("Delete failed:", e);
      notify('t:notifications.errorPlaylistDelete', 'error');
    }
  };

  const menuWidth = 240;
  const menuMaxHeight = 400;

  // چک کن از راست و پایین صفحه بیرون نزنه
  let left = x;
  let top = y;

  // اگه از راست بیرون میزنه
  if (left + menuWidth > window.innerWidth - 10) {
    left = window.innerWidth - menuWidth - 10;
  }

  // اگه از پایین بیرون میزنه
  if (top + menuMaxHeight > window.innerHeight - 10) {
    top = window.innerHeight - menuMaxHeight - 10;
  }

  // اگه از چپ بیرون میزنه
  if (left < 10) {
    left = 10;
  }

  // اگه از بالا بیرون میزنه
  if (top < 10) {
    top = 10;
  }

  const menuStyle = {
    position: "fixed",
    left: left,
    top: top,
    zIndex: 1000,
  };

  return (
    <div ref={menuRef} className="context-menu" style={menuStyle}>
      {track && (
        <>
          <button
            className="context-item"
            onClick={() => {
              playTrack(track);
              onClose();
            }}
          >
            <IoPlay /> {t("player.play")}
          </button>
          <button
            className="context-item"
            onClick={() => {
              addToQueue(track);
              onClose();
            }}
          >
            <IoAddCircle /> {t("player.addToQueue")}
          </button>
          <button
            className="context-item"
            onClick={() => {
              toggleStar(track.id, track.albumId, track.artistId);
              onClose();
            }}
          >
            {isStarred ? (
              <>
                <IoHeart /> {t("player.removeFromFavorites")}
              </>
            ) : (
              <>
                <IoHeartOutline /> {t("player.addToFavorites")}
              </>
            )}
          </button>
          {track.albumId && (
            <button
              className="context-item"
              onClick={() =>
                copyLink(`${window.location.origin}/album/${track.albumId}`)
              }
            >
              <IoShareOutline /> {t("common.copyAlbumLink")}
            </button>
          )}
          <div className="context-divider" />
        </>
      )}

      {tracks && tracks.length > 0 && (
        <>
          <button
            className="context-item"
            onClick={() => {
              shufflePlay(tracks);
              onClose();
            }}
          >
            <IoShuffle /> {t("player.shuffle")}
          </button>
          <button
            className="context-item"
            onClick={() => {
              tracks.forEach((t) => addToQueue(t));
              onClose();
            }}
          >
            <IoAddCircle /> {t("player.addAllToQueue")}
          </button>

          {!track && <div className="context-divider" />}
        </>
      )}

      {isPlaylist && playlistId && (
        <>
          <button className="context-item" onClick={deletePlaylist}>
            <IoTrash /> {t("common.delete")}
          </button>
          <button
            className="context-item"
            onClick={() =>
              copyLink(`${window.location.origin}/playlist/${playlistId}`)
            }
          >
            <IoShareOutline /> {t("common.copyPlaylistLink")}
          </button>
        </>
      )}

      {isAlbum && albumName && (
        <button
          className="context-item"
          onClick={() => copyLink(window.location.href)}
        >
          <IoShareOutline /> {t("common.copyAlbumLink")}
        </button>
      )}

      <div className="context-divider" />
      <button className="context-item" onClick={onClose}>
        <IoClose /> {t("common.close")}
      </button>
    </div>
  );
}
