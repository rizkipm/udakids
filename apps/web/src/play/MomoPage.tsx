import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Color, MomoLook } from '@little-coder/engine';
import { useApiCall } from '../auth/useApi';
import { MomoStudio, plainLook, type MomoStyle } from '../components/MomoStudio';
import { t } from '../i18n';
import { SpeakButton } from './ItemPlayer';
import { PageHead } from './Profile';

/** Anak menghias Momo-nya sendiri: warna, gradasi, aksesori (D-051). */
export function MomoPage({
  momoColor,
  momoLook,
  onSaved,
}: {
  momoColor: Color;
  momoLook: MomoLook | null;
  onSaved: () => void;
}) {
  const call = useApiCall('child');
  const navigate = useNavigate();
  const [style, setStyle] = useState<MomoStyle>({
    color: momoColor,
    look: momoLook ?? plainLook(),
  });
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function save() {
    setBusy(true);
    setFailed(false);
    try {
      await call('/auth/me/momo', {
        method: 'PUT',
        body: { momoColor: style.color, momoLook: style.look },
      });
      onSaved();
      navigate('/play/profil');
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="library momo-page">
      <PageHead title={t('play.momo.title')} />
      <div className="kid-say">
        <SpeakButton text={t('play.momo.say')} />
        <p>{t('play.momo.say')}</p>
      </div>
      <MomoStudio value={style} onChange={setStyle} />
      {failed && (
        <p className="kid-alert is-compact" role="status">
          {t('play.momo.offline')}
        </p>
      )}
      <div className="kid-row momo-actions">
        <button type="button" className="kid-btn" disabled={busy} onClick={() => void save()}>
          {busy ? t('play.momo.saving') : t('play.momo.save')}
        </button>
      </div>
    </main>
  );
}
