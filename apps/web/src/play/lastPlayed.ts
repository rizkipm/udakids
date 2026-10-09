import { t } from '../i18n';

/**
 * "Main 5 menit lalu" / "Main kemarin" untuk papan peringkat (D-105). `now` bisa diisi untuk test.
 * Kemarin/hari dihitung dari tanggal kalender WIB, bukan selisih 24 jam.
 */
export function lastPlayedLabel(iso: string | null | undefined, now = Date.now()): string | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return null;
  const min = Math.max(0, Math.floor((now - at) / 60_000));
  if (min < 1) return t('rank.last.now');
  if (min < 60) return t('rank.last.minutes', { n: min });
  const wib = (ms: number) => Math.floor((ms + 7 * 3_600_000) / 86_400_000);
  const days = wib(now) - wib(at);
  if (days === 0) return t('rank.last.hours', { n: Math.floor(min / 60) });
  if (days === 1) return t('rank.last.yesterday');
  if (days < 7) return t('rank.last.days', { n: days });
  if (days < 30) return t('rank.last.weeks', { n: Math.floor(days / 7) });
  if (days < 365) return t('rank.last.months', { n: Math.floor(days / 30) });
  return t('rank.last.years');
}
