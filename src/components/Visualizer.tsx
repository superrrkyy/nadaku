import { useEffect, useRef, useState } from "react";
import { getSpectrum } from "../player";

/**
 * Bar equalizer.
 * Spektrum ASLI dipakai kalau sumber audionya mengizinkan CORS,
 * kalau tidak otomatis memakai animasi sintetis.
 */
export default function Visualizer({
  active, bars = 24, className = "",
}: { active: boolean; bars?: number; className?: string }) {
  const [h, setH] = useState<number[]>(() => Array.from({ length: bars }, () => 0.12));
  const raf = useRef(0);

  useEffect(() => {
    if (!active) {
      setH(Array.from({ length: bars }, () => 0.12));
      return;
    }
    let frame = 0;
    const loop = () => {
      frame++;
      if (frame % 2 === 0) {
        const spec = getSpectrum();
        const next: number[] = [];
        for (let i = 0; i < bars; i++) {
          let v: number;
          if (spec && spec.length) {
            const idx = Math.floor((i / bars) * spec.length * 0.65);
            v = spec[idx] / 255;
          } else {
            v = 0.2 + 0.6 * Math.abs(Math.sin(frame / 11 + i * 0.9)) * (0.55 + 0.45 * Math.sin(frame / 23 + i * 0.4));
          }
          next.push(Math.min(1, Math.max(0.1, v)));
        }
        setH(next);
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [active, bars]);

  return (
    <div className={`flex items-end gap-[3px] ${className}`} aria-hidden>
      {h.map((v, i) => (
        <span key={i} className="flex-1 rounded-full bg-gradient-to-t from-fuchsia-400 to-violet-300"
          style={{ height: `${Math.round(v * 100)}%`, opacity: 0.55 + v * 0.45 }} />
      ))}
    </div>
  );
}
