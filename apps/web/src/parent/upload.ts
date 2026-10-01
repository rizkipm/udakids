import { PROOF_MAX_BYTES, PROOF_TYPES } from '@little-coder/engine';
import { ApiError } from '../api/client';
import { getSession, setSession } from '../auth/session';
import { API_URL } from '../config/app';
import { t } from '../i18n';
import type { Order } from './billingTypes';

/** Cek bukti di perangkat dulu (server tetap memeriksa isi file). `undefined` = boleh dikirim. */
export function proofProblem(file: { size: number; type: string }): string | undefined {
  if (!(PROOF_TYPES as readonly string[]).includes(file.type)) return t('parent.order.proofType');
  if (file.size > PROOF_MAX_BYTES) return t('parent.order.proofSize');
  if (file.size === 0) return t('parent.order.proofEmpty');
  return undefined;
}

async function send(path: string, init: RequestInit): Promise<Response> {
  const token = getSession('parent')?.token;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ApiError(0, 'Tidak tersambung ke server');
  }
  if (!res.ok) {
    if (res.status === 401) setSession('parent', null);
    let message = res.statusText;
    try {
      const body = (await res.json()) as { message?: unknown };
      if (typeof body.message === 'string') message = body.message;
    } catch {
      /* badan bukan JSON */
    }
    throw new ApiError(res.status, message);
  }
  return res;
}

/** Unggah bukti transfer: badan = isi file mentah dengan Content-Type sesuai jenis file. */
export async function uploadProof(orderId: string, file: Blob): Promise<Order> {
  const res = await send(`/parent/orders/${orderId}/proof`, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  return (await res.json()) as Order;
}

/** Ambil bukti yang sudah diunggah (butuh token, jadi lewat fetch → Blob). */
export async function fetchProof(orderId: string): Promise<Blob> {
  const res = await send(`/parent/orders/${orderId}/proof`, { method: 'GET' });
  return res.blob();
}
