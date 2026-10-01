import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatRupiah, type Pricing as Price } from '@little-coder/engine';
import { api } from '../api/client';
import { t } from '../i18n';

type PublicPackage = {
  id: string;
  name: string;
  description: string;
  scope: 'all' | 'books';
  books: { domain: string; grade: string }[];
  durationDays: number | null;
  pricing: Price;
  discountEndsAt: string | null;
};
type PublicPricing = { paywall: boolean; freeLevels: number; packages: PublicPackage[] };

/**
 * Harga di landing (untuk orang dewasa, D-036/D-038): level gratis + paket aktif dari database.
 * Pembelian hanya di area orang tua; anak tidak pernah melihat harga.
 */
export function PricingSection({
  bookTitle,
}: {
  bookTitle: (domain: string, grade: string) => string;
}) {
  const [data, setData] = useState<PublicPricing>();
  useEffect(() => {
    api<PublicPricing>('/public/pricing')
      .then((d) => Array.isArray(d?.packages) && setData(d))
      .catch(() => undefined);
  }, []);
  if (!data) return null;

  return (
    <section id="harga" className="site-section pricing" aria-labelledby="harga-title">
      <h2 id="harga-title">{t('site.price.title')}</h2>
      <p className="section-lead">
        {data.paywall ? t('site.price.lead', { free: data.freeLevels }) : t('site.price.allFree')}
      </p>
      <div className="price-grid">
        <article className="price-card is-free">
          <h3>{t('site.price.freeTitle')}</h3>
          <p className="price-amount">{t('site.price.freeAmount')}</p>
          <ul>
            <li>
              {data.paywall
                ? t('site.price.free1', { free: data.freeLevels })
                : t('site.price.free1All')}
            </li>
            <li>{t('site.price.free2')}</li>
            <li>{t('site.price.free3')}</li>
          </ul>
          <Link to="/play/daftar" className="site-btn">
            {t('site.cta.self')}
          </Link>
        </article>
        {data.packages.map((p) => (
          <article key={p.id} className="price-card">
            {p.pricing.discountActive && (
              <span className="price-badge">
                {t('site.price.save', { amount: formatRupiah(p.pricing.discount) })}
              </span>
            )}
            <h3>{p.name}</h3>
            <p className="price-amount">
              {p.pricing.discountActive && <s>{formatRupiah(p.pricing.normal)}</s>}{' '}
              <strong>{formatRupiah(p.pricing.final)}</strong>
            </p>
            <p className="price-term">
              {p.durationDays === null
                ? t('site.price.forever')
                : t('site.price.days', { n: p.durationDays })}
              {p.pricing.discountActive && p.discountEndsAt
                ? ` · ${t('site.price.until', {
                    date: new Date(p.discountEndsAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    }),
                  })}`
                : ''}
            </p>
            {p.description && <p>{p.description}</p>}
            <ul>
              <li>
                {p.scope === 'all'
                  ? t('site.price.allBooks')
                  : p.books.map((b) => bookTitle(b.domain, b.grade)).join(', ')}
              </li>
              <li>{t('site.price.family')}</li>
            </ul>
            <Link to="/orang-tua/daftar" className="site-btn ghost">
              {t('site.price.buy')}
            </Link>
          </article>
        ))}
      </div>
      <p className="price-note">{t('site.price.note')}</p>
    </section>
  );
}
