import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  entitlementEnd,
  planStatus,
  premiumGrantSchema,
  userListQuerySchema,
  type EntitlementLike,
  type PremiumGrant,
  type SessionUser,
  type UserListQuery,
} from '@little-coder/engine';
import { and, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { DB, type Db } from '../db/db.module.js';
import { children, entitlements, staffUsers } from '../db/schema.js';

type Ent = typeof entitlements.$inferSelect;
const iso = (d: Date | null) => (d ? d.toISOString() : null);
const like = (q: string) => `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
/** Hak yang masih berlaku dan membuka semua buku (Premium). */
const LIVE_ALL = sql`e.scope = 'all' and (e.ends_at is null or e.ends_at > now())`;

const entView = (e: Ent, grantedByName?: string | null) => ({
  id: e.id,
  name: e.name,
  scope: e.scope,
  source: e.source,
  note: e.note,
  parentId: e.parentId,
  childId: e.childId,
  startsAt: iso(e.startsAt),
  endsAt: iso(e.endsAt),
  createdAt: iso(e.createdAt),
  grantedByName: grantedByName ?? null,
  live: !e.endsAt || e.endsAt.getTime() > Date.now(),
});
const toLike = (e: Ent): EntitlementLike => ({
  scope: e.scope,
  books: e.books as { domain: string; grade: string }[],
  endsAt: iso(e.endsAt),
  source: e.source,
});

/**
 * Direktori pengguna admin (D-041): keluarga & anak dengan cari, filter, urutan, dan paging di server;
 * status Free / Paket buku / Premium; admin bisa memberi Premium ke keluarga atau satu anak. Pemberian
 * admin TIDAK membuat pesanan dan TIDAK masuk buku kas.
 */
@Roles('admin')
@Controller('admin')
export class AdminDirectoryController {
  constructor(@Inject(DB) private readonly db: Db) {}

  private async entsFor(parentIds: string[], childIds: string[]) {
    if (parentIds.length === 0 && childIds.length === 0)
      return [] as (Ent & { grantedByName: string | null })[];
    const conds: SQL[] = [];
    if (parentIds.length) conds.push(inArray(entitlements.parentId, parentIds));
    if (childIds.length) conds.push(inArray(entitlements.childId, childIds));
    const rows = await this.db
      .select({ e: entitlements, grantedByName: staffUsers.name })
      .from(entitlements)
      .leftJoin(staffUsers, eq(staffUsers.id, entitlements.grantedBy))
      .where(or(...conds));
    return rows.map((r) => ({ ...r.e, grantedByName: r.grantedByName }));
  }

  @Get('directory/summary')
  async summary() {
    const res = await this.db.execute(sql`
      select
        (select count(*) from parents) as families,
        (select count(*) from parents where not active) as families_inactive,
        (select count(*) from children) as children,
        (select count(*) from children where not active) as children_inactive,
        (select count(*) from children where parent_id is null and self_code is not null) as self_children,
        (select count(*) from children where parent_id is null and self_code is null and class_id is not null) as class_children,
        (select count(*) from children c where c.parent_id is null and exists (select 1 from entitlements e where e.child_id = c.id and ${LIVE_ALL})) as premium_self,
        (select count(*) from children c where exists (select 1 from entitlements e where ${LIVE_ALL}
            and (e.child_id = c.id or (c.parent_id is not null and e.parent_id = c.parent_id)))) as premium_children,
        (select count(*) from entitlements e where e.source = 'admin' and (e.ends_at is null or e.ends_at > now())) as admin_grants`);
    const r = (res.rows[0] ?? {}) as Record<string, unknown>;
    const n = (k: string) => Number(r[k] ?? 0);
    return {
      families: n('families'),
      familiesInactive: n('families_inactive'),
      children: n('children'),
      childrenInactive: n('children_inactive'),
      selfChildren: n('self_children'),
      classChildren: n('class_children'),
      /** Anak daftar sendiri / siswa tanpa orang tua yang Premium. */
      premiumSelf: n('premium_self'),
      premiumChildren: n('premium_children'),
      adminGrants: n('admin_grants'),
    };
  }

  /** Daftar keluarga (orang tua + anak-anaknya), dengan paging. */
  @Get('directory/families')
  async families(@Query(new ZodPipe(userListQuerySchema)) q: UserListQuery) {
    const where: SQL[] = [sql`true`];
    if (q.search) {
      const s = like(q.search.toLowerCase());
      where.push(sql`(lower(p.name) like ${s} or lower(p.email) like ${s} or lower(p.family_code) like ${s}
        or exists (select 1 from children k where k.parent_id = p.id and lower(k.nickname) like ${s}))`);
    }
    if (q.active !== 'all') where.push(sql`p.active = ${q.active === 'active'}`);
    // Keluarga "Premium" = punya minimal satu anak Premium (paket keluarga dibeli atau Premium per anak).
    const premium = sql`exists (select 1 from entitlements e where ${LIVE_ALL} and (e.parent_id = p.id
      or e.child_id in (select k.id from children k where k.parent_id = p.id)))`;
    if (q.status === 'premium') where.push(premium);
    if (q.status === 'free') where.push(sql`not ${premium}`);
    const order =
      q.sort === 'name'
        ? sql`lower(p.name) asc`
        : q.sort === 'oldest'
          ? sql`p.created_at asc`
          : q.sort === 'recent'
            ? sql`last_active desc nulls last`
            : sql`p.created_at desc`;
    const res = await this.db.execute(sql`
      select p.id, p.name, p.email, p.family_code, p.active, p.consent_at, p.created_at, p.email_verified_at,
        p.must_change_password,
        (select max(k.last_active_at) from children k where k.parent_id = p.id) as last_active,
        count(*) over() as total
      from parents p
      where ${sql.join(where, sql` and `)}
      order by ${order}
      limit ${q.pageSize} offset ${(q.page - 1) * q.pageSize}`);
    const rows = res.rows as Record<string, unknown>[];
    const ids = rows.map((r) => String(r.id));
    const kids = ids.length
      ? await this.db
          .select()
          .from(children)
          .where(inArray(children.parentId, ids))
          .orderBy(children.createdAt)
      : [];
    const ents = await this.entsFor(
      ids,
      kids.map((k) => k.id),
    );
    const now = new Date();
    return {
      page: q.page,
      pageSize: q.pageSize,
      total: Number(rows[0]?.total ?? 0),
      items: rows.map((r) => {
        const id = String(r.id);
        const famEnts = ents.filter((e) => e.parentId === id);
        return {
          id,
          name: String(r.name),
          email: String(r.email),
          familyCode: String(r.family_code),
          active: Boolean(r.active),
          consentAt: iso(r.consent_at ? new Date(String(r.consent_at)) : null),
          /** Null = email belum diverifikasi (belum bisa masuk; D-044). */
          emailVerifiedAt: r.email_verified_at ? iso(new Date(String(r.email_verified_at))) : null,
          mustChangePassword: Boolean(r.must_change_password),
          createdAt: iso(new Date(String(r.created_at))),
          lastActiveAt: r.last_active ? iso(new Date(String(r.last_active))) : null,
          /** Paket yang dibeli keluarga (berlaku untuk semua anaknya). */
          plan: planStatus(famEnts.map(toLike), now),
          grants: famEnts.map((e) => entView(e, e.grantedByName)),
          premiumChildren: kids.filter(
            (k) =>
              k.parentId === id &&
              planStatus([...famEnts, ...ents.filter((e) => e.childId === k.id)].map(toLike), now)
                .tier === 'premium',
          ).length,
          children: kids
            .filter((k) => k.parentId === id)
            .map((k) => {
              const own = ents.filter((e) => e.childId === k.id);
              return {
                id: k.id,
                nickname: k.nickname,
                momoColor: k.momoColor,
                active: k.active,
                lastActiveAt: iso(k.lastActiveAt),
                classId: k.classId,
                plan: planStatus([...famEnts, ...own].map(toLike), now),
                grants: own.map((e) => entView(e, e.grantedByName)),
              };
            }),
        };
      }),
    };
  }

  /** Daftar semua anak (keluarga, daftar sendiri, siswa kelas), dengan paging. */
  @Get('directory/children')
  async childrenList(@Query(new ZodPipe(userListQuerySchema)) q: UserListQuery) {
    const where: SQL[] = [sql`true`];
    if (q.search) {
      const s = like(q.search.toLowerCase());
      where.push(sql`(lower(c.nickname) like ${s} or lower(coalesce(p.name, '')) like ${s}
        or lower(coalesce(p.email, '')) like ${s} or lower(coalesce(c.self_code, '')) like ${s}
        or lower(coalesce(cl.event_name, '')) like ${s} or lower(coalesce(cl.code, '')) like ${s})`);
    }
    if (q.active !== 'all') where.push(sql`c.active = ${q.active === 'active'}`);
    if (q.type === 'family') where.push(sql`c.parent_id is not null`);
    if (q.type === 'self') where.push(sql`c.parent_id is null and c.self_code is not null`);
    if (q.type === 'class')
      where.push(sql`c.parent_id is null and c.self_code is null and c.class_id is not null`);
    const premium = sql`exists (select 1 from entitlements e where ${LIVE_ALL}
      and (e.child_id = c.id or (c.parent_id is not null and e.parent_id = c.parent_id)))`;
    if (q.status === 'premium') where.push(premium);
    if (q.status === 'free') where.push(sql`not ${premium}`);
    const order =
      q.sort === 'name'
        ? sql`lower(c.nickname) asc`
        : q.sort === 'oldest'
          ? sql`c.created_at asc`
          : q.sort === 'recent'
            ? sql`c.last_active_at desc nulls last`
            : sql`c.created_at desc`;
    const res = await this.db.execute(sql`
      select c.id, c.nickname, c.momo_color, c.active, c.last_active_at, c.created_at, c.self_code,
        c.parent_id, p.name as parent_name, p.email as parent_email,
        cl.id as class_id, cl.event_name as class_name, cl.code as class_code,
        (select count(*) from quiz_results q where q.child_id = c.id and q.passed) as passed,
        (select coalesce(sum(m.answered), 0) from skill_mastery m where m.child_id = c.id) as answered,
        count(*) over() as total
      from children c
      left join parents p on p.id = c.parent_id
      left join classes cl on cl.id = c.class_id
      where ${sql.join(where, sql` and `)}
      order by ${order}
      limit ${q.pageSize} offset ${(q.page - 1) * q.pageSize}`);
    const rows = res.rows as Record<string, unknown>[];
    const ids = rows.map((r) => String(r.id));
    const parentIds = [
      ...new Set(
        rows
          .map((r) => r.parent_id)
          .filter(Boolean)
          .map(String),
      ),
    ];
    const ents = await this.entsFor(parentIds, ids);
    const now = new Date();
    return {
      page: q.page,
      pageSize: q.pageSize,
      total: Number(rows[0]?.total ?? 0),
      items: rows.map((r) => {
        const id = String(r.id);
        const parentId = r.parent_id ? String(r.parent_id) : null;
        const own = ents.filter((e) => e.childId === id);
        const fam = parentId ? ents.filter((e) => e.parentId === parentId) : [];
        return {
          id,
          nickname: String(r.nickname),
          momoColor: String(r.momo_color),
          active: Boolean(r.active),
          lastActiveAt: r.last_active_at ? iso(new Date(String(r.last_active_at))) : null,
          createdAt: iso(new Date(String(r.created_at))),
          type: parentId ? 'family' : r.self_code ? 'self' : 'class',
          selfCode: r.self_code ? String(r.self_code) : null,
          parent: parentId
            ? { id: parentId, name: String(r.parent_name), email: String(r.parent_email) }
            : null,
          class: r.class_id
            ? { id: String(r.class_id), name: String(r.class_name), code: String(r.class_code) }
            : null,
          passed: Number(r.passed ?? 0),
          /** Total soal dijawab (D-045). */
          answered: Number(r.answered ?? 0),
          plan: planStatus([...fam, ...own].map(toLike), now),
          grants: own.map((e) => entView(e, e.grantedByName)),
          familyGrants: fam
            .filter((e) => e.source === 'admin')
            .map((e) => entView(e, e.grantedByName)),
        };
      }),
    };
  }

  /**
   * Beri Premium (semua buku) ke SATU anak — tanpa pesanan, tanpa catatan buku kas (D-041). Anak di
   * keluarga diatur per anak (saudaranya tidak ikut); anak yang daftar sendiri per orang.
   */
  @Post('premium')
  async grant(
    @Body(new ZodPipe(premiumGrantSchema)) body: PremiumGrant,
    @CurrentUser() user: SessionUser,
  ) {
    const [c] = await this.db
      .select({ id: children.id })
      .from(children)
      .where(eq(children.id, body.childId));
    if (!c) throw new NotFoundException('Anak tidak ditemukan');
    const now = new Date();
    // Perpanjang dari Premium admin yang masih berjalan untuk target yang sama.
    const [current] = await this.db
      .select({ endsAt: entitlements.endsAt })
      .from(entitlements)
      .where(
        and(
          eq(entitlements.source, 'admin'),
          eq(entitlements.scope, 'all'),
          eq(entitlements.childId, body.childId),
        ),
      )
      .orderBy(sql`${entitlements.endsAt} desc nulls first`)
      .limit(1);
    if (current && current.endsAt === null)
      throw new BadRequestException('Sudah Premium selamanya');
    const endsAt = entitlementEnd(body.durationDays, now, iso(current?.endsAt ?? null));
    const [row] = await this.db
      .insert(entitlements)
      .values({
        parentId: null,
        childId: body.childId,
        name: 'Premium (diberikan admin)',
        scope: 'all',
        books: [],
        source: 'admin',
        note: body.note || null,
        grantedBy: user.id,
        startsAt: now,
        endsAt: endsAt ? new Date(endsAt) : null,
      })
      .returning();
    return entView(row!, user.name);
  }

  /** Cabut Premium yang diberikan admin (hak dari pembelian tidak bisa dicabut di sini). */
  @Delete('premium/:id')
  async revoke(@Param('id', ParseUUIDPipe) id: string) {
    const [row] = await this.db.select().from(entitlements).where(eq(entitlements.id, id));
    if (!row) throw new NotFoundException('Hak akses tidak ditemukan');
    if (row.source !== 'admin')
      throw new BadRequestException('Hak dari pembelian paket tidak bisa dicabut dari sini');
    const [updated] = await this.db
      .update(entitlements)
      .set({ endsAt: new Date() })
      .where(eq(entitlements.id, id))
      .returning();
    return entView(updated!);
  }
}
