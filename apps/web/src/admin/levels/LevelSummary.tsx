import type { ReactNode } from 'react';
import type { Level } from '@little-coder/engine';
import { t } from '../../i18n';
import { GridPreview } from './GridPreview';

const list = (xs: readonly (string | number | null)[]) =>
  xs.map((x) => (x === null ? '___' : String(x))).join(' · ');

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

/** Ringkasan level yang mudah dibaca (grid-move → gambar SVG). */
export function LevelSummary({ level }: { level: Level }) {
  const common = (
    <>
      <Row label={t('admin.level.sum.where')}>
        {t('admin.level.sum.whereValue', {
          world: level.world,
          index: level.index,
          tier: level.tier,
          role: level.role,
          focus: level.focus,
        })}
      </Row>
      <Row label={t('admin.level.sum.skills')}>{level.skills.join(', ')}</Row>
      <Row label={t('admin.level.sum.story')}>
        <code>{level.story.intro}</code> → <code>{level.story.success}</code>
      </Row>
    </>
  );
  let specific: ReactNode;
  switch (level.type) {
    case 'grid-move':
      specific = (
        <>
          <Row label={t('admin.level.sum.palette')}>{level.palette.join(', ')}</Row>
          <Row label={t('admin.level.sum.maxCards')}>{level.maxCards}</Row>
          <Row label={t('admin.level.sum.optimal')}>{String(level.stars.optimalSteps)}</Row>
          <Row label={t('admin.level.sum.collectAll')}>
            {level.goal.collectAll ? t('admin.yes') : t('admin.no')}
          </Row>
        </>
      );
      break;
    case 'sequence-cards':
      specific = (
        <>
          <Row label={t('admin.level.sum.cards')}>{list(level.cards)}</Row>
          <Row label={t('admin.level.sum.validOrders')}>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              {level.validOrders.map((o, i) => (
                <li key={i}>{list(o)}</li>
              ))}
            </ol>
          </Row>
          <Row label={t('admin.level.sum.distractors')}>{list(level.distractors) || '—'}</Row>
        </>
      );
      break;
    case 'pattern':
      specific = (
        <>
          <Row label={t('admin.level.sum.sequence')}>{list(level.sequence)}</Row>
          <Row label={t('admin.level.sum.choices')}>{list(level.choices)}</Row>
          <Row label={t('admin.level.sum.answers')}>
            {level.answers.map((a) => list(a)).join(' | ')}
          </Row>
        </>
      );
      break;
    case 'classify':
      specific = (
        <>
          {level.groups.map((g) => (
            <Row key={g} label={t('admin.level.sum.group', { g })}>
              {list(level.items.filter((i) => i.group === g).map((i) => i.id))}
            </Row>
          ))}
        </>
      );
      break;
    case 'number':
      specific = (
        <>
          <Row label={t('admin.level.sum.mode')}>{level.mode}</Row>
          <Row label={t('admin.level.sum.object')}>{level.object ?? '—'}</Row>
          <Row label={t('admin.level.sum.answer')}>{level.answer}</Row>
          <Row label={t('admin.level.sum.choices')}>{list(level.choices)}</Row>
        </>
      );
      break;
    case 'predict':
      specific = (
        <>
          <Row label={t('admin.level.sum.options')}>{list(level.options)}</Row>
          <Row label={t('admin.level.sum.outcome')}>{level.outcome}</Row>
          <Row label={t('admin.level.sum.explanations')}>{list(level.explanations) || '—'}</Row>
        </>
      );
      break;
  }
  return (
    <div>
      {level.type === 'grid-move' && <GridPreview level={level} />}
      <dl className="adm-summary">
        <Row label={t('admin.level.sum.type')}>
          <code>{level.type}</code>
        </Row>
        {common}
        {specific}
      </dl>
    </div>
  );
}
