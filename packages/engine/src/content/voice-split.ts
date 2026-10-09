import { textLanguage, type VoiceLang } from './voice.js';

/**
 * Pemecah kalimat untuk suara Chirp (D-098), dipakai perangkat (urutan klip) dan server (daftar teks yang boleh
 * dibuatkan suara), supaya setiap potongan yang diminta perangkat pasti dikenali server.
 */
export const SEGMENT_MAX = 400;

/** Potong kalimat yang sangat panjang di spasi (tanpa memecah "a.m." atau "0,5"). */
/**
 * Kalimat demi kalimat (titik/tanda tanya/seru, boleh diikuti tanda kutip penutup, + spasi + huruf besar), tanpa
 * memecah "7 a.m." atau "0,5".
 */
export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/([.!?…]+["”’)]*)\s+(?=["“‘(]?[A-Z0-9])/g, '$1\u0001')
    .split('\u0001')
    .filter(Boolean);
}

export function cutLong(x: string, max: number): string[] {
  const out: string[] = [];
  let rest = x.trim();
  while (rest.length > max) {
    const cut = rest.lastIndexOf(' ', max);
    const at = cut > max / 2 ? cut : max;
    out.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) out.push(rest);
  return out;
}

/**
 * Pecah per kalimat (titik/tanda tanya/seru + spasi + huruf besar), tanpa memecah "7 a.m." atau "0,5"; lalu
 * gabungkan lagi kalimat berurutan sampai ± `SEGMENT_MAX` huruf.
 */
export function speechSegments(text: string, max = SEGMENT_MAX): string[] {
  const sentences = splitSentences(text).flatMap((x) => cutLong(x, max));
  const out: string[] = [];
  for (const x of sentences.filter(Boolean)) {
    const last = out.at(-1);
    if (last && last.length + x.length + 1 <= max) out[out.length - 1] = `${last} ${x}`;
    else out.push(x);
  }
  return out;
}

/** Kelompok kalimat berbahasa sama (English → en-GB, selain itu id-ID); kalimat tak pasti ikut sebelumnya. */
export function langSegments(
  text: string,
  base: VoiceLang = 'id-ID',
): { text: string; lang: VoiceLang }[] {
  const out: { text: string; lang: VoiceLang }[] = [];
  const sentences = splitSentences(text);
  // Label pendek + isi berbeda bahasa ("Ingat: at 7 a.m., …"): label dan isinya dibacakan terpisah.
  const pieces = sentences.flatMap((x) => {
    const m = /^([^:]{1,24}):\s+(.+)$/.exec(x);
    if (!m || m[1]!.split(' ').length > 3) return [x];
    const [label, rest] = [`${m[1]}:`, m[2]!];
    return (textLanguage(label) ?? 'id') === (textLanguage(rest) ?? 'id') ? [x] : [label, rest];
  });
  for (const x of pieces) {
    const guess = textLanguage(x);
    const lang: VoiceLang = guess
      ? guess === 'en'
        ? 'en-GB'
        : 'id-ID'
      : (out.at(-1)?.lang ?? base);
    const last = out.at(-1);
    if (last && last.lang === lang && last.text.length + x.length + 1 <= SEGMENT_MAX)
      last.text = `${last.text} ${x}`;
    else for (const piece of cutLong(x, SEGMENT_MAX)) out.push({ text: piece, lang });
  }
  return out;
}

/**
 * Kalimat tombol "Dengarkan" di halaman topik: intro lalu setiap tips dengan label ("Ingat:"). Setiap bagian diberi
 * titik bila belum berakhir tanda baca, supaya batas kalimatnya jelas bagi pemecah kalimat (D-098). Dipakai perangkat
 * dan server (klip dibuat lebih dulu) agar teksnya sama persis.
 */
export function topicReadAloud(intro: string, tips: readonly string[], label: string): string {
  const end = (x: string) => (/[.!?…]["”’)]*$/.test(x.trim()) ? x.trim() : `${x.trim()}.`);
  return [end(intro), ...tips.map((x) => `${label} ${end(x)}`)].join(' ');
}
