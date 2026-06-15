import { create } from "zustand";
import api from "../api/subsonic";
import config from "../config";
import { notify } from "../components/Notification";

const musicStore = create((set, get) => ({
  albums: [],
  artists: [],
  playlists: [],
  allSongs: [],
  totalSongs: 0,
  songsOffset: 0,
  starred: null,
  searchResults: null,
  currentTrack: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  volume: 0.2,
  currentPlaylist: null,
  repeatMode: "off",
  shuffleMode: false,
  isLoading: false,
  isLoggedIn: false,
  error: null,

  equalizerEnabled: false,
  equalizerBands: {
    '32': 0, '64': 0, '100': 0, '160': 0, '250': 0, '400': 0, '630': 0,
    '1k': 0, '1.6k': 0, '2.5k': 0, '4k': 0, '6.3k': 0, '10k': 0, '16k': 0,
  },
  equalizerPreset: "normal",
  bassBoost: 0,
  volumeBoost: 0,
  threeDEnabled: false,
  threeDDepth: 50,
  virtualizerEnabled: false,
  virtualizerPreset: 'studio',
  
  mobilePlayerOpen: false,

  language: localStorage.getItem("language") || "fa",
  sortBy: "name",

  setLoggedIn: (status) => set({ isLoggedIn: status }),

  setMobilePlayerOpen: (v) => set({ mobilePlayerOpen: v }),

  fetchAllData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [albums, artists, playlists, starred] = await Promise.all([
        api.getAlbums(), api.getArtists(), api.getPlaylists(), api.getStarred(),
      ]);
      set({ albums, artists, playlists, starred, isLoading: false });
    } catch (error) { set({ error: error.message, isLoading: false }); notify(error.message, 'error');}
  },

fetchAllSongs: async () => {
  const CACHE_KEY = 'allsongs_cache_v10';
  const CACHE_TIME_KEY = 'allsongs_cache_time_v10';
  const CACHE_DURATION = 60 * 60 * 1000;

  const cached = localStorage.getItem(CACHE_KEY);
  const cacheTime = localStorage.getItem(CACHE_TIME_KEY);

  if (cached && cacheTime && Date.now() - parseInt(cacheTime) < CACHE_DURATION) {
    const songs = JSON.parse(cached);
    set({ allSongs: songs, totalSongs: songs.length, isLoading: false, songsOffset: songs.length });
    return;
  }

  set({ isLoading: true, error: null, allSongs: [], totalSongs: 0 });

  try {
    let allTracks = [];
    const seenIds = new Set();

    // از هنرمندها بریم - مطمئن‌ترین راه
    const artists = await api.getArtists();
    
    for (const artist of artists) {
      try {
        const artistData = await api.getArtist(artist.id);
        if (artistData?.album) {
          for (const album of artistData.album) {
            try {
              const albumData = await api.getAlbum(album.id);
              if (albumData?.song) {
                albumData.song.forEach(t => {
                  if (!seenIds.has(t.id)) {
                    seenIds.add(t.id);
                    allTracks.push(t);
                  }
                });
              }
            } catch {}
          }
        }
      } catch {}
      
      // هر ۱۰ هنرمند آپدیت کن
      if (artists.indexOf(artist) % 10 === 0) {
        set({ allSongs: [...allTracks] });
      }
    }

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(allTracks));
      localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
    } catch {}

    set({ allSongs: allTracks, totalSongs: allTracks.length, songsOffset: allTracks.length, isLoading: false });
  } catch (error) {
    set({ error: error.message, isLoading: false });
  }
},

  fetchAlbums: async (sort = "newest") => {
    set({ isLoading: true });
    try {
      const albums = await api.getAlbums(sort === "newest" ? "newest" : "alphabeticalByName");
      set({ albums, isLoading: false, sortBy: sort });
    } catch (error) { set({ error: error.message, isLoading: false }); }
  },

  fetchArtists: async () => {
    set({ isLoading: true });
    try { const artists = await api.getArtists(); set({ artists, isLoading: false }); }
    catch (error) { set({ error: error.message, isLoading: false }); }
  },

  fetchPlaylists: async () => {
    set({ isLoading: true });
    try { const playlists = await api.getPlaylists(); set({ playlists, isLoading: false }); }
    catch (error) { set({ error: error.message, isLoading: false }); }
  },

