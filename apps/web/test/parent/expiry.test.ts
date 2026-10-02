import { describe, expect, it } from 'vitest';
import { expiryNotice } from '../../src/parent/Dashboard';

const NOW = Date.parse('2026-10-10T00:00:00Z');
const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();

describe('pengingat masa paket (D-043)', () => {
  it('berakhir ≤ 7 hari lagi → peringatan dengan sisa hari', () => {
    expect(
      expiryNotice([{ name: 'Semua buku 30 hari', endsAt: iso(NOW + 3 * DAY - 1000) }], NOW),
    ).toEqual({
      kind: 'soon',
      name: 'Semua buku 30 hari',
      days: 3,
    });
  });
  it('masih lama / selamanya → tidak ada pengingat', () => {
    expect(expiryNotice([{ name: 'A', endsAt: iso(NOW + 20 * DAY) }], NOW)).toBeNull();
    expect(
      expiryNotice(
        [
          { name: 'A', endsAt: null },
          { name: 'B', endsAt: iso(NOW + DAY) },
        ],
        NOW,
      ),
    ).toBeNull();
    expect(expiryNotice([], NOW)).toBeNull();
  });
  it('sudah berakhir (≤ 30 hari) tanpa paket lain → info berakhir', () => {
    expect(expiryNotice([{ name: 'A', endsAt: iso(NOW - 2 * DAY) }], NOW)).toMatchObject({
      kind: 'ended',
      name: 'A',
    });
    expect(expiryNotice([{ name: 'A', endsAt: iso(NOW - 40 * DAY) }], NOW)).toBeNull();
  });
});
