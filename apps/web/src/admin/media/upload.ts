import { ApiError } from '../../api/client';
import { getSession, setSession } from '../../auth/session';
import { API_URL } from '../../config/app';
import { t } from '../../i18n';

/** Sama dengan server (D-042): hanya JPG/PNG/WEBP, maks 3 MB. Server tetap memeriksa isi file. */
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const IMAGE_ACCEPT = IMAGE_TYPES.join(',');

export function imageProblem(file: { size: number; type: string }): string | undefined {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) return t('media.upload.type');
  if (file.size > IMAGE_MAX_BYTES) return t('media.upload.size');
  if (file.size === 0) return t('media.upload.empty');
  return undefined;
}

export type UploadedImage = { id: string; mime: string; bytes: number };

/** Unggah gambar: badan = isi file mentah + Content-Type, dengan token staf (admin). */
export async function uploadImage(file: Blob): Promise<UploadedImage> {
  const problem = imageProblem(file);
  if (problem) throw new ApiError(400, problem);
  const token = getSession('staff')?.token;
  let res: Response;
  try {
    res = await fetch(`${API_URL}/admin/media`, {
      method: 'POST',
      headers: { 'Content-Type': file.type, ...(token && { Authorization: `Bearer ${token}` }) },
      body: file,
    });
  } catch {
    throw new ApiError(0, 'Tidak tersambung ke server');
  }
  if (!res.ok) {
    if (res.status === 401) setSession('staff', null);
    if (res.status === 413) throw new ApiError(413, t('media.upload.size'));
    let message = res.statusText;
    try {
      const body = (await res.json()) as { message?: unknown };
      if (typeof body.message === 'string') message = body.message;
    } catch {
      /* bukan JSON */
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as UploadedImage;
}

/** "foto-workshop_bandung.jpg" → "foto workshop bandung" (judul awal galeri, maks 80). */
export function titleFromFile(name: string): string {
  const base = name
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return (base || 'Foto kegiatan').slice(0, 80);
}

/** Sama dengan validasi server: path internal "/…" (bukan "//") atau https://. */
export function isSafeCtaUrl(v: string): boolean {
  if (v === '') return true;
  // eslint-disable-next-line no-control-regex
  if (/[\s\\\u0000-\u001f\u007f]/.test(v)) return false;
  if (v.startsWith('/')) return !v.startsWith('//');
  if (!v.startsWith('https://')) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && !!u.hostname && !u.username && !u.password;
  } catch {
    return false;
  }
}
