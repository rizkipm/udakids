import { Link } from 'react-router-dom';
import { formatPercentBp, formatRupiah } from '@little-coder/engine';
import { useFetch } from '../auth/useApi';
import { t } from '../i18n';
import { CopyButton } from './billingUi';

/** Bagian dari GET /parent/affiliate yang dipakai di dasbor. */
type AffiliateSummary = {
  enabled: boolean;
  code: string;
  link: string;
  rules: { signupBonus: number; commissionBp: number; minPayout: number };
  balance: { available: number; pending: number };
  counts: { signups: number; active: number };
};

/**
 * Info program ajak teman di dasbor orang tua (D-063): kode referal, cara dapat bonus & komisi, dan
 * ringkasan saldo; detailnya di halaman Afiliasi. Tidak tampil bila program dimatikan admin.
 */
export function ReferralCard() {
  const { data: d } = useFetch<AffiliateSummary>('parent', '/parent/affiliate');
  if (!d?.enabled || !d.code) return null;
  const share = t('parent.aff.shareText', { link: d.link, code: d.code });
  const rp = (n: number) => formatRupiah(n);
  return (
    <section className="pd-ref" aria-labelledby="pd-ref-title">
      <div className="pd-ref-main">
        <span className="pd-ref-tag">{t('parent.dash.refTag')}</span>
        <h2 id="pd-ref-title">{t('parent.dash.refTitle')}</h2>
        <p>
          {d.rules.signupBonus > 0
            ? t('parent.dash.refLead', {
                bonus: rp(d.rules.signupBonus),
                percent: formatPercentBp(d.rules.commissionBp),
              })
            : t('parent.dash.refLeadNoBonus', {
                percent: formatPercentBp(d.rules.commissionBp),
              })}
        </p>
        <div className="pd-ref-code">
          <span>{t('parent.aff.codeLabel')}</span>
          <strong data-testid="ref-code">{d.code}</strong>
        </div>
        <div className="pd-ref-actions">
          <a
            className="ui-btn ui-btn-primary"
            href={`https://wa.me/?text=${encodeURIComponent(share)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('parent.aff.shareWa')}
          </a>
          <CopyButton text={d.link} label={t('parent.aff.copyLink')} />
          <CopyButton text={d.code} label={t('parent.aff.copyCode')} />
        </div>
      </div>
      <div className="pd-ref-side">
        <h3>{t('parent.dash.refSummary')}</h3>
        <dl className="pd-ref-stats">
          <div>
            <dt>{t('parent.dash.refFriends')}</dt>
            <dd>{d.counts.signups}</dd>
          </div>
          <div>
            <dt>{t('parent.dash.refAvailable')}</dt>
            <dd className="is-money">{rp(d.balance.available)}</dd>
          </div>
          <div>
            <dt>{t('parent.dash.refPending')}</dt>
            <dd>{rp(d.balance.pending)}</dd>
          </div>
        </dl>
        <Link className="ui-btn ui-btn-secondary pd-ref-more" to="/orang-tua/afiliasi">
          {t('parent.dash.refMore')}
        </Link>
        <small className="pd-ref-min">
          {t('parent.dash.refMin', { min: rp(d.rules.minPayout) })}
        </small>
      </div>
    </section>
  );
}
