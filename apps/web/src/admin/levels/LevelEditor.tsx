import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { levelSchema, type Level } from '@little-coder/engine';
import type { LevelRow, LevelValidation } from '../../api/types';
import { useApiCall, useFetch } from '../../auth/useApi';
import { t } from '../../i18n';
import { Button, Card, Notice, PageHeader, TextArea } from '../../ui/ui';
import {
  ActionNotice,
  Icon,
  levelPath,
  Loadable,
  StatusBadge,
  useAction,
  useDebounced,
} from '../common';
import { IssueList } from '../skills/IssueList';
import { parseJson } from '../skills/skillForm';
import { LevelSummary } from './LevelSummary';

/** Contoh awal level baru (grid-move Dunia 2). */
export const LEVEL_STARTER = {
  id: 'w2-l10',
  version: 1,
  tier: 'basic',
  world: 2,
  index: 10,
  role: 'practice',
  focus: 'logic',
  skills: ['direction-fixed'],
  type: 'grid-move',
  grid: { w: 4, h: 4, walls: [[1, 1]], stars: [[3, 0]], puddles: [] },
  start: { x: 0, y: 3, facing: 'up' },
  goal: { x: 3, y: 0 },
  palette: ['up', 'down', 'left', 'right'],
  maxCards: 8,
  stars: { optimalSteps: 'auto', hintsAllowedFor2Stars: 0 },
  story: { intro: 'vo_w2_l10_intro', success: 'vo_success_a' },
};

/** Validasi lokal (skema + aturan) untuk pratinjau langsung. */
export function checkLevelText(text: string): {
  level?: Level;
  issues: { path: string; message: string }[];
} {
  const json = parseJson(text);
  if (json.error) return { issues: [{ path: 'JSON', message: json.error }] };
  const r = levelSchema.safeParse(json.value);
  if (r.success) return { level: r.data, issues: [] };
  return {
    issues: r.error.issues.map((i) => ({ path: i.path.map(String).join('.'), message: i.message })),
  };
}

function LevelEditor({ row }: { row?: LevelRow }) {
  const creating = !row;
  const call = useApiCall('staff');
  const navigate = useNavigate();
  const action = useAction();
  const [text, setText] = useState(() => JSON.stringify(row?.data ?? LEVEL_STARTER, null, 2));
  const [saved, setSaved] = useState(
    row ? { status: row.status, version: row.version } : undefined,
  );
  const [server, setServer] = useState<LevelValidation & { forText: string }>();

  const debounced = useDebounced(text, 400);
  const local = useMemo(() => checkLevelText(debounced), [debounced]);
  const serverFresh = server && server.forText === text ? server : undefined;

  async function validate() {
    const json = parseJson(text);
    if (json.error) return;
    const forText = text;
    const res = await action.run(() =>
      call<LevelValidation>('/admin/levels/validate', { method: 'POST', body: json.value }),
    );
    if (res) setServer({ ...res, forText });
  }

  async function save() {
    const json = parseJson(text);
    if (json.error || !json.value) return;
    const out = await action.run(
      () =>
        creating
          ? call<Level>('/admin/levels', { method: 'POST', body: json.value })
          : call<Level>(`/admin/levels/${encodeURIComponent(row.id)}`, {
              method: 'PUT',
              body: json.value,
            }),
      t('admin.level.saved'),
    );
    if (!out) return;
    if (creating) {
      navigate(levelPath(out.id), { replace: true });
      return;
    }
    setSaved((s) => ({ status: s?.status ?? 'active', version: out.version }));
    setText(JSON.stringify(out, null, 2));
  }

  async function toggleStatus() {
    if (!row || !saved) return;
    const status = saved.status === 'active' ? 'draft' : 'active';
    const out = await action.run(
      () =>
        call<LevelRow>(`/admin/levels/${encodeURIComponent(row.id)}/status`, {
          method: 'PATCH',
          body: { status },
        }),
      status === 'active' ? t('admin.level.activated') : t('admin.level.drafted'),
    );
    if (out) setSaved({ status: out.status, version: out.version });
  }

  return (
    <>
      <PageHeader
        title={creating ? t('admin.level.newTitle') : row.id}
        subtitle={t('admin.level.editorSubtitle')}
        actions={
          <Link className="ui-btn ui-btn-ghost" to="/admin/level">
            <Icon name="back" />
            {t('admin.back')}
          </Link>
        }
      />
      <div className="adm-two">
        <Card title={t('admin.level.jsonTitle')}>
          <TextArea
            label={t('admin.level.json')}
            hint={t('admin.level.jsonHint')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            rows={28}
          />
          <ActionNotice error={action.error} done={action.done} />
          <div className="ui-row">
            <Button variant="secondary" onClick={validate} disabled={action.busy}>
              {t('admin.level.validate')}
            </Button>
            <Button onClick={save} disabled={action.busy || local.issues.length > 0}>
              <Icon name="check" />
              {creating ? t('admin.level.create') : t('admin.level.save')}
            </Button>
            {saved && (
              <>
                <Button variant="ghost" onClick={toggleStatus} disabled={action.busy}>
                  {saved.status === 'active' ? t('admin.level.toDraft') : t('admin.level.toActive')}
                </Button>
                <StatusBadge status={saved.status} />
                <span className="ui-muted">{t('admin.skill.version', { v: saved.version })}</span>
              </>
            )}
          </div>
        </Card>
        <div>
          <Card title={t('admin.level.checkTitle')}>
            <h3 className="adm-group-title">{t('admin.level.localCheck')}</h3>
            <IssueList issues={local.issues} checking={debounced !== text} />
            <h3 className="adm-group-title">{t('admin.level.serverCheck')}</h3>
            {!serverFresh ? (
              <p className="ui-muted">{t('admin.level.serverHint')}</p>
            ) : (
              <>
                <IssueList
                  issues={serverFresh.errors.map((message) => ({ path: '', message }))}
                  okText={t('admin.level.serverOk')}
                />
                {serverFresh.warnings.length > 0 && (
                  <Notice tone="warning">
                    <ul className="adm-issues">
                      {serverFresh.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </Notice>
                )}
                {serverFresh.optimalSteps !== undefined && (
                  <Notice tone="info">
                    {t('admin.level.optimal', { n: serverFresh.optimalSteps })}
                  </Notice>
                )}
              </>
            )}
          </Card>
          <Card title={t('admin.level.previewTitle')}>
            {local.level ? (
              <LevelSummary level={local.level} />
            ) : (
              <p className="ui-muted">{t('admin.level.previewInvalid')}</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

/** /admin/level/baru dan /admin/level/:id */
export function LevelEditorRoute() {
  const { id } = useParams();
  const levels = useFetch<LevelRow[]>('staff', id ? '/admin/levels' : null);
  if (!id) return <LevelEditor />;
  return (
    <Loadable loading={levels.loading} error={levels.error} hasData={!!levels.data}>
      {() => {
        const row = levels.data!.find((l) => l.id === id);
        return row ? (
          <LevelEditor key={row.id} row={row} />
        ) : (
          <Notice tone="error">{t('admin.level.notFound')}</Notice>
        );
      }}
    </Loadable>
  );
}
