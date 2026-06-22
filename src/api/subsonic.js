import config from "../config";
import { notify } from "../components/Notification";

class SubsonicAPI {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000;
    this.pendingRequests = new Map();
  }

  async cachedRequest(key, fetchFn) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.time < this.cacheTimeout)
      return cached.data;
    if (this.pendingRequests.has(key)) return this.pendingRequests.get(key);
    const promise = fetchFn()
      .then((data) => {
        this.cache.set(key, { data, time: Date.now() });
        this.pendingRequests.delete(key);
        if (this.cache.size > 200) {
          const oldest = [...this.cache.entries()].sort(
            (a, b) => a[1].time - b[1].time,
          )[0];
          if (oldest) this.cache.delete(oldest[0]);
        }
        return data;
      })
      .catch((err) => {
        this.pendingRequests.delete(key);
        throw err;
      });
    this.pendingRequests.set(key, promise);
    return promise;
  }

  clearCache(pattern = null) {
    if (pattern)
      [...this.cache.keys()].forEach((k) => {
        if (k.includes(pattern)) this.cache.delete(k);
      });
    else this.cache.clear();
  }

  async request(endpoint, params = {}) {
    const { server, username, password } = config.getAuth();
    if (!server || !username || !password)
      throw new Error("اطلاعات اتصال تنظیم نشده است");
    const url = new URL(`${server}/rest/${endpoint}`);
    const def = {
      u: username,
      p: password,
      v: "1.16.1",
      c: "NavidromePlayer",
      f: "json",
    };
    const all = { ...def, ...params };
    Object.entries(all).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
    });
    try {
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data["subsonic-response"].status === "failed")
        throw new Error(data["subsonic-response"].error?.message || "خطا");
      return data["subsonic-response"];
    } catch (e) {
      console.error("API:", e);
      throw e;
    }
  }

  async getUser(username) {
    return (await this.request("getUser", { username })).user;
  }
  async getArtists() {
    return this.cachedRequest("artists", async () => {
      const r = await this.request("getArtists");
      return (r.artists?.index || []).flatMap((i) => i.artist || []);
    });
  }
  async getArtist(id) {
    return this.cachedRequest(
      `artist_${id}`,
      async () => (await this.request("getArtist", { id })).artist,
    );
  }
  async getAlbums(type = "newest", size = 50, offset = 0) {
    return this.cachedRequest(
      `albums_${type}_${size}_${offset}`,
      async () =>
        (await this.request("getAlbumList2", { type, size, offset })).albumList2
          ?.album || [],
    );
  }
  async getAlbum(id) {
    return this.cachedRequest(
      `album_${id}`,
      async () => (await this.request("getAlbum", { id })).album,
    );
  }
  async getSongs(size = 30, offset = 0) {
    return this.cachedRequest(
      `songs_${size}_${offset}`,
      async () =>
        (await this.request("getSongs", { size, offset })).songs?.song || [],
    );
  }
  async getSongsCount() {
    try {
      return (await this.getAlbums("alphabeticalByName", 1, 0)).length > 0
        ? 2700
        : 0;
    } catch {
      return 0;
    }
  }
  async getRandomSongs(size = 50, genre, fromYear, toYear) {
    return (
      (await this.request("getRandomSongs", { size, genre, fromYear, toYear }))
        .randomSongs?.song || []
    );
  }
  async getSong(id) {
    return this.cachedRequest(
      `song_${id}`,
      async () => (await this.request("getSong", { id })).song,
    );
  }
  async getPlaylists() {
    return this.cachedRequest(
      "playlists",
      async () =>
        (await this.request("getPlaylists")).playlists?.playlist || [],
    );
  }
  async getPlaylist(id) {
    return this.cachedRequest(
      `playlist_${id}`,
      async () => (await this.request("getPlaylist", { id })).playlist,
    );
  }
  async createPlaylist(name, songId = []) {
    this.clearCache("playlist");
    return (
      await this.request("createPlaylist", {
        name,
        ...(songId.length && { songId }),
      })
    ).playlist;
  }
  async updatePlaylist(
    playlistId,
    name,
    comment,
    isPublic = true,
    songIdToAdd = [],
    songIndexToRemove = [],
  ) {
    this.clearCache("playlist");
    return this.request("updatePlaylist", {
      playlistId,
      name,
      comment,
      public: isPublic,
      ...(songIdToAdd.length && { songIdToAdd }),
      ...(songIndexToRemove.length && { songIndexToRemove }),
    });
  }
  async deletePlaylist(id) {
    this.clearCache("playlist");
    return this.request("deletePlaylist", { id });
  }
  async search(
    query,
    artistCount = 20,
    artistOffset = 0,
    albumCount = 20,
    albumOffset = 0,
    songCount = 20,
    songOffset = 0,
  ) {
    return this.cachedRequest(
      `search_${query}`,
      async () =>
        (
          await this.request("search3", {
            query,
            artistCount,
            artistOffset,
            albumCount,
            albumOffset,
            songCount,
            songOffset,
          })
        ).searchResult3,
    );
  }
  async getStarred() {
    return this.cachedRequest(
      "starred",
      async () => (await this.request("getStarred2")).starred2,
    );
  }
  async star(id, albumId, artistId) {
    this.clearCache("starred");
    return this.request("star", { id, albumId, artistId });
  }
  async unstar(id, albumId, artistId) {
    this.clearCache("starred");
    return this.request("unstar", { id, albumId, artistId });
  }
  async scrobble(id, time, submission = true) {
    return this.request("scrobble", { id, time, submission });
  }
  async getArtistInfo2(id, count = 10, includeNotPresent = false) {
    return this.cachedRequest(
      `artistInfo2_${id}`,
      async () =>
        (await this.request("getArtistInfo2", { id, count, includeNotPresent }))
          .artistInfo2,
    );
  }
  async getTopSongs(artist, count = 10) {
    return this.cachedRequest(
      `topSongs_${artist}`,
      async () =>
        (await this.request("getTopSongs", { artist, count })).topSongs?.song ||
        [],
    );
  }
  async getSongsByGenre(genre, count = 50, offset = 0) {
    return this.cachedRequest(
      `songsByGenre_${genre}`,
      async () =>
        (await this.request("getSongsByGenre", { genre, count, offset }))
          .songsByGenre?.song || [],
    );
  }
  async getGenres() {
    return this.cachedRequest(
      "genres",
      async () => (await this.request("getGenres")).genres?.genre || [],
    );
  }

  async getAllSongsFromAlbums(onProgress) {
    const all = [];
    const seen = new Set();
    const albums = await this.getAlbums("alphabeticalByName", 500);
    for (let i = 0; i < albums.length; i++) {
      if (onProgress) onProgress(i + 1, albums.length, albums[i].name);
      try {
        const d = await this.getAlbum(albums[i].id);
        if (d?.song)
          d.song.forEach((t) => {
            if (!seen.has(t.id)) {
              seen.add(t.id);
              all.push(t);
            }
          });
      } catch {
        notify("t:subsonic.skipalbum", "warning", 2000, albums[i].name);
      }
    }
    return all;
  }

  getStreamUrl(id, maxBitRate, format) {
    const { server, username, password } = config.getAuth();
    if (!server || !username || !password || !id) return "";
    let u = `${server}/rest/stream?id=${id}&u=${encodeURIComponent(username)}&p=${encodeURIComponent(password)}&v=1.16.1&c=NavidromePlayer`;
    if (maxBitRate) u += `&maxBitRate=${maxBitRate}`;
    if (format) u += `&format=${format}`;
    return u;
  }

  getCoverUrl(id, size = 300) {
    if (!id) return "";
    const { server, username, password } = config.getAuth();
    if (!server || !username || !password) return "";
    return `${server}/rest/getCoverArt?id=${id}&size=${size}&u=${encodeURIComponent(username)}&p=${encodeURIComponent(password)}&v=1.16.1&c=NavidromePlayer`;
  }

  async ping() {
    try {
      return (await this.request("ping")).status === "ok";
    } catch {
      return false;
    }
  }
}

const api = new SubsonicAPI();
export default api;