fetchStarred: async () => {
  try {
    const response = await api.getStarred();
    
    const normalized = {
      track: response?.song || [],
      album: response?.album || [],
      artist: response?.artist || [],
    };
    
    set({ starred: normalized });
  } catch (error) {
    console.error("❌ Error fetching starred:", error);
    notify('t:notifications.errorFetch', 'error');
  }
},

  search: async (query) => {
    if (!query?.trim()) { set({ searchResults: null }); return; }
    set({ isLoading: true });
    try { const results = await api.search(query); set({ searchResults: results, isLoading: false }); }
    catch (error) { set({ error: error.message, isLoading: false }); }
  },

playTrack: (track, queue = null) => {
  let currentQueue;
  
  // اگه صف داری و داری یه آهنگ تکی پلی میکنی → به صف اضافه کن
  if (!queue && get().queue.length > 0) {
    currentQueue = [...get().queue, track];
    const index = currentQueue.length - 1;
    
    if ("mediaSession" in navigator && track) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title || "Unknown", artist: track.artist || "Unknown", album: track.album || "",
          artwork: track.coverArt ? [{ src: api.getCoverUrl(track.coverArt, 512), sizes: "512x512", type: "image/png" }] : []
        });
        navigator.mediaSession.setActionHandler("play", () => set({ isPlaying: true }));
        navigator.mediaSession.setActionHandler("pause", () => set({ isPlaying: false }));
        navigator.mediaSession.setActionHandler("nexttrack", () => get().playNext());
        navigator.mediaSession.setActionHandler("previoustrack", () => get().playPrevious());
      } catch {}
    }
    
    set({ currentTrack: track, queue: currentQueue, queueIndex: index, isPlaying: false });
    setTimeout(() => set({ isPlaying: true }), 50);
    notify(`🎵 ${track.title} - ${track.artist}`, 'info', 2000);
    return;
  }
  
  // حالت عادی - صف جدید
  currentQueue = queue && queue.length > 0 ? queue : [track];
  let index = currentQueue.findIndex(t => t.id === track.id);
  if (index === -1 && queue && queue.length > 0) { currentQueue.push(track); index = currentQueue.length - 1; }
  const finalIndex = Math.max(index, 0);

  if ("mediaSession" in navigator && track) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || "Unknown", artist: track.artist || "Unknown", album: track.album || "",
        artwork: track.coverArt ? [{ src: api.getCoverUrl(track.coverArt, 512), sizes: "512x512", type: "image/png" }] : []
      });
      navigator.mediaSession.setActionHandler("play", () => set({ isPlaying: true }));
      navigator.mediaSession.setActionHandler("pause", () => set({ isPlaying: false }));
      navigator.mediaSession.setActionHandler("nexttrack", () => get().playNext());
      navigator.mediaSession.setActionHandler("previoustrack", () => get().playPrevious());
    } catch {}
  }

  set({ currentTrack: track, queue: currentQueue, queueIndex: finalIndex, isPlaying: false });
  setTimeout(() => set({ isPlaying: true }), 50);
},
  playNext: () => {
    const { queue, queueIndex, repeatMode } = get();
    if (!queue.length) { set({ isPlaying: false }); return; }
    if (repeatMode === "one") { set({ isPlaying: true }); return; }
    let nextIndex = queueIndex + 1;
    if (nextIndex >= queue.length) {
      if (repeatMode === "all") nextIndex = 0;
      else { set({ isPlaying: false, currentTrack: null }); return; }
    }
    const nextTrack = queue[nextIndex];
    if (!nextTrack) { set({ isPlaying: false, currentTrack: null }); return; }
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: nextTrack.title || "Unknown", artist: nextTrack.artist || "Unknown", album: nextTrack.album || "",
          artwork: nextTrack.coverArt ? [{ src: api.getCoverUrl(nextTrack.coverArt, 512), sizes: "512x512", type: "image/png" }] : []
        });
      } catch {}
    }
    set({ currentTrack: nextTrack, queueIndex: nextIndex, isPlaying: false });
    setTimeout(() => set({ isPlaying: true }), 100);
  },

