import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { BookLab, Catalog, Color, Materi, SkillTemplate } from '@little-coder/engine';
import { useFetch } from '../../auth/useApi';
import { t } from '../../i18n';
import { BookLabView } from '../../play/lab/BookLabPage';
import { MateriView } from '../../play/lab/MateriPage';
import { Badge, Button, Card, PageHeader, Stat } from '../../ui/ui';
import { Loadable } from '../common';
import '../../play/play.css';

type Coverage = {
  totals: {
    books: number;
    bookLabs: number;
    topics: number;
    materiActive: number;
    materiDraft: number;
  };
  books: {
    domain: string;
    grade: string;
    title: string;
    lab: { status: 'aktif' | 'draf'; judul: string; pos: number } | null;
    topics: {
      code: string;
      title: string;
      materi: { status: 'aktif' | 'draf'; judul: string } | null;
      labPos: string | null;
    }[];
  }[];
};

const statusBadge = (s: 'aktif' | 'draf' | undefined) =>
  s === 'aktif' ? (
    <Badge tone="success">{t('admin.lab.active')}</Badge>
  ) : s === 'draf' ? (
    <Badge tone="warning">{t('admin.lab.draft')}</Badge>
  ) : (
    <Badge tone="muted">{t('admin.lab.none')}</Badge>
  );

/** Admin: cakupan materi berformat lab per buku (D-109) + tautan pratinjau. */
export function LabCoveragePage() {
  const res = useFetch<Coverage>('staff', '/admin/lab/coverage');
  const [open, setOpen] = useState<string>();
  return (
    <>
      <PageHeader title={t('admin.lab.title')} subtitle={t('admin.lab.subtitle')} />
      <Loadable loading={res.loading} error={res.error} hasData={!!res.data}>
        {() => {
          const d = res.data!;
          return (
            <>
              <div className="adm-stats">
                <Stat
                  label={t('admin.lab.statBooks')}
                  value={t('admin.lab.ofN', { n: d.totals.bookLabs, of: d.totals.books })}
                />
                <Stat
                  label={t('admin.lab.statTopics')}
                  value={t('admin.lab.ofN', { n: d.totals.materiActive, of: d.totals.topics })}
                  hint={t('admin.lab.draftCount', { n: d.totals.materiDraft })}
                />
                <Stat
                  label={t('admin.lab.statPct')}
                  value={`${d.totals.topics ? Math.round((d.totals.materiActive / d.totals.topics) * 100) : 0}%`}
                />
              </div>
              {d.books.map((b) => {
                const key = `${b.domain}/${b.grade}`;
                const done = b.topics.filter((x) => x.materi?.status === 'aktif').length;
                return (
                  <Card
                    key={key}
                    title={b.title}
                    actions={
                      <>
                        {statusBadge(b.lab?.status)}
                        {b.lab && (
                          <Link to={`/admin/materi-lab/${b.domain}/${b.grade}`}>
                            {t('admin.lab.previewBook')}
                          </Link>
                        )}
                        <Button
                          variant="ghost"
                          onClick={() => setOpen(open === key ? undefined : key)}
                        >
                          {t('admin.lab.topicsOf', { n: done, of: b.topics.length })}
                        </Button>
                      </>
                    }
                  >
                    <div className="adm-lab-bar" aria-hidden>
                      <span
                        style={{
                          width: `${b.topics.length ? (done / b.topics.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    {open === key && (
                      <table className="adm-lab-table">
                        <tbody>
                          {b.topics.map((x) => (
                            <tr key={x.code}>
                              <td>{x.code}</td>
                              <td>{x.title}</td>
                              <td>{statusBadge(x.materi?.status)}</td>
                              <td className="ui-muted">{x.labPos ?? ''}</td>
                              <td>
                                {x.materi && (
                                  <Link to={`/admin/materi-lab/${b.domain}/${b.grade}/${x.code}`}>
                                    {t('admin.lab.preview')}
                                  </Link>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </Card>
                );
              })}
            </>
          );
        }}
      </Loadable>
    </>
  );
}

type Preview = {
  catalog: Catalog & { lab?: BookLab };
  skills: SkillTemplate[];
  category?: Catalog['categories'][number] & { materi?: Materi };
};

const PREVIEW_COLOR: Color = 'ungu';

/** Pratinjau Lab Buku / Materi Topik persis seperti di area anak (progres tidak disimpan). */
export function LabPreviewPage() {
  const { domain = '', grade = '', code } = useParams();
  const res = useFetch<Preview>(
    'staff',
    `/admin/lab/preview/${domain}/${grade}${code ? `/${code}` : ''}`,
  );
  const [parts, setParts] = useState<Record<string, number>>({});
  const mark = (part: string, stars = 1) =>
    setParts((p) => ({ ...p, [part]: Math.max(p[part] ?? -1, stars) }));
  return (
    <>
      <PageHeader
        title={t('admin.lab.previewTitle')}
        subtitle={t('admin.lab.previewHint')}
        actions={<Link to="/admin/materi-lab">{t('admin.lab.back')}</Link>}
      />
      <Loadable loading={res.loading} error={res.error} hasData={!!res.data}>
        {() => {
          const d = res.data!;
          return (
            <div className="kid-app adm-lab-preview">
              {code && d.category?.materi ? (
                <MateriView
                  materi={d.category.materi}
                  skills={d.skills}
                  where={{ domain, grade, code }}
                  title={d.category.title}
                  momoColor={PREVIEW_COLOR}
                  parts={parts}
                  mark={mark}
                />
              ) : d.catalog.lab ? (
                <BookLabView
                  lab={d.catalog.lab}
                  catalog={d.catalog}
                  skills={d.skills}
                  momoColor={PREVIEW_COLOR}
                  parts={parts}
                  mark={mark}
                />
              ) : (
                <p>{t('admin.lab.none')}</p>
              )}
            </div>
          );
        }}
      </Loadable>
    </>
  );
}
