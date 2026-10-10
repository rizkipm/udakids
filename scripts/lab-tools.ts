/**
 * Alat produksi materi berformat lab (D-109, L3). Draf ditulis per topik ke `labs-staging/<domain>/<grade>/<KODE>.json`
 * (Materi Topik) atau `_buku.json` (Lab Buku), supaya beberapa penulis bisa bekerja paralel tanpa mengubah file
 * katalog yang sama. Lalu digabung ke `content/skills/<domain>/<grade>/_catalog.json`.
 *
 *   pnpm lab:brief <domain> <grade>            daftar topik + status materi
 *   pnpm lab:brief <domain> <grade> <KODE>     ringkasan topik: semua level + contoh soal asli
 *   pnpm lab:check <domain> <grade> [KODE...]  periksa draf di labs-staging (skema, contoh, uji, rujukan)
 *   pnpm lab:merge [<domain> <grade> [KODE...]] gabungkan draf yang lolos ke katalog, lalu hapus drafnya
 */
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  bookLabSchema,
  catalogSchema,
  CONTOH_SEED,
  generateItem,
  isLabTopic,
  labQuizPool,
  materiQuizItems,
  materiSchema,
  skillTemplateSchema,
  type Catalog,
  type Item,
  type SkillTemplate,
} from '@little-coder/engine';

const ROOT = join(import.meta.dirname, '..');
const SKILLS = join(ROOT, 'content', 'skills');
const STAGING = join(ROOT, 'labs-staging');
const [cmd, ...args] = process.argv.slice(2);
// Output dipotong (mis. `| head`) tidak dianggap galat.
process.stdout.on('error', () => process.exit(0));

function book(domain: string, grade: string) {
  const dir = join(SKILLS, domain, grade);
  const path = join(dir, '_catalog.json');
  if (!existsSync(path)) throw new Error(`Buku ${domain}/${grade} tidak ada`);
  const catalog = catalogSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
  const skills: SkillTemplate[] = readdirSync(dir)
    .filter((f) => !f.startsWith('_') && f.endsWith('.json'))
    .map((f) => skillTemplateSchema.parse(JSON.parse(readFileSync(join(dir, f), 'utf8'))));
  return { path, catalog, skills };
}

const short = (t: string) => t.split('—').at(-1)!.trim();

/** Ringkasan satu soal untuk penulis materi: kalimat, pilihan, jawaban, pembahasan. */
function itemBrief(it: Item): string {
  const ia = it.interaction as {
    type: string;
    choices?: { id: string; say?: string; visual?: unknown }[];
    answer?: unknown;
  };
  const label = (c: { say?: string; visual?: unknown }) =>
    c.say || JSON.stringify(c.visual ?? '').slice(0, 60);
  const find = (id: string) => ia.choices?.find((c) => c.id === id);
  const ch = ia.choices?.map(label).join(' | ');
  const ans =
    typeof ia.answer === 'string'
      ? label(find(ia.answer) ?? { say: ia.answer })
      : Array.isArray(ia.answer)
        ? (ia.answer as string[]).map((a) => label(find(a) ?? { say: a })).join(', ')
        : JSON.stringify(ia.answer ?? '').slice(0, 120);
  const stim = it.stimulus?.length
    ? `\n      gambar: ${JSON.stringify(it.stimulus).slice(0, 120)}`
    : '';
  return `    [${ia.type}] ${it.prompt}${stim}${ch ? `\n      pilihan: ${ch}` : ''}\n      jawaban: ${ans}\n      pembahasan: ${it.reteach.say}`;
}

function brief(domain: string, grade: string, code?: string) {
  const { catalog, skills } = book(domain, grade);
  if (!code) {
    console.log(
      `${catalog.title} (${domain}/${grade}) — Lab Buku: ${catalog.lab ? catalog.lab.status : 'belum'}`,
    );
    for (const c of catalog.categories) {
      if (!isLabTopic(c)) continue;
      const n = skills.filter((k) => k.category === c.code).length;
      const staged = existsSync(join(STAGING, domain, grade, `${c.code}.json`));
      console.log(
        `  ${c.code.padEnd(3)} ${c.title} · ${n} level · materi: ${c.materi?.status ?? (staged ? 'draf di staging' : 'belum')}`,
      );
    }
    return;
  }
  const c = catalog.categories.find((x) => x.code === code);
  if (!c) throw new Error(`Topik ${code} tidak ada`);
  console.log(`# ${catalog.title} · ${c.code} ${c.title}`);
  if (c.intro) console.log(`intro: ${c.intro}`);
  if (c.tips) console.log(`tips: ${c.tips.join(' / ')}`);
  const levels = skills.filter((k) => k.category === code).sort((a, b) => a.order - b.order);
  for (const k of levels) {
    console.log(`\n## Level ${k.order}: ${short(k.title)}  (family ${k.family})`);
    for (const seed of [CONTOH_SEED, 101, 223]) {
      try {
        console.log(itemBrief(generateItem(k, { seed, band: 0 })));
      } catch (err) {
        console.log(`    (tidak bisa dibuat: ${(err as Error).message})`);
      }
    }
  }
}

