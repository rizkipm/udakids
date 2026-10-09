import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  COMMAND_KEYS,
  RESULT_KEYS,
  RIGHT_KEYS,
  SCORE_KEYS,
  WRONG_KEYS,
  type VoiceSettings,
  VOICE_MODELS,
} from '@little-coder/engine';
import { useApiCall, useFetch } from '../../auth/useApi';
import { API_URL } from '../../config/app';
import { t, type MessageKey } from '../../i18n';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Notice,
  PageHeader,
  Stat,
  TextArea,
  TextField,
} from '../../ui/ui';
import { ActionNotice, Icon, Loadable, useAction } from '../common';
import type { VoiceGenerateResult, VoiceOverview } from '../billing/types';
import { formatBytes, useBlobCall } from '../billing/util';

/** Nama suara Gemini-TTS yang cocok untuk Momo (bisa diketik nama lain). */
const VOICES = ['Leda', 'Aoede', 'Kore', 'Sulafat', 'Achird', 'Puck', 'Zephyr', 'Laomedeia'];

export const VOICE_GROUPS: { title: MessageKey; keys: readonly string[] }[] = [
  { title: 'admin.voice.group.cmd', keys: Object.values(COMMAND_KEYS) },
  { title: 'admin.voice.group.right', keys: RIGHT_KEYS },
  { title: 'admin.voice.group.wrong', keys: WRONG_KEYS },
  { title: 'admin.voice.group.score', keys: SCORE_KEYS },
  { title: 'admin.voice.group.result', keys: Object.values(RESULT_KEYS) },
];

