import { useEffect, useRef } from "react";
import api from "../api/subsonic";
import musicStore from "../store/musicStore";

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
    globalAudio.crossOrigin = "anonymous";
    globalAudio.preload = "auto";
  }
  return globalAudio;
}

function setupAudioContext() {
  if (audioCtx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AC();
  const fqs = [
    32, 64, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300, 10000, 16000,
  ];
  const ks = [
    "32",
    "64",
    "100",
    "160",
    "250",
    "400",
    "630",
    "1k",
    "1.6k",
    "2.5k",
    "4k",
    "6.3k",
    "10k",
    "16k",
  ];
  gainNode = audioCtx.createGain();
  gainNode.gain.value = 1;
  bassBoost = audioCtx.createBiquadFilter();
  bassBoost.type = "lowshelf";
  bassBoost.frequency.value = 80;
  bassBoost.gain.value = 0;
  eqNodes = fqs.map((f, i) => {
    const fl = audioCtx.createBiquadFilter();
    fl.type = "peaking";
    fl.frequency.value = f;
    fl.Q.value = 2;
    fl.gain.value = 0;
    return { filter: fl, key: ks[i] };
  });
  panner = audioCtx.createStereoPanner();
  panner.pan.value = 0;
  convolver = audioCtx.createConvolver();
  dryGain = audioCtx.createGain();
  wetGain = audioCtx.createGain();
  dryGain.gain.value = 0.7;
  wetGain.gain.value = 0.3;
  const sr = audioCtx.sampleRate;
  const len = Math.floor(sr * 1.5);
  const imp = audioCtx.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const d = imp.getChannelData(c);
    for (let i = 0; i < len; i++)
      d[i] = (Math.random() * 2 - 1) * Math.exp((-i / sr) * 2.5);
  }
  convolver.buffer = imp;
  virtualizerConvolver = audioCtx.createConvolver();
  virtualizerDryGain = audioCtx.createGain();
  virtualizerWetGain = audioCtx.createGain();
  virtualizerDryGain.gain.value = 1;
  virtualizerWetGain.gain.value = 0;
  bassBoost.connect(eqNodes[0].filter);
  for (let i = 0; i < eqNodes.length - 1; i++)
    eqNodes[i].filter.connect(eqNodes[i + 1].filter);
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
    audioCtx.createMediaElementSource(globalAudio).connect(bassBoost);
  } catch {}
}

function loadVirtualizerImpulse(p) {
  if (!audioCtx || !virtualizerConvolver) return;
  const sr = audioCtx.sampleRate;
  let l, d;
  switch (p) {
    case "studio":
      l = Math.floor(sr * 0.3);
      d = 15;
      break;
    case "hall":
      l = Math.floor(sr * 1.5);
      d = 3;
      break;
    case "club":
      l = Math.floor(sr * 2);
      d = 2;
      break;
    case "arena":
      l = Math.floor(sr * 3);
      d = 1.2;
      break;
    case "cave":
      l = Math.floor(sr * 1.8);
      d = 4;
      break;
    case "forest":
      l = Math.floor(sr * 2.5);
      d = 2.5;
      break;
    default:
      l = Math.floor(sr * 0.3);
      d = 15;
  }
  const imp = audioCtx.createBuffer(2, l, sr);
  for (let c = 0; c < 2; c++) {
    const dt = imp.getChannelData(c);
    for (let i = 0; i < l; i++)
      dt[i] = (Math.random() * 2 - 1) * Math.exp((-i / sr) * d);
  }
  virtualizerConvolver.buffer = imp;
}

function start8D() {
  stop8D();
  let a = 0;
  const dp = musicStore.getState().threeDDepth || 50;
  const sp = 0.08 * (0.5 + dp / 200);
  eightDRotation = setInterval(() => {
    if (!panner || !audioCtx) return;
    const s = musicStore.getState();
    if (!s.threeDEnabled || !s.isPlaying) return;
    a += sp;
    panner.pan.setTargetAtTime(
      Math.sin(a) * (s.threeDDepth / 100),
      audioCtx.currentTime,
      0.05,
    );
  }, 50);
}
function stop8D() {
  if (eightDRotation) {
    clearInterval(eightDRotation);
    eightDRotation = null;
  }
}

