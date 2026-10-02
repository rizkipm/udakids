import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { contestInputSchema, formatClock, type ContestInput } from '@little-coder/engine';
import type { CatalogRow } from '../../api/types';
import { useApiCall, useFetch } from '../../auth/useApi';
import { t } from '../../i18n';
import { Pager } from '../../ui/Pager';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Notice,
  PageHeader,
  RequiredNote,
  SelectField,
  Stat,
  Table,
  TextArea,
  TextField,
  type Column,
} from '../../ui/ui';
import { isoToLocalInput, localInputToIso, useBlobCall } from '../billing/util';
import { ActionNotice, ColorDot, confirmAction, Icon, Loadable, useAction } from '../common';
import './contests.css';

type Phase = 'upcoming' | 'live' | 'ended';
export type AdminContest = {
  id: string;
  title: string;
  description: string;
  domain: string;
  grade: string;
  book: string | null;
  categories: string[];
  questionCount: number;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  winners: number;
  phase: Phase;
  published: boolean;
  participants?: number;
  submitted?: number;
  disqualified?: number;
};
type Flags = {
  fast?: number;
  hidden?: number;
  dq?: { reason: string; by: string; at: string } | null;
};
export type AdminEntry = {
  id: string;
  childId: string;
  nickname: string;
  momoColor: string;
  className: string | null;
  total: number;
  answered: number;
  correct: number;
  startedAt: string;
  submittedAt: string | null;
  status: 'active' | 'done';
  flags: Flags;
  disqualified: boolean;
  position: number | null;
  score: number | null;
  timeMs: number | null;
};
type Detail = { now: string; contest: AdminContest; entries: AdminEntry[] };

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
const when = (c: Pick<AdminContest, 'startsAt' | 'endsAt'>) =>
  `${fmt(c.startsAt)} – ${new Date(c.endsAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

function PhaseBadge({ c }: { c: Pick<AdminContest, 'phase' | 'published'> }) {
  return (
    <span className="ct-badges">
      <Badge tone={c.phase === 'live' ? 'success' : c.phase === 'upcoming' ? 'info' : 'muted'}>
        {t(`contest.admin.phase.${c.phase}`)}
      </Badge>
      {!c.published && <Badge tone="warning">{t('contest.admin.hidden')}</Badge>}
    </span>
  );
}

/** Admin: kelola lomba live (D-042). `?lomba=<id>` = detail, `?ubah=<id>` / `?baru=1` = formulir. */
export function ContestsPage() {
  const [params, setParams] = useSearchParams();
  const detailId = params.get('lomba');
  const editId = params.get('ubah');
  const creating = params.get('baru') === '1';
  const list = useFetch<{ now: string; contests: AdminContest[] }>('staff', '/admin/contests');
  const go = (next: Record<string, string>) => setParams(next);
  const back = () => {
    setParams({});
    list.reload();
  };

  if (detailId)
    return <ContestDetail id={detailId} onBack={back} onEdit={(id) => go({ ubah: id })} />;
  if (creating || editId) {
    const existing = list.data?.contests.find((c) => c.id === editId);
    if (editId && !existing)
      return (
        <Loadable loading={list.loading} error={list.error} hasData={false}>
          {() => null}
        </Loadable>
      );
    return <ContestForm existing={existing} onDone={back} />;
  }
  return (
    <>
      <PageHeader
        title={t('contest.admin.title')}
        subtitle={t('contest.admin.subtitle')}
        actions={
          <Button onClick={() => go({ baru: '1' })}>
            <Icon name="plus" /> {t('contest.admin.new')}
          </Button>
        }
      />
      <Loadable loading={list.loading} error={list.error} hasData={!!list.data}>
        {() => <ContestTable rows={list.data!.contests} onChanged={list.reload} go={go} />}
      </Loadable>
    </>
  );
}

function ContestTable({
  rows,
  onChanged,
  go,
}: {
  rows: AdminContest[];
  onChanged: () => void;
  go: (p: Record<string, string>) => void;
}) {
  const call = useApiCall('staff');
  const action = useAction();
  const remove = async (c: AdminContest) => {
    if (!confirmAction(t('contest.admin.deleteConfirm', { title: c.title }))) return;
    const ok = await action.run(
      () => call(`/admin/contests/${c.id}`, { method: 'DELETE' }),
      t('contest.admin.deleted'),
    );
    if (ok) onChanged();
  };
  const columns: Column<AdminContest>[] = [
    {
      key: 'title',
      label: t('contest.admin.col.title'),
      render: (c) => (
        <button type="button" className="ct-link" onClick={() => go({ lomba: c.id })}>
          {c.title}
        </button>
      ),
    },
    {
      key: 'book',
      label: t('contest.admin.col.book'),
      render: (c) => c.book ?? `${c.domain}/${c.grade}`,
    },
    { key: 'when', label: t('contest.admin.col.schedule'), render: (c) => when(c) },
    { key: 'status', label: t('contest.admin.col.status'), render: (c) => <PhaseBadge c={c} /> },
    {
      key: 'n',
      label: t('contest.admin.col.participants'),
      render: (c) =>
        t('contest.admin.participants', { n: c.participants ?? 0, done: c.submitted ?? 0 }),
    },
    {
      key: 'act',
      label: t('contest.admin.col.actions'),
      render: (c) => (
        <span className="ui-row">
          <Button variant="secondary" onClick={() => go({ lomba: c.id })}>
            {t('contest.admin.open')}
          </Button>
          <Button variant="ghost" onClick={() => go({ ubah: c.id })}>
            {t('contest.admin.edit')}
          </Button>
          {(c.participants ?? 0) === 0 && (
            <Button
              variant="ghost"
              aria-label={`${t('contest.admin.delete')} ${c.title}`}
              disabled={action.busy}
              onClick={() => void remove(c)}
            >
              <Icon name="trash" />
            </Button>
          )}
        </span>
      ),
    },
  ];
  return (
    <Card>
      <ActionNotice error={action.error} done={action.done} />
      <Table rows={rows} columns={columns} rowKey={(c) => c.id} empty={t('contest.admin.empty')} />
    </Card>
  );
}

// ------------------------------------------------------------------ formulir

export type ContestFormState = {
  title: string;
  description: string;
  book: string;
  categories: string[];
  questionCount: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: string;
  winners: string;
  published: boolean;
};

const toForm = (c?: AdminContest): ContestFormState =>
  c
    ? {
        title: c.title,
        description: c.description,
        book: `${c.domain}/${c.grade}`,
        categories: c.categories,
        questionCount: String(c.questionCount),
        startsAt: isoToLocalInput(c.startsAt),
        endsAt: isoToLocalInput(c.endsAt),
        durationMinutes: String(c.durationMinutes),
        winners: String(c.winners),
        published: c.published,
      }
    : {
        title: '',
        description: '',
        book: '',
        categories: [],
        questionCount: '20',
        startsAt: '',
        endsAt: '',
        durationMinutes: '60',
        winners: '10',
        published: false,
      };

/** Isian formulir → body API (waktu lokal → ISO dengan zona waktu). Validasi dengan skema engine. */
export function toContestInput(f: ContestFormState) {
  const [domain, grade] = f.book.split('/');
  return contestInputSchema.safeParse({
    title: f.title,
    description: f.description,
    domain,
    grade,
    categories: f.categories,
    questionCount: Number(f.questionCount),
    startsAt: localInputToIso(f.startsAt) ?? '',
    endsAt: localInputToIso(f.endsAt) ?? '',
    durationMinutes: Number(f.durationMinutes),
    winners: Number(f.winners),
    published: f.published,
  });
}

function ContestForm({ existing, onDone }: { existing?: AdminContest; onDone: () => void }) {
  const catalogs = useFetch<CatalogRow[]>('staff', '/admin/catalogs');
  const call = useApiCall('staff');
  const action = useAction();
  const [f, setF] = useState<ContestFormState>(() => toForm(existing));
  const [invalid, setInvalid] = useState<string>();
  const locked = !!existing && (existing.phase !== 'upcoming' || (existing.participants ?? 0) > 0);
  const set = <K extends keyof ContestFormState>(k: K, v: ContestFormState[K]) =>
    setF((x) => ({ ...x, [k]: v }));
  const book = catalogs.data?.find((c) => `${c.domain}/${c.grade}` === f.book);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = toContestInput(f);
    if (!parsed.success) {
      setInvalid(
        t('contest.admin.form.invalid', {
          issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
        }),
      );
      return;
    }
    setInvalid(undefined);
    const body: ContestInput = parsed.data;
    const ok = await action.run(
      () =>
        existing
          ? call(`/admin/contests/${existing.id}`, { method: 'PUT', body })
          : call('/admin/contests', { method: 'POST', body }),
      t('contest.admin.saved'),
    );
    if (ok) onDone();
  };

  return (
    <>
      <PageHeader
        title={existing ? t('contest.admin.form.editTitle') : t('contest.admin.form.newTitle')}
        actions={
          <Button variant="ghost" onClick={onDone}>
            <Icon name="back" /> {t('contest.admin.back')}
          </Button>
        }
      />
      <Card>
        <form className="ct-form" onSubmit={(e) => void submit(e)}>
          <RequiredNote />
          {locked && <Notice tone="warning">{t('contest.admin.form.locked')}</Notice>}
          <TextField
            label={t('contest.admin.form.title')}
            hint={t('contest.admin.form.titleHint')}
            required
            maxLength={100}
            value={f.title}
            onChange={(e) => set('title', e.target.value)}
          />
          <TextArea
            label={t('contest.admin.form.description')}
            maxLength={600}
            rows={3}
            value={f.description}
            onChange={(e) => set('description', e.target.value)}
          />
          <SelectField
            label={t('contest.admin.form.book')}
            required
            disabled={locked}
            value={f.book}
            onChange={(e) => setF((x) => ({ ...x, book: e.target.value, categories: [] }))}
            options={[
              { value: '', label: '—' },
              ...(catalogs.data ?? []).map((c) => ({
                value: `${c.domain}/${c.grade}`,
                label: c.title,
              })),
            ]}
          />
          {book && (
            <fieldset className="ct-topics" disabled={locked}>
              <legend>{t('contest.admin.form.topics')}</legend>
              <div className="ct-topic-grid">
                {book.categories.map((cat) => (
                  <Checkbox
                    key={cat.code}
                    label={`${cat.code}. ${cat.title}`}
                    checked={f.categories.includes(cat.code)}
                    onChange={(e) =>
                      set(
                        'categories',
                        e.target.checked
                          ? [...f.categories, cat.code]
                          : f.categories.filter((x) => x !== cat.code),
                      )
                    }
                  />
                ))}
              </div>
              {f.categories.length === 0 && (
                <small className="ui-hint">{t('contest.admin.form.allTopics')}</small>
              )}
            </fieldset>
          )}
          <div className="ct-grid">
            <TextField
              label={t('contest.admin.form.questionCount')}
              type="number"
              min={5}
              max={50}
              required
              disabled={locked}
              value={f.questionCount}
              onChange={(e) => set('questionCount', e.target.value)}
            />
            <TextField
              label={t('contest.admin.form.duration')}
              hint={t('contest.admin.form.durationHint')}
              type="number"
              min={1}
              max={600}
              required
              disabled={locked}
              value={f.durationMinutes}
              onChange={(e) => set('durationMinutes', e.target.value)}
            />
            <TextField
              label={t('contest.admin.form.startsAt')}
              hint={t('contest.admin.form.timeHint', { tz })}
              type="datetime-local"
              required
              disabled={locked}
              value={f.startsAt}
              onChange={(e) => set('startsAt', e.target.value)}
            />
            <TextField
              label={t('contest.admin.form.endsAt')}
              type="datetime-local"
              required
              disabled={locked}
              value={f.endsAt}
              onChange={(e) => set('endsAt', e.target.value)}
            />
            <TextField
              label={t('contest.admin.form.winners')}
              type="number"
              min={1}
              max={100}
              required
              value={f.winners}
              onChange={(e) => set('winners', e.target.value)}
            />
          </div>
          <Checkbox
            label={t('contest.admin.form.published')}
            checked={f.published}
            onChange={(e) => set('published', e.target.checked)}
          />
          {invalid && <Notice tone="error">{invalid}</Notice>}
          <ActionNotice error={action.error} done={action.done} />
          <div className="ui-row">
            <Button type="submit" disabled={action.busy}>
              {t('contest.admin.form.save')}
            </Button>
            <Button variant="ghost" onClick={onDone}>
              {t('contest.admin.form.cancel')}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}

// ------------------------------------------------------------------ detail & hasil

const PAGE = 50;

function ContestDetail({
  id,
  onBack,
  onEdit,
}: {
  id: string;
  onBack: () => void;
  onEdit: (id: string) => void;
}) {
  const detail = useFetch<Detail>('staff', `/admin/contests/${encodeURIComponent(id)}`);
  const phase = detail.data?.contest.phase;
  const { reload } = detail;
  // Selama lomba berlangsung, progres peserta dimuat ulang tiap 10 detik.
  useEffect(() => {
    if (phase !== 'live') return;
    const timer = setInterval(reload, 10_000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <Loadable loading={detail.loading} error={detail.error} hasData={!!detail.data}>
      {() => (
        <DetailBody data={detail.data!} onBack={onBack} onEdit={onEdit} onReload={detail.reload} />
      )}
    </Loadable>
  );
}

function DetailBody({
  data,
  onBack,
  onEdit,
  onReload,
}: {
  data: Detail;
  onBack: () => void;
  onEdit: (id: string) => void;
  onReload: () => void;
}) {
  const c = data.contest;
  const call = useApiCall('staff');
  const blob = useBlobCall();
  const action = useAction();
  const [page, setPage] = useState(1);
  const [dq, setDq] = useState<AdminEntry>();
  const [reason, setReason] = useState('');

  const rows = useMemo(
    () =>
      [...data.entries].sort(
        (a, b) =>
          (a.position ?? 1e9) - (b.position ?? 1e9) || a.startedAt.localeCompare(b.startedAt),
      ),
    [data.entries],
  );
  const flagged = data.entries.filter((e) => (e.flags.fast ?? 0) + (e.flags.hidden ?? 0) > 0);
  const stats = {
    participants: data.entries.length,
    active: data.entries.filter((e) => e.status === 'active').length,
    done: data.entries.filter((e) => e.status === 'done').length,
    flagged: flagged.length,
    dq: data.entries.filter((e) => e.disqualified).length,
  };

  const toggleDq = async (e: AdminEntry, disqualified: boolean, why = '') => {
    const ok = await action.run(
      () =>
        call(`/admin/contests/${c.id}/entries/${e.id}/disqualify`, {
          method: 'POST',
          body: { disqualified, reason: why },
        }),
      disqualified ? t('contest.admin.detail.dqDone') : t('contest.admin.detail.undqDone'),
    );
    if (ok) {
      setDq(undefined);
      setReason('');
      onReload();
    }
  };

  const download = () =>
    action.run(async () => {
      const b = await blob(`/admin/contests/${c.id}/results.csv`);
      const url = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hasil-lomba-${c.id.slice(0, 8)}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

  const columns: Column<AdminEntry>[] = [
    {
      key: 'pos',
      label: t('contest.admin.detail.col.position'),
      width: '56px',
      render: (e) =>
        e.position === null ? (
          '—'
        ) : (
          <span
            className={c.phase === 'ended' && e.position <= c.winners ? 'ct-winner' : undefined}
          >
            {e.position}
          </span>
        ),
    },
    {
      key: 'child',
      label: t('contest.admin.detail.col.child'),
      render: (e) => (
        <span className="ct-child">
          <ColorDot color={e.momoColor} /> {e.nickname}
          {c.phase === 'ended' && e.position !== null && e.position <= c.winners && (
            <Badge tone="success">{t('contest.admin.detail.winner')}</Badge>
          )}
        </span>
      ),
    },
    { key: 'class', label: t('contest.admin.detail.col.class'), render: (e) => e.className ?? '—' },
    {
      key: 'progress',
      label: t('contest.admin.detail.col.progress'),
      render: (e) => (
        <span className="ct-progress" title={`${e.answered}/${e.total}`}>
          <span className="ct-bar" aria-hidden>
            <span style={{ width: `${e.total ? (e.answered / e.total) * 100 : 0}%` }} />
          </span>
          {e.answered}/{e.total}
        </span>
      ),
    },
    {
      key: 'correct',
      label: t('contest.admin.detail.col.correct'),
      render: (e) => (e.score === null ? e.correct : `${e.correct} (${e.score}%)`),
    },
    {
      key: 'time',
      label: t('contest.admin.detail.col.time'),
      render: (e) => (e.timeMs === null ? '—' : formatClock(e.timeMs)),
    },
    {
      key: 'status',
      label: t('contest.admin.detail.col.status'),
      render: (e) =>
        e.disqualified ? (
          <span title={e.flags.dq?.reason}>
            <Badge tone="warning">{t('contest.admin.detail.status.dq')}</Badge>
          </span>
        ) : e.status === 'active' ? (
          <Badge tone="info">{t('contest.admin.detail.status.active')}</Badge>
        ) : (
          <Badge tone="success">{t('contest.admin.detail.status.done')}</Badge>
        ),
    },
    {
      key: 'flags',
      label: t('contest.admin.detail.col.flags'),
      render: (e) => {
        const parts = [
          e.flags.fast ? t('contest.admin.detail.flag.fast', { n: e.flags.fast }) : '',
          e.flags.hidden ? t('contest.admin.detail.flag.hidden', { n: e.flags.hidden }) : '',
        ].filter(Boolean);
        return (
          <span className={parts.length ? 'ct-flag' : undefined}>
            {parts.join(' · ') || t('contest.admin.detail.flag.none')}
            {e.disqualified && e.flags.dq?.reason && (
              <small className="ct-reason">
                {t('contest.admin.detail.dqBy', { reason: e.flags.dq.reason })}
              </small>
            )}
          </span>
        );
      },
    },
    {
      key: 'act',
      label: t('contest.admin.detail.col.action'),
      render: (e) =>
        e.disqualified ? (
          <Button variant="ghost" disabled={action.busy} onClick={() => void toggleDq(e, false)}>
            {t('contest.admin.detail.undq')}
          </Button>
        ) : (
          <Button variant="secondary" disabled={action.busy} onClick={() => setDq(e)}>
            {t('contest.admin.detail.dq')}
          </Button>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title={c.title}
        subtitle={
          <>
            <PhaseBadge c={c} /> {c.book} · {t('contest.admin.detail.schedule', { when: when(c) })}
            <br />
            {t('contest.admin.detail.duration', {
              n: c.questionCount,
              minutes: c.durationMinutes,
              winners: c.winners,
            })}
          </>
        }
        actions={
          <>
            <Button variant="ghost" onClick={onBack}>
              <Icon name="back" /> {t('contest.admin.back')}
            </Button>
            <Button variant="secondary" onClick={() => onEdit(c.id)}>
              {t('contest.admin.edit')}
            </Button>
            <Button variant="secondary" onClick={onReload}>
              <Icon name="refresh" /> {t('contest.admin.detail.refresh')}
            </Button>
            <Button
              disabled={action.busy || data.entries.length === 0}
              onClick={() => void download()}
            >
              {t('contest.admin.detail.csv')}
            </Button>
          </>
        }
      />
      <div className="ct-stats">
        <Stat label={t('contest.admin.detail.stat.participants')} value={stats.participants} />
        <Stat label={t('contest.admin.detail.stat.active')} value={stats.active} />
        <Stat label={t('contest.admin.detail.stat.done')} value={stats.done} />
        <Stat label={t('contest.admin.detail.stat.flagged')} value={stats.flagged} />
        <Stat label={t('contest.admin.detail.stat.dq')} value={stats.dq} />
      </div>
      <ActionNotice error={action.error} done={action.done} />
      {dq && (
        <Card title={t('contest.admin.detail.dqTitle', { name: dq.nickname })}>
          <form
            className="ct-form"
            onSubmit={(ev) => {
              ev.preventDefault();
              void toggleDq(dq, true, reason.trim());
            }}
          >
            <TextField
              label={t('contest.admin.detail.dqReason')}
              required
              maxLength={300}
              value={reason}
              onChange={(ev) => setReason(ev.target.value)}
            />
            <div className="ui-row">
              <Button type="submit" variant="danger" disabled={action.busy || !reason.trim()}>
                {t('contest.admin.detail.dqConfirm')}
              </Button>
              <Button variant="ghost" onClick={() => setDq(undefined)}>
                {t('contest.admin.form.cancel')}
              </Button>
            </div>
          </form>
        </Card>
      )}
      <Card
        title={
          c.phase === 'ended'
            ? t('contest.admin.detail.rankFinal')
            : c.phase === 'live'
              ? t('contest.admin.detail.rankLive')
              : undefined
        }
      >
        {c.phase === 'upcoming' && data.entries.length === 0 ? (
          <p className="ui-muted">
            {t('contest.admin.detail.rankUpcoming', { when: fmt(c.startsAt) })}
          </p>
        ) : (
          <>
            <p className="ui-muted ct-hint">{t('contest.admin.detail.flagsHint')}</p>
            <Table
              rows={rows.slice((page - 1) * PAGE, page * PAGE)}
              columns={columns}
              rowKey={(e) => e.id}
              empty={t('contest.admin.empty')}
            />
            {rows.length > PAGE && (
              <Pager page={page} pageSize={PAGE} total={rows.length} onPage={setPage} />
            )}
          </>
        )}
      </Card>
    </>
  );
}
