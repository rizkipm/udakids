import { useRef, useState, type FormEvent } from 'react';
import { errorMessage } from '../../api/client';
import { useApiCall, useFetch } from '../../auth/useApi';
import { mediaUrl } from '../../components/BannerSlider';
import { t } from '../../i18n';
import { Pager } from '../../ui/Pager';
import {
  Button,
  Card,
  Checkbox,
  Empty,
  Notice,
  PageHeader,
  TextArea,
  TextField,
} from '../../ui/ui';
import { ActionNotice, confirmAction, Icon, Loadable, useAction } from '../common';
import { IMAGE_ACCEPT, imageProblem, titleFromFile, uploadImage } from './upload';
import './media.css';

export type GalleryRow = {
  id: string;
  title: string;
  caption: string;
  eventDate: string | null;
  imageId: string;
  active: boolean;
  sort: number;
  createdAt: string;
};
type GalleryList = { items: GalleryRow[]; total: number; page: number; pageSize: number };

const PAGE_SIZE = 12;

/** Unggah banyak foto berurutan (satu per satu, dengan progres). */
function Uploader({ onDone }: { onDone: () => void }) {
  const call = useApiCall('staff');
  const input = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState('');
  const [progress, setProgress] = useState<{ n: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [done, setDone] = useState<string>();

  async function submit(e: FormEvent) {
    e.preventDefault();
    const files = Array.from(input.current?.files ?? []);
    if (!files.length) return;
    setErrors([]);
    setDone(undefined);
    const failed: string[] = [];
    let ok = 0;
    for (const [i, file] of files.entries()) {
      setProgress({ n: i + 1, total: files.length });
      const problem = imageProblem(file);
      if (problem) {
        failed.push(t('media.upload.failed', { name: file.name, error: problem }));
        continue;
      }
      try {
        const img = await uploadImage(file);
        await call('/admin/gallery', {
          method: 'POST',
          body: {
            title: titleFromFile(file.name),
            caption: '',
            eventDate: date || null,
            imageId: img.id,
            active: true,
          },
        });
        ok++;
      } catch (err) {
        failed.push(t('media.upload.failed', { name: file.name, error: errorMessage(err) }));
      }
    }
    setProgress(null);
    setErrors(failed);
    if (ok) setDone(t('media.admin.gallery.uploaded', { n: ok }));
    if (input.current) input.current.value = '';
    if (ok) onDone();
  }

  return (
    <Card title={t('media.admin.gallery.uploadTitle')}>
      <form onSubmit={submit}>
        <div className="mda-upload-fields">
          <div className="ui-field">
            <label htmlFor="mda-gallery-files">{t('media.admin.gallery.files')}</label>
            <input
              ref={input}
              id="mda-gallery-files"
              type="file"
              multiple
              accept={IMAGE_ACCEPT}
              aria-describedby="mda-gallery-files-hint"
              disabled={!!progress}
            />
            <small id="mda-gallery-files-hint" className="ui-hint">
              {t('media.admin.gallery.filesHint')}
            </small>
          </div>
          <TextField
            label={t('media.admin.gallery.date')}
            type="date"
            value={date}
            disabled={!!progress}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        {progress && (
          <div className="mda-progress" role="status">
            <span>{t('media.admin.gallery.progress', progress)}</span>
            <progress value={progress.n - 1} max={progress.total} />
          </div>
        )}
        {done && <Notice tone="success">{done}</Notice>}
        {errors.length > 0 && (
          <Notice tone="error">
            <ul className="mda-errors">
              {errors.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </Notice>
        )}
        <Button type="submit" disabled={!!progress}>
          <Icon name="plus" />
          {t('media.admin.gallery.uploadTitle')}
        </Button>
      </form>
    </Card>
  );
}

function PhotoEditor({
  row,
  onSaved,
  onDeleted,
}: {
  row: GalleryRow;
  onSaved: (r: GalleryRow) => void;
  onDeleted: () => void;
}) {
  const call = useApiCall('staff');
  const action = useAction();
  const [form, setForm] = useState({
    title: row.title,
    caption: row.caption,
    eventDate: row.eventDate ?? '',
    active: row.active,
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function save(e: FormEvent) {
    e.preventDefault();
    const out = await action.run(
      () =>
        call<GalleryRow>(`/admin/gallery/${row.id}`, {
          method: 'PUT',
          body: {
            title: form.title.trim(),
            caption: form.caption.trim(),
            eventDate: form.eventDate || null,
            active: form.active,
            sort: row.sort,
          },
        }),
      t('media.admin.gallery.saved', { name: form.title.trim() }),
    );
    if (out) onSaved(out);
  }

  async function remove() {
    if (!confirmAction(t('media.admin.gallery.deleteConfirm', { name: row.title }))) return;
    const out = await action.run(() =>
      call(`/admin/gallery/${row.id}`, { method: 'DELETE' }).then(() => true),
    );
    if (out) onDeleted();
  }

  return (
    <li className={`mda-photo${row.active ? '' : ' is-off'}`}>
      <img src={mediaUrl(row.imageId)} alt={row.title} loading="lazy" />
      <form onSubmit={save} className="mda-photo-form">
        <TextField
          label={t('media.admin.gallery.fTitle')}
          required
          maxLength={80}
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
        />
        <TextArea
          label={t('media.admin.gallery.fCaption')}
          maxLength={300}
          rows={2}
          value={form.caption}
          onChange={(e) => set('caption', e.target.value)}
        />
        <TextField
          label={t('media.admin.gallery.fDate')}
          type="date"
          value={form.eventDate}
          onChange={(e) => set('eventDate', e.target.value)}
        />
        <Checkbox
          label={t('media.admin.gallery.fActive')}
          checked={form.active}
          onChange={(e) => set('active', e.target.checked)}
        />
        <ActionNotice error={action.error} done={action.done} />
        <div className="ui-row">
          <Button type="submit" disabled={action.busy}>
            {t('media.admin.gallery.save')}
          </Button>
          <Button
            variant="danger"
            disabled={action.busy}
            aria-label={t('media.admin.gallery.deleteLabel', { name: row.title })}
            onClick={() => void remove()}
          >
            <Icon name="trash" />
          </Button>
        </div>
      </form>
    </li>
  );
}

/** Admin: galeri dokumentasi landing (D-042). */
export function GalleryAdminPage() {
  const [page, setPage] = useState(1);
  const list = useFetch<GalleryList>('staff', `/admin/gallery?page=${page}&pageSize=${PAGE_SIZE}`);
  const [notice, setNotice] = useState<string>();

  return (
    <>
      <PageHeader
        title={t('media.admin.gallery.title')}
        subtitle={t('media.admin.gallery.subtitle')}
      />
      <Uploader
        onDone={() => {
          setNotice(undefined);
          if (page === 1) list.reload();
          else setPage(1);
        }}
      />
      <Card title={t('media.admin.gallery.listTitle')}>
        {notice && <Notice tone="success">{notice}</Notice>}
        <Loadable loading={list.loading} error={list.error} hasData={!!list.data}>
          {() => {
            const data = list.data!;
            if (!data.items.length) return <Empty>{t('media.admin.gallery.empty')}</Empty>;
            return (
              <>
                <ul className="mda-photos">
                  {data.items.map((r) => (
                    <PhotoEditor
                      key={r.id}
                      row={r}
                      onSaved={(out) =>
                        list.setData({
                          ...data,
                          items: data.items.map((x) => (x.id === out.id ? out : x)),
                        })
                      }
                      onDeleted={() => {
                        setNotice(t('media.admin.gallery.deleted', { name: r.title }));
                        if (data.items.length === 1 && page > 1) setPage(page - 1);
                        else list.reload();
                      }}
                    />
                  ))}
                </ul>
                <Pager
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={data.total}
                  onPage={(p) => setPage(p)}
                />
              </>
            );
          }}
        </Loadable>
      </Card>
    </>
  );
}
