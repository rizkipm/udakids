import admin from './id/admin.json';
import common from './id/common.json';
import parent from './id/parent.json';
import play from './id/play.json';
import site from './id/site.json';
import staff from './id/staff.json';
import rank from './id/rank.json';
import contest from './id/contest.json';
import media from './id/media.json';
import { APP_NAME, CHARACTER_NAME } from '../config/app';

// Semua teks UI lewat sini (PRD A14). Satu file per area → kunci "area.kunci". Siap untuk en/.
const namespaces = { common, staff, admin, parent, play, site, rank, contest, media };
type Namespaces = typeof namespaces;
export type MessageKey = {
  [N in keyof Namespaces]: `${N & string}.${keyof Namespaces[N] & string}`;
}[keyof Namespaces];

const flat: Record<string, string> = {};
for (const [ns, dict] of Object.entries(namespaces)) {
  for (const [k, v] of Object.entries(dict as Record<string, string>)) flat[`${ns}.${k}`] = v;
}
const dictionaries: Record<string, Record<string, string>> = { id: flat };
export type Locale = 'id';

let locale: Locale = 'id';
export const setLocale = (next: Locale) => {
  locale = next;
};

const defaults: Record<string, string> = { app: APP_NAME, character: CHARACTER_NAME };

export function t(key: MessageKey, vars: Record<string, string | number> = {}): string {
  const all = { ...defaults, ...vars };
  const template = dictionaries[locale]![key] ?? key;
  return template.replace(/\{(\w+)\}/g, (m, name: string) => (name in all ? String(all[name]) : m));
}
