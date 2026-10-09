import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AI_PHOTO_STYLE_GUIDE,
  CLAUDE_PROMPT_WRITER_SYSTEM,
  DEFAULT_AI_IMAGE_SETTINGS,
  aiImageSettingsSchema,
  claudeCost,
  claudePromptWriterInput,
  estimateImageCost,
  AI_STYLE_GUIDE,
  aiImageRequestSchema,
  aiStyleGuideFor,
  catalogSchema,
  composeImagePrompt,
  lessonScreenSchema,
  lessonVoiceLines,
} from '../src/index.js';

const catalog = catalogSchema.parse(
  JSON.parse(
    readFileSync(
      new URL('../../../content/skills/sains/tkosn/_catalog.json', import.meta.url),
      'utf8',
    ),
  ),
);
const lesson = catalog.categories.find((c) => c.code === 'H')!.lesson!;

describe('simulasi "Tubuhku bekerja" (D-088)', () => {
  it('topik H Sains TK punya layar simulasi + kuis + ingat', () => {
    expect(lesson.layar.map((s) => s.jenis)).toEqual(['simulasi', 'coba', 'coba', 'ingat']);
    const sim = lesson.layar[0]!.simulasi!;
    expect(sim.bagian.map((b) => b.id)).toEqual([
      'mata',
      'telinga',
      'hidung',
      'mulut',
      'tangan',
      'kaki',
    ]);
    // Momen aha: ada kegiatan yang memakai lebih dari satu bagian tubuh.
    expect(sim.kegiatan.some((k) => k.bagian.length > 1)).toBe(true);
    for (const b of sim.bagian) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeLessThanOrEqual(100);
    }
  });

  it('kunci suara pelajaran stabil dan mencakup semua kalimat simulasi', () => {
    const lines = lessonVoiceLines(lesson);
    expect(lines['0']).toBe(lesson.layar[0]!.suara);
    expect(lines['0.b.mata']).toBe('Ini mata. Mata untuk melihat.');
    expect(lines['0.k.menendang-bola.ok']).toMatch(/kaki menendang/);
    expect(lines['0.aha']).toMatch(/bekerja bersama/);
    expect(lines['3']).toBe(lesson.layar[3]!.suara);
  });

  it('skema menolak kegiatan dengan bagian yang tidak ada dan simulasi tanpa momen aha', () => {
    const base = lesson.layar[0]!;
    const sim = base.simulasi!;
    const bad = {
      ...base,
      simulasi: { ...sim, kegiatan: sim.kegiatan.map((k) => ({ ...k, bagian: ['perut'] })) },
    };
    const r = lessonScreenSchema.safeParse(bad);
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toMatch(/tidak ada|aha/);
  });
});

describe('AI Gambar: gaya foto realistis (D-088)', () => {
  it('bawaan ilustrasi; foto memakai panduan foto & prompt foto', () => {
    const base = { kind: 'object', subject: 'foto-contoh-apel', label: 'apel merah' } as const;
    const ilustrasi = aiImageRequestSchema.parse(base);
    expect(ilustrasi.style).toBe('ilustrasi');
    expect(aiStyleGuideFor(ilustrasi)).toBe(AI_STYLE_GUIDE);
    const foto = aiImageRequestSchema.parse({ ...base, style: 'foto' });
    expect(aiStyleGuideFor(foto)).toBe(AI_PHOTO_STYLE_GUIDE);
    expect(AI_PHOTO_STYLE_GUIDE).toMatch(/realistic photo/);
    expect(AI_PHOTO_STYLE_GUIDE).toMatch(/no letters/);
    expect(composeImagePrompt(foto)).toMatch(/realistic close-up photo of apel merah/);
    expect(composeImagePrompt(ilustrasi)).toMatch(/sticker-like icon/);
  });
});

describe('AI Gambar: Claude menulis prompt (D-092)', () => {
  it('pengaturan lama tanpa field baru tetap valid (default: Claude menulis prompt, Opus 5.5)', () => {
    const { promptWriter: _p, claudeModel: _m, ...old } = DEFAULT_AI_IMAGE_SETTINGS;
    const {
      claudeInputPer1M: _a,
      claudeCachedInputPer1M: _b,
      claudeOutputPer1M: _c,
      ...oldPrice
    } = DEFAULT_AI_IMAGE_SETTINGS.price;
    const parsed = aiImageSettingsSchema.parse({ ...old, price: oldPrice });
    expect(parsed).toEqual(DEFAULT_AI_IMAGE_SETTINGS);
    expect(parsed.promptWriter).toBe('claude');
    expect(parsed.claudeModel).toBe('claude-opus-5-5');
  });

  it('perkiraan biaya naik saat Claude aktif; biaya nyata dari token', () => {
    const base = estimateImageCost({ ...DEFAULT_AI_IMAGE_SETTINGS, promptWriter: 'none' });
    const claude = { ...DEFAULT_AI_IMAGE_SETTINGS, promptWriter: 'claude' as const };
    expect(estimateImageCost(claude)).toBeGreaterThan(base);
    // 1 juta token masuk Opus 5.5 = US$4; 1 juta token keluar = US$20.
    expect(claudeCost(claude, { input: 1e6, cachedRead: 0, cacheWrite: 0, output: 0 })).toBe(4);
    expect(claudeCost(claude, { input: 0, cachedRead: 0, cacheWrite: 0, output: 1e6 })).toBe(20);
  });

  it('pesan ke Claude: data permintaan + panduan gaya, tanpa data anak; sistem tetap', () => {
    const r = aiImageRequestSchema.parse({
      kind: 'scene',
      subject: 'foto-kegiatan-makan-apel',
      label: 'anak Indonesia sedang makan apel',
      style: 'foto',
    });
    const msg = JSON.parse(claudePromptWriterInput(r, AI_PHOTO_STYLE_GUIDE));
    expect(msg.request).toMatchObject({ kind: 'scene', style: 'foto', label: r.label });
    expect(msg.styleGuide).toBe(AI_PHOTO_STYLE_GUIDE);
    expect(msg.basePrompt).toMatch(/realistic photo/);
    expect(CLAUDE_PROMPT_WRITER_SYSTEM).toMatch(/no letters/);
    expect(CLAUDE_PROMPT_WRITER_SYSTEM).not.toMatch(/\{/);
  });
});
