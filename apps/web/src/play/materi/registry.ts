import { MATERI_ANGKA } from './angka';
import type { Materi } from './types';

/** Materi lengkap yang sudah ada (purwarupa): kunci = domain/kelas/kode topik. */
const MATERI: Record<string, Materi> = {
  'math/tkosn/A': MATERI_ANGKA,
};

export const materiOf = (domain: string, grade: string, code: string): Materi | undefined =>
  MATERI[`${domain}/${grade}/${code}`];
