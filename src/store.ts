// Favorit & volume tersimpan di localStorage
import { useSyncExternalStore } from "react";
import type { Track } from "./api";

const FAV_KEY = "nadaku_favs";
const VOL_KEY = "nadaku_vol";

export type FavTrack = Pick<Track, "id" | "source" | "title" | "artist" | "art" | "duration" | "full" | "stream" | "link" | "genre">;

let favs: FavTrack[] = (() => {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]"); } catch { return []; }
})();

let volume = (() => {
  const v = parseFloat(localStorage.getItem(VOL_KEY) ?? "0.85");
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.85;
})();

const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

export function toggleFav(t: Track) {
  const item: FavTrack = {
    id: t.id, source: t.source, title: t.title, artist: t.artist, art: t.art,
    duration: t.duration, full: t.full, stream: t.stream, link: t.link, genre: t.genre,
  };
  const has = favs.some(f => f.id === t.id);
  favs = has ? favs.filter(f => f.id !== t.id) : [item, ...favs];
  try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch { /* penuh */ }
  emit();
  return !has;
}

export function useFavs() {
  return useSyncExternalStore(subscribe, () => favs);
}

export function setVolume(v: number) {
  volume = Math.min(1, Math.max(0, v));
  try { localStorage.setItem(VOL_KEY, String(volume)); } catch { /* abaikan */ }
  emit();
}

export const getVolume = () => volume;

export function useVolume() {
  return useSyncExternalStore(subscribe, () => volume);
}