function checkMateri(domain: string, grade: string, code: string, data: unknown): string[] {
  const out: string[] = [];
  const r = materiSchema.safeParse(data);
  if (!r.success) {
    for (const i of r.error.issues) out.push(`${i.path.join('.')} — ${i.message}`);
    return out;
  }
  const { catalog, skills } = book(domain, grade);
  if (!catalog.categories.some((c) => c.code === code))
    out.push(`topik ${code} tidak ada di katalog`);
  const own = skills.filter((k) => k.category === code && k.family !== 'mock');
  if (!own.length) out.push('topik tanpa level');
  for (const k of own)
    try {
      generateItem(k, { seed: CONTOH_SEED, band: 0 });
    } catch {
      out.push(`contoh level ${k.order} tidak bisa dibuat`);
    }
  if (own.length && materiQuizItems(own, 8, 0).length < 4) out.push('uji penguasaan < 4 soal');
  const levels = new Set(own.map((k) => String(k.order)));
  for (const lv of Object.keys(r.data.contoh?.catatan ?? {}))
    if (!levels.has(lv)) out.push(`catatan contoh untuk level ${lv} yang tidak ada`);
  return out;
}

function checkBook(domain: string, grade: string, data: unknown): string[] {
  const out: string[] = [];
  const r = bookLabSchema.safeParse(data);
  if (!r.success) {
    for (const i of r.error.issues) out.push(`${i.path.join('.')} — ${i.message}`);
    return out;
  }
  const { catalog, skills } = book(domain, grade);
  const codes = new Set(catalog.categories.map((c) => c.code));
  for (const p of r.data.pos) {
    for (const t of p.topik) if (!codes.has(t)) out.push(`pos ${p.id}: topik ${t} tidak ada`);
    for (const ref of p.uji)
      if (!skills.some((k) => k.category === ref.topik && k.order === ref.level))
        out.push(`pos ${p.id}: level ${ref.topik}.${ref.level} tidak ada`);
    if (labQuizPool(skills, p.uji, p.saring).length < 4) out.push(`pos ${p.id}: bank soal Uji < 4`);
  }
  for (const ref of r.data.ujian.soal)
    if (!skills.some((k) => k.category === ref.topik && k.order === ref.level))
      out.push(`uji jago: level ${ref.topik}.${ref.level} tidak ada`);
  const regular = catalog.categories.filter(isLabTopic).map((c) => c.code);
  const covered = new Set(r.data.pos.flatMap((p) => p.topik));
  const missing = regular.filter((c) => !covered.has(c));
  if (missing.length) out.push(`topik belum masuk pos mana pun: ${missing.join(', ')}`);
  return out;
}

function stagedFiles(domain: string, grade: string, codes: string[]) {
  const dir = join(STAGING, domain, grade);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .filter((c) => !codes.length || codes.includes(c))
    .map((c) => ({ code: c, path: join(dir, `${c}.json`) }));
}

function check(domain: string, grade: string, codes: string[]): boolean {
  let ok = true;
  for (const f of stagedFiles(domain, grade, codes)) {
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(f.path, 'utf8'));
    } catch (err) {
      console.log(`✗ ${f.code}: JSON tidak valid (${(err as Error).message})`);
      ok = false;
      continue;
    }
    const errs =
      f.code === '_buku'
        ? checkBook(domain, grade, data)
        : checkMateri(domain, grade, f.code, data);
    if (errs.length) {
      ok = false;
      console.log(`✗ ${domain}/${grade}/${f.code}`);
      for (const e of errs) console.log(`    ${e}`);
    } else console.log(`✓ ${domain}/${grade}/${f.code}`);
  }
  return ok;
}

function merge(only?: [string, string], codes: string[] = []) {
  if (!existsSync(STAGING)) return console.log('labs-staging kosong');
  const pairs = only
    ? [only]
    : readdirSync(STAGING).flatMap((d) =>
        existsSync(join(STAGING, d))
          ? readdirSync(join(STAGING, d)).map((g) => [d, g] as [string, string])
          : [],
      );
  for (const [domain, grade] of pairs) {
    const files = stagedFiles(domain, grade, codes);
    if (!files.length) continue;
    const { path } = book(domain, grade);
    const raw = JSON.parse(readFileSync(path, 'utf8')) as Catalog;
    let merged = 0;
    for (const f of files) {
      const data = JSON.parse(readFileSync(f.path, 'utf8')) as unknown;
      const errs =
        f.code === '_buku'
          ? checkBook(domain, grade, data)
          : checkMateri(domain, grade, f.code, data);
      if (errs.length) {
        console.log(`✗ dilewati ${domain}/${grade}/${f.code}: ${errs[0]}`);
        continue;
      }
      if (f.code === '_buku') raw.lab = data as Catalog['lab'];
      else {
        const cat = raw.categories.find((c) => c.code === f.code)!;
        cat.materi = data as NonNullable<Catalog['categories'][number]['materi']>;
      }
      rmSync(f.path);
      merged++;
    }
    catalogSchema.parse(raw);
    writeFileSync(path, `${JSON.stringify(raw, null, 2)}\n`);
    console.log(`${domain}/${grade}: ${merged} draf digabung`);
  }
}

try {
  if (cmd === 'brief') brief(args[0]!, args[1]!, args[2]);
  else if (cmd === 'check') process.exit(check(args[0]!, args[1]!, args.slice(2)) ? 0 : 1);
  else if (cmd === 'merge')
    merge(args.length >= 2 ? [args[0]!, args[1]!] : undefined, args.slice(2));
  else console.log('pakai: lab:brief | lab:check | lab:merge');
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
