import { useEffect, useState, type FormEvent } from 'react';
import {
  AI_IMAGE_KINDS,
  type AiImageKind,
  type AiImageSettings,
  type AiImageStatus,
} from '@little-coder/engine';
import { useApiCall, useFetch } from '../../auth/useApi';
import { t, type MessageKey } from '../../i18n';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Notice,
  PageHeader,
  SelectField,
  Stat,
  TextField,
} from '../../ui/ui';
import { ActionNotice, Loadable, useAction } from '../common';
import { formatBytes, useBlobCall } from '../billing/util';

type KeyInfo = {
  source: 'env' | 'admin' | null;
  last4: string | null;
  updatedAt: string | null;
  unreadable: boolean;
};
type Overview = {
  settings: AiImageSettings;
  key: KeyInfo;
  ready: boolean;
  spent: { today: number; month: number };
  estimate: number;
  images: Partial<Record<AiImageStatus, number>>;
  momoReady: boolean;
  /** Penulis prompt Claude (D-092). */
  claudeKey: KeyInfo;
  claudeReady: boolean;
  styleGuide: string;
  recent: {
    action: string;
    model: string | null;
    costUsd: number;
    ok: boolean;
    detail: string | null;
    inputTokens: number | null;
    cachedTokens: number | null;
    outputTokens: number | null;
    createdAt: string;
  }[];
};
type ImageRow = {
  id: string;
  kind: AiImageKind;
  subject: string;
  label: string;
  labelEn: string | null;
  theme: string | null;
  variant: number;
  model: string;
  quality: string;
  status: AiImageStatus;
  bytes: number;
  costUsd: number;
  credit?: string | null;
  createdAt: string;
};

const usd = (n: number) => `US$${n.toFixed(n < 1 ? 4 : 2)}`;

/**
 * Admin → AI Gambar (D-068). Gambar aset dibuat sekali lewat OpenAI lalu dipakai ulang. Kunci API hanya bisa
 * diisi/diganti (tidak pernah ditampilkan), terenkripsi di server, dan butuh sandi admin.
 */
export function AiImagesPage() {
  const data = useFetch<Overview>('staff', '/admin/ai');
  const [listRev, setListRev] = useState(0);
  const reload = () => {
    data.reload();
    setListRev((r) => r + 1);
  };
  return (
    <>
      <PageHeader title={t('admin.ai.title')} subtitle={t('admin.ai.subtitle')} />
      <Loadable loading={data.loading} error={data.error} hasData={!!data.data}>
        {() => {
          const d = data.data!;
          return (
            <>
              {!d.settings.enabled && <Notice tone="warning">{t('admin.ai.disabled')}</Notice>}
              <div className="ui-grid adm-stats">
                <Stat
                  label={t('admin.ai.statToday')}
                  value={usd(d.spent.today)}
                  hint={t('admin.ai.statLimit', { limit: usd(d.settings.dailyLimitUsd) })}
                />
                <Stat
                  label={t('admin.ai.statMonth')}
                  value={usd(d.spent.month)}
                  hint={t('admin.ai.statLimit', { limit: usd(d.settings.monthlyLimitUsd) })}
                />
                <Stat
                  label={t('admin.ai.statEstimate')}
                  value={usd(d.estimate)}
                  hint={`${d.settings.mode} · ${d.settings.quality}`}
                />
                <Stat
                  label={t('admin.ai.statImages')}
                  value={`${d.images.approved ?? 0} / ${(d.images.review ?? 0) + (d.images.approved ?? 0)}`}
                  hint={t('admin.ai.statImagesHint')}
                />
              </div>
              <KeyCard info={d.key} onChanged={reload} />
              <KeyCard info={d.claudeKey} onChanged={reload} provider="claude" />
              <GenerateCard overview={d} onMade={reload} />
              <ImageGrid rev={listRev} onChanged={reload} />
              <SettingsCard
                key={JSON.stringify(d.settings)}
                initial={d.settings}
                onSaved={reload}
              />
              <UsageCard recent={d.recent} styleGuide={d.styleGuide} />
            </>
          );
        }}
      </Loadable>
    </>
  );
}

/** Kunci OpenAI (pembuat gambar) atau Claude (penulis prompt, D-092) — perilakunya sama. */
const KEY_UI = {
  openai: { path: '/admin/ai/key', prefix: 'admin.ai.key', placeholder: 'sk-proj-…' },
  claude: { path: '/admin/ai/claude-key', prefix: 'admin.ai.claudeKey', placeholder: 'sk-ant-…' },
} as const;

