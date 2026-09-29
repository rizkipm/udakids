/**
 * pnpm validate:content — PRD A7. Logika aturan ada di `validateContent` (engine); script ini IO saja.
 *
 * Flag:
 *   --allow-incomplete   komposisi fokus per dunia (4/3/3) hanya peringatan
 *   --content <dir>      folder konten (default: content/)
 *   --no-write           jangan tulis <content>/.generated/optimal.json
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { validateContent, validateSkillContent, type ContentFile } from '@little-coder/engine';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const ROOT = join(import.meta.dirname, '..');
const CONTENT = resolve(option('--content') ?? join(ROOT, 'content'));
const parseErrors: string[] = [];
const toRel = (p: string) => relative(CONTENT, p).split(sep).join('/');

function jsonFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.json'))
    .map((e) => join(e.parentPath, e.name))
    .sort();
}

function load(file: string): ContentFile | undefined {
  try {
    return { path: toRel(file), data: JSON.parse(readFileSync(file, 'utf8')) };
  } catch (err) {
    parseErrors.push(`${toRel(file)}: JSON tidak valid (${(err as Error).message})`);
    return undefined;
  }
}

const levels = jsonFiles(join(CONTENT, 'levels'))
  .map(load)
  .filter((f): f is ContentFile => f !== undefined);
const dialog = load(join(CONTENT, 'dialog', 'momo.id.json')) ?? {
  path: 'dialog/momo.id.json',
  data: undefined,
};

// Skill template Pustaka: skema, katalog, dan 200 soal acak per skill (A7 no. 7).
const skillFiles = jsonFiles(join(CONTENT, 'skills'))
  .map(load)
  .filter((f): f is ContentFile => f !== undefined);
const isCatalog = (f: ContentFile) => f.path.split('/').pop()!.startsWith('_');
const skillReport = validateSkillContent({
  catalogs: skillFiles.filter(isCatalog),
  skills: skillFiles.filter((f) => !isCatalog(f)),
});

const report = validateContent({ levels, dialog, allowIncomplete: flag('--allow-incomplete') });
const errors = [...parseErrors, ...report.errors, ...skillReport.errors];

if (!flag('--no-write') && errors.length === 0) {
  mkdirSync(join(CONTENT, '.generated'), { recursive: true });
  writeFileSync(
    join(CONTENT, '.generated', 'optimal.json'),
    JSON.stringify(report.optimal, null, 2) + '\n',
  );
}

for (const w of report.warnings) console.warn(`peringatan: ${w}`);
for (const e of errors) console.error(`error: ${e}`);
console.log(
  `\n${report.levels.length} level, ${skillReport.skills.length} skill valid — ${errors.length} error, ${report.warnings.length} peringatan`,
);
process.exit(errors.length > 0 ? 1 : 0);
