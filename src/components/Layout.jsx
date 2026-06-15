import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import PlayerBar from './PlayerBar';
import Queue from './Queue';
import MobilePlayer from './MobilePlayer';
import MiniPlayer from './MiniPlayer';
import musicStore from '../store/musicStore';

export default function Layout({ children, onLogout }) {
  const [showMobilePlayer, setShowMobilePlayer] = useState(false);
  const { currentTrack } = musicStore();
  const location = useLocation();

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <TopBar onLogout={onLogout} />
        <div className="content-wrapper" key={location.pathname}>{children}</div>
      </main>
      <PlayerBar />
      {currentTrack && <MiniPlayer onClick={() => setShowMobilePlayer(true)} />}
      <MobilePlayer show={showMobilePlayer} onClose={() => setShowMobilePlayer(false)} />
      <Queue />
      <BottomNav />
    </div>
  );
}