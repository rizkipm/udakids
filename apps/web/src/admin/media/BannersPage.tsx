import { useRef, useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import { useApiCall, useFetch } from '../../auth/useApi';
import {
  BANNER_TONES,
  BannerCard,
  mediaUrl,
  type BannerPlacement,
  type BannerTone,
} from '../../components/BannerSlider';
import { t, type MessageKey } from '../../i18n';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Notice,
  PageHeader,
  RequiredNote,
  SelectField,
  Table,
  TextArea,
  TextField,
  formatDate,
  type Column,
} from '../../ui/ui';
import { isoToLocalInput, localInputToIso } from '../billing/util';
import { ActionNotice, confirmAction, Icon, Loadable, useAction } from '../common';
import { IMAGE_ACCEPT, imageProblem, isSafeCtaUrl, uploadImage } from './upload';
import './media.css';

const PLACEMENTS: BannerPlacement[] = ['landing', 'parent', 'admin'];

export type BannerRow = {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaUrl: string;
  imageId: string | null;
  tone: BannerTone;
  placements: BannerPlacement[];
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  sort: number;
  createdAt: string;
};
type BannerBody = Omit<BannerRow, 'id' | 'createdAt'>;

const toBody = (b: BannerRow): BannerBody => ({
  title: b.title,
  subtitle: b.subtitle,
  ctaLabel: b.ctaLabel,
  ctaUrl: b.ctaUrl,
  imageId: b.imageId,
  tone: b.tone,
  placements: b.placements,
  startsAt: b.startsAt,
  endsAt: b.endsAt,
  active: b.active,
  sort: b.sort,
});

const placementLabel = (p: BannerPlacement) => t(`media.placement.${p}` as MessageKey);
const toneLabel = (x: BannerTone) => t(`media.tone.${x}` as MessageKey);

export type BannerStatus = 'live' | 'scheduled' | 'ended' | 'off';
export function bannerStatus(
  b: Pick<BannerRow, 'active' | 'startsAt' | 'endsAt'>,
  now = Date.now(),
): BannerStatus {
  if (!b.active) return 'off';
  if (b.startsAt && new Date(b.startsAt).getTime() > now) return 'scheduled';
  if (b.endsAt && new Date(b.endsAt).getTime() <= now) return 'ended';
  return 'live';
}
const STATUS_TONE = { live: 'success', scheduled: 'info', ended: 'muted', off: 'muted' } as const;

/** Masalah formulir di perangkat (server memeriksa ulang). */
export function bannerProblems(f: BannerBody): Partial<Record<keyof BannerBody, string>> {
  const out: Partial<Record<keyof BannerBody, string>> = {};
  if (!isSafeCtaUrl(f.ctaUrl.trim())) out.ctaUrl = t('media.admin.banner.ctaUrlBad');
  else if ((f.ctaLabel.trim() === '') !== (f.ctaUrl.trim() === ''))
    out.ctaUrl = t('media.admin.banner.ctaPair');
  if (f.placements.length === 0) out.placements = t('media.admin.banner.placementsNone');
  if (f.startsAt && f.endsAt && new Date(f.endsAt) <= new Date(f.startsAt))
    out.endsAt = t('media.admin.banner.endsBad');
  return out;
}

