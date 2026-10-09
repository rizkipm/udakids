import { z } from 'zod';
import { OBJECTS, SENSES, SENSE_IDS, type ObjectId, type SenseId } from '../assets.js';
import type { Choice } from '../item.js';
import { between, defineFamily, range, reject } from './common.js';

/**
 * Game "ketuk wajah" pancaindra (D-089): gambar wajah besar, anak mengetuk alat indra yang tepat — langsung pada
 * mata, telinga, hidung, lidah, atau tangan (kulit). Interaksinya tetap `pick-one` (susunan `face`), jadi
 * penilaian, lomba, dan laporan memakai jalur yang sama.
 */

type Use = { object: ObjectId; sense: SenseId; what: string };

/** Kegiatan sehari-hari → alat indra yang dipakai (gambar sudah ada). */
export const SENSE_USES: readonly Use[] = [
  { object: 'pelangi', sense: 'mata', what: 'melihat warna pelangi' },
  { object: 'buku', sense: 'mata', what: 'melihat gambar di buku' },
  { object: 'bintang', sense: 'mata', what: 'melihat bintang di langit' },
  { object: 'drum', sense: 'telinga', what: 'mendengar suara drum' },
  { object: 'burung', sense: 'telinga', what: 'mendengar kicau burung' },
  { object: 'jam-dinding', sense: 'telinga', what: 'mendengar jam berbunyi tik tok' },
  { object: 'bunga', sense: 'hidung', what: 'mencium harumnya bunga' },
  { object: 'sabun', sense: 'hidung', what: 'mencium wangi sabun' },
  { object: 'kopi', sense: 'hidung', what: 'mencium bau kopi' },
  { object: 'permen', sense: 'lidah', what: 'merasakan manisnya permen' },
  { object: 'jeruk-nipis', sense: 'lidah', what: 'merasakan asamnya jeruk nipis' },
  { object: 'garam', sense: 'lidah', what: 'merasakan asinnya garam' },
  { object: 'kucing', sense: 'kulit', what: 'meraba bulu kucing yang lembut' },
  { object: 'batu', sense: 'kulit', what: 'meraba batu yang keras' },
  { object: 'salju', sense: 'kulit', what: 'merasakan dinginnya salju' },
];

const senseChoice = (s: SenseId, id: string, tag?: string): Choice => ({
  id,
  visual: { kind: 'sense', sense: s },
  say: SENSES[s].say,
  ...(tag && { tag }),
});

export const senseTapFamily = defineFamily({
  description:
    'Ketuk alat indra pada gambar wajah: indra yang dipakai untuk suatu kegiatan, nama alat indra, atau kegunaannya.',
  params: z.strictObject({
    /** `use` = kegiatan bergambar; `name` = "ketuk hidung"; `function` = "ketuk indra untuk mendengar". */
    mode: z.enum(['use', 'name', 'function']).default('use'),
    senses: z
      .array(z.enum(SENSE_IDS as [SenseId, ...SenseId[]]))
      .min(2)
      .max(5)
      .default([...SENSE_IDS]),
    /** Banyak alat indra yang bisa diketuk (sisanya tampil redup). */
    choices: range(2, 5).default([5, 5]),
  }),
  generate(p, rng) {
    const pool =
      p.mode === 'use' ? SENSE_USES.filter((u) => p.senses.includes(u.sense)) : undefined;
    if (pool && !pool.length) reject('tidak ada kegiatan untuk alat indra ini');
    const use = pool ? rng.pick(pool) : undefined;
    const sense = use ? use.sense : rng.pick(p.senses);
    const k = Math.min(between(rng, p.choices), SENSE_IDS.length);
    const others = rng.sample(
      SENSE_IDS.filter((s) => s !== sense),
      k - 1,
    );
    // Urutan tetap seperti di wajah (posisi diatur gambar, bukan urutan kartu).
    const shown = SENSE_IDS.filter((s) => s === sense || others.includes(s));
    const choices = shown.map((s) =>
      s === sense ? senseChoice(s, 'ans') : senseChoice(s, `s-${s}`, `indra-${s}`),
    );
    const info = SENSES[sense];
    const reteach = {
      say: `Kita ${info.verb} dengan ${info.say}. ${capital(info.say)} adalah ${info.indra}.`,
      show: [{ kind: 'face' as const, sense }],
    };
    const interaction = {
      type: 'pick-one' as const,
      choices,
      answer: 'ans',
      arrangement: 'face' as const,
    };
    if (use)
      return {
        prompt: `Untuk ${use.what}, kita memakai …`,
        say: `Ini ${OBJECTS[use.object].say}. Untuk ${use.what}, kita memakai apa? Ketuk di wajah.`,
        stimulus: [{ kind: 'object', object: use.object }],
        interaction,
        reteach: { ...reteach, say: `Untuk ${use.what}, kita memakai ${info.say}. ${reteach.say}` },
      };
    if (p.mode === 'function')
      return {
        prompt: `Ketuk ${info.indra}.`,
        say: `Ketuk alat indra untuk ${info.verb}.`,
        stimulus: [],
        interaction,
        reteach,
      };
    return {
      prompt: `Ketuk ${info.say}.`,
      say: `Mana ${info.say}? Ketuk di wajah.`,
      stimulus: [],
      interaction,
      reteach,
    };
  },
});

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
