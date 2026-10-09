import { useEffect, useState, type ReactNode } from 'react';
import { specVisual, type PeragaPhoto, type Spec } from '@little-coder/engine';
import { VisualView } from '../../components/visuals';
import { API_URL } from '../../config/app';

/**
 * Foto realistis simulasi (D-093): foto AI Gambar yang sudah disetujui untuk subjek itu (dibuat sekali, dipakai
 * ulang). Selama belum ada / offline, gambar SVG cadangan yang tampil — simulasi tetap bisa dimainkan.
 */
const cache = new Map<string, Promise<string | null>>();

export function photoUrl(subject: string): Promise<string | null> {
  let p = cache.get(subject);
  if (!p) {
    p = fetch(`${API_URL}/pictures/subject/${subject}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ id: string | null }>) : { id: null }))
      .then((d) => (d.id ? `${API_URL}/pictures/${d.id}` : null))
      .catch(() => null);
    cache.set(subject, p);
  }
  return p;
}

export function usePhoto(subject: string | undefined) {
  const [url, setUrl] = useState<string | null>();
  useEffect(() => {
    let alive = true;
    if (!subject) {
      setUrl(null);
      return;
    }
    void photoUrl(subject).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [subject]);
  return url;
}

/** Foto realistis, atau `gambar` SVG (spec) / `fallback` selama foto belum tersedia. */
export function PeragaPicture({
  foto,
  gambar,
  alt,
  size = 140,
  fallback,
  className,
}: {
  foto?: PeragaPhoto;
  gambar?: Spec;
  alt: string;
  size?: number;
  fallback?: ReactNode;
  className?: string;
}) {
  const url = usePhoto(foto?.id);
  const [broken, setBroken] = useState(false);
  if (url && !broken)
    return (
      <img
        className={`peraga-photo${className ? ` ${className}` : ''}`}
        src={url}
        alt={alt}
        loading="lazy"
        onError={() => setBroken(true)}
      />
    );
  if (gambar)
    return (
      <span className={`peraga-svg${className ? ` ${className}` : ''}`}>
        <VisualView visual={specVisual(gambar)} size={size} />
      </span>
    );
  // Tanpa foto & tanpa cadangan (mis. foto suasana yang belum dibuat): tidak menampilkan apa pun.
  if (!fallback) return null;
  return <span className={`peraga-svg${className ? ` ${className}` : ''}`}>{fallback}</span>;
}
