// PRD A18 — nama produk & karakter; ubah hanya di sini. Merek: UdaKids (D-097).
export const APP_NAME = 'UdaKids';
export const CHARACTER_NAME = 'Momo';

export const FEATURE_VOICE = import.meta.env.VITE_FEATURE_VOICE === 'true';
/**
 * Alamat API. Bawaan `/api` = alamat yang sama dengan web (proxy Vite di dev/preview, Nginx di server),
 * sehingga bisa dibuka dari perangkat lain di jaringan lokal (iPad) maupun domain produksi.
 */
export const API_URL = import.meta.env.VITE_API_URL || '/api';
