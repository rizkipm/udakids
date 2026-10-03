import { describe, expect, it } from 'vitest';
import { GRADES } from '@little-coder/engine';
import { t, type MessageKey } from '../../src/i18n';
import { gradeSpan } from '../../src/site/Landing';

describe('rentang jenjang di landing', () => {
  it('dihitung dari buku yang ada (urut GRADES), bukan teks tetap', () => {
    expect(gradeSpan([{ grade: 'sd4' }, { grade: 'prek' }, { grade: 'tk' }])).toBe(
      'Dari Pra-TK sampai kelas 4',
    );
    expect(gradeSpan([{ grade: 'smp79' }, { grade: 'prek' }, { grade: 'sd56' }])).toBe(
      'Dari Pra-TK sampai SMP',
    );
    expect(gradeSpan([{ grade: 'tk' }, { grade: 'tkosn' }])).toBe('Untuk TK');
    expect(gradeSpan(undefined)).toBe(t('site.hero.kicker'));
    expect(gradeSpan([{ grade: 'tidak-dikenal' }])).toBe(t('site.hero.kicker'));
  });

  it('setiap jenjang di GRADES punya label (jenjang baru wajib diberi label)', () => {
    for (const g of GRADES) {
      const key = `site.span.${g}` as MessageKey;
      expect(t(key), g).not.toBe(key);
    }
  });
});
