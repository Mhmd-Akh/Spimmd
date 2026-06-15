import { useState, useCallback } from 'react';
import api from '../api/subsonic';

export default function usePlaylist() {
  const [currentPlaylist, setCurrentPlaylist] = useState(null);

  const loadPlaylist = useCallback(async (id) => {
    try {
      const playlist = await api.getPlaylist(id);
      setCurrentPlaylist(playlist);
      return playlist;
    } catch (error) {
      console.error('Error loading playlist:', error);
      return null;
    }
  }, []);

  return { currentPlaylist, loadPlaylist };
}