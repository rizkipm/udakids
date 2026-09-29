import type { SkillTemplate } from '@little-coder/engine';
import { useNavigate } from 'react-router-dom';
import { useApiCall } from '../../auth/useApi';
import { t } from '../../i18n';
import { Button } from '../../ui/ui';
import { ActionNotice, confirmAction, Icon, skillPath, useAction } from '../common';

type Props = {
  /** Template yang sudah lolos validasi klien; undefined = tombol simpan nonaktif. */
  template?: SkillTemplate;
  creating: boolean;
  /** Status & versi yang tersimpan di server (untuk skill lama). */
  saved?: { status: 'active' | 'draft'; version: number };
  onSaved: (template: SkillTemplate) => void;
};

/** Simpan / ubah status / hapus skill — dipakai editor generator dan editor soal manual. */
export function SkillActions({ template, creating, saved, onSaved }: Props) {
  const call = useApiCall('staff');
  const navigate = useNavigate();
  const action = useAction();

  async function save() {
    if (!template) return;
    const out = await action.run(
      () =>
        creating
          ? call<SkillTemplate>('/admin/skills', { method: 'POST', body: template })
          : call<SkillTemplate>(`/admin/skills/${encodeURIComponent(template.id)}`, {
              method: 'PUT',
              body: template,
            }),
      t('admin.skill.saved'),
    );
    if (!out) return;
    onSaved(out);
    if (creating) navigate(skillPath(out.id), { replace: true });
  }

  async function toggleStatus() {
    if (!template || !saved) return;
    const status = saved.status === 'active' ? 'draft' : 'active';
    const out = await action.run(
      () =>
        call<SkillTemplate>(`/admin/skills/${encodeURIComponent(template.id)}/status`, {
          method: 'PATCH',
          body: { status },
        }),
      status === 'active' ? t('admin.skill.activated') : t('admin.skill.drafted'),
    );
    if (out) onSaved(out);
  }

  async function remove() {
    if (!template || !confirmAction(t('admin.skill.deleteConfirm', { title: template.title }))) {
      return;
    }
    const out = await action.run(() =>
      call<{ ok: boolean }>(`/admin/skills/${encodeURIComponent(template.id)}`, {
        method: 'DELETE',
      }),
    );
    if (out) navigate('/admin/skill', { replace: true });
  }

  return (
    <div>
      <ActionNotice error={action.error} done={action.done} />
      <div className="ui-row">
        <Button onClick={save} disabled={!template || action.busy}>
          <Icon name="check" />
          {creating ? t('admin.skill.create') : t('admin.skill.save')}
        </Button>
        {!creating && saved && (
          <>
            <Button variant="secondary" onClick={toggleStatus} disabled={action.busy}>
              {saved.status === 'active' ? t('admin.skill.toDraft') : t('admin.skill.toActive')}
            </Button>
            {saved.status === 'draft' && (
              <Button variant="danger" onClick={remove} disabled={action.busy}>
                <Icon name="trash" />
                {t('admin.skill.delete')}
              </Button>
            )}
            <span className="ui-muted">{t('admin.skill.version', { v: saved.version })}</span>
          </>
        )}
      </div>
      {!creating && <p className="ui-muted">{t('admin.skill.versionHint')}</p>}
    </div>
  );
}
