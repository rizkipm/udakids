import { Controller, Get, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { Roles } from '../auth/decorators.js';
import { DB, type Db } from '../db/db.module.js';

/** Jumlah item notifikasi yang dikirim (gabungan pendaftaran + transaksi). */
const LIMIT = 30;

export type AdminNotification = {
  /** Unik per kejadian (jenis + id). */
  key: string;
  kind: 'parent' | 'child_self' | 'child_class' | 'order_created' | 'order_proof';
  at: string;
  title: string;
  /** Teks pendek kedua: email, nama kelas / kode anak, nomor pesanan. */
  detail: string;
  /** Nominal pesanan (rupiah), null untuk pendaftaran. */
  amount: number | null;
  /** Status tambahan: belum verifikasi email, status pesanan. */
  status: string | null;
  /** Tautan admin untuk menindaklanjuti. */
  href: string;
};

/**
 * Notifikasi admin (D-045): pendaftaran baru (orang tua, anak daftar sendiri, anak gabung kelas) dan transaksi
 * (pesanan baru, bukti transfer masuk) 30 hari terakhir. Status "sudah dibaca" disimpan di perangkat admin.
 */
@Roles('admin')
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get()
  async list() {
    const res = await this.db.execute(sql`
      (select 'parent' as kind, p.id::text as id, p.created_at as at, p.name as title, p.email as detail,
          case when p.email_verified_at is null then 'unverified' else null end as status,
          null::int as amount
        from parents p where p.created_at > now() - interval '30 days')
      union all
      (select case when c.class_id is not null then 'child_class' else 'child_self' end, c.id::text, c.created_at,
          c.nickname, coalesce(k.event_name, c.self_code, ''), null, null
        from children c left join classes k on k.id = c.class_id
        where c.parent_id is null and c.created_at > now() - interval '30 days')
      union all
      (select 'order_created', o.id::text, o.created_at, p.name, o.number, o.status, o.amount
        from orders o join parents p on p.id = o.parent_id
        where o.created_at > now() - interval '30 days')
      union all
      (select 'order_proof', o.id::text, o.proof_at, p.name, o.number, o.status, o.amount
        from orders o join parents p on p.id = o.parent_id
        where o.proof_at is not null and o.proof_at > now() - interval '30 days')
      order by at desc
      limit ${LIMIT}`);
    const items: AdminNotification[] = res.rows.map((r) => {
      const kind = String(r.kind) as AdminNotification['kind'];
      const id = String(r.id);
      return {
        key: `${kind}:${id}`,
        kind,
        at: new Date(String(r.at)).toISOString(),
        title: String(r.title),
        detail: String(r.detail ?? ''),
        status: r.status == null ? null : String(r.status),
        amount: r.amount == null ? null : Number(r.amount),
        href: kind.startsWith('order')
          ? '/admin/transaksi'
          : kind === 'child_class'
            ? '/admin/kelas'
            : '/admin/keluarga',
      };
    });
    return { items, serverTime: new Date().toISOString() };
  }
}