playPrevious: () => {
  const { queue, queueIndex } = get();
  if (!queue.length || queueIndex <= 0) return;
  const prevTrack = queue[queueIndex - 1];
  if (!prevTrack) return;
  set({ currentTrack: prevTrack, queueIndex: queueIndex - 1, isPlaying: false });
  setTimeout(() => set({ isPlaying: true }), 50);
},

  togglePlay: () => set(s => s.currentTrack ? { isPlaying: !s.isPlaying } : s),
  setVolume: (v) => set({ volume: v }),

  toggleShuffle: () => set(s => {
    if (s.shuffleMode) return { shuffleMode: false };
    const q = [...s.queue].sort(() => Math.random() - 0.5);
    return { shuffleMode: true, queue: q, queueIndex: q.findIndex(t => t.id === s.currentTrack?.id) || 0 };
  }),

//   shufflePlay: (tracks) => {
//   if (!tracks?.length) return;
//   const { currentTrack } = get();
//   let orderedTracks;
//   const currentIndex = tracks.findIndex(t => t.id === currentTrack?.id);
//   if (currentIndex >= 0) {
//     const current = tracks[currentIndex];
//     const rest = tracks.filter((_, i) => i !== currentIndex);
//     orderedTracks = [current, ...rest.sort(() => Math.random() - 0.5)];
//   } else {
//     orderedTracks = [...tracks].sort(() => Math.random() - 0.5);
//   }
//   get().playTrack(orderedTracks[0], orderedTracks);
// },

shufflePlay: (tracks) => {
  if (!tracks?.length) return;
  const { currentTrack } = get();
  
  let orderedTracks;
  const currentIndex = tracks.findIndex(t => t.id === currentTrack?.id);
  
  if (currentIndex >= 0) {
    const current = tracks[currentIndex];
    const rest = tracks.filter((_, i) => i !== currentIndex);
    orderedTracks = [current, ...rest.sort(() => Math.random() - 0.5)];
  } else {
    orderedTracks = [...tracks].sort(() => Math.random() - 0.5);
  }
  
  // 🔥 فقط queue رو آپدیت کن، playTrack رو صدا نزن
  const firstTrack = orderedTracks[0];
  set({
    queue: orderedTracks,
    queueIndex: 0,
    currentTrack: firstTrack,
    isPlaying: true,
    shuffleMode: true
  });
},

  cycleRepeat: () => set(s => ({
    repeatMode: s.repeatMode === "off" ? "all" : s.repeatMode === "all" ? "one" : "off"
  })),

