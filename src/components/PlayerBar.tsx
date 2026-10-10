import { useState } from "react";
import { mmss } from "../api";
import { next, pause, play, prev, seek, setRepeat, setShuffle, setVol, toggle, usePlayer, type Repeat } from "../player";
import { toggleFav, useFavs, useVolume } from "../store";
import Visualizer from "./Visualizer";

/** Bilah pemutar mini di bawah layar */
export function MiniPlayer() {
  const { track, playing, loading, time, duration } = usePlayer();
  const [open, setOpen] = useState(false);
  if (!track) return null;

  const pct = duration ? Math.min(100, (time / duration) * 100) : 0;

  return (
    <>
      <div className="fixed bottom-14 left-0 right-0 z-40 border-t border-white/10 bg-[#0a0713]/95 backdrop-blur-lg sm:bottom-0">
        <div className="h-0.5 w-full bg-white/10">
          <div className="h-full bg-gradient-to-r from-fuchsia-400 to-violet-500 transition-[width]"
            style={{ width: `${pct}%` }} />
        </div>
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2">
          <button onClick={() => setOpen(true)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white/10">
              {track.art
                ? <img src={track.art} alt="" className="h-full w-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.visibility = "hidden"; }} />
                : <span className="grid h-full w-full place-items-center">🎵</span>}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{track.title}</span>
              <span className="block truncate text-[11px] text-white/50">
                {loading ? "Memuat…" : `${track.artist}${track.full ? "" : " · preview 30s"}`}
              </span>
            </span>
          </button>

          <button onClick={() => prev()} aria-label="Sebelumnya" className="px-1 text-lg">⏮</button>
          <button onClick={() => toggle()} aria-label="Putar"
            className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 text-lg transition active:scale-90">
            {loading ? "⟳" : playing ? "⏸" : "▶"}
          </button>
          <button onClick={() => next()} aria-label="Berikutnya" className="px-1 text-lg">⏭</button>
        </div>
      </div>
      {open && <NowPlaying onClose={() => setOpen(false)} />}
    </>
  );
}

/** Layar pemutar penuh */
export function NowPlaying({ onClose }: { onClose: () => void }) {
  const { track, playing, loading, error, time, duration, shuffle, repeat, queue, index } = usePlayer();
  const vol = useVolume();
  const favs = useFavs();

  if (!track) return null;
  const fav = favs.some(f => f.id === track.id);
  const cycleRepeat = () => {
    const order: Repeat[] = ["off", "all", "one"];
    setRepeat(order[(order.indexOf(repeat) + 1) % order.length]);
  };

  return (
    <div className="fade-up fixed inset-0 z-50 overflow-y-auto bg-gradient-to-b from-[#14091f] via-[#0a0713] to-[#08060f]">
      <div className="mx-auto min-h-full max-w-md px-5 pb-10 pt-4">
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="rounded-full bg-white/10 px-3 py-1.5 text-sm">▼ Tutup</button>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
            track.full ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
            {track.full ? "LAGU PENUH" : "PREVIEW 30 DETIK"}
          </span>
        </div>

        <div className="mt-6 flex justify-center">
          {track.art
            ? <img src={track.art} alt={track.title}
                className="h-64 w-64 rounded-3xl object-cover shadow-2xl shadow-fuchsia-500/20"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            : <div className="grid h-64 w-64 place-items-center rounded-3xl bg-white/10 text-6xl">🎵</div>}
        </div>

        <h1 className="mt-6 text-center text-xl font-extrabold leading-tight">{track.title}</h1>
        <p className="mt-1 text-center text-sm text-white/60">{track.artist}</p>
        {queue.length > 1 && (
          <p className="mt-0.5 text-center text-[11px] text-white/35">
            Lagu ke {index + 1} dari {queue.length} dalam daftar
          </p>
        )}

        <Visualizer active={playing} bars={28} className="mt-6 h-20 w-full" />

        {error && <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-center text-xs text-red-300">{error}</p>}

        {/* progress */}
        <div className="mt-5">
          <input type="range" min={0} max={duration || track.duration || 30} step={0.5} value={Math.min(time, duration || track.duration || 30)}
            onChange={e => seek(+e.target.value)}
            className="w-full accent-fuchsia-500" />
          <div className="flex justify-between text-[11px] tabular-nums text-white/45">
            <span>{mmss(time)}</span>
            <span>{mmss(duration || track.duration || 0)}</span>
          </div>
        </div>

        {/* kontrol utama */}
        <div className="mt-4 flex items-center justify-center gap-6">
          <button onClick={() => setShuffle(!shuffle)} className={`text-lg ${shuffle ? "text-fuchsia-400" : "text-white/40"}`} title="Acak">🔀</button>
          <button onClick={() => prev()} className="text-2xl">⏮</button>
          <button onClick={() => toggle()} disabled={loading}
            className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 text-2xl shadow-lg transition active:scale-95 disabled:opacity-60">
            {loading ? "⟳" : playing ? "⏸" : "▶"}
          </button>
          <button onClick={() => next()} className="text-2xl">⏭</button>
          <button onClick={cycleRepeat} className={`text-sm font-bold ${repeat !== "off" ? "text-fuchsia-400" : "text-white/40"}`}>
            {repeat === "one" ? "🔂" : "🔁"}
          </button>
        </div>

        {/* aksi tambahan */}
        <div className="mt-5 flex items-center justify-center gap-5">
          <button onClick={() => toggleFav(track)} className="text-xl transition active:scale-90">{fav ? "❤️" : "🤍"}</button>
          <button onClick={() => pause()} className="text-sm text-white/50">⏹ Berhenti</button>
          <a href={track.link} target="_blank" rel="noopener" className="text-sm text-white/50">
            {track.source === "audius" ? "Buka di Audius ↗" : "Buka di iTunes ↗"}
          </a>
        </div>

        {/* volume */}
        <div className="mt-6">
          <div className="flex justify-between text-xs text-white/50">
            <span>🔉 Volume</span><span>{Math.round(vol * 100)}%</span>
          </div>
          <input type="range" min={0} max={1} step={0.01} value={vol}
            onChange={e => setVol(+e.target.value)} className="mt-2 w-full accent-fuchsia-500" />
        </div>

        <button onClick={() => play(track, queue.length ? queue : [track])}
          className="mt-6 block w-full text-center text-[11px] text-white/30 underline">
          Muat ulang lagu
        </button>

        <p className="mt-4 text-center text-[10px] leading-relaxed text-white/30">
          {track.full
            ? "Lagu penuh diunggah sendiri oleh artisnya lewat Audius."
            : "Ini preview resmi 30 detik dari iTunes. Untuk lagu penuh, dukung artisnya lewat platform langganan."}
        </p>
      </div>
    </div>
  );
}