function BannerEditor({
  editing,
  nextSort,
  onSaved,
  onCancel,
}: {
  editing: BannerRow | null;
  nextSort: number;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const call = useApiCall('staff');
  const action = useAction();
  const upload = useAction();
  const fileInput = useRef<HTMLInputElement>(null);
  const empty: BannerBody = {
    title: '',
    subtitle: '',
    ctaLabel: '',
    ctaUrl: '',
    imageId: null,
    tone: 'grape',
    placements: ['landing'],
    startsAt: null,
    endsAt: null,
    active: true,
    sort: nextSort,
  };
  const [form, setForm] = useState<BannerBody>(() => (editing ? toBody(editing) : empty));
  const [touched, setTouched] = useState(false);
  /** Gambar yang baru diunggah di formulir ini (dibuang bila diganti sebelum disimpan). */
  const fresh = useRef<string | null>(null);
  const set = <K extends keyof BannerBody>(k: K, v: BannerBody[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const problems = touched ? bannerProblems(form) : {};

  const dropFresh = () => {
    if (fresh.current)
      void call(`/admin/media/${fresh.current}`, { method: 'DELETE' }).catch(() => {});
    fresh.current = null;
  };

  async function pick(file: File | undefined) {
    if (!file) return;
    const problem = imageProblem(file);
    if (problem) {
      upload.clear();
      void upload.run(() => Promise.reject(new ApiError(400, problem)));
      return;
    }
    const out = await upload.run(() => uploadImage(file));
    if (fileInput.current) fileInput.current.value = '';
    if (!out) return;
    dropFresh();
    fresh.current = out.id;
    set('imageId', out.id);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(bannerProblems(form)).length) return;
    const body: BannerBody = {
      ...form,
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      ctaLabel: form.ctaLabel.trim(),
      ctaUrl: form.ctaUrl.trim(),
    };
    const out = await action.run(
      () =>
        editing
          ? call<BannerRow>(`/admin/banners/${editing.id}`, { method: 'PUT', body })
          : call<BannerRow>('/admin/banners', { method: 'POST', body }),
      t('media.admin.banner.saved', { name: body.title }),
    );
    if (out) {
      fresh.current = null;
      if (!editing) {
        setForm({ ...empty, sort: nextSort + 1 });
        setTouched(false);
      }
      onSaved();
    }
  }

  const togglePlacement = (p: BannerPlacement, on: boolean) =>
    set(
      'placements',
      PLACEMENTS.filter((x) => (x === p ? on : form.placements.includes(x))),
    );

  return (
    <Card
      title={
        editing
          ? t('media.admin.banner.editTitle', { name: editing.title })
          : t('media.admin.banner.createTitle')
      }
    >
      <ActionNotice error={action.error} done={action.done} />
      <div className="mda-editor">
        <form onSubmit={submit}>
          <RequiredNote />
          <TextField
            label={t('media.admin.banner.fTitle')}
            hint={t('media.admin.banner.fTitleHint')}
            required
            maxLength={80}
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
          />
          <TextArea
            className="adm-textarea"
            label={t('media.admin.banner.fSubtitle')}
            hint={t('media.admin.banner.fSubtitleHint')}
            maxLength={200}
            rows={2}
            value={form.subtitle}
            onChange={(e) => set('subtitle', e.target.value)}
          />
          <div className="adm-fields">
            <TextField
              label={t('media.admin.banner.fCtaLabel')}
              hint={t('media.admin.banner.fCtaLabelHint')}
              maxLength={30}
              value={form.ctaLabel}
              onChange={(e) => set('ctaLabel', e.target.value)}
            />
            <TextField
              label={t('media.admin.banner.fCtaUrl')}
              hint={t('media.admin.banner.fCtaUrlHint')}
              error={problems.ctaUrl}
              maxLength={500}
              inputMode="url"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="/orang-tua/daftar"
              value={form.ctaUrl}
              onChange={(e) => set('ctaUrl', e.target.value)}
            />
          </div>
          <fieldset className="adm-fieldset">
            <legend>{t('media.admin.banner.fPlacements')}</legend>
            <div className="ui-row">
              {PLACEMENTS.map((p) => (
                <Checkbox
                  key={p}
                  label={placementLabel(p)}
                  checked={form.placements.includes(p)}
                  onChange={(e) => togglePlacement(p, e.target.checked)}
                />
              ))}
            </div>
            {problems.placements && <p className="ui-error">{problems.placements}</p>}
          </fieldset>
          <div className="adm-fields">
            <SelectField
              label={t('media.admin.banner.fTone')}
              hint={t('media.admin.banner.fToneHint')}
              value={form.tone}
              onChange={(e) => set('tone', e.target.value as BannerTone)}
              options={BANNER_TONES.map((x) => ({ value: x, label: toneLabel(x) }))}
            />
            <TextField
              label={t('media.admin.banner.fStarts')}
              hint={t('media.admin.banner.scheduleHint')}
              type="datetime-local"
              value={isoToLocalInput(form.startsAt)}
              onChange={(e) => set('startsAt', localInputToIso(e.target.value))}
            />
            <TextField
              label={t('media.admin.banner.fEnds')}
              error={problems.endsAt}
              type="datetime-local"
              value={isoToLocalInput(form.endsAt)}
              onChange={(e) => set('endsAt', localInputToIso(e.target.value))}
            />
          </div>
          <div className="ui-field">
            <label htmlFor="mda-banner-file">{t('media.admin.banner.fImage')}</label>
            <input
              ref={fileInput}
              id="mda-banner-file"
              type="file"
              accept={IMAGE_ACCEPT}
              aria-describedby="mda-banner-file-hint"
              disabled={upload.busy}
              onChange={(e) => void pick(e.target.files?.[0])}
            />
            <small id="mda-banner-file-hint" className="ui-hint">
              {t('media.admin.banner.fImageHint')}
            </small>
          </div>
          {upload.busy && <Notice>{t('media.admin.banner.uploading')}</Notice>}
          <ActionNotice error={upload.error} />
          {form.imageId && (
            <div className="ui-row mda-image-row">
              <img className="mda-thumb" src={mediaUrl(form.imageId)} alt="" />
              <Button
                variant="ghost"
                onClick={() => {
                  dropFresh();
                  set('imageId', null);
                }}
              >
                <Icon name="trash" />
                {t('media.admin.banner.removeImage')}
              </Button>
            </div>
          )}
          <Checkbox
            label={t('media.admin.banner.fActive')}
            checked={form.active}
            onChange={(e) => set('active', e.target.checked)}
          />
          <div className="ui-row">
            <Button type="submit" disabled={action.busy || upload.busy}>
              {editing ? (
                t('admin.save')
              ) : (
                <>
                  <Icon name="plus" />
                  {t('media.admin.banner.create')}
                </>
              )}
            </Button>
            {editing && (
              <Button
                variant="ghost"
                onClick={() => {
                  dropFresh();
                  onCancel();
                }}
              >
                {t('admin.cancel')}
              </Button>
            )}
          </div>
        </form>
        <div className="mda-preview">
          <h3>{t('media.admin.banner.preview')}</h3>
          <div
            className="bnr bnr-at-admin mda-preview-box"
            aria-hidden
            ref={(el) => el?.setAttribute('inert', '')}
          >
            <BannerCard
              banner={{
                id: 'preview',
                title: form.title.trim() || t('media.admin.banner.previewTitle'),
                subtitle: form.subtitle,
                ctaLabel: form.ctaLabel,
                ctaUrl: isSafeCtaUrl(form.ctaUrl.trim()) ? form.ctaUrl.trim() : '',
                imageId: form.imageId,
                tone: form.tone,
              }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

function Schedule({ b }: { b: BannerRow }) {
  if (!b.startsAt && !b.endsAt)
    return <span className="ui-muted">{t('media.admin.banner.always')}</span>;
  return (
    <div className="mda-schedule">
      {b.startsAt && <span>{t('media.admin.banner.from', { date: formatDate(b.startsAt) })}</span>}
      {b.endsAt && <span>{t('media.admin.banner.until', { date: formatDate(b.endsAt) })}</span>}
    </div>
  );
}

/** Admin: banner slideshow (D-042). */
export function BannersPage() {
  const list = useFetch<BannerRow[]>('staff', '/admin/banners');
  const call = useApiCall('staff');
  const action = useAction();
  const [editing, setEditing] = useState<BannerRow | null>(null);
  const rows = list.data ?? [];

  async function move(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    const ids = rows.map((r) => r.id);
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    const out = await action.run(() =>
      call<BannerRow[]>('/admin/banners/reorder', { method: 'POST', body: { ids } }),
    );
    if (out) list.setData(out);
  }

  async function toggle(b: BannerRow, active: boolean) {
    const out = await action.run(() =>
      call<BannerRow>(`/admin/banners/${b.id}`, {
        method: 'PUT',
        body: { ...toBody(b), active },
      }),
    );
    if (out) list.setData(rows.map((r) => (r.id === b.id ? out : r)));
  }

  async function remove(b: BannerRow) {
    if (!confirmAction(t('media.admin.banner.deleteConfirm', { name: b.title }))) return;
    const out = await action.run(
      () => call(`/admin/banners/${b.id}`, { method: 'DELETE' }).then(() => true),
      t('media.admin.banner.deleted', { name: b.title }),
    );
    if (out) {
      if (editing?.id === b.id) setEditing(null);
      list.reload();
    }
  }

  const columns: Column<BannerRow>[] = [
    {
      key: 'banner',
      label: t('media.admin.banner.col.banner'),
      render: (b) => (
        <div className="mda-banner-cell">
          {b.imageId ? (
            <img className="mda-thumb" src={mediaUrl(b.imageId)} alt="" loading="lazy" />
          ) : (
            <span className={`mda-thumb mda-swatch bnr-tone-${b.tone}`} aria-hidden />
          )}
          <div>
            <strong>{b.title}</strong>
            {b.subtitle && <div className="ui-muted mda-clip">{b.subtitle}</div>}
            {b.ctaUrl && (
              <div className="ui-muted mda-clip">
                {b.ctaLabel} → <code>{b.ctaUrl}</code>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'placements',
      label: t('media.admin.banner.col.placements'),
      render: (b) => (
        <div className="ui-row mda-badges">
          {b.placements.map((p) => (
            <Badge key={p} tone="info">
              {placementLabel(p)}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'schedule',
      label: t('media.admin.banner.col.schedule'),
      render: (b) => {
        const s = bannerStatus(b);
        return (
          <>
            <Badge tone={STATUS_TONE[s]}>{t(`media.admin.banner.status.${s}` as MessageKey)}</Badge>
            <Schedule b={b} />
          </>
        );
      },
    },
    {
      key: 'active',
      label: t('admin.col.status'),
      render: (b) => (
        <label className="mda-switch">
          <input
            type="checkbox"
            checked={b.active}
            disabled={action.busy}
            aria-label={t('media.admin.banner.activeLabel', { name: b.title })}
            onChange={(e) => void toggle(b, e.target.checked)}
          />
          <span aria-hidden>{b.active ? t('admin.user.active') : t('admin.user.inactive')}</span>
        </label>
      ),
    },
    {
      key: 'order',
      label: t('media.admin.banner.col.order'),
      render: (b) => {
        const i = rows.findIndex((r) => r.id === b.id);
        return (
          <div className="ui-row mda-order">
            <Button
              variant="ghost"
              disabled={action.busy || i === 0}
              aria-label={t('media.admin.banner.up', { name: b.title })}
              onClick={() => void move(i, -1)}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2.4" fill="none" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              disabled={action.busy || i === rows.length - 1}
              aria-label={t('media.admin.banner.down', { name: b.title })}
              onClick={() => void move(i, 1)}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" fill="none" />
              </svg>
            </Button>
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: t('admin.col.actions'),
      render: (b) => (
        <div className="ui-row">
          <Button variant="secondary" onClick={() => setEditing(b)}>
            {t('admin.edit')}
          </Button>
          <Button
            variant="danger"
            disabled={action.busy}
            aria-label={t('media.admin.banner.deleteLabel', { name: b.title })}
            onClick={() => void remove(b)}
          >
            <Icon name="trash" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('media.admin.banner.title')}
        subtitle={t('media.admin.banner.subtitle')}
      />
      <Card title={t('media.admin.banner.listTitle')}>
        <ActionNotice error={action.error} done={action.done} />
        <Loadable loading={list.loading} error={list.error} hasData={!!list.data}>
          {() => (
            <Table
              rows={rows}
              columns={columns}
              rowKey={(b) => b.id}
              empty={t('media.admin.banner.empty')}
            />
          )}
        </Loadable>
      </Card>
      <BannerEditor
        key={editing?.id ?? 'new'}
        editing={editing}
        nextSort={rows.length}
        onSaved={() => {
          setEditing(null);
          list.reload();
        }}
        onCancel={() => setEditing(null)}
      />
    </>
  );
}
