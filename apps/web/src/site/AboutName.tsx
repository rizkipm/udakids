import { APP_NAME, CHARACTER_NAME } from '../config/app';
import { t } from '../i18n';

/** Lengkung atap gonjong rumah gadang + titik kunyit (ciri khas UdaKids, D-107). */
export function GonjongArc({ width = 112 }: { width?: number }) {
  return (
    <svg
      className="uk-gonjong"
      viewBox="0 0 112 44"
      width={width}
      height={(width * 44) / 112}
      aria-hidden
    >
      <path d="M6 6 C24 22 36 30 56 30 C76 30 88 22 106 6" />
      <circle cx="56" cy="14" r="7" />
    </svg>
  );
}

/** Pita pucuk rebung: segitiga gonjong/kunyit bergantian. Maksimal satu per layar (BRAND.md). */
export function RebungBand() {
  return (
    <svg className="uk-rebung" preserveAspectRatio="none" aria-hidden>
      <defs>
        <pattern id="uk-rebung-pola" width="48" height="24" patternUnits="userSpaceOnUse">
          <path className="a" d="M0 24 L12 0 L24 24 Z" />
          <path className="b" d="M24 24 L36 4 L48 24 Z" />
        </pattern>
      </defs>
      <rect width="100%" height="24" fill="url(#uk-rebung-pola)" />
    </svg>
  );
}

/** Warna marawa: hitam, merah, kuning. */
function MarawaIcon() {
  return (
    <svg viewBox="0 0 96 64" width="96" height="64" aria-hidden className="about-name-marawa">
      <rect
        x="4"
        y="8"
        width="28"
        height="48"
        rx="6"
        fill="var(--ilustrasi-garis)"
        stroke="var(--garis-tegas)"
        strokeWidth="2"
      />
      <rect x="34" y="8" width="28" height="48" rx="6" fill="var(--gonjong)" />
      <rect x="64" y="8" width="28" height="48" rx="6" fill="var(--kunyit)" />
    </svg>
  );
}

/**
 * "Kenapa namanya UdaKids?" (D-107): arti Uda (kakak dalam bahasa Minang), logo dari atap gonjong, warna marawa &
 * motif pucuk rebung. Hanya nama UdaKids yang tampil (BRAND.md: satu nama, satu wajah).
 */
export function AboutNameSection() {
  const cards = [
    {
      key: 'uda',
      icon: <img src="/brand/udakids-mark.svg" width={64} height={64} alt="" />,
      title: t('site.about.udaTitle'),
      body: t('site.about.udaBody', { name: CHARACTER_NAME }),
    },
    {
      key: 'gonjong',
      icon: <GonjongArc width={96} />,
      title: t('site.about.gonjongTitle'),
      body: t('site.about.gonjongBody', { app: APP_NAME }),
    },
    {
      key: 'marawa',
      icon: <MarawaIcon />,
      title: t('site.about.marawaTitle'),
      body: t('site.about.marawaBody'),
    },
  ];
  return (
    <section id="tentang" className="site-section about-name" aria-labelledby="about-name-title">
      <RebungBand />
      <h2 id="about-name-title">{t('site.about.title', { app: APP_NAME })}</h2>
      <p className="section-lead">
        {t('site.about.lead', { app: APP_NAME, name: CHARACTER_NAME })}
      </p>
      <ul className="about-name-cards">
        {cards.map((c) => (
          <li key={c.key} className="about-name-card">
            <span className="about-name-icon">{c.icon}</span>
            <h3>{c.title}</h3>
            <p>{c.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
