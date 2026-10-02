import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { nicknameSchema, OBJECTS, type Color, type PinPicture } from '@little-coder/engine';
import type { ClassRow } from '../../api/types';
import { useApiCall, useFetch } from '../../auth/useApi';
import { Momo } from '../../components/Momo';
import { VisualView } from '../../components/visuals';
import { t } from '../../i18n';
import { Button, Card, Empty, formatDate, Notice, PageHeader, TextArea } from '../../ui/ui';
import { ActionNotice, confirmAction, Loadable, useAction } from '../common';

type Student = {
  id: string;
  nickname: string;
  momoColor: string;
  viaParent: boolean;
  lastActiveAt: string | null;
  answered: number;
  rounds: number;
};
type LoginCard = { id: string; nickname: string; momoColor: string; pin: PinPicture[] };
type RosterResult = { code: string; eventName: string; created: LoginCard[]; skipped: string[] };

/** Pisah daftar nama: satu nama per baris (atau koma), buang kosong & duplikat. */
export function parseNames(text: string) {
  const seen = new Set<string>();
  const names: string[] = [];
  const invalid: string[] = [];
  for (const raw of text.split(/[\n,;]+/)) {
    const name = raw.trim().replace(/\s+/g, ' ');
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    (nicknameSchema.safeParse(name).success ? names : invalid).push(name);
  }
  return { names, invalid };
}

/**
 * Siswa kelas (D-025): tempel daftar nama → akun anak + sandi gambar acak → kartu masuk untuk
 * dicetak. Sandi hanya terlihat sekali (saat dibuat / direset).
 */
export function ClassStudentsPage({ base = '/admin/kelas' }: { base?: string }) {
  const { id = '' } = useParams();
  const call = useApiCall('staff');
  const action = useAction();
  const classes = useFetch<ClassRow[]>('staff', '/classes');
  const students = useFetch<Student[]>('staff', `/classes/${id}/students`);
  const cls = classes.data?.find((c) => c.id === id);
  const [text, setText] = useState('');
  const [cards, setCards] = useState<{ code: string; eventName: string; list: LoginCard[] }>();
  const parsed = parseNames(text);
  const joinUrl = cls ? `${window.location.origin}/play/gabung?kode=${cls.code}` : '';

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (parsed.names.length === 0) return;
    const res = await action.run(
      () =>
        call<RosterResult>(`/classes/${id}/roster`, {
          method: 'POST',
          body: { nicknames: parsed.names },
        }),
      t('admin.roster.done'),
    );
    if (res) {
      setCards({ code: res.code, eventName: res.eventName, list: res.created });
      setText(res.skipped.join('\n'));
      students.reload();
    }
  }

  async function resetPin(s: Student) {
    if (!confirmAction(t('admin.roster.resetConfirm', { name: s.nickname }))) return;
    const res = await action.run(
      () =>
        call<LoginCard & { code: string; eventName: string }>(
          `/classes/${id}/students/${s.id}/pin`,
          { method: 'POST' },
        ),
      t('admin.roster.resetDone', { name: s.nickname }),
    );
    if (res) setCards({ code: res.code, eventName: res.eventName, list: [res] });
  }

  return (
    <>
      <div className="no-print">
        <Link to={base}>{t('admin.roster.back')}</Link>
        <PageHeader
          title={cls ? cls.eventName : t('admin.roster.title')}
          subtitle={t('admin.roster.subtitle')}
        />
      </div>
      <ActionNotice error={action.error} done={action.done} />

      {cls && (
        <Card title={t('admin.roster.joinTitle')} className="no-print">
          <p className="ui-muted">{t('admin.roster.joinText')}</p>
          <div className="adm-join">
            <span className="adm-code">{cls.code}</span>
            <code className="adm-join-url">{joinUrl}</code>
            <Button
              variant="secondary"
              onClick={() => void navigator.clipboard?.writeText(joinUrl)}
            >
              {t('admin.roster.copy')}
            </Button>
          </div>
        </Card>
      )}

      {!cls?.closedAt && (
        <Card title={t('admin.roster.addTitle')} className="no-print">
          <form onSubmit={submit}>
            <TextArea
              label={t('admin.roster.names')}
              hint={t('admin.roster.namesHint')}
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            {parsed.invalid.length > 0 && (
              <Notice tone="warning">
                {t('admin.roster.invalid', { names: parsed.invalid.join(', ') })}
              </Notice>
            )}
            <Button type="submit" disabled={action.busy || parsed.names.length === 0}>
              {t('admin.roster.submit', { n: parsed.names.length })}
            </Button>
          </form>
        </Card>
      )}

      {cards && cards.list.length > 0 && (
        <Card
          title={t('admin.roster.cardsTitle', { n: cards.list.length })}
          actions={
            <Button className="no-print" onClick={() => window.print()}>
              {t('admin.roster.print')}
            </Button>
          }
        >
          <Notice tone="info">{t('admin.roster.cardsNote')}</Notice>
          <div className="login-cards">
            {cards.list.map((c) => (
              <article key={c.id} className="login-card">
                <header>
                  <Momo color={c.momoColor as Color} mood="happy" size={56} />
                  <div>
                    <strong>{c.nickname}</strong>
                    <small>{cards.eventName}</small>
                  </div>
                </header>
                <div className="login-card-code">
                  <span>{t('admin.roster.cardCode')}</span>
                  <b>{cards.code}</b>
                </div>
                <div className="login-card-pin">
                  <span>{t('admin.roster.cardPin')}</span>
                  <ol>
                    {c.pin.map((p, i) => (
                      <li key={i}>
                        <VisualView visual={{ kind: 'object', object: p }} size={44} />
                        <small>
                          {i + 1}. {OBJECTS[p].say}
                        </small>
                      </li>
                    ))}
                  </ol>
                </div>
              </article>
            ))}
          </div>
        </Card>
      )}

      <Card title={t('admin.roster.listTitle')} className="no-print">
        <Loadable loading={students.loading} error={students.error} hasData={!!students.data}>
          {() =>
            students.data!.length === 0 ? (
              <Empty>{t('admin.roster.empty')}</Empty>
            ) : (
              <ul className="adm-students">
                {students.data!.map((s) => (
                  <li key={s.id}>
                    <Momo color={s.momoColor as Color} mood="idle" size={40} />
                    <span className="adm-student-name">
                      <strong>{s.nickname}</strong>
                      <small className="ui-muted">
                        {s.viaParent ? t('admin.roster.viaParent') : t('admin.roster.viaClass')}
                        {' · '}
                        {s.lastActiveAt
                          ? t('admin.roster.active', { date: formatDate(s.lastActiveAt) })
                          : t('admin.roster.never')}
                      </small>
                      <small className="ui-muted">
                        {t('admin.roster.stats', {
                          answered: s.answered.toLocaleString('id-ID'),
                          rounds: s.rounds,
                        })}
                      </small>
                    </span>
                    {!s.viaParent && (
                      <Button
                        variant="secondary"
                        disabled={action.busy}
                        onClick={() => void resetPin(s)}
                      >
                        {t('admin.roster.reset')}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )
          }
        </Loadable>
      </Card>
    </>
  );
}
