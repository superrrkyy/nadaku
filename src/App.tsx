import { useEffect, useState } from "react";
import Beranda from "./pages/Beranda";
import Cari from "./pages/Cari";
import Favorit from "./pages/Favorit";
import { MiniPlayer } from "./components/PlayerBar";

function useRoute() {
  const [hash, setHash] = useState(location.hash || "#/");
  useEffect(() => {
    const on = () => { setHash(location.hash || "#/"); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash.slice(1);
}

const NAV = [
  { path: "/", icon: "🏠", label: "Beranda" },
  { path: "/cari", icon: "🔍", label: "Cari" },
  { path: "/favorit", icon: "❤️", label: "Favorit" },
];

export default function App() {
  const route = useRoute();
  const [path, query = ""] = route.split("?");
  const params = new URLSearchParams(query);

  useEffect(() => { document.title = "NadaKu — Dengar & Cari Musik"; }, []);

  let page;
  if (path === "/cari") page = <Cari genre={params.get("genre") ?? ""} initialQuery={params.get("q") ?? ""} />;
  else if (path === "/favorit") page = <Favorit />;
  else page = <Beranda />;

  return (
    <div className="min-h-screen pb-32">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(600px_300px_at_0%_0%,#e879f922,transparent),radial-gradient(600px_300px_at_100%_10%,#8b5cf622,transparent)]" />

      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0713]/85 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <a href="#/" className="text-xl font-black tracking-tight">🎵 <span className="grad-text">NadaKu</span></a>
          <nav className="hidden gap-1 sm:flex">
            {NAV.map(n => (
              <a key={n.path} href={`#${n.path}`}
                className={`rounded-full px-4 py-1.5 text-sm transition ${path === n.path ? "bg-white/10 font-semibold" : "text-white/60 hover:text-white"}`}>
                {n.label}
              </a>
            ))}
          </nav>
          <a href="#/cari" className="text-lg sm:hidden" aria-label="Cari">🔍</a>
        </div>
      </header>

      <main key={route} className="mx-auto max-w-5xl px-4 pt-4">{page}</main>

      <footer className="mx-auto mt-12 max-w-5xl px-4 text-center text-xs text-white/40">
        Musik: <a href="https://audius.co" target="_blank" rel="noopener" className="underline">Audius</a> ·{" "}
        <a href="https://www.apple.com/itunes/" target="_blank" rel="noopener" className="underline">iTunes</a> • Dibuat dengan 💜 oleh{" "}
        <a href="https://superrrkyy.github.io/" target="_blank" rel="noopener" className="font-semibold text-fuchsia-400">AXRYZURE</a>
      </footer>

      <MiniPlayer />

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0a0713]/95 backdrop-blur-lg sm:hidden">
        <div className="grid grid-cols-3">
          {NAV.map(n => {
            const on = path === n.path;
            return (
              <a key={n.path} href={`#${n.path}`}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] transition ${on ? "text-fuchsia-400" : "text-white/50"}`}>
                <span className={`text-xl transition ${on ? "scale-110" : "grayscale"}`}>{n.icon}</span>
                {n.label}
              </a>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
