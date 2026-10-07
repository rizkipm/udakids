import type { Access } from '@little-coder/engine';
import { useFetch } from '../auth/useApi';
import { t } from '../i18n';
import { SpeakButton } from './ItemPlayer';

/** Alamat halaman orang tua di domain yang sedang dipakai (mis. kids.eduskul.my.id/orang-tua/paket). */
const parentUrl = (path: string) =>
  `${typeof window !== 'undefined' ? window.location.host : ''}/orang-tua${path}`;

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden className="kid-alert-icon">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path d="M12 7.2v.1M12 10.5v6.3" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

/** Kalimat yang dibacakan untuk anak (tanpa harga, tanpa ajakan membeli langsung). */
export const premiumSay = (access: Access, mock = false) =>
  access.expired
    ? t('play.premium.sayExpired')
    : mock
      ? t('play.premium.sayMock')
      : t('play.premium.say', { n: access.freeLevels + 1 });

/**
 * Info level Premium untuk anak (D-046). Sesuai D-036: tanpa harga, tanpa tombol beli, tanpa tautan ke
 * pembayaran di area anak — hanya penjelasan untuk anak + langkah yang ditujukan ke Ayah/Bunda
 * (dibuka di halaman orang tua yang butuh login orang tua).
 */
export function PremiumNotice({
  access,
  compact = false,
  mock = false,
}: {
  access: Access;
  compact?: boolean;
  /** Mock Test olimpiade (D-072): khusus Premium seluruhnya, bukan "level n ke atas". */
  mock?: boolean;
}) {
  const me = useFetch<{ selfCode?: string | null }>('child', access.noParent ? '/auth/me' : null);
  const code = me.data?.selfCode ?? null;
  const say = premiumSay(access, mock);
  return (
    <section className={`kid-alert${compact ? ' is-compact' : ''}`} role="note">
      <div className="kid-alert-head">
        <InfoIcon />
        <strong>
          {access.expired
            ? t('play.premium.titleExpired')
            : mock
              ? t('play.premium.titleMock')
              : t('play.premium.title', { n: access.freeLevels + 1 })}
        </strong>
        <SpeakButton text={say} />
      </div>
      <p>
        {access.expired
          ? t('play.premium.kidExpired')
          : mock
            ? t('play.premium.kidMock', { free: access.freeLevels })
            : access.freeLevels > 0
              ? t('play.premium.kid', { free: access.freeLevels })
              : t('play.premium.kidNoFree')}
      </p>
      {!compact && (
        <div className="kid-alert-parent">
          <strong>{t('play.premium.parentTitle')}</strong>
          {access.noParent ? (
            <ol>
              <li>{t('play.premium.stepRegister', { url: parentUrl('/daftar') })}</li>
              <li>
                {code ? t('play.premium.stepClaimCode', { code }) : t('play.premium.stepClaim')}
              </li>
              <li>{t('play.premium.stepPackage', { url: parentUrl('/paket') })}</li>
            </ol>
          ) : (
            <ol>
              <li>{t('play.premium.stepLogin', { url: parentUrl('') })}</li>
              <li>{t('play.premium.stepPackage', { url: parentUrl('/paket') })}</li>
              <li>{t('play.premium.stepDone')}</li>
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
