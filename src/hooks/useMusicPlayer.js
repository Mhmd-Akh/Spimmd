import { useEffect, useRef } from 'react';
import api from '../api/subsonic';
import musicStore from '../store/musicStore';
import { notify } from "../components/Notification";

let globalAudio = null;
let audioCtx = null;
let gainNode = null;
let bassBoost = null;
let eqNodes = [];
let panner = null;
let convolver = null;
let dryGain = null;
let wetGain = null;
let virtualizerConvolver = null;
let virtualizerDryGain = null;
let virtualizerWetGain = null;
let eightDRotation = null;
let endedCheckInterval = null;

export function getGlobalAudio() {
  if (!globalAudio) {
    globalAudio = new Audio();
    globalAudio.crossOrigin = 'anonymous';
    globalAudio.preload = 'auto';
  }
  return globalAudio;
}

function setupAudioContext() {
  if (audioCtx) return;
  
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContext();

  const freqs = [32, 64, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300, 10000, 16000];
  const keys = ['32', '64', '100', '160', '250', '400', '630', '1k', '1.6k', '2.5k', '4k', '6.3k', '10k', '16k'];

  gainNode = audioCtx.createGain();
  gainNode.gain.value = 1.0;

  bassBoost = audioCtx.createBiquadFilter();
  bassBoost.type = 'lowshelf';
  bassBoost.frequency.value = 80;
  bassBoost.gain.value = 0;

  eqNodes = freqs.map((freq, i) => {
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'peaking';
    filter.frequency.value = freq;
    filter.Q.value = 2.0;
    filter.gain.value = 0;
    return { filter, key: keys[i] };
  });

  panner = audioCtx.createStereoPanner();
  panner.pan.value = 0;

  // 8D convolver + dry/wet
  convolver = audioCtx.createConvolver();
  dryGain = audioCtx.createGain();
  wetGain = audioCtx.createGain();
  dryGain.gain.value = 0.7;
  wetGain.gain.value = 0.3;

  const sampleRate = audioCtx.sampleRate;
  const length = Math.floor(sampleRate * 1.5);
  const impulse = audioCtx.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / sampleRate * 2.5);
    }
  }
  convolver.buffer = impulse;

  // Virtualizer
  virtualizerConvolver = audioCtx.createConvolver();
  virtualizerDryGain = audioCtx.createGain();
  virtualizerWetGain = audioCtx.createGain();
  virtualizerDryGain.gain.value = 1.0;
  virtualizerWetGain.gain.value = 0.0;

  // زنجیره
  bassBoost.connect(eqNodes[0].filter);
  for (let i = 0; i < eqNodes.length - 1; i++) {
    eqNodes[i].filter.connect(eqNodes[i + 1].filter);
  }
  eqNodes[eqNodes.length - 1].filter.connect(panner);
  
  panner.connect(dryGain);
  panner.connect(convolver);
  convolver.connect(wetGain);
  
  dryGain.connect(virtualizerDryGain);
  wetGain.connect(virtualizerDryGain);
  dryGain.connect(virtualizerConvolver);
  wetGain.connect(virtualizerConvolver);
  virtualizerConvolver.connect(virtualizerWetGain);
  
  virtualizerDryGain.connect(gainNode);
  virtualizerWetGain.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  try {
    const source = audioCtx.createMediaElementSource(globalAudio);
    source.connect(bassBoost);
  } catch (e) {}
}

function loadVirtualizerImpulse(preset) {
  if (!audioCtx || !virtualizerConvolver) return;
  const sampleRate = audioCtx.sampleRate;
  let length, decay;
  switch(preset) {
    case 'studio': length = Math.floor(sampleRate * 0.3); decay = 15; break;
    case 'hall': length = Math.floor(sampleRate * 1.5); decay = 3; break;
    case 'club': length = Math.floor(sampleRate * 2.0); decay = 2; break;
    case 'arena': length = Math.floor(sampleRate * 3.0); decay = 1.2; break;
    case 'cave': length = Math.floor(sampleRate * 1.8); decay = 4; break;
    case 'forest': length = Math.floor(sampleRate * 2.5); decay = 2.5; break;
    default: length = Math.floor(sampleRate * 0.3); decay = 15;
  }
  const impulse = audioCtx.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / sampleRate * decay);
    }
  }
  virtualizerConvolver.buffer = impulse;
}

function startEightDRotation() {
  stopEightDRotation();
  let angle = 0;
  const depth = musicStore.getState().threeDDepth || 50;
  const baseSpeed = 0.08;
  const speed = baseSpeed * (0.5 + (depth / 100) * 0.5);
  
  eightDRotation = setInterval(() => {
    if (!panner || !audioCtx) return;
    const state = musicStore.getState();
    if (!state.threeDEnabled || !state.isPlaying) return;
    angle += speed;
    const pan = Math.sin(angle) * (state.threeDDepth / 100);
    panner.pan.setTargetAtTime(pan, audioCtx.currentTime, 0.05);
  }, 50);
}

function stopEightDRotation() {
  if (eightDRotation) { clearInterval(eightDRotation); eightDRotation = null; }
}

