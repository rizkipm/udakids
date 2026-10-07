import { useRef, useState, type DragEvent, type FormEvent } from 'react';
import { slugify } from '@little-coder/engine';
import { errorMessage } from '../../api/client';
import { useApiCall, useFetch } from '../../auth/useApi';
import { mediaUrl } from '../../components/BannerSlider';
import { t } from '../../i18n';
import { ArticleGallery } from '../../site/ArticleGallery';
import { ArticleBody, articleImageIds } from '../../site/SiteContent';
import {
  Badge,
  Button,
  Card,
  Empty,
  Notice,
  PageHeader,
  SelectField,
  TextArea,
  TextField,
} from '../../ui/ui';
import { ActionNotice, confirmAction, formatUpdated, Icon, Loadable, useAction } from '../common';
import { IMAGE_ACCEPT, uploadImage } from './upload';
import './media.css';
import '../../site/site.css';
import '../../site/content.css';

type Status = 'draft' | 'published';
export type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  coverImageId: string | null;
  imageIds?: string[];
  status: Status;
  publishedAt: string | null;
  updatedAt: string;
};
type ArticleFull = ArticleRow & { body: string };
type Form = {
  title: string;
  slug: string;
  summary: string;
  body: string;
  /** Urutan gambar; gambar pertama = sampul (D-076). */
  imageIds: string[];
  status: Status;
};

/** Sama dengan batas server (`articleInputSchema`). */
const MAX_IMAGES = 10;

const EMPTY: Form = {
  title: '',
  slug: '',
  summary: '',
  body: '',
  imageIds: [],
  status: 'draft',
};

