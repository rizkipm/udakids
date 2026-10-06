import type { ManualItem, SkillTemplate, Visual } from '@little-coder/engine';
import { buildTemplate, checkTemplate, type SkillMeta, type TemplateCheck } from './skillForm';

/** Satu pilihan jawaban dalam form soal manual. */
export type ChoiceDraft = { visual: Visual; say: string; tag: string };

/** Satu soal dalam form (string kosong = tidak diisi). */
export type ItemDraft = {
  prompt: string;
  say: string;
  reteach: string;
  stimulus: Visual[];
  choices: ChoiceDraft[];
  /** true = "ketuk semua yang benar" (tap-all). */
  multi: boolean;
  answers: number[];
};

export const MAX_STIMULUS = 4;
export const MIN_CHOICES = 2;
export const MAX_CHOICES = 10;

export const newChoice = (value = 1): ChoiceDraft => ({
  visual: { kind: 'numeral', value },
  say: '',
  tag: '',
});

export function newItem(): ItemDraft {
  return {
    prompt: '',
    say: '',
    reteach: '',
    stimulus: [],
    choices: [newChoice(1), newChoice(2), newChoice(3)],
    multi: false,
    answers: [0],
  };
}

/** Form → item untuk params family `manual`. */
export function toManualItem(d: ItemDraft): ManualItem {
  const answers = [...new Set(d.answers)].sort((a, b) => a - b);
  return {
    prompt: d.prompt.trim(),
    ...(d.say.trim() && { say: d.say.trim() }),
    stimulus: d.stimulus,
    choices: d.choices.map((c) => ({
      visual: c.visual,
      ...(c.say.trim() && { say: c.say.trim() }),
      ...(c.tag.trim() && { tag: c.tag.trim() }),
    })),
    answer: d.multi ? answers : (answers[0] ?? 0),
    reteach: d.reteach.trim() || 'Yuk kita lihat lagi bersama.',
  };
}

/** Item tersimpan → form. */
export function fromManualItem(it: ManualItem): ItemDraft {
  const multi = Array.isArray(it.answer);
  return {
    prompt: it.prompt,
    say: it.say ?? '',
    reteach: it.reteach === 'Yuk kita lihat lagi bersama.' ? '' : it.reteach,
    stimulus: it.stimulus ?? [],
    choices: it.choices.map((c) => ({ visual: c.visual, say: c.say ?? '', tag: c.tag ?? '' })),
    multi,
    answers: Array.isArray(it.answer) ? it.answer : [it.answer],
  };
}

/** Item manual dari template tersimpan (tanpa asumsi bentuk — params belum tentu valid). */
export function draftsFromTemplate(t: SkillTemplate): ItemDraft[] {
  const items = (t.params as { items?: ManualItem[] }).items;
  return Array.isArray(items) && items.length ? items.map(fromManualItem) : [newItem()];
}

export function buildManualTemplate(meta: SkillMeta, items: ItemDraft[], version = 1) {
  return buildTemplate(meta, 'manual', { items: items.map(toManualItem) }, undefined, version);
}

/** Validasi template manual + kelompokkan masalah per nomor soal. */
export function checkManual(
  meta: SkillMeta,
  items: ItemDraft[],
  version = 1,
): TemplateCheck & { byItem: Map<number, string[]>; general: { path: string; message: string }[] } {
  const res = checkTemplate(buildManualTemplate(meta, items, version), 30);
  const byItem = new Map<number, string[]>();
  const general: { path: string; message: string }[] = [];
  for (const issue of res.issues) {
    const m = /^params\.items\.(\d+)(?:\.(.*))?$/.exec(issue.path);
    if (m) {
      const i = Number(m[1]);
      // Family manual tidak memakai band: buang awalan "band N: " dari pesan skema.
      const message = issue.message.replace(/^band \d: /, '');
      byItem.set(i, [...(byItem.get(i) ?? []), m[2] ? `${m[2]}: ${message}` : message]);
    } else general.push(issue);
  }
  return { ...res, byItem, general };
}

/** Template satu soal (untuk pratinjau per soal). */
export function singleItemTemplate(meta: SkillMeta, item: ItemDraft): SkillTemplate | undefined {
  // Metadata tiruan agar pratinjau tidak terhalang judul/kategori yang belum diisi.
  const previewMeta = { ...meta, id: 'manual.pratinjau', title: 'Pratinjau', category: 'A' };
  const res = checkTemplate(
    buildManualTemplate({ ...previewMeta, order: '1', tags: '' }, [item]),
    1,
  );
  return res.template && res.issues.length === 0 ? res.template : undefined;
}
