/**
 * Unit test untuk modul musik NadaKu (Audius + iTunes).
 * fetch selalu di-mock; modul di-reset tiap test agar state host/cache bersih.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Api = typeof import("../api");

const okJson = (data: unknown) =>
  ({ ok: true, status: 200, json: async () => data }) as unknown as Response;

const AUDIUS_TRACK = {
  id: "123",
  title: "  Lagu Uji  ",
  duration: 214,
  genre: "Lo-Fi",
  permalink: "/artist/lagu-uji",
  artwork: { "480x480": "https://img/480.jpg" },
  user: { name: "Artis Uji" },
};

const ITUNES_SONG = {
  trackId: 999,
  trackName: "Preview Lagu",
  artistName: "Artis iTunes",
  collectionName: "Album Uji",
  artworkUrl100: "https://art/100x100bb.jpg",
  previewUrl: "https://preview/30s.m4a",
  trackTimeMillis: 215_000,
  primaryGenreName: "Pop",
  trackViewUrl: "https://music.apple.com/song/999",
};

let api: Api;

beforeEach(async () => {
  vi.resetModules();
  api = await import("../api");
});

afterEach(() => vi.restoreAllMocks());

describe("mmss()", () => {
  it("memformat detik menjadi menit:detik", () => {
    expect(api.mmss(0)).toBe("0:00");
    expect(api.mmss(5)).toBe("0:05");
    expect(api.mmss(65)).toBe("1:05");
    expect(api.mmss(215)).toBe("3:35");
    expect(api.mmss(3599)).toBe("59:59");
  });

  it("menangani nilai tidak masuk akal dengan aman", () => {
    expect(api.mmss(Number.NaN)).toBe("0:00");
    expect(api.mmss(-5)).toBe("0:00");
    expect(api.mmss(Number.POSITIVE_INFINITY)).toBe("0:00");
  });
});

describe("trending() dari Audius", () => {
  it("memetakan respons Audius ke bentuk Track", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okJson({ data: [AUDIUS_TRACK] })));

    const list = await api.trending("week");
    expect(list).toHaveLength(1);

    const t = list[0];
    expect(t.id).toBe("a:123");
    expect(t.source).toBe("audius");
    expect(t.title).toBe("Lagu Uji"); // spasi dipangkas
    expect(t.artist).toBe("Artis Uji");
    expect(t.full).toBe(true); // lagu utuh
    expect(t.stream).toContain("/tracks/123/stream");
    expect(t.stream).toContain("app_name=Nadaku");
    expect(t.link).toBe("https://audius.co/artist/lagu-uji");
  });

  it("memanggil endpoint trending dengan parameter yang benar", async () => {
    const fetchMock = vi.fn(async (_url: string) => okJson({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await api.trending("month");
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("/tracks/trending");
    expect(url).toContain("time=month");
    expect(url).toContain("limit=30");
  });

  it("memakai cache: permintaan kedua tidak menghubungi jaringan lagi", async () => {
    const fetchMock = vi.fn(async () => okJson({ data: [AUDIUS_TRACK] }));
    vi.stubGlobal("fetch", fetchMock);

    await api.trending("week");
    await api.trending("week");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("ganti host otomatis saat discovery provider pertama gagal", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("api.audius.co")) throw new Error("host mati");
      return okJson({ data: [AUDIUS_TRACK] });
    });
    vi.stubGlobal("fetch", fetchMock);

    const list = await api.trending("week");
    expect(list).toHaveLength(1);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1); // mencoba host lain
  });

  it("semua host gagal (HTTP 500) → pesan error yang jelas", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 }) as unknown as Response));
    await expect(api.trending("week")).rejects.toThrow(/Gagal mengambil lagu dari Audius/);
  });

  it("timeout (AbortError) → pesan 'lambat merespons'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw Object.assign(new Error("aborted"), { name: "AbortError" });
      }),
    );
    await expect(api.trending("week")).rejects.toThrow(/Audius lambat merespons/);
  });

  it("respons tanpa data tetap menghasilkan array kosong (bukan error)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okJson({})));
    await expect(api.trending("week")).resolves.toEqual([]);
  });
});

describe("searchItunes()", () => {
  it("memetakan hasil iTunes + menyaring yang tanpa preview", async () => {
    const fetchMock = vi.fn(async (_url: string) =>
      okJson({ results: [ITUNES_SONG, { ...ITUNES_SONG, trackId: 1000, previewUrl: "" }] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const list = await api.searchItunes("pop indonesia");
    expect(list).toHaveLength(1); // yang tanpa previewUrl dibuang

    const t = list[0];
    expect(t.id).toBe("i:999");
    expect(t.source).toBe("itunes");
    expect(t.full).toBe(false); // hanya preview 30 detik
    expect(t.art).toBe("https://art/600x600bb.jpg"); // 100x100bb → 600x600bb
    expect(t.duration).toBe(215); // ms → detik
    expect(t.album).toBe("Album Uji");

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("itunes.apple.com/search");
    expect(url).toContain("entity=song");
    expect(url).toContain("country=ID");
  });
});

describe("searchAll()", () => {
  it("menggabungkan dua sumber", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        String(url).includes("itunes.apple.com")
          ? okJson({ results: [ITUNES_SONG] })
          : okJson({ data: [AUDIUS_TRACK] }),
      ),
    );

    const { full, preview } = await api.searchAll("uji");
    expect(full.map(t => t.id)).toEqual(["a:123"]);
    expect(preview.map(t => t.id)).toEqual(["i:999"]);
  });

  it("tetap mengembalikan hasil iTunes walau Audius mati", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("itunes.apple.com")) return okJson({ results: [ITUNES_SONG] });
        throw new Error("audius down");
      }),
    );

    const { full, preview } = await api.searchAll("uji");
    expect(full).toEqual([]);
    expect(preview).toHaveLength(1);
  });

  it("tidak melempar error walau kedua sumber mati", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("semua mati");
      }),
    );
    await expect(api.searchAll("uji")).resolves.toEqual({ full: [], preview: [] });
  });
});

describe("daftar genre", () => {
  it("berisi genre yang didukung Audius", () => {
    expect(api.GENRES).toContain("Lo-Fi");
    expect(api.GENRES).toContain("Electronic");
    expect(api.GENRES.length).toBeGreaterThanOrEqual(10);
  });
});
