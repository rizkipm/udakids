import { useState, type FormEvent } from 'react';
import { parseYoutubeId, youtubeThumb } from '@little-coder/engine';
import { useApiCall, useFetch } from '../../auth/useApi';
import { t } from '../../i18n';
import { Button, Card, Checkbox, Empty, PageHeader, TextArea, TextField } from '../../ui/ui';
import { ActionNotice, confirmAction, Icon, Loadable, useAction } from '../common';
import './media.css';

export type VideoRow = {
  id: string;
  youtubeId: string;
  title: string;
  description: string;
  active: boolean;
  sort: number;
  createdAt: string;
};
type VideoForm = { url: string; title: string; description: string; active: boolean; sort: number };

const EMPTY: VideoForm = { url: '', title: '', description: '', active: true, sort: 0 };
const formOf = (r: VideoRow): VideoForm => ({
  url: `https://youtu.be/${r.youtubeId}`,
  title: r.title,
  description: r.description,
  active: r.active,
  sort: r.sort,
});

/** Isian video: tautan YouTube + judul; pratinjau gambar muncul begitu tautannya dikenali. */
function VideoFields({
  form,
  set,
}: {
  form: VideoForm;
  set: <K extends keyof VideoForm>(k: K, v: VideoForm[K]) => void;
}) {
  const id = form.url.trim() ? parseYoutubeId(form.url) : null;
  return (
    <>
      <TextField
        label={t('media.admin.videos.fUrl')}
        hint={t('media.admin.videos.fUrlHint')}
        error={form.url.trim() && !id ? t('media.admin.videos.badUrl') : undefined}
        required
        maxLength={300}
        inputMode="url"
        value={form.url}
        onChange={(e) => set('url', e.target.value)}
      />
      {id && (
        <img
          className="mda-video-thumb"
          src={youtubeThumb(id)}
          alt={t('media.admin.videos.thumbAlt')}
          loading="lazy"
        />
      )}
      <TextField
        label={t('media.admin.videos.fTitle')}
        required
        minLength={3}
        maxLength={120}
        value={form.title}
        onChange={(e) => set('title', e.target.value)}
      />
      <TextArea
        label={t('media.admin.videos.fDesc')}
        maxLength={300}
        rows={2}
        value={form.description}
        onChange={(e) => set('description', e.target.value)}
      />
      <div className="mda-upload-fields">
        <TextField
          label={t('media.admin.videos.fSort')}
          hint={t('media.admin.videos.fSortHint')}
          type="number"
          min={0}
          max={9999}
          value={String(form.sort)}
          onChange={(e) => set('sort', Math.max(0, Math.min(9999, Number(e.target.value) || 0)))}
        />
        <Checkbox
          label={t('media.admin.videos.fActive')}
          checked={form.active}
          onChange={(e) => set('active', e.target.checked)}
        />
      </div>
    </>
  );
}

function useVideoForm(initial: VideoForm) {
  const [form, setForm] = useState(initial);
  const set = <K extends keyof VideoForm>(k: K, v: VideoForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const body = () => ({
    url: form.url.trim(),
    title: form.title.trim(),
    description: form.description.trim(),
    active: form.active,
    sort: form.sort,
  });
  return { form, set, setForm, body };
}

function AddVideo({ onAdded }: { onAdded: (r: VideoRow) => void }) {
  const call = useApiCall('staff');
  const action = useAction();
  const { form, set, setForm, body } = useVideoForm(EMPTY);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const out = await action.run(
      () => call<VideoRow>('/admin/videos', { method: 'POST', body: body() }),
      t('media.admin.videos.added', { name: form.title.trim() }),
    );
    if (out) {
      setForm(EMPTY);
      onAdded(out);
    }
  }

  return (
    <Card title={t('media.admin.videos.addTitle')}>
      <form onSubmit={submit} className="mda-video-add">
        <VideoFields form={form} set={set} />
        <ActionNotice error={action.error} done={action.done} />
        <Button type="submit" disabled={action.busy || !parseYoutubeId(form.url)}>
          <Icon name="plus" />
          {t('media.admin.videos.add')}
        </Button>
      </form>
    </Card>
  );
}

function VideoEditor({
  row,
  onSaved,
  onDeleted,
}: {
  row: VideoRow;
  onSaved: (r: VideoRow) => void;
  onDeleted: () => void;
}) {
  const call = useApiCall('staff');
  const action = useAction();
  const { form, set, body } = useVideoForm(formOf(row));

  async function save(e: FormEvent) {
    e.preventDefault();
    const out = await action.run(
      () => call<VideoRow>(`/admin/videos/${row.id}`, { method: 'PUT', body: body() }),
      t('media.admin.videos.saved', { name: form.title.trim() }),
    );
    if (out) onSaved(out);
  }

  async function remove() {
    if (!confirmAction(t('media.admin.videos.deleteConfirm', { name: row.title }))) return;
    const out = await action.run(() =>
      call(`/admin/videos/${row.id}`, { method: 'DELETE' }).then(() => true),
    );
    if (out) onDeleted();
  }

  return (
    <li className={`mda-photo${row.active ? '' : ' is-off'}`}>
      <form onSubmit={save} className="mda-photo-form">
        <VideoFields form={form} set={set} />
        <ActionNotice error={action.error} done={action.done} />
        <div className="ui-row">
          <Button type="submit" disabled={action.busy || !parseYoutubeId(form.url)}>
            {t('media.admin.videos.save')}
          </Button>
          <a
            className="ui-btn ui-btn-ghost"
            href={`https://www.youtube.com/watch?v=${row.youtubeId}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            {t('media.admin.videos.open')}
          </a>
          <Button
            variant="danger"
            disabled={action.busy}
            aria-label={t('media.admin.videos.deleteLabel', { name: row.title })}
            onClick={() => void remove()}
          >
            <Icon name="trash" />
          </Button>
        </div>
      </form>
    </li>
  );
}

/** Admin: video panduan YouTube di landing page (D-073). */
export function VideosAdminPage() {
  const list = useFetch<VideoRow[]>('staff', '/admin/videos');
  const [notice, setNotice] = useState<string>();
  return (
    <>
      <PageHeader
        title={t('media.admin.videos.title')}
        subtitle={t('media.admin.videos.subtitle')}
      />
      <AddVideo
        onAdded={() => {
          setNotice(undefined);
          list.reload();
        }}
      />
      <Card title={t('media.admin.videos.listTitle')}>
        {notice && <ActionNotice done={notice} />}
        <Loadable loading={list.loading} error={list.error} hasData={!!list.data}>
          {() =>
            !list.data!.length ? (
              <Empty>{t('media.admin.videos.empty')}</Empty>
            ) : (
              <ul className="mda-photos">
                {list.data!.map((r) => (
                  <VideoEditor
                    key={`${r.id}-${r.youtubeId}`}
                    row={r}
                    onSaved={() => list.reload()}
                    onDeleted={() => {
                      setNotice(t('media.admin.videos.deleted', { name: r.title }));
                      list.reload();
                    }}
                  />
                ))}
              </ul>
            )
          }
        </Loadable>
      </Card>
    </>
  );
}
