import type { Track } from "../api";
import { TrackRow, playAll } from "../components/ui";
import { useFavs } from "../store";

export default function Favorit() {
  const favs = useFavs();
  const list = favs as unknown as Track[];

  return (
    <div className="fade-up">
      <h1 className="text-2xl font-extrabold">❤️ Favoritku</h1>
      <p className="text-sm text-white/50">{favs.length} lagu tersimpan di perangkat ini</p>

      {favs.length === 0 ? (
        <div className="mt-16 text-center">
          <div className="text-6xl">💜</div>
          <p className="mt-3 text-white/60">Belum ada lagu favorit.</p>
          <p className="text-sm text-white/40">Ketuk 🤍 pada lagu untuk menyimpannya.</p>
          <a href="#/cari" className="mt-5 inline-block rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 px-6 py-2.5 text-sm font-bold">
            Cari Lagu
          </a>
        </div>
      ) : (
        <>
          <button onClick={() => playAll(list)}
            className="mt-4 w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-600 py-2.5 text-sm font-bold transition active:scale-95">
            ▶ Putar semua
          </button>
          <div className="mt-4 space-y-2">
            {list.map((t, i) => <TrackRow key={t.id} t={t} queue={list} index={i} />)}
          </div>
        </>
      )}
    </div>
  );
}
