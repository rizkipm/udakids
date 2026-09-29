import { z } from 'zod';

/** Pesan validasi Zod dalam Bahasa Indonesia. Dipanggil sekali di titik masuk app (web & API). */
export function setIndonesianValidationMessages() {
  z.config(z.locales.id());
}
