import { useEffect } from 'react';
import type { Color } from '@little-coder/engine';
import { useFetch } from '../auth/useApi';
import { Momo } from '../components/Momo';
import { t } from '../i18n';
import { Badge, Card, Table, type Column } from '../ui/ui';

type LivePlayer = {
  id: string;
  nickname: string;
  momoColor: string;
  type: 'family' | 'self' | 'class';
  parent: { id: string; name: string | null; email: string | null } | null;
  class: { id: string; name: string | null; code: string | null } | null;
  selfCode: string | null;
  book: string | null;
  topic: string | null;
  level: number | null;
  levelTitle: string | null;
  answeredToday: number;
  correctToday: number;
  lastActiveAt: string;
};
type LiveResponse = { windowMin: number; at: string; items: LivePlayer[] };

/** Diperbarui otomatis selama tab terlihat. */
const REFRESH_MS = 15_000;

/** "30 detik lalu", "4 menit lalu". */
function ago(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  return s < 60
    ? t('admin.live.secondsAgo', { n: s })
    : t('admin.live.minutesAgo', { n: Math.round(s / 60) });
}

const TYPE_LABEL = {
  family: 'admin.dir.typeFamily',
  self: 'admin.dir.typeSelf',
  class: 'admin.dir.typeClass',
} as const;

/**
 * Siapa yang sedang bermain sekarang (D-103): anak aktif ≤ 10 menit, anak siapa (orang tua / kelas / daftar
 * sendiri), materi yang sedang dimainkan, dan jawaban hari ini. Khusus admin.
 */
export function LivePlayers() {
  const live = useFetch<LiveResponse>('staff', '/admin/live');
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== 'hidden') live.reload();
    }, REFRESH_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const items = live.data?.items ?? [];
  const now = live.data ? Date.parse(live.data.at) : Date.now();

  const cols: Column<LivePlayer>[] = [
    {
      key: 'child',
      label: t('admin.live.child'),
      render: (r) => (
        <span className="live-child">
          <Momo color={r.momoColor as Color} size={30} />
          <strong>{r.nickname}</strong>
        </span>
      ),
    },
    {
      key: 'owner',
      label: t('admin.live.owner'),
      render: (r) => (
        <span className="live-owner">
          <Badge tone={r.type === 'family' ? 'info' : r.type === 'self' ? 'warning' : 'neutral'}>
            {t(TYPE_LABEL[r.type])}
          </Badge>
          {r.parent && (
            <small>
              {r.parent.name} · {r.parent.email}
            </small>
          )}
          {r.class && (
            <small>
              {t('admin.live.class', { name: r.class.name ?? '', code: r.class.code ?? '' })}
            </small>
          )}
          {!r.parent && !r.class && r.selfCode && (
            <small>{t('admin.live.selfCode', { code: r.selfCode })}</small>
          )}
        </span>
      ),
    },
    {
      key: 'playing',
      label: t('admin.live.playing'),
      render: (r) =>
        r.book ? (
          <span className="live-owner">
            <strong>{r.topic ?? r.book}</strong>
            <small>
              {r.book}
              {r.level ? ` · ${t('admin.live.level', { n: r.level })}` : ''}
              {r.levelTitle ? ` — ${r.levelTitle}` : ''}
            </small>
          </span>
        ) : (
          <span className="ui-muted">{t('admin.live.justLoggedIn')}</span>
        ),
    },
    {
      key: 'today',
      label: t('admin.live.today'),
      render: (r) =>
        t('admin.live.todayValue', { correct: r.correctToday, total: r.answeredToday }),
    },
    { key: 'ago', label: t('admin.live.lastActive'), render: (r) => ago(r.lastActiveAt, now) },
  ];

  return (
    <Card
      title={t('admin.live.title', { n: items.length })}
      actions={
        <span className="ui-muted">
          {t('admin.live.hint', { min: live.data?.windowMin ?? 10 })}
        </span>
      }
    >
      {live.error && !live.data ? (
        <p className="ui-muted">{t('admin.live.error')}</p>
      ) : (
        <Table rows={items} columns={cols} rowKey={(r) => r.id} empty={t('admin.live.empty')} />
      )}
    </Card>
  );
}
