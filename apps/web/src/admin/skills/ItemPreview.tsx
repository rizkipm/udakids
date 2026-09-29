import { useMemo, useState } from 'react';
import { generateItem, type Item, type SkillTemplate } from '@little-coder/engine';
import { t } from '../../i18n';
import { ItemPlayer } from '../../play/ItemPlayer';
import { Button, Notice, SelectField } from '../../ui/ui';
import { Icon } from '../common';

type Generated = { seed: number; band: number; item?: Item; error?: string };

export function generatePreview(
  template: SkillTemplate,
  seed: number,
  band: number | 'mix',
  n = 3,
) {
  return Array.from({ length: n }, (_, i): Generated => {
    const b = band === 'mix' ? (seed + i) % 3 : band;
    try {
      return { seed: seed + i, band: b, item: generateItem(template, { seed: seed + i, band: b }) };
    } catch (err) {
      return { seed: seed + i, band: b, error: (err as Error).message };
    }
  });
}

/** Pratinjau 3 soal hasil generator dengan kontrol seed & band. */
export function ItemPreview({ template, count = 3 }: { template?: SkillTemplate; count?: number }) {
  const [seed, setSeed] = useState(1);
  const [band, setBand] = useState<number | 'mix'>('mix');
  const items = useMemo(
    () => (template ? generatePreview(template, seed, band, count) : []),
    [template, seed, band, count],
  );

  return (
    <div>
      <div className="adm-inline-form" style={{ marginBottom: 12 }}>
        <SelectField
          label={t('admin.preview.band')}
          value={String(band)}
          onChange={(e) => setBand(e.target.value === 'mix' ? 'mix' : Number(e.target.value))}
          options={[
            { value: 'mix', label: t('admin.preview.bandMix') },
            { value: '0', label: t('admin.preview.band0') },
            { value: '1', label: t('admin.preview.band1') },
            { value: '2', label: t('admin.preview.band2') },
          ]}
        />
        <div className="ui-field" style={{ width: 110 }}>
          <label htmlFor="adm-preview-seed">{t('admin.preview.seed')}</label>
          <input
            id="adm-preview-seed"
            type="number"
            min={0}
            value={seed}
            onChange={(e) => setSeed(Math.max(0, Number(e.target.value) || 0))}
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => setSeed(Math.floor(Math.random() * 100000))}
          disabled={!template}
        >
          <Icon name="refresh" />
          {t('admin.preview.reroll')}
        </Button>
      </div>
      {!template ? (
        <Notice tone="warning">{t('admin.preview.invalid')}</Notice>
      ) : (
        <div className="adm-preview-grid">
          {items.map((g) => (
            <div className="adm-preview" key={`${g.seed}/${g.band}`}>
              <div className="adm-preview-meta">
                {t('admin.preview.meta', { seed: g.seed, band: g.band })}
              </div>
              {g.item ? (
                <ItemPlayer item={g.item} mode="preview" showAnswer />
              ) : (
                <Notice tone="error">{g.error}</Notice>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
