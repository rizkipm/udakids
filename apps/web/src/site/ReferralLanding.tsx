import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { isReferralCode, normalizeReferralCode } from '@little-coder/engine';
import { api } from '../api/client';
import { rememberReferral } from './referral';

/** Link referal `/r/KODE` (D-063): simpan kode, hitung klik, lalu langsung ke daftar orang tua. */
export function ReferralLanding() {
  const raw = useParams().code ?? '';
  const valid = isReferralCode(raw);
  const code = valid ? normalizeReferralCode(raw) : '';
  useEffect(() => {
    if (!code) return;
    rememberReferral(code);
    void api(`/referral/${code}/click`, { method: 'POST' }).catch(() => undefined);
  }, [code]);
  return <Navigate to={code ? `/orang-tua/daftar?ref=${code}` : '/orang-tua/daftar'} replace />;
}
