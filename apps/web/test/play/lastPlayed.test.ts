import { describe, expect, it } from 'vitest';
import { t } from '../../src/i18n';
import { lastPlayedLabel } from '../../src/play/lastPlayed';

describe('lastPlayedLabel (D-105)', () => {
  // 10 Okt 2026 10.00 WIB.
  const now = Date.parse('2026-10-10T03:00:00Z');
  const ago = (ms: number) => new Date(now - ms).toISOString();
  const H = 3_600_000;

  it('menit, jam, kemarin (tanggal WIB), hari, minggu, bulan, tahun', () => {
    expect(lastPlayedLabel(null, now)).toBeNull();
    expect(lastPlayedLabel('bukan tanggal', now)).toBeNull();
    expect(lastPlayedLabel(ago(20_000), now)).toBe(t('rank.last.now'));
    expect(lastPlayedLabel(ago(5 * 60_000), now)).toBe(t('rank.last.minutes', { n: 5 }));
    expect(lastPlayedLabel(ago(3 * H), now)).toBe(t('rank.last.hours', { n: 3 }));
    // 11 jam lalu = 9 Okt 23.00 WIB → kemarin, bukan "11 jam lalu".
    expect(lastPlayedLabel(ago(11 * H), now)).toBe(t('rank.last.yesterday'));
    expect(lastPlayedLabel(ago(3 * 24 * H), now)).toBe(t('rank.last.days', { n: 3 }));
    expect(lastPlayedLabel(ago(15 * 24 * H), now)).toBe(t('rank.last.weeks', { n: 2 }));
    expect(lastPlayedLabel(ago(65 * 24 * H), now)).toBe(t('rank.last.months', { n: 2 }));
    expect(lastPlayedLabel(ago(400 * 24 * H), now)).toBe(t('rank.last.years'));
  });
});
