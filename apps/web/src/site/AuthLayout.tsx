import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Color } from '@little-coder/engine';
import { Momo, type MomoMood } from '../components/Momo';
import { APP_NAME } from '../config/app';
import { t } from '../i18n';
import { Cloud, Icon, ProgramCard, Star, type FeatureIcon } from './Decor';
import './site.css';

export type AuthVariant = 'parent' | 'staff';

const ART: Record<AuthVariant, { color: Color; mood: MomoMood; points: [FeatureIcon, string][] }> =
  {
    parent: {
      color: 'hijau',
      mood: 'happy',
      points: [
        ['family', 'site.auth.parent.p1'],
        ['shield', 'site.auth.parent.p2'],
        ['trophy', 'site.auth.parent.p3'],
      ],
    },
    staff: {
      color: 'biru',
      mood: 'proud',
      points: [
        ['class', 'site.auth.staff.p1'],
        ['book', 'site.auth.staff.p2'],
        ['staff', 'site.auth.staff.p3'],
      ],
    },
  };

/**
 * Halaman masuk/daftar orang dewasa: panel ilustrasi berwarna (atas di ponsel, kiri di layar lebar)
 * + kartu formulir. Formulir tetap memakai komponen `ui` (kontras tinggi, bisa mouse saja).
 */
export function AuthLayout({
  variant,
  title,
  text,
  steps,
  children,
}: {
  variant: AuthVariant;
  title: string;
  text: string;
  /** Langkah registrasi (1-based) untuk wizard keluarga. */
  steps?: { current: number; labels: string[] };
  children: ReactNode;
}) {
  const art = ART[variant];
  return (
    <div className={`ui-shell auth-page auth-${variant}`}>
      <aside className="auth-art">
        <Link to="/" className="site-brand on-dark">
          <Momo mood="happy" size={40} color={art.color} />
          <span>{APP_NAME}</span>
        </Link>
        <div className="auth-hero">
          <Cloud className="float-a auth-cloud" width={110} />
          <Star className="spin auth-star" size={30} />
          <div className="auth-momo float-b">
            <Momo mood={art.mood} color={art.color} size={150} />
          </div>
          <ProgramCard dir="right" color="#ff7a59" size={48} className="auth-card-1 float-a" />
          <ProgramCard dir="up" color="#f7c948" size={42} className="auth-card-2 float-b" />
          <h2>{title}</h2>
          <p>{text}</p>
          <ul className="auth-points">
            {art.points.map(([icon, key]) => (
              <li key={key}>
                <Icon name={icon} size={30} />
                <span>{t(key as never)}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-wrap">
          {steps && <Stepper {...steps} />}
          {children}
          <nav className="auth-links">
            <Link to="/">{t('site.auth.home')}</Link>
            <Link to="/play">{t('site.auth.child')}</Link>
          </nav>
        </div>
      </main>
    </div>
  );
}

export function Stepper({ current, labels }: { current: number; labels: string[] }) {
  return (
    <ol
      className="stepper"
      aria-label={t('site.steps.label', { n: current, total: labels.length })}
    >
      {labels.map((label, i) => {
        const n = i + 1;
        const state = n < current ? 'is-done' : n === current ? 'is-current' : '';
        return (
          <li key={label} className={state} aria-current={n === current ? 'step' : undefined}>
            <span className="stepper-dot">
              {n < current ? (
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                  <path
                    d="M5 12l5 5 9-10"
                    stroke="currentColor"
                    strokeWidth="3.4"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                n
              )}
            </span>
            <span className="stepper-label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export const familySteps = () => [
  t('site.steps.account'),
  t('site.steps.child'),
  t('site.steps.play'),
];