function applyAllSettings(state) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  if (state.equalizerBands) {
    eqNodes.forEach(({ filter, key }) => {
      if (filter) {
        filter.gain.setTargetAtTime(state.equalizerEnabled ? (state.equalizerBands[key] || 0) : 0, now, 0.015);
      }
    });
  }

  if (bassBoost && state.bassBoost !== undefined) {
    bassBoost.gain.setTargetAtTime(state.bassBoost, now, 0.015);
  }

  if (gainNode && state.volumeBoost !== undefined) {
    const vb = state.volumeBoost || 0;
    gainNode.gain.setTargetAtTime(Math.max(0.1, Math.min(5, 1 + (vb / 100) * 2)), now, 0.015);
  }

  // 8D
  if (state.threeDEnabled) {
    if (dryGain && wetGain) {
      const depth = (state.threeDDepth || 50) / 100;
      dryGain.gain.setTargetAtTime(0.6 - depth * 0.3, now, 0.05);
      wetGain.gain.setTargetAtTime(0.4 + depth * 0.3, now, 0.05);
    }
    startEightDRotation();
  } else {
    if (dryGain && wetGain) {
      dryGain.gain.setTargetAtTime(1.0, now, 0.05);
      wetGain.gain.setTargetAtTime(0.0, now, 0.05);
    }
    stopEightDRotation();
    if (panner) panner.pan.setTargetAtTime(0, now, 0.05);
  }

  // Virtualizer
  if (state.virtualizerEnabled) {
    if (virtualizerDryGain && virtualizerWetGain) {
      virtualizerDryGain.gain.setTargetAtTime(0.3, now, 0.05);
      virtualizerWetGain.gain.setTargetAtTime(0.7, now, 0.05);
    }
    loadVirtualizerImpulse(state.virtualizerPreset);
  } else {
    if (virtualizerDryGain && virtualizerWetGain) {
      virtualizerDryGain.gain.setTargetAtTime(1.0, now, 0.05);
      virtualizerWetGain.gain.setTargetAtTime(0.0, now, 0.05);
    }
  }
}

function startEndedCheck(audio) {
  stopEndedCheck();
  endedCheckInterval = setInterval(() => {
    if (audio && audio.duration && !audio.paused) {
      if (audio.ended || (audio.currentTime >= audio.duration - 0.1 && audio.duration > 0)) {
        stopEndedCheck();
        stopEightDRotation();
        const state = musicStore.getState();
        if (state.repeatMode === 'one') {
          audio.currentTime = 0;
          audio.play().catch(() => {});
          startEndedCheck(audio);
        } else {
          state.playNext();
        }
      }
    }
  }, 500);
}

function stopEndedCheck() {
  if (endedCheckInterval) { clearInterval(endedCheckInterval); endedCheckInterval = null; }
}

export default function useMusicPlayer() {
  const isSetup = useRef(false);

  useEffect(() => {
    if (isSetup.current) return;
    isSetup.current = true;

    const audio = getGlobalAudio();
    globalAudio = audio;

    audio.addEventListener('play', () => {
      setupAudioContext();
      if (audioCtx?.state === 'suspended') audioCtx.resume().then(() => applyAllSettings(musicStore.getState()));
      applyAllSettings(musicStore.getState());
      startEndedCheck(audio);
    });

    audio.addEventListener('pause', () => { stopEndedCheck(); stopEightDRotation(); });

    audio.addEventListener('ended', () => {
      stopEndedCheck();
      stopEightDRotation();
      const state = musicStore.getState();
      if (state.repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        startEndedCheck(audio);
      } else {
        state.playNext();
      }
    });

    audio.addEventListener('error', () => {
      stopEndedCheck();
      stopEightDRotation();
      const state = musicStore.getState();
      if (state.currentTrack) setTimeout(() => state.playNext(), 1500);
    });

    audio.volume = musicStore.getState().volume;

    return () => {
      stopEndedCheck();
      stopEightDRotation();
      audio.pause();
      audio.src = '';
    };
  }, []);

  useEffect(() => {
    const audio = getGlobalAudio();
    const unsubscribe = musicStore.subscribe((state, prevState) => {
      if (state.currentTrack?.id !== prevState.currentTrack?.id) {
        if (state.currentTrack) { audio.src = api.getStreamUrl(state.currentTrack.id); audio.load(); }
      }
      if (state.isPlaying !== prevState.isPlaying && state.currentTrack) {
        if (state.isPlaying) {
          if (audioCtx?.state === 'suspended') audioCtx.resume();
          audio.play().then(() => {
            if (!musicStore.getState().isPlaying) musicStore.setState({ isPlaying: true });
            startEndedCheck(audio);
          }).catch(() => {
            musicStore.setState({ isPlaying: false }); 
            notify('t:notifications.errorPlayback', 'error');
          });
        } else { audio.pause(); stopEndedCheck(); stopEightDRotation(); }
      }
      if (state.volume !== prevState.volume) audio.volume = state.volume;
      applyAllSettings(state);
    });
    audio.volume = musicStore.getState().volume;
    return () => unsubscribe();
  }, []);

  return getGlobalAudio();
}