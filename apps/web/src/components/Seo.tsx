import { useEffect } from 'react';

interface SeoProps {
  title?: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
}

const DEFAULT_TITLE = 'Udakids – Game Edukasi Anak: Matematika, Sains & English';
const DEFAULT_DESCRIPTION =
  'Latihan interaktif PAUD sampai SMP: matematika, sains, bahasa Inggris, dan logika bersama robot Momo. Soal dibacakan, tanpa iklan, bisa offline.';
const BASE_URL = 'https://kids.eduskul.my.id';

export function Seo({ title, description, canonical, noindex = false }: SeoProps) {
  useEffect(() => {
    // 1. Update Title
    const fullTitle = title ? `${title} | Udakids` : DEFAULT_TITLE;
    document.title = fullTitle;

    // 2. Update or create Meta Description
    let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = description || DEFAULT_DESCRIPTION;

    // 3. Update or create Canonical Link
    let linkCanonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.rel = 'canonical';
      document.head.appendChild(linkCanonical);
    }
    const targetCanonical = canonical
      ? canonical.startsWith('http')
        ? canonical
        : `${BASE_URL}${canonical}`
      : `${BASE_URL}${window.location.pathname}`;
    linkCanonical.href = targetCanonical;

    // 4. Update or create Robots tag
    let metaRobots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.name = 'robots';
      document.head.appendChild(metaRobots);
    }
    metaRobots.content = noindex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

    // 5. Open Graph Title, Description, and URL
    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = fullTitle;
    const ogDesc = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    if (ogDesc) ogDesc.content = description || DEFAULT_DESCRIPTION;
    const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (ogUrl) ogUrl.content = targetCanonical;
  }, [title, description, canonical, noindex]);

  return null;
}
