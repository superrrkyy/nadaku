import { useEffect, useRef, useState } from "react";
import { GENRES, byGenre, searchAll, type Track } from "../api";
import { ErrorBox, Loading, TrackRow, playAll } from "../components/ui";

type Tab = "all" | "full" | "preview";

export default function Cari({ genre = "", initialQuery = "" }: { genre?: string; initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery);
  const [deb, setDeb] = useState(initialQuery);
  const [tab, setTab] = useState<Tab>("all");
  const [full, setFull] = useState<Track[] | null>(null);
  const [preview, setPreview] = useState<Track[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef<Track[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDeb(q.trim()), 600);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let alive = true;
    setError("");

    if (!deb && genre) {
      setLoading(true); setFull(null); setPreview([]);
      byGenre(genre)
        .then(l => { if (alive) { cacheRef.current = l; setFull(l); setPreview([]); } })
        .catch(e => alive && setError(e.message))
        .finally(() => alive && setLoading(false));
      return () => { alive = false; };
    }

    if (!deb) { setFull(null); setPreview(null); return; }

    setLoading(true);
    searchAll(deb)
      .then(r => {
        if (!alive) return;
        cacheRef.current = [...r.full, ...r.preview];
        setFull(r.full); setPreview(r.preview);
        if (!r.full.length && !r.preview.length) setError("");
      })
      .catch(e => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [deb, genre]);

  const showFull = tab !== "preview" && full && full.length > 0;
  const showPreview = tab !== "full" && preview && preview.length > 0;
  const empty = full !== null && preview !== null && !full.length && !preview.length && !loading;

  return (
    <div className="fade-up">
      <h1 className="text-2xl font-extrabold">🔍 Cari Musik</h1>
      <p className="text-sm text-white/50">
        {genre ? `Genre: ${genre}` : "Lagu penuh dari Audius + katalog lengkap iTunes"}
      </p>

      <input value={q} onChange={e => setQ(e.target.value)}
        placeholder="Judul lagu, artis, atau album…"
        className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-fuchsia-400/60" />

      <div className="mt-3 flex gap-2">
        {([["all", "Semua"], ["full", "🎧 Lagu Penuh"], ["preview", "⏱️ Preview 30s"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 rounded-full border px-2 py-1.5 text-xs font-semibold transition active:scale-95 ${
              tab === id ? "border-fuchsia-400/60 bg-fuchsia-400/20 text-fuchsia-200" : "border-white/10 bg-white/5 text-white/60"}`}>
            {label}
          </button>
        ))}
      </div>

      {!deb && !genre && (
        <div className="mt-6">
          <p className="text-sm text-white/50">Coba cari:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {["lofi", "taylor swift", "dangdut", "daft punk", "niki", "edm", "coldplay"].map(s => (
              <button key={s} onClick={() => setQ(s)}
                className="rounded-full bg-white/10 px-3 py-1.5 text-xs transition active:scale-95">{s}</button>
            ))}
          </div>
          <div className="mt-5">
            <p className="mb-2 text-sm text-white/50">Atau pilih genre:</p>
            <div className="flex flex-wrap gap-2">
              {GENRES.map(g => (
                <a key={g} href={`#/cari?genre=${encodeURIComponent(g)}`}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs">{g}</a>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading && <div className="mt-5"><Loading n={5} /></div>}
      {error && <ErrorBox msg={error} retry={() => setQ(q + " ")} />}

      {empty && !loading && (
        <p className="mt-10 text-center text-sm text-white/50">
          Tidak ada hasil untuk <b>{deb}</b>. Coba kata kunci lain.
        </p>
      )}

      {showFull && (
        <section className="mt-6">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-lg font-bold">🎧 Lagu Penuh <span className="text-xs font-normal text-white/40">· gratis &amp; legal</span></h2>
            <button onClick={() => playAll(full!)} className="text-xs font-semibold text-fuchsia-400">▶ Putar semua</button>
          </div>
          <div className="space-y-2">{full!.map((t, i) => <TrackRow key={t.id} t={t} queue={full!} index={i} />)}</div>
        </section>
      )}

      {showPreview && (
        <section className="mt-7">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-lg font-bold">🎼 Katalog Lengkap <span className="text-xs font-normal text-white/40">· preview 30 detik</span></h2>
            <button onClick={() => playAll(preview!)} className="text-xs font-semibold text-amber-400">▶ Putar semua</button>
          </div>
          <div className="space-y-2">{preview!.map((t, i) => <TrackRow key={t.id} t={t} queue={preview!} index={i} />)}</div>
        </section>
      )}
    </div>
  );
}