toggleStar: async (id, albumId, artistId) => {

  try {
    // اول fetch کن starred رو
    await get().fetchStarred();
    const { starred } = get();
    
    const isTrackStarred = starred?.track?.some(t => t.id === id);
    
    if (isTrackStarred) {
      await api.unstar(id);
      notify('t:notifications.removedFromFavorites', 'warning');
    } else {
      await api.star(id);
      notify('t:notifications.addedToFavorites', 'success');
    }
    
    await get().fetchStarred();

  } catch (error) {
    console.error('❌ Error toggling star:', error);
    notify('t:notifications.errorFavorites', 'error');
  }
},

  loadEqFromConfig: () => {
  const settings = config.eqSettings;
    if (settings) {
      set({
        equalizerEnabled: settings.equalizerEnabled || false,
        equalizerBands: settings.equalizerBands || { /* default */ },
        equalizerPreset: settings.equalizerPreset || "normal",
        bassBoost: settings.bassBoost || 0,
        volumeBoost: settings.volumeBoost || 0,
        threeDEnabled: settings.threeDEnabled || false,
        threeDDepth: settings.threeDDepth || 50,
        virtualizerEnabled: settings.virtualizerEnabled || false,
        virtualizerPreset: settings.virtualizerPreset || 'studio',
      });
    }
  },
  
  saveEqToConfig: () => {
    const state = get();
    config.saveEqSettings({
      equalizerEnabled: state.equalizerEnabled,
      equalizerBands: state.equalizerBands,
      equalizerPreset: state.equalizerPreset,
      bassBoost: state.bassBoost,
      volumeBoost: state.volumeBoost,
      threeDEnabled: state.threeDEnabled,
      threeDDepth: state.threeDDepth,
      virtualizerEnabled: state.virtualizerEnabled,
      virtualizerPreset: state.virtualizerPreset,
    })
  },

  setEqualizerEnabled: (v) => set({ equalizerEnabled: v }),
  setEqualizerBand: (band, value) => set(s => ({
    equalizerBands: { ...s.equalizerBands, [band]: value },
    equalizerPreset: "custom",
  })),
  setEqualizerPreset: (preset) => {
    const presets = {
      normal: { '32':0,'64':0,'100':0,'160':0,'250':0,'400':0,'630':0,'1k':0,'1.6k':0,'2.5k':0,'4k':0,'6.3k':0,'10k':0,'16k':0 },
      bass: { '32':12,'64':10,'100':8,'160':6,'250':4,'400':2,'630':1,'1k':0,'1.6k':0,'2.5k':0,'4k':0,'6.3k':0,'10k':0,'16k':0 },
      treble: { '32':0,'64':0,'100':0,'160':0,'250':0,'400':1,'630':2,'1k':4,'1.6k':5,'2.5k':6,'4k':8,'6.3k':10,'10k':11,'16k':12 },
      pop: { '32':-1,'64':3,'100':5,'160':3,'250':0,'400':-1,'630':-2,'1k':0,'1.6k':2,'2.5k':4,'4k':5,'6.3k':5,'10k':4,'16k':3 },
      rock: { '32':5,'64':4,'100':3,'160':1,'250':0,'400':-1,'630':0,'1k':1,'1.6k':3,'2.5k':4,'4k':3,'6.3k':5,'10k':6,'16k':5 },
      jazz: { '32':3,'64':2,'100':1,'160':0,'250':-1,'400':-2,'630':-1,'1k':0,'1.6k':1,'2.5k':2,'4k':0,'6.3k':2,'10k':3,'16k':2 },
      hiphop: { '32':10,'64':8,'100':6,'160':4,'250':2,'400':0,'630':-1,'1k':0,'1.6k':1,'2.5k':0,'4k':2,'6.3k':3,'10k':4,'16k':3 },
      electronic: { '32':8,'64':6,'100':4,'160':2,'250':0,'400':-2,'630':-4,'1k':-2,'1.6k':0,'2.5k':2,'4k':4,'6.3k':6,'10k':8,'16k':10 },
      vocal: { '32':-3,'64':-2,'100':0,'160':2,'250':4,'400':5,'630':6,'1k':8,'1.6k':6,'2.5k':4,'4k':2,'6.3k':0,'10k':-1,'16k':-2 },
      acoustic: { '32':2,'64':3,'100':2,'160':1,'250':0,'400':0,'630':0,'1k':2,'1.6k':3,'2.5k':2,'4k':1,'6.3k':0,'10k':0,'16k':0 },
      piano: { '32':0,'64':1,'100':2,'160':3,'250':2,'400':1,'630':0,'1k':2,'1.6k':4,'2.5k':3,'4k':2,'6.3k':1,'10k':2,'16k':1 },
      deep: { '32':8,'64':6,'100':3,'160':0,'250':-2,'400':-4,'630':-5,'1k':-4,'1.6k':-2,'2.5k':0,'4k':2,'6.3k':4,'10k':5,'16k':6 },
    };
    set({ equalizerBands: presets[preset] || presets.normal, equalizerPreset: preset });
  },
  setBassBoost: (v) => set({ bassBoost: v }),
  setVolumeBoost: (v) => set({ volumeBoost: v }),
  setThreeDEnabled: (v) => set({ threeDEnabled: v }),
  setThreeDDepth: (v) => set({ threeDDepth: v }),
  setVirtualizerEnabled: (v) => set({ virtualizerEnabled: v }),
  setVirtualizerPreset: (preset) => set({ virtualizerPreset: preset }),

  setLanguage: (lang) => { localStorage.setItem("language", lang); set({ language: lang }); },
  addToQueue: (t) => {set(s => ({ queue: [...s.queue, t] })); notify('t:notifications.addedToQueue', 'success', 2000, { title: t.title });},
  removeFromQueue: (i) => set(s => {
    const removed = s.queue[i];
    if (removed) notify('t:notifications.removedFromQueue', 'warning', 2000, { title: removed.title });
    return { queue: s.queue.filter((_, idx) => idx !== i) }
  }),
  clearQueue: () => {
    set({ queue: [], queueIndex: -1, isPlaying: false });
    notify('t:notifications.queueCleared', 'warning');
  },
}));

export default musicStore;