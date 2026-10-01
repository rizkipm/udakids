import { useState, type FormEvent } from 'react';
import { childClaimSchema, type PinPicture } from '@little-coder/engine';
import { errorMessage } from '../api/client';
import type { ChildProfile } from '../api/types';
import { useApiCall } from '../auth/useApi';
import { t } from '../i18n';
import { Button, Card, Notice, RequiredNote, TextField } from '../ui/ui';
import { PinEntry } from './PinSetter';

/** Tautkan anak yang daftar sendiri (D-025) ke akun orang tua: kode keluarga anak + sandi gambar. */
export function ClaimChild({
  onClaimed,
  onClose,
}: {
  onClaimed: (child: ChildProfile) => void;
  onClose: () => void;
}) {
  const call = useApiCall('parent');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState<PinPicture[] | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  // Ganti key → PinEntry kembali kosong setelah gagal.
  const [pinKey, setPinKey] = useState(0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    const next: Record<string, string> = {};
    const parsed = childClaimSchema.safeParse({ familyCode: code, pin: pin ?? [] });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? '');
        if (key === 'familyCode') next.familyCode = t('parent.claim.codeInvalid');
        if (key === 'pin') next.pin = t('parent.claim.pinMissing');
      }
    }
    setErrors(next);
    if (!parsed.success) return;
    setBusy(true);
    try {
      const child = await call<ChildProfile>('/parent/children/claim', { body: parsed.data });
      onClaimed(child);
    } catch (err) {
      setError(errorMessage(err));
      setPin(null);
      setPinKey((k) => k + 1);
      setBusy(false);
    }
  }

  return (
    <Card title={t('parent.claim.title')} className="pa-claim">
      <p className="ui-muted pa-gap">{t('parent.claim.explain')}</p>
      {error && <Notice tone="error">{error}</Notice>}
      <form onSubmit={submit} noValidate className="pa-form">
        <RequiredNote />
        <TextField
          required
          label={t('parent.claim.code')}
          hint={t('parent.claim.codeHint')}
          autoComplete="off"
          maxLength={6}
          value={code}
          error={errors.familyCode}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
        />
        <fieldset
          className="pa-pin-field"
          aria-describedby={errors.pin ? 'pa-claim-pin-error' : undefined}
        >
          <legend>
            {t('parent.claim.pin')}{' '}
            <span className="ui-req" aria-hidden>
              *
            </span>
          </legend>
          <PinEntry key={pinKey} onChange={setPin} />
          {errors.pin && (
            <p id="pa-claim-pin-error" className="ui-error pa-field-error" role="alert">
              {errors.pin}
            </p>
          )}
        </fieldset>
        <div className="ui-row pa-form-actions">
          <Button type="submit" disabled={busy}>
            {busy ? t('parent.claim.sending') : t('parent.claim.submit')}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={onClose}>
            {t('parent.cancel')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
