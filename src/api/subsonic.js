import config from "../config";
import { notify } from "../components/Notification"; 

class SubsonicAPI {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 دقیقه
    this.pendingRequests = new Map(); // جلوگیری از درخواست‌های تکراری همزمان
  }

  // کش هوشمند
  async cachedRequest(key, fetchFn) {
    // اگه تو کش هست و منقضی نشده
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.time < this.cacheTimeout) {
      return cached.data;
    }

    // اگه درخواست مشابهی در حال انجامه، منتظر بمون
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // درخواست جدید
    const promise = fetchFn().then(data => {
      this.cache.set(key, { data, time: Date.now() });
      this.pendingRequests.delete(key);
      
      // پاکسازی کش‌های قدیمی
      if (this.cache.size > 200) {
        const oldest = [...this.cache.entries()]
          .sort((a, b) => a[1].time - b[1].time)[0];
        if (oldest) this.cache.delete(oldest[0]);
      }
      
      return data;
    }).catch(err => {
      this.pendingRequests.delete(key);
      throw err;
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  clearCache(pattern = null) {
    if (pattern) {
      [...this.cache.keys()].forEach(key => {
        if (key.includes(pattern)) this.cache.delete(key);
      });
    } else {
      this.cache.clear();
    }
  }

  async request(endpoint, params = {}) {
    const { server, username, password } = config.getAuth();

    if (!server || !username || !password) {
      throw new Error("اطلاعات اتصال تنظیم نشده است");
    }

    const url = new URL(`${server}/rest/${endpoint}`);

    const defaultParams = {
      u: username,
      p: password,
      v: "1.16.1",
      c: "NavidromePlayer",
      f: "json",
    };

    const allParams = { ...defaultParams, ...params };

    Object.entries(allParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    try {
      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();

      if (data["subsonic-response"].status === "failed") {
        const errorMsg =
          data["subsonic-response"].error?.message || "خطای ناشناخته";
        throw new Error(errorMsg);
      }

      return data["subsonic-response"];
    } catch (error) {
      console.error("API Error:", error);
      if (error.message.includes('تنظیم نشده')) {
        notify(error.message, 'warning'); // 🔥
      } else {
        notify('t:notifications.errorConnection', 'error');
      }
      throw error;
    }
  }

  async getUser(username) {
    const response = await this.request('getUser', { username });
    return response.user;
  }

  // آرتیست‌ها - کش میشن
  async getArtists() {
    return this.cachedRequest('artists', async () => {
      const response = await this.request("getArtists");
      const indexes = response.artists?.index || [];
      const artists = [];
      indexes.forEach((index) => {
        if (index.artist) artists.push(...index.artist);
      });
      return artists;
    });
  }

  async getArtist(id) {
    return this.cachedRequest(`artist_${id}`, () => 
      this.request("getArtist", { id }).then(r => r.artist)
    );
  }

  // آلبوم‌ها - کش میشن
  async getAlbums(type = 'newest', size = 50, offset = 0) {
    return this.cachedRequest(`albums_${type}_${size}_${offset}`, () => 
      this.request('getAlbumList2', { type, size, offset })
        .then(r => r.albumList2?.album || [])
    );
  }

  async getAlbum(id) {
    return this.cachedRequest(`album_${id}`, () => 
      this.request("getAlbum", { id }).then(r => r.album)
    );
  }

  // آهنگ‌ها
  async getSongs(size = 30, offset = 0) {
    return this.cachedRequest(`songs_${size}_${offset}`, () =>
      this.request('getSongs', { size, offset })
        .then(r => r.songs?.song || [])
    );
  }

  async getSongsCount() {
    try {
      const albums = await this.getAlbums('alphabeticalByName', 1, 0);
      return albums.length > 0 ? 2700 : 0;
    } catch {
      return 0;
    }
  }

  async getRandomSongs(size = 50, genre, fromYear, toYear) {
    return this.request("getRandomSongs", { size, genre, fromYear, toYear })
      .then(r => r.randomSongs?.song || []);
  }

  async getSong(id) {
    return this.cachedRequest(`song_${id}`, () =>
      this.request("getSong", { id }).then(r => r.song)
    );
  }

  // پلی‌لیست‌ها
  async getPlaylists() {
    return this.cachedRequest('playlists', () =>
      this.request("getPlaylists")
        .then(r => r.playlists?.playlist || [])
    );
  }

  async getPlaylist(id) {
    return this.cachedRequest(`playlist_${id}`, () =>
      this.request("getPlaylist", { id }).then(r => r.playlist)
    );
  }

  async createPlaylist(name, songId = []) {
    this.clearCache('playlist');
    const params = { name };
    if (songId.length > 0) params.songId = songId;
    return this.request("createPlaylist", params).then(r => r.playlist);
  }

  async updatePlaylist(playlistId, name, comment, isPublic = true, songIdToAdd = [], songIndexToRemove = []) {
    this.clearCache('playlist');
    const params = { playlistId };
    if (name) params.name = name;
    if (comment) params.comment = comment;
    if (isPublic !== undefined) params.public = isPublic;
    if (songIdToAdd.length > 0) params.songIdToAdd = songIdToAdd;
    if (songIndexToRemove.length > 0) params.songIndexToRemove = songIndexToRemove;
    return this.request("updatePlaylist", params);
  }

  async deletePlaylist(id) {
    this.clearCache('playlist');
    return this.request("deletePlaylist", { id });
  }

  // جستجو
  async search(query, artistCount = 20, artistOffset = 0, albumCount = 20, albumOffset = 0, songCount = 20, songOffset = 0) {
    return this.cachedRequest(`search_${query}_${artistCount}_${albumCount}_${songCount}`, () =>
      this.request("search3", { query, artistCount, artistOffset, albumCount, albumOffset, songCount, songOffset })
        .then(r => r.searchResult3)
    );
  }

  // علاقه‌مندی‌ها
  async getStarred() {
    return this.cachedRequest('starred', () =>
      this.request("getStarred2").then(r => r.starred2)
    );
  }

  async star(id, albumId, artistId) {
    this.clearCache('starred');
    const params = {};
    if (id) params.id = id;
    if (albumId) params.albumId = albumId;
    if (artistId) params.artistId = artistId;
    return this.request("star", params);
  }

  async unstar(id, albumId, artistId) {
    this.clearCache('starred');
    const params = {};
    if (id) params.id = id;
    if (albumId) params.albumId = albumId;
    if (artistId) params.artistId = artistId;
    return this.request("unstar", params);
  }

  // اسکروبل
  async scrobble(id, time, submission = true) {
    return this.request("scrobble", { id, time, submission });
  }

  async getArtistInfo2(id, count = 10, includeNotPresent = false) {
    return this.cachedRequest(`artistInfo2_${id}`, () =>
      this.request('getArtistInfo2', { id, count, includeNotPresent })
        .then(r => r.artistInfo2)
    );
  }

  async getTopSongs(artist, count = 10) {
    return this.cachedRequest(`topSongs_${artist}_${count}`, () =>
      this.request('getTopSongs', { artist, count })
        .then(r => r.topSongs?.song || [])
    );
  }

  async getSongsByGenre(genre, count = 50, offset = 0) {
    return this.cachedRequest(`songsByGenre_${genre}_${count}_${offset}`, () =>
      this.request('getSongsByGenre', { genre, count, offset })
        .then(r => r.songsByGenre?.song || [])
    );
  }

  async getGenres() {
    return this.cachedRequest('genres', () =>
      this.request("getGenres").then(r => r.genres?.genre || [])
    );
  }

  // این متد کش نمیشه - حجمش زیاده
  async getAllSongsFromAlbums(onProgress) {
    const allTracks = [];
    const seenIds = new Set();
    const albums = await this.getAlbums('alphabeticalByName', 500);
    
    for (let i = 0; i < albums.length; i++) {
      const album = albums[i];
      if (onProgress) onProgress(i + 1, albums.length, album.name);
      
      try {
        const albumData = await this.getAlbum(album.id);
        if (albumData?.song) {
          albumData.song.forEach(track => {
            if (!seenIds.has(track.id)) {
              seenIds.add(track.id);
              allTracks.push(track);
            }
          });
        }
      } catch (e) {
        notify('t:subsonic.skipalbum', 'warning', 2000, album.name)
      }
    }
    return allTracks;
  }

  // لینک‌های استریم و کاور (بدون کش)
  getStreamUrl(id, maxBitRate, format) {
    const { server, username, password } = config.getAuth();
    let url = `${server}/rest/stream?id=${id}&u=${encodeURIComponent(username)}&p=${encodeURIComponent(password)}&v=1.16.1&c=NavidromePlayer`;
    if (maxBitRate) url += `&maxBitRate=${maxBitRate}`;
    if (format) url += `&format=${format}`;
    return url;
  }

  getCoverUrl(id, size = 300) {
    if (!id) return '';
    const { server, username, password } = config.getAuth();
    if (!server || !username || !password) return '';
    return `${server}/rest/getCoverArt?id=${id}&size=${size}&u=${encodeURIComponent(username)}&p=${encodeURIComponent(password)}&v=1.16.1&c=NavidromePlayer`;
  }

  async ping() {
    return this.request("ping").then(r => r.status === "ok");
  }
}

const api = new SubsonicAPI();
export default api;