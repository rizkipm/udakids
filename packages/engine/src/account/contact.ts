import { z } from 'zod';

/**
 * Kontak WhatsApp (D-064), diatur admin:
 * - `adminWhatsapp`: tombol "Hubungi admin" melayang di kanan bawah (landing, area orang tua, admin/guru;
 *   TIDAK di area anak — PRD A17 tanpa fitur chat di area anak);
 * - `groupWhatsapp`: tautan grup WhatsApp orang tua yang dicantumkan di email verifikasi/sambutan.
 * Kosong = tidak ditampilkan.
 */

const WA_HOSTS = new Set(['wa.me', 'api.whatsapp.com', 'whatsapp.com', 'www.whatsapp.com']);
const GROUP_HOSTS = new Set(['chat.whatsapp.com']);

/** Nomor HP Indonesia (08…, 62…, +62…) → https://wa.me/62…; selain nomor dikembalikan apa adanya. */
export function whatsappFromPhone(input: string): string {
  const raw = input.trim();
  if (!/^\+?[\d\s().-]{8,20}$/.test(raw)) return raw;
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}

/** Host dari URL https (engine tanpa global `URL`); selain https / format aneh → undefined. */
function httpsHost(v: string): string | undefined {
  const m = /^https:\/\/([a-z0-9.-]+)(?::\d+)?(?:[/?#]|$)/i.exec(v);
  return m && !/\s/.test(v) ? m[1]!.toLowerCase() : undefined;
}

const httpsOn = (hosts: Set<string>, message: string) =>
  z
    .string()
    .trim()
    .max(300)
    .refine((v) => {
      if (v === '') return true;
      const host = httpsHost(v);
      return host !== undefined && hosts.has(host);
    }, message);

export const contactSettingsSchema = z.strictObject({
  adminWhatsapp: z.preprocess(
    (v) => (typeof v === 'string' ? whatsappFromPhone(v) : v),
    httpsOn(WA_HOSTS, 'isi nomor WhatsApp (08…) atau link https://wa.me/…'),
  ),
  /** Pesan pembuka saat orang tua mengetuk tombol (opsional). */
  adminMessage: z.string().trim().max(200).default(''),
  groupWhatsapp: httpsOn(GROUP_HOSTS, 'isi link undangan grup https://chat.whatsapp.com/…'),
});
export type ContactSettings = z.infer<typeof contactSettingsSchema>;

export const DEFAULT_CONTACT_SETTINGS: ContactSettings = {
  adminWhatsapp: '',
  adminMessage: '',
  groupWhatsapp: '',
};

/** Link tombol admin, dengan pesan pembuka bila ada (`?text=` untuk wa.me / api.whatsapp.com). */
export function adminWhatsappHref(c: Pick<ContactSettings, 'adminWhatsapp' | 'adminMessage'>) {
  if (!c.adminWhatsapp) return '';
  if (!c.adminMessage) return c.adminWhatsapp;
  const [base, hash = ''] = c.adminWhatsapp.split('#', 2);
  const clean = base!.replace(/([?&])text=[^&]*&?/, '$1').replace(/[?&]$/, '');
  const text = encodeURIComponent(c.adminMessage).replace(/%20/g, '+');
  return `${clean}${clean.includes('?') ? '&' : '?'}text=${text}${hash ? `#${hash}` : ''}`;
}
