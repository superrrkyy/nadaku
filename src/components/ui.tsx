import type { Track } from "../api";
import { mmss } from "../api";
import { next, play, usePlayer } from "../player";
import { toggleFav, useFavs } from "../store";
import Visualizer from "./Visualizer";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded ${className}`} />;
}

export function ErrorBox({ msg, retry }: { msg: string; retry: () => void }) {
  return (
    <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
      <p className="mb-3 text-sm">😢 {msg}</p>
      <button onClick={retry}
        className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-5 py-2 text-sm font-bold">
        Coba lagi
      </button>
    </div>
  );
}

export function Loading({ n = 6 }: { n?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-2.5">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="flex-1">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="mt-2 h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** satu baris lagu */
export function TrackRow({ t, queue, index }: { t: Track; queue?: Track[]; index?: number }) {
  const { track, playing } = usePlayer();
  const favs = useFavs();
  const on = track?.id === t.id;
  const fav = favs.some(f => f.id === t.id);
  const list = queue ?? [t];

  return (
    <div className={`relative flex items-center gap-2 rounded-2xl border p-2.5 transition ${
      on ? "border-fuchsia-400/60 bg-fuchsia-500/10" : "border-white/5 bg-white/[0.03] hover:bg-white/[0.06]"}`}>
      <button onClick={() => (on ? undefined : play(t, list))}
        className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/10">
          {t.art
            ? <img src={t.art} alt="" loading="lazy" className="h-full w-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.visibility = "hidden"; }} />
            : <span className="grid h-full w-full place-items-center text-lg">🎵</span>}
          {on && playing && (
            <span className="absolute inset-0 grid place-items-center bg-black/55">
              <Visualizer active bars={4} className="h-5 w-7" />
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{t.title}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/45">
            <span className="truncate">{t.artist}</span>
            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
              t.full ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
              {t.full ? "PENUH" : "30s"}
            </span>
          </span>
        </span>

        <span className="shrink-0 text-xs tabular-nums text-white/40">
          {t.duration ? mmss(t.duration) : "-"}
        </span>

        <span className="shrink-0 text-lg">{on && playing ? "⏸" : "▶"}</span>
      </button>

      <button onClick={() => toggleFav(t)} aria-label="Favorit"
        className={`shrink-0 rounded-full px-1.5 py-1 text-xs transition active:scale-90 ${
          fav ? "text-fuchsia-400" : "text-white/30"}`}>
        {fav ? "❤️" : "🤍"}
      </button>

      {index != null && <span className="sr-only">{index}</span>}
    </div>
  );
}

/** putar semua lagu dalam daftar, mulai dari yang pertama */
export function playAll(list: Track[]) {
  if (!list.length) return;
  play(list[0], list);
}

export { next };
