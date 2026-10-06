import { useEffect, useState } from 'react';
import { isReferralCode, normalizeReferralCode } from '@little-coder/engine';
import { api } from '../api/client';

/** Cek kode referal (D-063): nama pengajak tersamar, atau kode tidak dikenal. */
export function useReferralPreview(raw: string) {
  const [state, setState] = useState<{ code: string; name?: string; valid: boolean }>();
  const code = normalizeReferralCode(raw);
  useEffect(() => {
    if (!isReferralCode(code)) return setState(undefined);
    const ctl = new AbortController();
    api<{ valid: boolean; name?: string }>(`/referral/${code}`, { signal: ctl.signal })
      .then((r) => setState({ code, valid: r.valid, name: r.name }))
      .catch(() => undefined);
    return () => ctl.abort();
  }, [code]);
  return state?.code === code ? state : undefined;
}
