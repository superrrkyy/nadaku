import { useEffect, useState } from "react";
import { GENRES, byGenre, trending, type Track } from "../api";
import { ErrorBox, Loading, TrackRow, playAll } from "../components/ui";
import { lastTrack } from "../player";

export default function Beranda() {
  const [list, setList] = useState<Track[] | null>(null);
  const [error, setError] = useState("");
  const [time, setTime] = useState<"week" | "month" | "allTime">("week");
  const [genre, setGenre] = useState<Track[] | null>(null);
  const last = lastTrack();

  const load = () => {
    setError(""); setList(null); setGenre(null);
    trending(time).then(setList).catch(e => setError(e.message));
    byGenre("Lo-Fi").then(setGenre).catch(() => {});
  };
  useEffect(load, [time]);

  return (
    <div className="fade-up">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-fuchsia-600/20 via-violet-600/10 to-transparent p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <p className="text-2xl font-extrabold">🎧 NadaKu</p>
        <p className="mt-1 text-sm text-white/60">
          Dengarkan lagu <b>penuh &amp; gratis</b>, atau cari apa saja dari katalog musik dunia.
        </p>
        <a href="#/cari" className="mt-3 inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold">
          🔍 Cari lagu →
        </a>
      </div>

      {last && (
        <section className="mt-6">
          <h2 className="mb-2.5 text-lg font-bold">⏮️ Lanjut Dengar</h2>
          <TrackRow t={last} />
        </section>
      )}

      <section className="mt-6">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-lg font-bold">🔥 Sedang Trending</h2>
          <div className="flex gap-1 rounded-full bg-black/30 p-1 text-[11px] font-semibold">
            {(["week", "month", "allTime"] as const).map(v => (
              <button key={v} onClick={() => setTime(v)}
                className={`rounded-full px-3 py-1 transition ${time === v ? "bg-white/15" : "text-white/50"}`}>
                {v === "week" ? "Minggu" : v === "month" ? "Bulan" : "Sepanjang"}
              </button>
            ))}
          </div>
        </div>
        {list && list.length > 0 && (
          <button onClick={() => playAll(list)}
            className="mb-2.5 w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-600 py-2.5 text-sm font-bold transition active:scale-95">
            ▶ Putar semua
          </button>
        )}
        {error ? <ErrorBox msg={error} retry={load} />
          : list === null ? <Loading n={6} />
          : <div className="space-y-2">{list.slice(0, 12).map(t => <TrackRow key={t.id} t={t} queue={list} />)}</div>}
      </section>

      <section className="mt-7">
        <h2 className="mb-2.5 text-lg font-bold">🎛️ Jelajah Genre</h2>
        <div className="flex flex-wrap gap-2">
          {GENRES.map(g => (
            <a key={g} href={`#/cari?genre=${encodeURIComponent(g)}`}
              className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium transition active:scale-95 hover:bg-white/10">
              {g}
            </a>
          ))}
        </div>
      </section>

      {genre && genre.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-2.5 text-lg font-bold">🌙 Lo-Fi Buat Santai</h2>
          <div className="space-y-2">{genre.slice(0, 6).map(t => <TrackRow key={t.id} t={t} queue={genre} />)}</div>
        </section>
      )}
    </div>
  );
}