function Editor({
  initial,
  onDone,
}: {
  initial: ArticleFull | null;
  onDone: (notice?: string) => void;
}) {
  const call = useApiCall('staff');
  const action = useAction();
  const file = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const [form, setForm] = useState<Form>(
    initial
      ? {
          title: initial.title,
          slug: initial.slug,
          summary: initial.summary,
          body: initial.body,
          imageIds: articleImageIds(initial),
          status: initial.status,
        }
      : EMPTY,
  );
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const [dragOver, setDragOver] = useState(false);

  /** Unggah beberapa gambar berurutan; berhenti di batas 10 gambar. Gambar yang gagal dilaporkan, sisanya lanjut. */
  async function addImages(files: readonly File[]) {
    if (!files.length) return;
    const room = MAX_IMAGES - form.imageIds.length;
    setUploadError(undefined);
    if (room <= 0) {
      setUploadError(t('media.admin.articles.maxImages', { n: MAX_IMAGES }));
      return;
    }
    setUploading(true);
    const errors: string[] = [];
    for (const f of files.slice(0, room)) {
      try {
        const img = await uploadImage(f);
        setForm((x) => ({ ...x, imageIds: [...x.imageIds, img.id] }));
      } catch (err) {
        errors.push(`${f.name}: ${errorMessage(err)}`);
      }
    }
    if (files.length > room) errors.push(t('media.admin.articles.maxImages', { n: MAX_IMAGES }));
    setUploadError(errors.length ? errors.join(' · ') : undefined);
    setUploading(false);
    if (file.current) file.current.value = '';
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!uploading) void addImages([...e.dataTransfer.files]);
  };
  const move = (from: number, to: number) =>
    setForm((x) => {
      if (to < 0 || to >= x.imageIds.length) return x;
      const ids = [...x.imageIds];
      const [id] = ids.splice(from, 1);
      ids.splice(to, 0, id!);
      return { ...x, imageIds: ids };
    });
  const removeImage = (i: number) =>
    setForm((x) => ({ ...x, imageIds: x.imageIds.filter((_, k) => k !== i) }));

  async function save(e: FormEvent) {
    e.preventDefault();
    const body = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      summary: form.summary.trim(),
      body: form.body.trim(),
      coverImageId: form.imageIds[0] ?? null,
      imageIds: form.imageIds,
      status: form.status,
    };
    const out = await action.run(() =>
      initial
        ? call<ArticleFull>(`/admin/articles/${initial.id}`, { method: 'PUT', body })
        : call<ArticleFull>('/admin/articles', { method: 'POST', body }),
    );
    if (out) onDone(t('media.admin.articles.saved', { name: out.title }));
  }

  const slugPreview = form.slug.trim() || (form.title.trim() ? slugify(form.title) : '');

  return (
    <div className="mda-editor">
      <Card
        title={initial ? t('media.admin.articles.editTitle') : t('media.admin.articles.newTitle')}
      >
        <form onSubmit={save}>
          <TextField
            label={t('media.admin.articles.fTitle')}
            required
            minLength={5}
            maxLength={140}
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
          />
          <TextField
            label={t('media.admin.articles.fSlug')}
            hint={t('media.admin.articles.fSlugHint', { slug: slugPreview || '…' })}
            maxLength={80}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            value={form.slug}
            onChange={(e) => set('slug', e.target.value.toLowerCase())}
          />
          <TextArea
            label={t('media.admin.articles.fSummary')}
            hint={t('media.admin.articles.fSummaryHint')}
            required
            minLength={10}
            maxLength={300}
            rows={3}
            value={form.summary}
            onChange={(e) => set('summary', e.target.value)}
          />
          <div className="ui-field">
            <label htmlFor="art-image-files">
              {t('media.admin.articles.fImages')}{' '}
              <span className="mda-count">
                {form.imageIds.length}/{MAX_IMAGES}
              </span>
            </label>
            {form.imageIds.length > 0 && (
              <ol className="mda-images" aria-label={t('media.admin.articles.fImages')}>
                {form.imageIds.map((id, i) => (
                  <li key={id} className={`mda-image${i === 0 ? ' is-cover' : ''}`}>
                    <img src={mediaUrl(id)} alt="" />
                    <span className="mda-image-no">
                      {i === 0 ? t('media.admin.articles.cover') : i + 1}
                    </span>
                    <div className="mda-image-tools">
                      <button
                        type="button"
                        disabled={i === 0}
                        aria-label={t('media.admin.articles.moveLeft', { n: i + 1 })}
                        onClick={() => move(i, i - 1)}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                          <path
                            d="M15 5l-7 7 7 7"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      {i > 0 && (
                        <button
                          type="button"
                          className="mda-image-cover"
                          onClick={() => move(i, 0)}
                        >
                          {t('media.admin.articles.makeCover')}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={i === form.imageIds.length - 1}
                        aria-label={t('media.admin.articles.moveRight', { n: i + 1 })}
                        onClick={() => move(i, i + 1)}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                          <path
                            d="M9 5l7 7-7 7"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="mda-image-del"
                        aria-label={t('media.admin.articles.removeImage', { n: i + 1 })}
                        onClick={() => removeImage(i)}
                      >
                        <Icon name="trash" />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {form.imageIds.length < MAX_IMAGES && (
              <label
                className={`mda-drop${dragOver ? ' is-over' : ''}${uploading ? ' is-busy' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                <input
                  ref={file}
                  id="art-image-files"
                  type="file"
                  multiple
                  accept={IMAGE_ACCEPT}
                  disabled={uploading}
                  onChange={(e) => void addImages([...(e.target.files ?? [])])}
                />
                <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
                  <path
                    d="M12 16V4m0 0L7 9m5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <strong>
                  {uploading
                    ? t('media.admin.articles.uploading')
                    : t('media.admin.articles.dropTitle')}
                </strong>
                <small>{t('media.admin.articles.fImagesHint', { n: MAX_IMAGES })}</small>
              </label>
            )}
            {uploadError && <small className="ui-error">{uploadError}</small>}
          </div>
          <TextArea
            label={t('media.admin.articles.fBody')}
            hint={t('media.admin.articles.fBodyHint')}
            required
            minLength={20}
            maxLength={20000}
            rows={16}
            value={form.body}
            onChange={(e) => set('body', e.target.value)}
          />
          <SelectField
            label={t('media.admin.articles.fStatus')}
            value={form.status}
            onChange={(e) => set('status', e.target.value as Status)}
            options={[
              { value: 'draft', label: t('media.admin.articles.status.draft') },
              { value: 'published', label: t('media.admin.articles.status.published') },
            ]}
          />
          <ActionNotice error={action.error} done={action.done} />
          <div className="ui-row">
            <Button type="submit" disabled={action.busy || uploading}>
              {t('media.admin.articles.save')}
            </Button>
            <Button variant="secondary" disabled={action.busy} onClick={() => onDone()}>
              {t('media.admin.articles.cancel')}
            </Button>
          </div>
        </form>
      </Card>
      <aside className="mda-preview" aria-label={t('media.admin.articles.preview')}>
        <h3>{t('media.admin.articles.preview')}</h3>
        <div className="site mda-article-preview">
          <article className="art-full">
            <header className="art-head">
              <h1>{form.title || t('media.admin.articles.fTitle')}</h1>
              {form.summary && <p className="art-lead">{form.summary}</p>}
            </header>
            <ArticleGallery ids={form.imageIds} title={form.title} />
            <ArticleBody body={form.body} />
          </article>
        </div>
      </aside>
    </div>
  );
}

/** Admin: artikel/berita landing page (D-073). */
export function ArticlesAdminPage() {
  const list = useFetch<ArticleRow[]>('staff', '/admin/articles');
  const call = useApiCall('staff');
  const action = useAction();
  const [editing, setEditing] = useState<ArticleFull | 'new' | null>(null);
  const [notice, setNotice] = useState<string>();

  async function open(id: string) {
    const out = await action.run(() => call<ArticleFull>(`/admin/articles/${id}`));
    if (out) setEditing(out);
  }
  async function remove(r: ArticleRow) {
    if (!confirmAction(t('media.admin.articles.deleteConfirm', { name: r.title }))) return;
    const out = await action.run(() =>
      call(`/admin/articles/${r.id}`, { method: 'DELETE' }).then(() => true),
    );
    if (out) {
      setNotice(t('media.admin.articles.deleted', { name: r.title }));
      list.reload();
    }
  }

  if (editing) {
    return (
      <>
        <PageHeader title={t('media.admin.articles.title')} />
        <Editor
          key={editing === 'new' ? 'new' : editing.id}
          initial={editing === 'new' ? null : editing}
          onDone={(msg) => {
            setEditing(null);
            setNotice(msg);
            if (msg) list.reload();
          }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t('media.admin.articles.title')}
        subtitle={t('media.admin.articles.subtitle')}
        actions={
          <Button onClick={() => setEditing('new')}>
            <Icon name="plus" />
            {t('media.admin.articles.new')}
          </Button>
        }
      />
      <Card title={t('media.admin.articles.listTitle')}>
        {notice && <Notice tone="success">{notice}</Notice>}
        <ActionNotice error={action.error} />
        <Loadable loading={list.loading} error={list.error} hasData={!!list.data}>
          {() =>
            !list.data!.length ? (
              <Empty>{t('media.admin.articles.empty')}</Empty>
            ) : (
              <ul className="mda-articles">
                {list.data!.map((r) => (
                  <li key={r.id} className="mda-article">
                    {r.coverImageId ? (
                      <span className="mda-thumb-wrap">
                        <img className="mda-thumb" src={mediaUrl(r.coverImageId)} alt="" />
                        {(r.imageIds?.length ?? 0) > 1 && (
                          <span className="mda-thumb-count">
                            {t('media.admin.articles.imageCount', { n: r.imageIds!.length })}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="mda-thumb mda-thumb-empty" aria-hidden />
                    )}
                    <div className="mda-article-text">
                      <strong>{r.title}</strong>
                      <small>
                        <Badge tone={r.status === 'published' ? 'success' : 'neutral'}>
                          {t(`media.admin.articles.status.${r.status}`)}
                        </Badge>{' '}
                        /artikel/{r.slug} · {formatUpdated(r.updatedAt)}
                      </small>
                    </div>
                    <div className="ui-row mda-order">
                      {r.status === 'published' && (
                        <a
                          className="ui-btn ui-btn-ghost"
                          href={`/artikel/${r.slug}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t('media.admin.articles.view')}
                        </a>
                      )}
                      <Button
                        variant="secondary"
                        disabled={action.busy}
                        onClick={() => void open(r.id)}
                      >
                        {t('media.admin.articles.edit')}
                      </Button>
                      <Button
                        variant="danger"
                        disabled={action.busy}
                        aria-label={t('media.admin.articles.deleteLabel', { name: r.title })}
                        onClick={() => void remove(r)}
                      >
                        <Icon name="trash" />
                      </Button>
                    </div>
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
