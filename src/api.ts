// ============================================================
// NadaKu — dua sumber musik LEGAL, tanpa API key:
// 1) Audius  → lagu PENUH, diunggah langsung oleh artisnya
// 2) iTunes  → katalog terluas, preview resmi 30 detik
// ============================================================

const APP = "Nadaku";

const AUDIUS_HOSTS = [
  "https://api.audius.co/v1",
  "https://discoveryprovider.audius.co/v1",
  "https://discoveryprovider2.audius.co/v1",
  "https://discoveryprovider3.audius.co/v1",
];
let host = AUDIUS_HOSTS[0];

export interface Track {
  id: string;              // "a:<id>" | "i:<id>"
  source: "audius" | "itunes";
  title: string;
  artist: string;
  art: string;
  album: string;
  genre: string;
  duration: number;        // detik
  full: boolean;           // true = lagu utuh, false = preview 30 detik
  stream: string;
  link: string;
}

// ---------- cache ----------
const cache = new Map<string, { t: number; d: unknown }>();
function cached<T>(key: string, ttl: number): T | null {
  const hit = cache.get(key);
  return hit && Date.now() - hit.t < ttl ? (hit.d as T) : null;
}
const save = (key: string, d: unknown) => cache.set(key, { t: Date.now(), d });

async function json<T>(url: string, ms = 10_000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** panggil Audius dengan ganti host otomatis kalau ada yang gagal */
async function audius<T>(path: string): Promise<T> {
  let lastErr: unknown;
  for (const h of [host, ...AUDIUS_HOSTS.filter(x => x !== host)]) {
    try {
      const d = await json<T>(`${h}${path}`);
      host = h;
      return d;
    } catch (e) { lastErr = e; }
  }
  throw lastErr instanceof Error && lastErr.name === "AbortError"
    ? new Error("Audius lambat merespons. Coba lagi sebentar.")
    : new Error("Gagal mengambil lagu dari Audius. Periksa koneksi lalu coba lagi.");
}

type AudiusTrack = {
  id: string; title: string; duration: number; genre: string; permalink: string;
  artwork?: Record<string, string>;
  user?: { name: string; profile_picture?: Record<string, string> };
};

function fromAudius(t: AudiusTrack): Track {
  const art =
    t.artwork?.["480x480"] || t.artwork?.["1000x1000"] ||
    t.user?.profile_picture?.["480x480"] || t.user?.profile_picture?.["1000x1000"] || "";
  return {
    id: `a:${t.id}`,
    source: "audius",
    title: (t.title || "Tanpa judul").trim(),
    artist: t.user?.name || "Artis independen",
    art,
    album: "",
    genre: t.genre || "",
    duration: t.duration || 0,
    full: true,
    stream: `${host}/tracks/${t.id}/stream?app_name=${APP}`,
    link: t.permalink ? `https://audius.co${t.permalink}` : "https://audius.co",
  };
}

type ItunesResult = {
  trackId: number; trackName: string; artistName: string; collectionName: string;
  artworkUrl100: string; previewUrl: string; trackTimeMillis: number;
  primaryGenreName: string; trackViewUrl: string;
};

function fromItunes(r: ItunesResult): Track {
  return {
    id: `i:${r.trackId}`,
    source: "itunes",
    title: r.trackName || "Tanpa judul",
    artist: r.artistName || "Tanpa artis",
    art: (r.artworkUrl100 || "").replace("100x100bb", "600x600bb"),
    album: r.collectionName || "",
    genre: r.primaryGenreName || "",
    duration: Math.round((r.trackTimeMillis || 0) / 1000),
    full: false,
    stream: r.previewUrl || "",
    link: r.trackViewUrl || "",
  };
}

// ---------- endpoint publik ----------
export async function trending(time: "week" | "month" | "allTime" = "week"): Promise<Track[]> {
  const key = `trend:${time}`;
  const hit = cached<Track[]>(key, 10 * 60_000);
  if (hit) return hit;
  const d = await audius<{ data?: AudiusTrack[] }>(`/tracks/trending?limit=30&app_name=${APP}&time=${time}`);
  const list = (d.data ?? []).map(fromAudius);
  save(key, list);
  return list;
}

export async function byGenre(genre: string): Promise<Track[]> {
  const key = `genre:${genre}`;
  const hit = cached<Track[]>(key, 10 * 60_000);
  if (hit) return hit;
  // endpoint /tracks/trending mendukung filter genre (endpoint /tracks saja tidak)
  const d = await audius<{ data?: AudiusTrack[] }>(
    `/tracks/trending?genre=${encodeURIComponent(genre)}&limit=30&app_name=${APP}`,
  );
  const list = (d.data ?? []).map(fromAudius);
  if (list.length) save(key, list);
  return list;
}

export async function searchAudius(q: string, limit = 20): Promise<Track[]> {
  const key = `as:${q}:${limit}`;
  const hit = cached<Track[]>(key, 5 * 60_000);
  if (hit) return hit;
  const d = await audius<{ data?: AudiusTrack[] }>(
    `/tracks/search?query=${encodeURIComponent(q)}&limit=${limit}&app_name=${APP}`,
  );
  const list = (d.data ?? []).map(fromAudius);
  save(key, list);
  return list;
}

export async function searchItunes(q: string, limit = 25): Promise<Track[]> {
  const key = `it:${q}:${limit}`;
  const hit = cached<Track[]>(key, 10 * 60_000);
  if (hit) return hit;
  const d = await json<{ results?: ItunesResult[] }>(
    `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=${limit}&country=ID`,
  );
  const list = (d.results ?? []).filter(r => r.previewUrl).map(fromItunes);
  save(key, list);
  return list;
}

/** cari di kedua sumber sekaligus */
export async function searchAll(q: string): Promise<{ full: Track[]; preview: Track[] }> {
  const [full, preview] = await Promise.all([
    searchAudius(q).catch(() => [] as Track[]),
    searchItunes(q).catch(() => [] as Track[]),
  ]);
  return { full, preview };
}

// genre yang terbukti punya banyak lagu di Audius
export const GENRES = [
  "Electronic", "House", "Hip-Hop/Rap", "Pop", "Rock", "Lo-Fi",
  "Chill", "Techno", "Dubstep", "Drum & Bass", "Ambient", "Jazz",
  "R&B/Soul", "Funk", "Reggae", "Metal",
];

// ---------- helper ----------
export const mmss = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};