function KeyCard({
  info,
  onChanged,
  provider = 'openai',
}: {
  info: KeyInfo;
  onChanged: () => void;
  provider?: keyof typeof KEY_UI;
}) {
  const ui = KEY_UI[provider];
  const k = (name: string) => `${ui.prefix}${name}` as MessageKey;
  const call = useApiCall('staff');
  const action = useAction();
  const [apiKey, setApiKey] = useState('');
  const [password, setPassword] = useState('');
  const [test, setTest] = useState<{ ok: boolean; message: string }>();

  async function save(e: FormEvent) {
    e.preventDefault();
    const ok = await action.run(
      () =>
        call(ui.path, {
          method: 'PUT',
          body: { apiKey: apiKey.trim(), password },
        }).then(() => true),
      t(k('Saved')),
    );
    // Kunci & sandi tidak disimpan di memori halaman lebih lama dari perlu.
    setApiKey('');
    setPassword('');
    if (ok) {
      setTest(undefined);
      onChanged();
    }
  }
  async function remove() {
    if (!window.confirm(t(k('DeleteConfirm')))) return;
    const ok = await action.run(
      () => call(ui.path, { method: 'DELETE' }).then(() => true),
      t(k('Removed')),
    );
    if (ok) onChanged();
  }
  async function runTest() {
    setTest(undefined);
    const out = await action.run(() =>
      call<{ ok: boolean; message: string }>(`${ui.path}/test`, { method: 'POST', body: {} }),
    );
    if (out) setTest(out);
  }

  return (
    <Card title={t(k('Title'))}>
      <p className="ui-muted">{t(k('Hint'))}</p>
      <div className="ui-row" style={{ marginBottom: 10 }}>
        {info.source === 'admin' ? (
          <Badge tone="success">{t(k('Admin'), { last4: info.last4 ?? '' })}</Badge>
        ) : info.source === 'env' ? (
          <Badge tone="success">{t(k('Env'))}</Badge>
        ) : (
          <Badge tone="warning">{t(k('None'))}</Badge>
        )}
        {info.unreadable && <Badge tone="warning">{t('admin.ai.keyUnreadable')}</Badge>}
      </div>
      <ActionNotice error={action.error} done={action.done} />
      {test && <Notice tone={test.ok ? 'success' : 'warning'}>{test.message}</Notice>}
      {info.source !== 'env' && (
        <form onSubmit={save} className="adm-key-form" autoComplete="off">
          <div className="adm-fields">
            <TextField
              label={t(k('Label'))}
              type="password"
              autoComplete="off"
              spellCheck={false}
              maxLength={300}
              placeholder={info.source === 'admin' ? `••••${info.last4 ?? ''}` : ui.placeholder}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <TextField
              label={t('admin.ai.password')}
              hint={t('admin.ai.passwordHint')}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="ui-row">
            <Button type="submit" disabled={action.busy || apiKey.trim().length < 20 || !password}>
              {t('admin.ai.keySave')}
            </Button>
            {info.source === 'admin' && (
              <Button variant="danger" disabled={action.busy} onClick={() => void remove()}>
                {t('admin.ai.keyDelete')}
              </Button>
            )}
          </div>
        </form>
      )}
      {info.source && (
        <Button variant="secondary" disabled={action.busy} onClick={() => void runTest()}>
          {t('admin.ai.keyTest')}
        </Button>
      )}
    </Card>
  );
}

