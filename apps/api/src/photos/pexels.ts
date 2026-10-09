/**
 * Foto stok gratis dari Pexels untuk simulasi pelajaran (D-095). Lisensi Pexels: boleh dipakai komersial tanpa
 * atribusi wajib; kredit fotografer tetap disimpan dan ditampilkan di admin & halaman publik.
 * Batas API bawaan: 200 permintaan/jam, 20.000/bulan. Bila habis, klien menunggu sampai jatah dibuka lagi.
 */
const API = 'https://api.pexels.com/v1';

export type PexelsPhoto = {
  id: number;
  width: number;
  height: number;
  /** Halaman foto di pexels.com. */
  url: string;
  alt: string;
  photographer: string;
  photographerUrl: string;
  /** Ukuran kecil untuk disaring Claude, besar untuk disimpan. */
  small: string;
  large: string;
};

type RawPhoto = {
  id: number;
  width: number;
  height: number;
  url: string;
  alt?: string;
  photographer?: string;
  photographer_url?: string;
  src: { medium: string; large: string };
};

export class PexelsError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class PexelsClient {
  constructor(
    private readonly apiKey: string,
    private readonly fetchFn: typeof fetch = fetch,
    private readonly wait: (ms: number) => Promise<void> = sleep,
    private readonly log: (msg: string) => void = () => {},
  ) {}

  /** Cari foto (urutan relevansi Pexels). Jatah per jam habis → tunggu lalu coba lagi (maks. 2×). */
  async search(query: string, perPage = 6): Promise<PexelsPhoto[]> {
    const q = new URLSearchParams({ query, per_page: String(perPage), size: 'medium' });
    for (let attempt = 0; ; attempt++) {
      const res = await this.fetchFn(`${API}/search?${q}`, {
        headers: { Authorization: this.apiKey },
      });
      if (res.status === 429 && attempt < 2) {
        const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000;
        const ms = Math.min(Math.max(reset - Date.now(), 60_000), 3_600_000);
        this.log(`Jatah Pexels per jam habis, menunggu ${Math.ceil(ms / 60_000)} menit…`);
        await this.wait(ms);
        continue;
      }
      if (!res.ok) {
        throw new PexelsError(
          res.status,
          res.status === 401 || res.status === 403
            ? 'Kunci Pexels ditolak (periksa PEXELS_API_KEY)'
            : `Pexels ${res.status}`,
        );
      }
      const body = (await res.json()) as { photos?: RawPhoto[] };
      return (body.photos ?? []).map((p) => ({
        id: p.id,
        width: p.width,
        height: p.height,
        url: p.url,
        alt: p.alt ?? '',
        photographer: p.photographer ?? '',
        photographerUrl: p.photographer_url ?? '',
        small: p.src.medium,
        large: p.src.large,
      }));
    }
  }

  /** Unduh berkas foto (CDN Pexels, tidak memakai jatah API). */
  async download(url: string): Promise<{ data: Buffer; mime: string }> {
    const res = await this.fetchFn(url);
    if (!res.ok) throw new PexelsError(res.status, `Unduh foto gagal (${res.status})`);
    const mime = (res.headers.get('content-type') ?? 'image/jpeg').split(';')[0]!.trim();
    if (!/^image\/(jpeg|png|webp)$/.test(mime)) throw new PexelsError(415, `Bukan foto (${mime})`);
    return { data: Buffer.from(await res.arrayBuffer()), mime };
  }
}

/**
 * Kata kunci pencarian: English singkat lebih dulu (koleksi Pexels berbahasa Inggris), lalu dipersempit ke
 * 3 dan 2 kata pertama bila tidak ada yang cocok (pola yang sama dengan clipvideo).
 */
export function pexelsQueries(label: string, en?: string): string[] {
  const base = (en ?? label).trim().replace(/\s+/g, ' ');
  const words = base.split(' ');
  const out = [base];
  for (const n of [3, 2]) {
    const q = words.slice(0, n).join(' ');
    if (words.length > n && !out.includes(q)) out.push(q);
  }
  return out;
}

/** Kredit foto untuk admin (disimpan di kolom `prompt` gambar). */
export const pexelsCredit = (p: PexelsPhoto, query: string) =>
  `Pexels #${p.id} · Foto: ${p.photographer} (${p.photographerUrl}) · ${p.url} · cari "${query}"`;
