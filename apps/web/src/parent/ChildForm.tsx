import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  MOMO_COLORS,
  childProfileSchema,
  childUpdateSchema,
  type Color,
  type PinPicture,
} from '@little-coder/engine';
import { errorMessage } from '../api/client';
import type { ChildProfile } from '../api/types';
import { useApiCall, useFetch } from '../auth/useApi';
import { t } from '../i18n';
import { familySteps, Stepper } from '../site/AuthLayout';
import { Button, Card, Notice, RequiredNote, Spinner, TextField } from '../ui/ui';
import { ColorPicker } from './ColorPicker';
import { fieldErrors, serverFieldErrors } from './form';
import { PinSetter } from './PinSetter';

export type ChildFormMode = 'new' | 'edit' | 'pin';

const isColor = (c: string): c is Color => (MOMO_COLORS as readonly string[]).includes(c);

function Form({ mode, child }: { mode: ChildFormMode; child?: ChildProfile }) {
  const navigate = useNavigate();
  const welcome = (useLocation().state as { welcome?: boolean } | null)?.welcome === true;
  const call = useApiCall('parent');
  const [nickname, setNickname] = useState(child?.nickname ?? '');
  const [color, setColor] = useState<Color>(
    child && isColor(child.momoColor) ? child.momoColor : MOMO_COLORS[0],
  );
  const [pin, setPin] = useState<PinPicture[] | null>(null);
  const [classCode, setClassCode] = useState(child?.classCode ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const withPin = mode !== 'edit';
  const withProfile = mode !== 'pin';

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    const input = {
      ...(withProfile && { nickname, momoColor: color }),
      ...(withPin && pin && { pin }),
      // Kode kelas (D-022): kosong saat membuat = tanpa kelas; dikosongkan saat mengubah = keluar kelas.
      ...(withProfile &&
        (classCode.trim()
          ? { classCode: classCode.trim().toUpperCase() }
          : mode === 'edit' && child?.classCode
            ? { classCode: null }
            : {})),
    };
    const parsed =
      mode === 'new' ? childProfileSchema.safeParse(input) : childUpdateSchema.safeParse(input);
    const next = parsed.success ? {} : fieldErrors(parsed.error.issues);
    if (withPin && !pin) next.pin = t('parent.form.pinMissing');
    setErrors(next);
    if (!parsed.success || Object.keys(next).length > 0) return;
    setBusy(true);
    try {
      const saved =
        mode === 'new'
          ? await call<ChildProfile>('/parent/children', { body: parsed.data })
          : await call<ChildProfile>(`/parent/children/${child!.id}`, {
              method: 'PATCH',
              body: parsed.data,
            });
      navigate('/orang-tua', { state: { saved: saved?.nickname ?? nickname, welcome } });
    } catch (err) {
      setErrors(serverFieldErrors(err));
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  const title =
    mode === 'new'
      ? t('parent.form.newTitle')
      : mode === 'edit'
        ? t('parent.form.editTitle', { name: child?.nickname ?? '' })
        : t('parent.form.pinTitle', { name: child?.nickname ?? '' });

  return (
    <div className="pa-form">
      {welcome && mode === 'new' && <Stepper current={2} labels={familySteps()} />}
      <Card title={title}>
        {withProfile && <Notice tone="info">{t('parent.form.privacy')}</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
        <form onSubmit={submit} noValidate>
          {withProfile && <RequiredNote />}
          {withProfile && (
            <>
              <TextField
                required
                label={t('parent.form.nickname')}
                hint={t('parent.form.nicknameHint')}
                autoComplete="off"
                maxLength={20}
                value={nickname}
                error={errors.nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
              <ColorPicker
                label={t('parent.form.color')}
                hint={t('parent.form.colorHint')}
                value={color}
                onChange={setColor}
              />
              <TextField
                label={t('parent.form.classCode')}
                hint={t('parent.form.classCodeHint')}
                autoComplete="off"
                maxLength={6}
                value={classCode}
                error={errors.classCode}
                onChange={(e) =>
                  setClassCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                }
              />
            </>
          )}
          {withPin && (
            <fieldset
              className="pa-pin-field"
              aria-describedby={errors.pin ? 'pa-pin-error' : undefined}
            >
              <legend>{t('parent.form.pin')}</legend>
              <PinSetter onChange={setPin} />
              {errors.pin && (
                <p id="pa-pin-error" className="ui-error pa-field-error" role="alert">
                  {errors.pin}
                </p>
              )}
            </fieldset>
          )}
          <div className="ui-row pa-form-actions">
            <Button type="submit" disabled={busy}>
              {busy
                ? t('parent.saving')
                : mode === 'new'
                  ? t('parent.form.submitNew')
                  : mode === 'edit'
                    ? t('parent.form.submitEdit')
                    : t('parent.form.submitPin')}
            </Button>
            <Link className="ui-btn ui-btn-ghost" to="/orang-tua">
              {t('parent.cancel')}
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}

/** Tambah anak (mode new), ubah nama/warna (edit), atau ganti sandi gambar (pin). */
export function ChildForm({ mode }: { mode: ChildFormMode }) {
  const { id } = useParams();
  const list = useFetch<ChildProfile[]>('parent', mode === 'new' ? null : '/parent/children');
  if (mode === 'new') return <Form mode="new" />;
  if (list.loading) return <Spinner label={t('parent.loading')} />;
  const child = list.data?.find((c) => c.id === id);
  if (!child) {
    return (
      <>
        <Notice tone="error">
          {list.error ? errorMessage(list.error) : t('parent.child.notFound')}
        </Notice>
        <Link to="/orang-tua">{t('parent.back')}</Link>
      </>
    );
  }
  return <Form key={child.id} mode={mode} child={child} />;
}
