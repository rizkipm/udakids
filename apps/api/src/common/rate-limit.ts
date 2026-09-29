import { HttpException, HttpStatus } from '@nestjs/common';

/** Pembatas percobaan login sederhana di memori (per kunci, jendela geser). */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Lempar 429 bila kunci sudah melewati batas. */
  check(key: string) {
    const t = this.now();
    const recent = (this.hits.get(key) ?? []).filter((x) => t - x < this.windowMs);
    this.hits.set(key, recent);
    if (recent.length >= this.max) {
      throw new HttpException(
        'Terlalu banyak percobaan. Coba lagi sebentar lagi.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  fail(key: string) {
    this.hits.set(key, [...(this.hits.get(key) ?? []), this.now()]);
  }

  reset(key: string) {
    this.hits.delete(key);
  }
}