function applySettings(s) {
  if (!audioCtx) return;
  const n = audioCtx.currentTime;
  if (s.equalizerBands)
    eqNodes.forEach(({ filter, key }) => {
      if (filter)
        filter.gain.setTargetAtTime(
          s.equalizerEnabled ? s.equalizerBands[key] || 0 : 0,
          n,
          0.015,
        );
    });
  if (bassBoost && s.bassBoost !== undefined)
    bassBoost.gain.setTargetAtTime(s.bassBoost, n, 0.015);
  if (gainNode && s.volumeBoost !== undefined)
    gainNode.gain.setTargetAtTime(
      Math.max(0.1, Math.min(5, 1 + (s.volumeBoost / 100) * 2)),
      n,
      0.015,
    );
  if (s.threeDEnabled) {
    if (dryGain && wetGain) {
      const dp = (s.threeDDepth || 50) / 100;
      dryGain.gain.setTargetAtTime(0.6 - dp * 0.3, n, 0.05);
      wetGain.gain.setTargetAtTime(0.4 + dp * 0.3, n, 0.05);
    }
    start8D();
  } else {
    if (dryGain && wetGain) {
      dryGain.gain.setTargetAtTime(1, n, 0.05);
      wetGain.gain.setTargetAtTime(0, n, 0.05);
    }
    stop8D();
    if (panner) panner.pan.setTargetAtTime(0, n, 0.05);
  }
  if (s.virtualizerEnabled) {
    if (virtualizerDryGain && virtualizerWetGain) {
      virtualizerDryGain.gain.setTargetAtTime(0.3, n, 0.05);
      virtualizerWetGain.gain.setTargetAtTime(0.7, n, 0.05);
    }
    loadVirtualizerImpulse(s.virtualizerPreset);
  } else {
    if (virtualizerDryGain && virtualizerWetGain) {
      virtualizerDryGain.gain.setTargetAtTime(1, n, 0.05);
      virtualizerWetGain.gain.setTargetAtTime(0, n, 0.05);
    }
  }
}

function startEndedCheck(a) {
  stopEndedCheck();
  endedCheckInterval = setInterval(() => {
    if (
      a &&
      a.duration &&
      !a.paused &&
      (a.ended || (a.currentTime >= a.duration - 0.1 && a.duration > 0))
    ) {
      stopEndedCheck();
      stop8D();
      const s = musicStore.getState();
      if (s.repeatMode === "one") {
        a.currentTime = 0;
        a.play().catch(() => {});
        startEndedCheck(a);
      } else s.playNext();
    }
  }, 500);
}
function stopEndedCheck() {
  if (endedCheckInterval) {
    clearInterval(endedCheckInterval);
    endedCheckInterval = null;
  }
}

export default function useMusicPlayer() {
  const init = useRef(false);
  useEffect(() => {
    if (init.current) return;
    init.current = true;
    const a = getGlobalAudio();
    globalAudio = a;
    a.addEventListener("play", () => {
      setupAudioContext();
      if (audioCtx?.state === "suspended")
        audioCtx.resume().then(() => applySettings(musicStore.getState()));
      applySettings(musicStore.getState());
      startEndedCheck(a);
    });
    a.addEventListener("pause", () => {
      stopEndedCheck();
      stop8D();
    });
    a.addEventListener("ended", () => {
      stopEndedCheck();
      stop8D();
      const s = musicStore.getState();
      if (s.repeatMode === "one") {
        a.currentTime = 0;
        a.play().catch(() => {});
        startEndedCheck(a);
      } else s.playNext();
    });
    a.addEventListener("error", () => {
      stopEndedCheck();
      stop8D();
      const s = musicStore.getState();
      if (s.currentTrack) setTimeout(() => s.playNext(), 1500);
    });
    a.volume = musicStore.getState().volume;
    return () => {
      stopEndedCheck();
      stop8D();
      a.pause();
      a.src = "";
    };
  }, []);

  useEffect(() => {
    const a = getGlobalAudio();
    return musicStore.subscribe((state, prev) => {
      if (
        state.currentTrack?.id !== prev.currentTrack?.id &&
        state.currentTrack
      ) {

        a.pause();
        a.src = '';

        const url = api.getStreamUrl(state.currentTrack.id);
        if (url) {
          a.src = url;
          a.load();
        }

        // 🔥 کش در background با opus
        if (navigator.onLine && window.electronAPI) {
          import("../config").then(({ default: config }) => {
            const cacheUrl = `${config.server}/rest/stream?id=${state.currentTrack.id}&u=${encodeURIComponent(config.username)}&p=${encodeURIComponent(config.password)}&v=1.16.1&c=NavidromePlayer&format=opus&maxBitRate=128`;
            fetch(cacheUrl)
              .then((r) => r.arrayBuffer())
              .then((buf) =>
                window.electronAPI.cacheAudio(
                  state.currentTrack.id,
                  Array.from(new Uint8Array(buf)),
                  state.currentTrack.title,
                  state.currentTrack.artist,
                ),
              )
              .catch(() => {});
          });
        }
      }
        
      if (state.isPlaying !== prev.isPlaying && state.currentTrack) {
        if (state.isPlaying) {
          if (audioCtx?.state === "suspended") audioCtx.resume();
          a.play()
            .then(() => {
              if (!musicStore.getState().isPlaying)
                musicStore.setState({ isPlaying: true });
              startEndedCheck(a);
            })
            .catch(() => musicStore.setState({ isPlaying: false }));
        } else {
          a.pause();
          stopEndedCheck();
          stop8D();
        }
      }
      if (state.volume !== prev.volume) a.volume = state.volume;
      applySettings(state);
    });
  }, []);

  return getGlobalAudio();
}
