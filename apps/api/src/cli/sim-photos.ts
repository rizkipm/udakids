/**
 * Minta semua foto realistis untuk simulasi pelajaran satu topik (D-088) ke AI Gambar:
 *   pnpm sim:photos -- sains tkosn H          (dev)
 *   node dist/cli/sim-photos.js sains tkosn H (server)
 * Butuh API key OpenAI di Admin → AI Gambar. Memakai layanan AI Gambar yang sama dengan admin (batas biaya
 * harian/bulanan, audit, sidik jari): foto yang sudah ada dipakai ulang tanpa biaya. Foto baru berstatus
 * "review" — setujui di Admin → AI Gambar agar tampil di simulasi.
 */
import '../common/env.js';
import {
  BODY_PARTS,
  catalogSchema,
  OBJECTS,
  type AiImageRequest,
  type LessonSim,
  type ObjectId,
} from '@little-coder/engine';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { AiImageService } from '../ai/ai-image.service.js';
import { DEFAULT_DATABASE_URL } from '../common/config.js';
import * as schema from '../db/schema.js';
import { skillCatalogs, staffUsers } from '../db/schema.js';
import { MailService } from '../mail/mail.service.js';
import { SettingsService } from '../settings/settings.service.js';

/** Nama English bagian tubuh untuk prompt foto close-up. */
const PART_EN: Record<string, string> = {
  kepala: "child's head",
  rambut: "child's hair",
  mata: "child's eyes",
  telinga: "child's ear",
  hidung: "child's nose",
  mulut: "child's smiling mouth",
  tangan: "child's open hand",
  perut: "child's tummy with t-shirt",
  kaki: "child's feet",
};

/** Daftar permintaan foto dari data simulasi: foto utama, close-up bagian, contoh benda, dan kegiatan. */
export function simPhotoRequests(sim: LessonSim): AiImageRequest[] {
  const base = { variant: 1, withMomo: false, style: 'foto' as const };
  const out: AiImageRequest[] = [
    {
      ...base,
      kind: 'character',
      subject: sim.foto,
      label: 'anak Indonesia usia 5 tahun berdiri tegak',
      labelEn: 'Indonesian child, 5 years old',
      note: 'full body, front view, arms slightly away, plain t-shirt and shorts',
    },
  ];
  for (const b of sim.bagian) {
    if (b.foto)
      out.push({
        ...base,
        kind: 'object',
        subject: b.foto,
        label: `${BODY_PARTS[b.id]} anak`,
        labelEn: PART_EN[b.id],
      });
    if (b.contoh) {
      const name = b.contohGambar
        ? OBJECTS[b.contohGambar as ObjectId].say
        : b.contoh.replace(/^foto-contoh-/, '').replaceAll('-', ' ');
      out.push({ ...base, kind: 'object', subject: b.contoh, label: name });
    }
  }
  for (const k of sim.kegiatan)
    if (k.foto)
      out.push({
        ...base,
        kind: 'scene',
        subject: k.foto,
        label: `anak Indonesia sedang ${k.teks.toLowerCase()}`,
      });
  // Subjek kembar (mis. contoh dipakai dua bagian) cukup sekali.
  return out.filter((r, i) => out.findIndex((x) => x.subject === r.subject) === i);
}

async function main(domain: string, grade: string, code: string) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL });
  try {
    const db = drizzle(pool, { schema });
    const [row] = await db
      .select()
      .from(skillCatalogs)
      .where(and(eq(skillCatalogs.domain, domain), eq(skillCatalogs.grade, grade)));
    if (!row) throw new Error(`Buku ${domain}/${grade} tidak ada`);
    const cat = catalogSchema
      .parse({ domain, grade, title: row.title, categories: row.categories })
      .categories.find((c) => c.code === code);
    const sims = (cat?.lesson?.layar ?? []).flatMap((s) => (s.simulasi ? [s.simulasi] : []));
    if (!sims.length) throw new Error(`Topik ${code} tidak punya layar simulasi`);
    const [admin] = await db.select().from(staffUsers).where(eq(staffUsers.role, 'admin')).limit(1);
    if (!admin) throw new Error('Belum ada akun admin');
    // Layanan yang sama dengan Admin → AI Gambar (kunci admin terenkripsi, batas biaya, audit).
    const ai = new AiImageService(db, new SettingsService(db), new MailService(db), null);
    let made = 0;
    let reused = 0;
    let cost = 0;
    for (const r of sims.flatMap(simPhotoRequests)) {
      const res = await ai.generate(r, admin.id);
      if (res.reused) reused++;
      else made++;
      cost += res.costUsd;
      console.log(`${res.reused ? 'ada   ' : 'dibuat'} ${r.subject} (${res.image.status})`);
    }
    console.log(
      `Selesai: ${made} foto baru, ${reused} sudah ada, perkiraan biaya US$${cost.toFixed(3)}. Setujui di Admin → AI Gambar.`,
    );
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  const [domain, grade, code] = process.argv.slice(2).filter((x) => x !== '--');
  if (!domain || !grade || !code) {
    console.error('Pakai: pnpm sim:photos -- <domain> <grade> <kode topik>, mis. sains tkosn H');
    process.exit(1);
  }
  main(domain, grade, code).catch((err: unknown) => {
    console.error((err as Error).message);
    process.exit(1);
  });
}
