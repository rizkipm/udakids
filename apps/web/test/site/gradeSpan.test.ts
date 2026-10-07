import { describe, expect, it } from 'vitest';
import { GRADES } from '@little-coder/engine';
import { t, type MessageKey } from '../../src/i18n';
import { gradeSpan, groupSubjects, subjectList } from '../../src/site/Landing';

describe('rentang jenjang di landing', () => {
  it('dihitung dari buku yang ada (urut GRADES), bukan teks tetap', () => {
    expect(gradeSpan([{ grade: 'sd4' }, { grade: 'prek' }, { grade: 'tk' }])).toBe(
      'Dari PAUD sampai kelas 4',
    );
    expect(gradeSpan([{ grade: 'smp79' }, { grade: 'prek' }, { grade: 'sd56' }])).toBe(
      'Dari PAUD sampai SMP',
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

describe('mata pelajaran di landing (D-059)', () => {
  const book = (domain: string, grade: string, standards: string[], levels = 10) => ({
    domain,
    grade,
    title: `${domain} ${grade}`,
    topics: 1,
    levels,
    sampleTopics: [],
    standards,
  });

  it('kalimat mata pelajaran mengikuti buku yang ada, termasuk English', () => {
    const books = [book('math', 'tk', []), book('sains', 'tk', []), book('english', 'prek', [])];
    expect(subjectList(books)).toBe('matematika, sains, dan bahasa Inggris');
    expect(subjectList(books, 'or')).toBe('matematika, sains, atau bahasa Inggris');
    expect(subjectList([book('math', 'tk', [])])).toBe('matematika');
    expect(subjectList(undefined)).toBe(t('site.subjects.default'));
  });

  it('buku dikelompokkan per mata pelajaran; rujukan digabung tanpa duplikat', () => {
    const groups = groupSubjects([
      book('math', 'prek', ['merdeka', 'singapore'], 250),
      book('math', 'sd1', ['merdeka', 'ccss'], 400),
      book('math', 'sd56', ['merdeka', 'timss', 'osn'], 100),
      book('english', 'prek', ['singapore', 'cambridge'], 290),
    ]);
    expect(groups.map((g) => [g.title, g.books.length, g.levels])).toEqual([
      ['Matematika', 3, 750],
      ['English', 1, 290],
    ]);
    expect(groups[0]!.standards).toEqual(['merdeka', 'singapore', 'timss', 'osn', 'ccss']);
    expect(groups[1]!.standards).toEqual(['singapore', 'cambridge']);
  });

  it('setiap rujukan yang bisa dikirim server punya label', () => {
    for (const std of ['merdeka', 'singapore', 'cambridge', 'timss', 'osn', 'ngss', 'ccss']) {
      const key = `site.std.${std}` as MessageKey;
      expect(t(key), std).not.toBe(key);
    }
  });
});