function SettingsForm({ initial, onSaved }: { initial: VoiceSettings; onSaved: () => void }) {
  const call = useApiCall('staff');
  const action = useAction();
  const [form, setForm] = useState(initial);
  const set = <K extends keyof VoiceSettings>(k: K, v: VoiceSettings[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const out = await action.run(
      () => call<VoiceSettings>('/admin/voice/settings', { method: 'PUT', body: form }),
      t('admin.voice.settingsSaved'),
    );
    if (out) {
      setForm(out);
      onSaved();
    }
  }

  return (
    <Card title={t('admin.voice.settingsTitle')}>
      <ActionNotice error={action.error} done={action.done} />
      <form onSubmit={submit}>
        <Checkbox
          label={t('admin.voice.enabled')}
          checked={form.enabled}
          onChange={(e) => set('enabled', e.target.checked)}
        />
        <div className="adm-fields">
          <TextField
            label={t('admin.voice.model')}
            hint={t('admin.voice.modelHint')}
            list="adm-voice-models"
            required
            minLength={3}
            maxLength={60}
            value={form.model}
            onChange={(e) => set('model', e.target.value)}
          />
          <TextField
            label={t('admin.voice.voice')}
            hint={t('admin.voice.voiceHint')}
            required
            minLength={2}
            maxLength={40}
            list="adm-voice-names"
            value={form.voice}
            onChange={(e) => set('voice', e.target.value)}
          />
          <TextField
            label={t('admin.voice.rate')}
            hint={t('admin.voice.rateHint')}
            type="number"
            required
            min={0.7}
            max={1.2}
            step={0.05}
            value={String(form.rate)}
            onChange={(e) => set('rate', Number(e.target.value))}
          />
        </div>
        <datalist id="adm-voice-models">
          {VOICE_MODELS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <datalist id="adm-voice-names">
          {VOICES.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
        <TextArea
          className="adm-textarea"
          label={t('admin.voice.style')}
          hint={t('admin.voice.styleHint')}
          maxLength={400}
          rows={3}
          value={form.style}
          onChange={(e) => set('style', e.target.value)}
        />
        <Button type="submit" disabled={action.busy}>
          {t('admin.save')}
        </Button>
      </form>
    </Card>
  );
}

function Lines({ data, onSaved }: { data: VoiceOverview; onSaved: () => void }) {
  const call = useApiCall('staff');
  const blob = useBlobCall();
  const action = useAction();
  const play = useAction();
  const [texts, setTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(data.lines).map(([k, l]) => [k, l.text])),
  );
  const audio = useRef<{ el: HTMLAudioElement; url?: string } | null>(null);
  const known = new Set(VOICE_GROUPS.flatMap((g) => g.keys));
  const groups = [
    ...VOICE_GROUPS,
    {
      title: 'admin.voice.group.other' as MessageKey,
      keys: Object.keys(data.lines).filter((k) => !known.has(k)),
    },
  ].filter((g) => g.keys.some((k) => k in data.lines));
  const changed = Object.entries(texts).filter(
    ([k, v]) => data.lines[k] && v.trim() !== data.lines[k].text,
  );

  function stop() {
    if (!audio.current) return;
    audio.current.el.pause();
    if (audio.current.url) URL.revokeObjectURL(audio.current.url);
    audio.current = null;
  }
  useEffect(() => stop, []);

  async function listen(key: string) {
    stop();
    const line = data.lines[key]!;
    const text = (texts[key] ?? line.text).trim();
    if (line.clip && text === line.text) {
      const el = new Audio(`${API_URL}/voice/clip/${line.clip}`);
      audio.current = { el };
      await play.run(() => el.play());
      return;
    }
    await play.run(async () => {
      const b = await blob('/admin/voice/preview', { text });
      const url = URL.createObjectURL(b);
      const el = new Audio(url);
      audio.current = { el, url };
      await el.play();
    });
  }

  async function save() {
    const out = await action.run(
      () =>
        call('/admin/voice/lines', {
          method: 'PUT',
          body: { lines: Object.fromEntries(changed.map(([k, v]) => [k, v.trim()])) },
        }).then(() => true),
      t('admin.voice.linesSaved', { n: changed.length }),
    );
    if (out) onSaved();
  }

  return (
    <Card
      title={t('admin.voice.linesTitle')}
      actions={
        <Button disabled={action.busy || changed.length === 0} onClick={() => void save()}>
          {t('admin.voice.saveLines')}
        </Button>
      }
    >
      <p className="ui-muted">{t('admin.voice.linesHint')}</p>
      <ActionNotice error={action.error ?? play.error} done={action.done} />
      {groups.map((g) => (
        <section key={g.title}>
          <h3 className="adm-group-title">{t(g.title)}</h3>
          <ul className="adm-voice-lines">
            {g.keys
              .filter((k) => k in data.lines)
              .map((k) => {
                const line = data.lines[k]!;
                const dirty = (texts[k] ?? '').trim() !== line.text;
                const canPlay = (!!line.clip && !dirty) || data.providerReady;
                return (
                  <li key={k}>
                    <code className="adm-voice-key">{k}</code>
                    <input
                      aria-label={t('admin.voice.lineLabel', { key: k })}
                      maxLength={300}
                      value={texts[k] ?? ''}
                      onChange={(e) => setTexts((x) => ({ ...x, [k]: e.target.value }))}
                    />
                    {line.clip && !dirty ? (
                      <Badge tone="success">{t('admin.voice.hasClip')}</Badge>
                    ) : (
                      <Badge tone="muted">{t('admin.voice.noClip')}</Badge>
                    )}
                    <Button
                      variant="secondary"
                      disabled={!canPlay || play.busy}
                      aria-label={t('admin.voice.play', { key: k })}
                      title={t('admin.voice.play', { key: k })}
                      onClick={() => void listen(k)}
                    >
                      <Icon name="play" />
                    </Button>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </Card>
  );
}

/**
 * API key suara (D-043): disimpan terenkripsi di server, tidak pernah ditampilkan lagi (hanya 4 karakter
 * terakhir). Kosong → aplikasi memakai suara browser.
 */
function ApiKeyCard({ info, onChanged }: { info: VoiceOverview['key']; onChanged: () => void }) {
  const call = useApiCall('staff');
  const action = useAction();
  const [apiKey, setApiKey] = useState('');
  const [show, setShow] = useState(false);
  const [test, setTest] = useState<{ ok: boolean; message: string }>();
  const source = info?.source ?? null;
  const fromServer = source === 'env' || source === 'server';

  async function save(e: FormEvent) {
    e.preventDefault();
    const ok = await action.run(
      () =>
        call('/admin/voice/key', { method: 'PUT', body: { apiKey: apiKey.trim() } }).then(
          () => true,
        ),
      t('admin.voice.keySaved'),
    );
    if (ok) {
      setApiKey('');
      setTest(undefined);
      onChanged();
    }
  }
  async function remove() {
    const ok = await action.run(
      () => call('/admin/voice/key', { method: 'DELETE' }).then(() => true),
      t('admin.voice.keyRemoved'),
    );
    if (ok) {
      setTest(undefined);
      onChanged();
    }
  }
  async function runTest() {
    setTest(undefined);
    const out = await action.run(() =>
      call<{ ok: boolean; message: string }>('/admin/voice/key/test', { method: 'POST', body: {} }),
    );
    if (out) setTest(out);
  }

  return (
    <Card title={t('admin.voice.keyTitle')}>
      <p className="ui-muted">{t('admin.voice.keyHint')}</p>
      <div className="ui-row" style={{ marginBottom: 10 }}>
        {source === 'admin' ? (
          <Badge tone="success">{t('admin.voice.keyAdmin', { last4: info?.last4 ?? '' })}</Badge>
        ) : fromServer ? (
          <Badge tone="success">{t('admin.voice.keyEnv')}</Badge>
        ) : (
          <Badge tone="warning">{t('admin.voice.keyNone')}</Badge>
        )}
        {info?.unreadable && <Badge tone="warning">{t('admin.voice.keyUnreadable')}</Badge>}
      </div>
      <ActionNotice error={action.error} done={action.done} />
      {test && <Notice tone={test.ok ? 'success' : 'warning'}>{test.message}</Notice>}
      {fromServer ? (
        <p className="ui-muted">{t('admin.voice.keyEnvHint')}</p>
      ) : (
        <form onSubmit={save} className="adm-key-form">
          <TextField
            label={t('admin.voice.keyLabel')}
            type={show ? 'text' : 'password'}
            autoComplete="off"
            spellCheck={false}
            maxLength={200}
            placeholder={source === 'admin' ? `••••${info?.last4 ?? ''}` : 'AIza…'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <div className="ui-row">
            <Button variant="ghost" onClick={() => setShow((x) => !x)}>
              {show ? t('admin.voice.keyHide') : t('admin.voice.keyShow')}
            </Button>
            <Button type="submit" disabled={action.busy || apiKey.trim().length < 20}>
              {t('admin.voice.keySave')}
            </Button>
            {source === 'admin' && (
              <Button variant="danger" disabled={action.busy} onClick={() => void remove()}>
                {t('admin.voice.keyDelete')}
              </Button>
            )}
          </div>
        </form>
      )}
      {source && (
        <Button variant="secondary" disabled={action.busy} onClick={() => void runTest()}>
          {t('admin.voice.keyTest')}
        </Button>
      )}
    </Card>
  );
}

export function VoicePage() {
  const data = useFetch<VoiceOverview>('staff', '/admin/voice');
  const call = useApiCall('staff');
  const gen = useAction();
  const [result, setResult] = useState<VoiceGenerateResult>();

  async function generate() {
    setResult(undefined);
    const out = await gen.run(() =>
      call<VoiceGenerateResult>('/admin/voice/generate', { method: 'POST', body: {} }),
    );
    if (out) {
      setResult(out);
      data.reload();
    }
  }

  return (
    <>
      <PageHeader title={t('admin.voice.title')} subtitle={t('admin.voice.subtitle')} />
      <Loadable loading={data.loading} error={data.error} hasData={!!data.data}>
        {() => {
          const d = data.data!;
          const lineCount = Object.keys(d.lines).length;
          const withClip = Object.values(d.lines).filter((l) => l.clip).length;
          return (
            <>
              {!d.providerReady && <Notice tone="info">{t('admin.voice.noProvider')}</Notice>}
              <ApiKeyCard info={d.key} onChanged={data.reload} />
              <div className="ui-grid adm-stats">
                <Stat label={t('admin.voice.statClips')} value={d.clips} />
                <Stat label={t('admin.voice.statBytes')} value={formatBytes(d.bytes)} />
                <Stat
                  label={t('admin.voice.statLines')}
                  value={`${withClip}/${lineCount}`}
                  hint={t('admin.voice.statLinesHint')}
                />
                <Stat label={t('admin.voice.statToday')} value={d.madeToday} />
              </div>
              <Card
                title={t('admin.voice.generateTitle')}
                actions={
                  <Button disabled={gen.busy || !d.providerReady} onClick={() => void generate()}>
                    <Icon name="refresh" />
                    {gen.busy ? t('admin.voice.generating') : t('admin.voice.generate')}
                  </Button>
                }
              >
                <p className="ui-muted">{t('admin.voice.generateHint')}</p>
                <ActionNotice error={gen.error} />
                {result && (
                  <Notice tone={result.failed > 0 ? 'warning' : 'success'}>
                    {t('admin.voice.generated', {
                      total: result.total,
                      created: result.created,
                      skipped: result.skipped,
                      failed: result.failed,
                    })}
                  </Notice>
                )}
              </Card>
              <SettingsForm key={d.rev} initial={d.settings} onSaved={data.reload} />
              <Lines key={`${d.rev}-${JSON.stringify(d.lines)}`} data={d} onSaved={data.reload} />
            </>
          );
        }}
      </Loadable>
    </>
  );
}