/** Kata yang belum punya gambar (dari docs/blueprint/gambar-kurang.csv) bisa diketik di sini. */
function GenerateCard({ overview, onMade }: { overview: Overview; onMade: () => void }) {
  const call = useApiCall('staff');
  const action = useAction();
  const [kind, setKind] = useState<AiImageKind>('object');
  const [subject, setSubject] = useState('');
  const [label, setLabel] = useState('');
  const [labelEn, setLabelEn] = useState('');
  const [theme, setTheme] = useState('');
  const [note, setNote] = useState('');
  const [variant, setVariant] = useState(1);
  const [withMomo, setWithMomo] = useState(false);
  // Gaya foto realistis untuk simulasi (D-088).
  // Bawaan: foto realistis (permintaan pemilik produk, D-092).
  const [style, setStyle] = useState<'ilustrasi' | 'foto'>('foto');
  const [last, setLast] = useState<{ reused: boolean; costUsd: number; image: ImageRow }>();

  async function submit(e: FormEvent) {
    e.preventDefault();
    const out = await action.run(() =>
      call<{ reused: boolean; costUsd: number; image: ImageRow }>('/admin/ai/images', {
        method: 'POST',
        body: {
          kind,
          subject: subject.trim(),
          label: label.trim(),
          ...(labelEn.trim() && { labelEn: labelEn.trim() }),
          ...(theme.trim() && { theme: theme.trim() }),
          ...(note.trim() && { note: note.trim() }),
          variant,
          withMomo,
          style,
        },
      }),
    );
    if (out) {
      setLast(out);
      onMade();
    }
  }

  const disabled = !overview.ready || !overview.settings.enabled;
  return (
    <Card title={t('admin.ai.generateTitle')}>
      <p className="ui-muted">{t('admin.ai.generateHint', { estimate: usd(overview.estimate) })}</p>
      {!overview.momoReady && <Notice tone="info">{t('admin.ai.momoFirst')}</Notice>}
      <ActionNotice error={action.error} />
      {last && (
        <Notice tone="success">
          {last.reused
            ? t('admin.ai.reused', { subject: last.image.subject })
            : t('admin.ai.made', { subject: last.image.subject, cost: usd(last.costUsd) })}
        </Notice>
      )}
      <form onSubmit={submit}>
        <div className="adm-fields">
          <SelectField
            label={t('admin.ai.kind')}
            value={kind}
            onChange={(e) => {
              const k = e.target.value as AiImageKind;
              setKind(k);
              if (k === 'character' && !subject) {
                setSubject('momo');
                setLabel('Momo, robot kecil yang ramah, badan ungu bulat, mata besar');
              }
            }}
            options={AI_IMAGE_KINDS.map((k) => ({ value: k, label: t(`admin.ai.kind.${k}`) }))}
          />
          <SelectField
            label={t('admin.ai.style')}
            hint={t('admin.ai.styleHint')}
            value={style}
            onChange={(e) => setStyle(e.target.value as 'ilustrasi' | 'foto')}
            options={[
              { value: 'ilustrasi', label: t('admin.ai.style.ilustrasi') },
              { value: 'foto', label: t('admin.ai.style.foto') },
            ]}
          />
          <TextField
            label={t('admin.ai.subject')}
            hint={t('admin.ai.subjectHint')}
            required
            pattern="[a-z][a-z0-9\-]{1,39}"
            value={subject}
            onChange={(e) => setSubject(e.target.value.toLowerCase())}
          />
          <TextField
            label={t('admin.ai.label')}
            required
            minLength={2}
            maxLength={80}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <TextField
            label={t('admin.ai.labelEn')}
            maxLength={60}
            value={labelEn}
            onChange={(e) => setLabelEn(e.target.value)}
          />
          <TextField
            label={t('admin.ai.theme')}
            maxLength={40}
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          />
          <TextField
            label={t('admin.ai.note')}
            hint={t('admin.ai.noteHint')}
            maxLength={120}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <TextField
            label={t('admin.ai.variant')}
            hint={t('admin.ai.variantHint')}
            type="number"
            min={1}
            max={12}
            value={String(variant)}
            onChange={(e) => setVariant(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
          />
        </div>
        {kind === 'scene' && (
          <Checkbox
            label={t('admin.ai.withMomo')}
            checked={withMomo}
            disabled={!overview.momoReady}
            onChange={(e) => setWithMomo(e.target.checked)}
          />
        )}
        <Button type="submit" disabled={disabled || action.busy || !subject || !label}>
          {action.busy ? t('admin.ai.generating') : t('admin.ai.generate')}
        </Button>
      </form>
    </Card>
  );
}

function ImageGrid({ rev, onChanged }: { rev: number; onChanged: () => void }) {
  // Bawaan: gambar yang sudah disetujui (yang tampil ke anak); review, ditolak, atau semua lewat filter.
  const [status, setStatus] = useState<AiImageStatus | 'all'>('approved');
  const [page, setPage] = useState(0);
  const query = `status=${status}&page=${page}&r=${rev}`;
  const list = useFetch<ImageRow[]>('staff', `/admin/ai/images?${query}`);
  const count = useFetch<{ total: number; pageSize: number }>(
    'staff',
    `/admin/ai/images/count?status=${status}&r=${rev}`,
  );
  const pages = count.data ? Math.max(1, Math.ceil(count.data.total / count.data.pageSize)) : 1;
  const call = useApiCall('staff');
  const action = useAction();
  async function review(id: string, next: AiImageStatus) {
    const ok = await action.run(() =>
      call(`/admin/ai/images/${id}`, { method: 'PATCH', body: { status: next } }).then(() => true),
    );
    if (ok) {
      list.reload();
      count.reload();
      onChanged();
    }
  }
  const pager = count.data && (
    <div className="ui-row adm-ai-pager">
      <span className="ui-muted">
        {t('admin.ai.pageInfo', { page: page + 1, pages, total: count.data.total })}
      </span>
      <Button variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>
        {t('admin.ai.prev')}
      </Button>
      <Button variant="secondary" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>
        {t('admin.ai.next')}
      </Button>
    </div>
  );
  return (
    <Card
      title={t('admin.ai.gridTitle')}
      actions={
        <SelectField
          label={t('admin.ai.filter')}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as AiImageStatus | 'all');
            setPage(0);
          }}
          options={(['approved', 'review', 'rejected', 'all'] as const).map((s) => ({
            value: s,
            label: t(`admin.ai.status.${s}`),
          }))}
        />
      }
    >
      <p className="ui-muted">{t('admin.ai.gridHint')}</p>
      {pager}
      <ActionNotice error={action.error} />
      <Loadable loading={list.loading} error={list.error} hasData={!!list.data}>
        {() =>
          list.data!.length === 0 ? (
            <p className="ui-muted">{t('admin.ai.empty')}</p>
          ) : (
            <ul className="adm-ai-grid">
              {list.data!.map((img) => (
                <li key={img.id}>
                  <Preview id={img.id} alt={img.label} />
                  <strong>{img.subject}</strong>
                  <small className="ui-muted">
                    {img.label} · v{img.variant} · {formatBytes(img.bytes)} · {usd(img.costUsd)}
                  </small>
                  {img.credit && <small className="ui-muted adm-ai-credit">{img.credit}</small>}
                  <div className="ui-row">
                    {img.status !== 'approved' && (
                      <Button
                        disabled={action.busy}
                        onClick={() => void review(img.id, 'approved')}
                      >
                        {t('admin.ai.approve')}
                      </Button>
                    )}
                    {img.status !== 'rejected' && (
                      <Button
                        variant="secondary"
                        disabled={action.busy}
                        onClick={() => void review(img.id, 'rejected')}
                      >
                        {t('admin.ai.reject')}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )
        }
      </Loadable>
    </Card>
  );
}

/** Pratinjau lewat fetch ber-token (gambar belum disetujui tidak punya URL publik). */
function Preview({ id, alt }: { id: string; alt: string }) {
  const blob = useBlobCall();
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let made: string | undefined;
    let live = true;
    void blob(`/admin/ai/images/${id}/file`)
      .then((b) => {
        made = URL.createObjectURL(b);
        if (live) setUrl(made);
      })
      .catch(() => undefined);
    return () => {
      live = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [id, blob]);
  return url ? (
    <img src={url} alt={alt} width={160} height={160} className="adm-ai-img" />
  ) : (
    <div className="adm-ai-img" aria-hidden />
  );
}

function SettingsCard({ initial, onSaved }: { initial: AiImageSettings; onSaved: () => void }) {
  const call = useApiCall('staff');
  const action = useAction();
  const [form, setForm] = useState(initial);
  const [password, setPassword] = useState('');
  const set = <K extends keyof AiImageSettings>(k: K, v: AiImageSettings[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const setPrice = (k: keyof AiImageSettings['price'], v: number) =>
    setForm((f) => ({ ...f, price: { ...f.price, [k]: v } }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const ok = await action.run(
      () =>
        call('/admin/ai/settings', { method: 'PUT', body: { settings: form, password } }).then(
          () => true,
        ),
      t('admin.ai.settingsSaved'),
    );
    setPassword('');
    if (ok) onSaved();
  }
  const num = (v: string) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  return (
    <Card title={t('admin.ai.settingsTitle')}>
      <p className="ui-muted">{t('admin.ai.settingsHint')}</p>
      <ActionNotice error={action.error} done={action.done} />
      <form onSubmit={submit}>
        <Checkbox
          label={t('admin.ai.enabled')}
          checked={form.enabled}
          onChange={(e) => set('enabled', e.target.checked)}
        />
        <div className="adm-fields">
          <SelectField
            label={t('admin.ai.mode')}
            hint={t('admin.ai.modeHint')}
            value={form.mode}
            onChange={(e) => set('mode', e.target.value as AiImageSettings['mode'])}
            options={[
              { value: 'responses', label: t('admin.ai.mode.responses') },
              { value: 'images', label: t('admin.ai.mode.images') },
            ]}
          />
          <TextField
            label={t('admin.ai.textModel')}
            required
            value={form.textModel}
            onChange={(e) => set('textModel', e.target.value.trim())}
          />
          <TextField
            label={t('admin.ai.imageModel')}
            required
            value={form.imageModel}
            onChange={(e) => set('imageModel', e.target.value.trim())}
          />
          <SelectField
            label={t('admin.ai.promptWriter')}
            hint={t('admin.ai.promptWriterHint')}
            value={form.promptWriter}
            onChange={(e) => set('promptWriter', e.target.value as AiImageSettings['promptWriter'])}
            options={[
              { value: 'none', label: t('admin.ai.promptWriter.none') },
              { value: 'claude', label: t('admin.ai.promptWriter.claude') },
            ]}
          />
          <TextField
            label={t('admin.ai.claudeModel')}
            required
            value={form.claudeModel}
            onChange={(e) => set('claudeModel', e.target.value.trim())}
          />
          <SelectField
            label={t('admin.ai.quality')}
            hint={t('admin.ai.qualityHint')}
            value={form.quality}
            onChange={(e) => set('quality', e.target.value as AiImageSettings['quality'])}
            options={['low', 'medium', 'high'].map((v) => ({ value: v, label: v }))}
          />
          <SelectField
            label={t('admin.ai.size')}
            value={form.size}
            onChange={(e) => set('size', e.target.value as AiImageSettings['size'])}
            options={['1024x1024', '1024x1536', '1536x1024'].map((v) => ({ value: v, label: v }))}
          />
          <SelectField
            label={t('admin.ai.background')}
            value={form.background}
            onChange={(e) => set('background', e.target.value as AiImageSettings['background'])}
            options={['transparent', 'opaque', 'auto'].map((v) => ({ value: v, label: v }))}
          />
          <TextField
            label={t('admin.ai.compression')}
            type="number"
            min={30}
            max={100}
            value={String(form.compression)}
            onChange={(e) => set('compression', num(e.target.value))}
          />
          <TextField
            label={t('admin.ai.daily')}
            type="number"
            min={0}
            step={0.5}
            value={String(form.dailyLimitUsd)}
            onChange={(e) => set('dailyLimitUsd', num(e.target.value))}
          />
          <TextField
            label={t('admin.ai.monthly')}
            type="number"
            min={0}
            step={1}
            value={String(form.monthlyLimitUsd)}
            onChange={(e) => set('monthlyLimitUsd', num(e.target.value))}
          />
        </div>
        <h3 className="adm-group-title">{t('admin.ai.priceTitle')}</h3>
        <div className="adm-fields">
          {(
            [
              'imageLow',
              'imageMedium',
              'imageHigh',
              'textInputPer1M',
              'textCachedInputPer1M',
              'textOutputPer1M',
            ] as const
          ).map((k) => (
            <TextField
              key={k}
              label={t(`admin.ai.price.${k}`)}
              type="number"
              min={0}
              step={0.001}
              value={String(form.price[k])}
              onChange={(e) => setPrice(k, num(e.target.value))}
            />
          ))}
        </div>
        <TextField
          label={t('admin.ai.password')}
          hint={t('admin.ai.passwordHint')}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" disabled={action.busy || !password}>
          {t('admin.save')}
        </Button>
      </form>
    </Card>
  );
}

function UsageCard({ recent, styleGuide }: { recent: Overview['recent']; styleGuide: string }) {
  return (
    <Card title={t('admin.ai.usageTitle')}>
      <p className="ui-muted">{t('admin.ai.usageHint')}</p>
      <div className="ui-table-wrap">
        <table className="ui-table">
          <thead>
            <tr>
              <th>{t('admin.ai.col.time')}</th>
              <th>{t('admin.ai.col.action')}</th>
              <th>{t('admin.ai.col.detail')}</th>
              <th>{t('admin.ai.col.tokens')}</th>
              <th>{t('admin.ai.col.cost')}</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((r, i) => (
              <tr key={i}>
                <td>{new Date(r.createdAt).toLocaleString('id-ID')}</td>
                <td>
                  {r.action} {!r.ok && <Badge tone="warning">{t('admin.ai.failed')}</Badge>}
                </td>
                <td>{[r.model, r.detail].filter(Boolean).join(' · ')}</td>
                <td>
                  {r.inputTokens !== null
                    ? `${r.inputTokens} (${r.cachedTokens ?? 0} cache) → ${r.outputTokens ?? 0}`
                    : '–'}
                </td>
                <td>{usd(r.costUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details>
        <summary>{t('admin.ai.styleGuide')}</summary>
        <p className="ui-muted">{styleGuide}</p>
      </details>
    </Card>
  );
}
