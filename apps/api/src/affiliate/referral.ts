import { createHmac } from 'node:crypto';
import {
  affiliateSettingsSchema,
  DEFAULT_AFFILIATE_SETTINGS,
  normalizeReferralCode,
  type AffiliateSettings,
} from '@little-coder/engine';
import { and, eq, gte, ne, sql } from 'drizzle-orm';
import { jwtSecret } from '../common/config.js';
import type { Db } from '../db/db.module.js';
import { affiliateLedger, appSettings, parents } from '../db/schema.js';

/**
 * Bagian afiliasi yang dipakai saat pendaftaran orang tua (modul Auth), tanpa bergantung pada AffiliateService
 * (menghindari ketergantungan melingkar antar-modul). D-063.
 */

/** HMAC (tidak bisa dibalik) untuk IP / nomor rekening — hanya dibandingkan, tidak pernah ditampilkan. */
export const fingerprint = (purpose: string, value: string) =>
  createHmac('sha256', `lc-fp-v1|${jwtSecret()}`).update(`${purpose}|${value}`).digest('hex');

export async function affiliateSettings(db: Db): Promise<AffiliateSettings> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, 'affiliate'));
  const parsed = affiliateSettingsSchema.safeParse({
    ...DEFAULT_AFFILIATE_SETTINGS,
    ...(row?.value as object),
  });
  return parsed.success ? parsed.data : DEFAULT_AFFILIATE_SETTINGS;
}

/** Pemilik kode referal yang masih aktif & terverifikasi; undefined bila kode tidak dikenal. */
export async function findReferrer(db: Db, raw: string) {
  const code = normalizeReferralCode(raw);
  if (!code) return undefined;
  const [row] = await db
    .select({ id: parents.id, name: parents.name, email: parents.email })
    .from(parents)
    .where(
      and(
        eq(parents.referralCode, code),
        eq(parents.active, true),
        sql`${parents.emailVerifiedAt} is not null`,
      ),
    );
  return row;
}

/**
 * Kunci perekrut untuk akun baru dan catat bonus ajak teman sebagai TERTAHAN (cair setelah teman aktif,
 * gugur setelah `qualifyDays`). Batas bonus per bulan mencegah banjir akun palsu; komisi tetap berlaku walau
 * bonus bulan itu sudah habis.
 */
export async function attachReferral(
  db: Db,
  input: { refereeId: string; referrerId: string },
  settings: AffiliateSettings,
  now = new Date(),
) {
  if (input.refereeId === input.referrerId) return false;
  const [linked] = await db
    .update(parents)
    .set({ referredBy: input.referrerId, referredAt: now })
    .where(and(eq(parents.id, input.refereeId), sql`${parents.referredBy} is null`))
    .returning({ id: parents.id });
  if (!linked || settings.signupBonus <= 0) return !!linked;
  if (settings.monthlyBonusCap > 0) {
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const [{ n } = { n: 0 }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(affiliateLedger)
      .where(
        and(
          eq(affiliateLedger.parentId, input.referrerId),
          eq(affiliateLedger.type, 'signup_bonus'),
          ne(affiliateLedger.state, 'void'),
          gte(affiliateLedger.createdAt, monthStart),
        ),
      );
    if (Number(n) >= settings.monthlyBonusCap) return true;
  }
  await db
    .insert(affiliateLedger)
    .values({
      parentId: input.referrerId,
      type: 'signup_bonus',
      state: 'pending',
      amount: settings.signupBonus,
      refereeId: input.refereeId,
      availableAt: new Date(now.getTime() + settings.qualifyDays * 86_400_000),
      note: `Tertahan sampai teman aktif (anak main ${settings.qualifyRounds} ronde)`,
    })
    .onConflictDoNothing();
  return true;
}
