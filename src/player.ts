// Mesin pemutar: antrian lagu + visualizer
import { useSyncExternalStore } from "react";
import type { Track } from "./api";
import { getVolume, setVolume as saveVolume } from "./store";

export type Repeat = "off" | "all" | "one";

export interface PlayerState {
  track: Track | null;
  queue: Track[];
  index: number;
  playing: boolean;
  loading: boolean;
  error: string;
  time: number;
  duration: number;
  shuffle: boolean;
  repeat: Repeat;
}

let state: PlayerState = {
  track: null, queue: [], index: -1, playing: false, loading: false,
  error: "", time: 0, duration: 0, shuffle: false, repeat: "off",
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());
const set = (p: Partial<PlayerState>) => { state = { ...state, ...p }; emit(); };
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

export function usePlayer() {
  return useSyncExternalStore(subscribe, () => state);
}

let audio: HTMLAudioElement | null = null;
let ctx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;
let data: Uint8Array | null = null;

function ensure() {
  if (audio) return audio;
  audio = new Audio();
  audio.preload = "none";
  audio.volume = getVolume();
  audio.addEventListener("playing", () => set({ playing: true, loading: false, error: "" }));
  audio.addEventListener("waiting", () => set({ loading: true }));
  audio.addEventListener("pause", () => set({ playing: false, loading: false }));
  audio.addEventListener("loadedmetadata", () => set({ duration: audio?.duration || 0 }));
  audio.addEventListener("timeupdate", () => set({ time: audio?.currentTime ?? 0 }));
  audio.addEventListener("ended", () => next(true));
  audio.addEventListener("error", () => set({
    playing: false, loading: false,
    error: "Lagu tidak bisa diputar. Mungkin sumbernya sedang bermasalah.",
  }));
  return audio;
}

// ---------- visualizer ----------
const corsCache = new Map<string, boolean>();
async function corsProbe(url: string) {
  if (corsCache.has(url)) return corsCache.get(url)!;
  let ok = false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    // tanpa header Range — sebagian server konten menolaknya (503)
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    res.body?.cancel().catch(() => {});
    ok = res.ok || res.status === 206;
  } catch { ok = false; }
  corsCache.set(url, ok);
  return ok;
}

function attachAnalyser() {
  if (!audio || sourceNode) return;
  try {
    const AC = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    ctx.resume().catch(() => {});
    sourceNode = ctx.createMediaElementSource(audio);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.75;
    data = new Uint8Array(analyser.frequencyBinCount);
    sourceNode.connect(analyser);
    analyser.connect(ctx.destination);
  } catch {
    analyser = null; sourceNode = null; data = null;
  }
}

export function getSpectrum(): Uint8Array | null {
  if (!analyser || !data) return null;
  (analyser.getByteFrequencyData as (arr: Uint8Array) => void)(data);
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  return sum === 0 ? null : data;
}

// ---------- kontrol ----------
export async function play(t: Track, queue?: Track[]) {
  const a = ensure();
  if (queue && queue.length) {
    const idx = queue.findIndex(x => x.id === t.id);
    set({ queue, index: idx >= 0 ? idx : 0 });
  }
  set({ track: t, loading: true, error: "", playing: false, time: 0, duration: t.duration || 0 });
  try {
    const cors = await corsProbe(t.stream);
    a.crossOrigin = cors ? "anonymous" : null;
    a.src = t.stream;
    a.volume = getVolume();
    await a.play();
    set({ playing: true, loading: false });
    try { localStorage.setItem(LAST_KEY, JSON.stringify(t)); } catch { /* abaikan */ }
    if (cors) attachAnalyser();
  } catch {
    set({ playing: false, loading: false, error: "Browser memblokir pemutaran. Tekan tombol putar sekali lagi." });
  }
}

export function toggle(t?: Track) {
  const target = t ?? state.track;
  if (!target) return;
  if (state.track?.id === target.id && audio) {
    if (audio.paused) audio.play().then(() => set({ playing: true })).catch(() => set({ error: "Gagal melanjutkan." }));
    else audio.pause();
    return;
  }
  play(target);
}

export function pause() { audio?.pause(); set({ playing: false }); }

function pickNext(): Track | null {
  const { queue, index, shuffle, repeat } = state;
  if (!queue.length) return null;
  if (shuffle) {
    let i = index;
    if (queue.length > 1) while (i === index) i = Math.floor(Math.random() * queue.length);
    return queue[i] ?? null;
  }
  if (index + 1 < queue.length) return queue[index + 1];
  return repeat === "all" ? queue[0] : null;
}

export function next(auto = false) {
  if (auto && state.repeat === "one" && state.track) {
    const a = ensure();
    a.currentTime = 0;
    a.play().catch(() => {});
    return;
  }
  const n = pickNext();
  if (!n) { set({ playing: false }); return; }
  play(n, state.queue);
}

export function prev() {
  const { queue, index, shuffle } = state;
  if (!queue.length) return;
  if (shuffle) { next(); return; }
  const p = index > 0 ? queue[index - 1] : queue[queue.length - 1];
  if (p) play(p, queue);
}

export function seek(sec: number) {
  const a = ensure();
  if (Number.isFinite(a.duration)) a.currentTime = Math.max(0, Math.min(sec, a.duration));
  set({ time: sec });
}

export function setVol(v: number) {
  const val = Math.min(1, Math.max(0, v));
  if (audio) audio.volume = val;
  saveVolume(val);
}

export function setShuffle(v: boolean) { set({ shuffle: v }); }
export function setRepeat(v: Repeat) { set({ repeat: v }); }

// ---------- lagu terakhir ----------
const LAST_KEY = "nadaku_last";
export function lastTrack(): Track | null {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    return raw ? (JSON.parse(raw) as Track) : null;
  } catch { return null; }
}
