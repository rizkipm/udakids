import { useParams } from 'react-router-dom';
import type { SkillTemplate } from '@little-coder/engine';
import type { CatalogRow, SkillRow } from '../../api/types';
import { useFetch } from '../../auth/useApi';
import { Loadable } from '../common';
import { ManualEditor } from './ManualEditor';
import { SkillEditor } from './SkillEditor';

type Mode = 'new' | 'new-manual' | 'edit';

/** Memuat katalog (+ skill yang diedit) lalu memilih editor generator atau soal manual. */
export function SkillEditorRoute({ mode }: { mode: Mode }) {
  const { id } = useParams();
  const catalogs = useFetch<CatalogRow[]>('staff', '/admin/catalogs');
  const skills = useFetch<SkillRow[]>('staff', mode === 'new-manual' ? null : '/admin/skills');
  const skill = useFetch<{ template: SkillTemplate; version: number; status: 'active' | 'draft' }>(
    'staff',
    mode === 'edit' && id ? `/admin/skills/${encodeURIComponent(id)}` : null,
  );

  const needSkill = mode === 'edit';
  return (
    <Loadable
      loading={catalogs.loading || (needSkill && skill.loading)}
      error={catalogs.error ?? skill.error}
      hasData={!!catalogs.data && (!needSkill || !!skill.data)}
    >
      {() => {
        const initial = skill.data
          ? { ...skill.data.template, version: skill.data.version, status: skill.data.status }
          : undefined;
        if (mode === 'new-manual' || initial?.family === 'manual') {
          return (
            <ManualEditor key={initial?.id ?? 'new'} initial={initial} catalogs={catalogs.data!} />
          );
        }
        return (
          <SkillEditor
            key={initial?.id ?? 'new'}
            initial={initial}
            catalogs={catalogs.data!}
            examples={skills.data}
          />
        );
      }}
    </Loadable>
  );
}
