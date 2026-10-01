import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Pembatas percobaan sederhana di memori (per kunci, jendela geser). Kunci lama dibersihkan dan jumlah
 * kunci dibatasi agar memori tidak terus tumbuh (audit M3).
 */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();
  private calls = 0;

  private readonly max: number;

  constructor(
    max: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
    private readonly maxKeys = 20_000,
  ) {
    // RATE_LIMIT_SCALE (mis. di test e2e yang memanggil API berkali-kali dari satu IP) melonggarkan batas.
    this.max = Math.max(1, Math.round(max * Number(process.env.RATE_LIMIT_SCALE ?? 1)));
  }

  private recent(key: string) {
    const t = this.now();
    const list = (this.hits.get(key) ?? []).filter((x) => t - x < this.windowMs);
    if (list.length) this.hits.set(key, list);
    else this.hits.delete(key);
    return list;
  }

  private prune() {
    if (++this.calls % 500 !== 0 && this.hits.size < this.maxKeys) return;
    for (const key of [...this.hits.keys()]) this.recent(key);
    while (this.hits.size >= this.maxKeys) this.hits.delete(this.hits.keys().next().value!);
  }

  /** Sisa percobaan untuk kunci ini. */
  remaining(key: string) {
    return Math.max(0, this.max - this.recent(key).length);
  }

  /** Lempar 429 bila kunci sudah melewati batas. */
  check(key: string) {
    this.prune();
    if (this.recent(key).length >= this.max) {
      throw new HttpException(
        'Terlalu banyak percobaan. Coba lagi sebentar lagi.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  fail(key: string) {
    this.hits.set(key, [...this.recent(key), this.now()]);
  }

  reset(key: string) {
    this.hits.delete(key);
  }
}

/** Alamat IP klien (Express `trust proxy` = loopback, jadi di balik Nginx memakai X-Forwarded-For). */
export const clientIp = (req: { ip?: string }) => req.ip ?? 'unknown';
