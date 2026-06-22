import config from "./config";
import Login from "./components/Login";
import Layout from "./components/Layout";
import Settings from "./components/Settings";
import AllSongs from "./components/AllSongs";
import { notify } from "./components/Notification";
import Notification from "./components/Notification";
import UpdateNotification from './components/UpdateNotification';

import HomePage from "./pages/HomePage";
import AlbumPage from "./pages/AlbumPage";
import GenresPage from "./pages/GenresPage";
import ArtistPage from "./pages/ArtistPage";
import SearchPage from "./pages/SearchPage";
import OfflinePage from "./pages/OfflinePage";
import LibraryPage from "./pages/LibraryPage";
import PlaylistPage from "./pages/PlaylistPage";
import FavoritesPage from "./pages/FavoritesPage";

import musicStore from "./store/musicStore";
import useMusicPlayer from "./hooks/useMusicPlayer";


import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const { i18n } = useTranslation();

  useMusicPlayer();

  useEffect(() => {
    checkLogin();

    const lang = localStorage.getItem("language") || "fa";
    i18n.changeLanguage(lang);
    document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, []);

  const checkLogin = async () => {
    setIsChecking(true);
    await config.load();
    if (!config.isConfigured()) {
      setIsLoggedIn(false);
      setIsChecking(false);
      return;
    }

    if (config.isExpired()) {
      setIsLoggedIn('expired');
      setIsChecking(false);
      return;
    }

    try {
      const { server, username, password } = config.getAuth();
      const response = await fetch(
        `${server}/rest/ping?u=${encodeURIComponent(username)}&p=${encodeURIComponent(password)}&v=1.16.1&c=NavidromePlayer&f=json`,
      );
      const data = await response.json();

      if (data["subsonic-response"]?.status === "ok") {
        setIsLoggedIn(true);
        musicStore.getState().setLoggedIn(true);
         musicStore.getState().loadEqFromConfig();
      } else {
        config.logout();
        setIsLoggedIn(false);
      }
    } catch (error) {
      if (error.message.includes("Failed to fetch")) {
        setIsLoggedIn(true);
         musicStore.getState().loadEqFromConfig();
      } else {
        config.logout();
        setIsLoggedIn(false);
        notify('ارتباط با سرور قطع شد', 'error');
      }
    }

    setIsChecking(false);
  };

  const handleLogin = () => {
  setIsLoggedIn(true);
  musicStore.getState().setLoggedIn(true);
  musicStore.getState().loadEqFromConfig();
  };

  const handleLogout = () => {
    config.logout();
    setIsLoggedIn(false);
    musicStore.getState().setLoggedIn(false);
  };

  if (isChecking) {
    return (
      <div className="fullscreen-center">
        <div className="loading-content">
          <div className="loading-animation">🎵</div>
          <h2>Spimmd Player</h2>
          <p>در حال اتصال...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || isLoggedIn === 'expired') {
    return (
      <div className="fullscreen-center login-screen">
        <Login
          onLogin={handleLogin}
          expiredMode={isLoggedIn === 'expired'}
          savedServer={config.server}
          savedUsername={config.username}
        />
      </div>
    );
  }

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Layout onLogout={handleLogout}>
        <Notification />
        <UpdateNotification />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/genres" element={<GenresPage />} />
          <Route path="/all-songs" element={<AllSongs />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/album/:id" element={<AlbumPage />} />
          <Route path="/offline" element={<OfflinePage />} />
          <Route path="/artist/:id" element={<ArtistPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/liked-songs" element={<FavoritesPage />} />
          <Route path="/playlist/:id" element={<PlaylistPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}