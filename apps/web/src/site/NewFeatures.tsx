import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPercentBp, formatRupiah, MAX_CHILDREN_PER_PARENT } from '@little-coder/engine';
import { api } from '../api/client';
import { t } from '../i18n';
import { Icon } from './Decor';

/** Aturan afiliasi publik (`GET /public/affiliate`, D-063) — angka mengikuti pengaturan admin. */
export type PublicAffiliate = {
  enabled: boolean;
  signupBonus: number;
  commissionBp: number;
  minPayout: number;
  qualifyRounds: number;
  maxChildren: number;
};

function usePublicAffiliate() {
  const [data, setData] = useState<PublicAffiliate>();
  useEffect(() => {
    api<PublicAffiliate>('/public/affiliate')
      .then((d) => d && typeof d.enabled === 'boolean' && setData(d))
      .catch(() => undefined);
  }, []);
  return data;
}

/**
 * "Fitur terbaru" di landing: program ajak teman (hanya untuk akun orang tua, bukan anak) dan satu akun untuk
 * hingga 7 anak. Kartu afiliasi hilang bila program dimatikan admin.
 */
export function NewFeaturesSection() {
  const aff = usePublicAffiliate();
  const max = aff?.maxChildren ?? MAX_CHILDREN_PER_PARENT;
  return (
    <section id="fitur-baru" className="site-section news" aria-labelledby="news-title">
      <p className="news-kicker">{t('site.news.kicker')}</p>
      <h2 id="news-title">{t('site.news.title')}</h2>
      <div className={`news-grid${aff?.enabled ? '' : ' is-single'}`}>
        {aff?.enabled && (
          <article className="news-card news-aff" aria-labelledby="news-aff-title">
            <span className="news-badge">{t('site.news.badge')}</span>
            <h3 id="news-aff-title">{t('site.news.aff.title')}</h3>
            <p>{t('site.news.aff.lead')}</p>
            <ol className="news-steps">
              <li>
                <strong>{formatRupiah(aff.signupBonus)}</strong>
                <span>{t('site.news.aff.step1', { rounds: aff.qualifyRounds })}</span>
              </li>
              <li>
                <strong>{formatPercentBp(aff.commissionBp)}</strong>
                <span>{t('site.news.aff.step2')}</span>
              </li>
              <li>
                <strong>{formatRupiah(aff.minPayout)}</strong>
                <span>{t('site.news.aff.step3')}</span>
              </li>
            </ol>
            <div className="news-actions">
              <Link to="/orang-tua/daftar" className="site-btn">
                {t('site.news.aff.cta')}
              </Link>
              <Link to="/orang-tua/afiliasi" className="site-btn ghost">
                {t('site.news.aff.have')}
              </Link>
            </div>
            <small className="news-note">{t('site.news.aff.note')}</small>
          </article>
        )}
        <article className="news-card news-kids" aria-labelledby="news-kids-title">
          <Icon name="family" size={56} />
          <h3 id="news-kids-title">{t('site.news.kids.title', { n: max })}</h3>
          <p>{t('site.news.kids.text', { n: max })}</p>
          <ul className="news-list">
            <li>{t('site.news.kids.point1')}</li>
            <li>{t('site.news.kids.point2', { n: max })}</li>
            <li>{t('site.news.kids.point3')}</li>
          </ul>
        </article>
      </div>
    </section>
  );
}
