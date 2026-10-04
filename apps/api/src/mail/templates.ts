import { MOMO_LOGO_CID } from './logo.js';

/**
 * Template email Udakids (D-044): hangat, profesional, ramah anak. Tata letak tabel + gaya inline agar
 * tampil baik di Gmail/Outlook/HP. Semua teks dari pengguna di-escape. Setiap email punya versi teks biasa.
 * Footer: "Momo From Udakids".
 */

export type MailContent = { subject: string; html: string; text: string };

export type MailContext = {
  /** Alamat web publik, mis. https://app.udakids.id (untuk tombol & gambar Momo). */
  appUrl: string;
  brand: string;
};

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const rupiah = (n: number) => `Rp${Math.round(n).toLocaleString('id-ID')}`;
export const dateTime = (d: Date | string) =>
  new Date(d).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) + ' WIB';

const C = {
  grape: '#5b3fd6',
  grapeSoft: '#efeaff',
  sun: '#f7c948',
  sunSoft: '#fff4cf',
  leaf: '#2e9e5b',
  leafSoft: '#e3f6ea',
  coral: '#c0502e',
  coralSoft: '#ffe6de',
  ink: '#1d1a2e',
  muted: '#5d5873',
  bg: '#fff8ec',
};

type Tone = 'grape' | 'leaf' | 'sun' | 'coral';
const toneColor: Record<Tone, [string, string]> = {
  grape: [C.grape, C.grapeSoft],
  leaf: [C.leaf, C.leafSoft],
  sun: ['#9a5b00', C.sunSoft],
  coral: [C.coral, C.coralSoft],
};

/** Paragraf aman (teks di-escape; **tebal** diubah jadi <strong>). */
/** Catatan kecil abu-abu (teks di-escape). */
const note = (text: string) =>
  `<p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:${C.muted}">${esc(text)}</p>`;

const p = (text: string) =>
  `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:${C.ink}">${esc(text).replace(
    /\*\*(.+?)\*\*/g,
    '<strong>$1</strong>',
  )}</p>`;

const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 18px"><tr><td style="border-radius:999px;background:${C.grape}">
<a href="${esc(href)}" style="display:inline-block;padding:14px 26px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px">${esc(label)}</a>
</td></tr></table>`;

/** Kotak info berwarna, berisi baris label → nilai. */
const infoBox = (rows: [string, string][], tone: Tone = 'grape') => {
  const [fg, bg] = toneColor[tone];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;background:${bg};border-radius:16px;border:2px solid ${fg}">
${rows
  .map(
    ([k, v]) =>
      `<tr><td style="padding:10px 16px;font-size:14px;color:${C.muted};width:42%;vertical-align:top">${esc(k)}</td><td style="padding:10px 16px;font-size:15px;font-weight:700;color:${C.ink}">${esc(v)}</td></tr>`,
  )
  .join('\n')}
</table>`;
};

/** Kotak besar untuk kode / nominal. */
const bigBox = (label: string, value: string, tone: Tone = 'grape', note?: string) => {
  const [fg, bg] = toneColor[tone];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px"><tr><td align="center" style="background:${bg};border:3px dashed ${fg};border-radius:18px;padding:18px 12px">
<div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:${C.muted};font-weight:700">${esc(label)}</div>
<div style="font-size:34px;font-weight:800;letter-spacing:.12em;color:${fg};margin-top:6px;font-family:'Courier New',monospace">${esc(value)}</div>
${note ? `<div style="font-size:13px;color:${C.muted};margin-top:8px">${esc(note)}</div>` : ''}
</td></tr></table>`;
};

/** Kerangka email: kepala ungu dengan Momo, isi kartu putih, footer "Momo From Udakids". */
function layout(
  ctx: MailContext,
  opts: { title: string; preheader: string; tone?: Tone; body: string; unsubscribe?: string },
): string {
  const [accent] = toneColor[opts.tone ?? 'grape'];
  // Logo ditempel di email (CID, lihat logo.ts) — tidak bergantung pada URL/hosting.
  const momo = `cid:${MOMO_LOGO_CID}`;
  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>${esc(opts.title)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td align="center" style="background:${C.grape};border-radius:24px 24px 0 0;padding:26px 20px 18px">
<img src="${esc(momo)}" width="84" height="84" alt="Momo" style="display:block;border:0;border-radius:20px">
<div style="font-size:14px;font-weight:700;color:${C.sun};margin-top:10px;letter-spacing:.06em">${esc(ctx.brand.toUpperCase())}</div>
</td></tr>
<tr><td style="background:#ffffff;padding:28px 26px 10px;border-left:3px solid ${C.ink};border-right:3px solid ${C.ink};border-top:6px solid ${accent}">
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:${C.ink}">${esc(opts.title)}</h1>
${opts.body}
</td></tr>
<tr><td style="background:#ffffff;padding:0 26px 22px;border-left:3px solid ${C.ink};border-right:3px solid ${C.ink};border-bottom:3px solid ${C.ink};border-radius:0 0 24px 24px">
<p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:${C.ink}">Salam hangat,<br><strong>Momo From ${esc(ctx.brand)}</strong></p>
</td></tr>
<tr><td align="center" style="padding:18px 10px 0;font-size:12px;line-height:1.6;color:${C.muted}">
Email ini dikirim otomatis oleh ${esc(ctx.brand)}. Mohon tidak membalas email ini.<br>
Kami tidak pernah meminta password atau sandi gambar anak lewat email.<br>
<a href="${esc(ctx.appUrl)}" style="color:${C.grape};font-weight:700;text-decoration:none">Momo From ${esc(ctx.brand)}</a>${
    opts.unsubscribe
      ? `<br><a href="${esc(opts.unsubscribe)}" style="color:${C.muted};text-decoration:underline">Berhenti menerima info materi baru</a>`
      : ''
  }
</td></tr>
</table></td></tr></table></body></html>`;
}

const footerText = (ctx: MailContext) =>
  `\n\nSalam hangat,\nMomo From ${ctx.brand}\n\n—\nEmail ini dikirim otomatis. Mohon tidak membalas.\nKami tidak pernah meminta password atau sandi gambar anak lewat email.\n${ctx.appUrl}`;

// ------------------------------------------------------------------ verifikasi & sambutan

export function verifyEmail(
  ctx: MailContext,
  d: { name: string; code: string; minutes: number },
): MailContent {
  const subject = `${d.code} adalah kode verifikasi ${ctx.brand}`;
  const html = layout(ctx, {
    title: `Halo, ${d.name}!`,
    preheader: `Kode verifikasi Anda: ${d.code}. Berlaku ${d.minutes} menit.`,
    body: [
      p(
        `Terima kasih sudah mendaftar di ${ctx.brand}. Momo senang sekali bisa menemani si kecil belajar!`,
      ),
      p('Masukkan kode berikut untuk memastikan email ini milik Anda:'),
      bigBox('Kode verifikasi', d.code, 'grape', `Berlaku ${d.minutes} menit`),
      p(
        'Kalau Anda tidak merasa mendaftar, abaikan saja email ini — akun tidak akan aktif tanpa kode di atas.',
      ),
    ].join('\n'),
  });
  const text = `Halo, ${d.name}!\n\nTerima kasih sudah mendaftar di ${ctx.brand}.\nKode verifikasi Anda: ${d.code}\n(Berlaku ${d.minutes} menit.)\n\nKalau Anda tidak merasa mendaftar, abaikan email ini.${footerText(ctx)}`;
  return { subject, html, text };
}

export function welcome(ctx: MailContext, d: { name: string; familyCode: string }): MailContent {
  const url = `${ctx.appUrl.replace(/\/$/, '')}/orang-tua`;
  const subject = `Selamat datang di ${ctx.brand}!`;
  const html = layout(ctx, {
    title: 'Email Anda sudah terverifikasi',
    preheader: `Kode keluarga Anda: ${d.familyCode}.`,
    tone: 'leaf',
    body: [
      p(`Halo ${d.name}, akun ${ctx.brand} Anda sudah aktif. Selamat datang di keluarga Momo!`),
      bigBox(
        'Kode keluarga',
        d.familyCode,
        'leaf',
        'Dipakai anak untuk masuk dari tablet atau laptop',
      ),
      p('Langkah berikutnya:'),
      p('1. Tambahkan profil anak (nama panggilan, warna Momo, dan 3 gambar sandi).'),
      p('2. Buka halaman anak, masukkan kode keluarga, lalu biarkan si kecil memilih namanya.'),
      p('3. Pantau progres belajarnya setiap minggu di dasbor orang tua.'),
      button(url, 'Buka dasbor orang tua'),
    ].join('\n'),
  });
  const text = `Halo ${d.name}, akun ${ctx.brand} Anda sudah aktif.\nKode keluarga: ${d.familyCode}\n\n1. Tambahkan profil anak.\n2. Buka halaman anak dan masukkan kode keluarga.\n3. Pantau progres di dasbor: ${url}${footerText(ctx)}`;
  return { subject, html, text };
}

// ------------------------------------------------------------------ transaksi (orang tua)

export type OrderMail = {
  number: string;
  parentName: string;
  parentEmail: string;
  packageName: string;
  priceNormal: number;
  discount: number;
  uniqueCode: number;
  amount: number;
  method: { provider: string; accountNumber: string; accountName: string; instructions?: string };
  expiresAt: Date | string;
  orderId: string;
  note?: string | null;
  endsAt?: Date | string | null;
};

const orderUrl = (ctx: MailContext, id: string) =>
  `${ctx.appUrl.replace(/\/$/, '')}/orang-tua/transaksi/${encodeURIComponent(id)}`;
const adminUrl = (ctx: MailContext) => `${ctx.appUrl.replace(/\/$/, '')}/admin/transaksi`;

export function orderCreated(ctx: MailContext, o: OrderMail): MailContent {
  const subject = `Pesanan ${o.number}: transfer ${rupiah(o.amount)}`;
  const rows: [string, string][] = [
    ['Nomor pesanan', o.number],
    ['Paket', o.packageName],
    ['Harga normal', rupiah(o.priceNormal)],
    ...(o.discount > 0 ? ([['Diskon', `- ${rupiah(o.discount)}`]] as [string, string][]) : []),
    ['Kode unik', `+ ${rupiah(o.uniqueCode)}`],
    ['Bayar sebelum', dateTime(o.expiresAt)],
  ];
  const html = layout(ctx, {
    title: 'Terima kasih, pesanan Anda tercatat',
    preheader: `Transfer tepat ${rupiah(o.amount)} sebelum ${dateTime(o.expiresAt)}.`,
    tone: 'sun',
    body: [
      p(
        `Halo ${o.parentName}, terima kasih sudah memilih ${ctx.brand} untuk menemani si kecil belajar.`,
      ),
      bigBox(
        'Total transfer',
        rupiah(o.amount),
        'sun',
        'Transfer tepat sampai 3 digit terakhir agar cepat dicocokkan',
      ),
      infoBox(
        [
          ['Bank / e-wallet', o.method.provider],
          ['Nomor rekening', o.method.accountNumber],
          ['Atas nama', o.method.accountName],
        ],
        'grape',
      ),
      ...(o.method.instructions ? [p(o.method.instructions)] : []),
      infoBox(rows, 'sun'),
      p(
        'Setelah transfer, unggah foto bukti transfer di halaman pesanan. Admin kami akan memeriksanya.',
      ),
      button(orderUrl(ctx, o.orderId), 'Unggah bukti transfer'),
    ].join('\n'),
  });
  const text = `Halo ${o.parentName},\n\nPesanan ${o.number} (${o.packageName}) tercatat.\nTotal transfer: ${rupiah(o.amount)} (tepat sampai 3 digit terakhir)\nKe: ${o.method.provider} ${o.method.accountNumber} a.n. ${o.method.accountName}\nBayar sebelum: ${dateTime(o.expiresAt)}\n\nUnggah bukti transfer: ${orderUrl(ctx, o.orderId)}${footerText(ctx)}`;
  return { subject, html, text };
}

export function proofReceived(ctx: MailContext, o: OrderMail): MailContent {
  const subject = `Bukti transfer ${o.number} kami terima`;
  const html = layout(ctx, {
    title: 'Bukti transfer sudah kami terima',
    preheader: 'Admin sedang memeriksa pembayaran Anda.',
    tone: 'grape',
    body: [
      p(
        `Halo ${o.parentName}, terima kasih! Bukti transfer untuk pesanan **${o.number}** sudah kami terima.`,
      ),
      infoBox(
        [
          ['Paket', o.packageName],
          ['Total', rupiah(o.amount)],
          ['Status', 'Menunggu verifikasi admin'],
        ],
        'grape',
      ),
      p(
        'Biasanya pemeriksaan selesai dalam 1×24 jam pada hari kerja. Kami akan mengabari Anda lewat email.',
      ),
      button(orderUrl(ctx, o.orderId), 'Lihat status pesanan'),
    ].join('\n'),
  });
  const text = `Halo ${o.parentName},\n\nBukti transfer pesanan ${o.number} sudah kami terima dan sedang diperiksa.\nStatus: ${orderUrl(ctx, o.orderId)}${footerText(ctx)}`;
  return { subject, html, text };
}

export function orderPaid(ctx: MailContext, o: OrderMail): MailContent {
  const until = o.endsAt ? `sampai ${dateTime(o.endsAt)}` : 'selamanya';
  const subject = `Pembayaran ${o.number} berhasil — paket sudah aktif`;
  const html = layout(ctx, {
    title: 'Hore! Paket sudah aktif',
    preheader: `${o.packageName} aktif ${until}.`,
    tone: 'leaf',
    body: [
      p(
        `Halo ${o.parentName}, pembayaran untuk pesanan **${o.number}** sudah kami terima. Terima kasih!`,
      ),
      infoBox(
        [
          ['Paket', o.packageName],
          ['Dibayar', rupiah(o.amount)],
          ['Masa aktif', until],
        ],
        'leaf',
      ),
      p(
        'Semua level di paket ini sudah terbuka untuk anak-anak di keluarga Anda. Momo siap menemani lagi!',
      ),
      button(`${ctx.appUrl.replace(/\/$/, '')}/orang-tua`, 'Lihat progres anak'),
    ].join('\n'),
  });
  const text = `Halo ${o.parentName},\n\nPembayaran pesanan ${o.number} berhasil. ${o.packageName} aktif ${until}.${footerText(ctx)}`;
  return { subject, html, text };
}

export function orderRejected(ctx: MailContext, o: OrderMail): MailContent {
  const subject = `Pesanan ${o.number}: mohon unggah ulang bukti transfer`;
  const html = layout(ctx, {
    title: 'Bukti transfer perlu diperiksa ulang',
    preheader: 'Kami belum bisa mencocokkan pembayaran Anda.',
    tone: 'coral',
    body: [
      p(
        `Halo ${o.parentName}, mohon maaf, kami belum bisa mencocokkan pembayaran untuk pesanan **${o.number}**.`,
      ),
      infoBox(
        [
          ['Catatan admin', o.note || '—'],
          ['Total yang diharapkan', rupiah(o.amount)],
        ],
        'coral',
      ),
      p(
        'Silakan periksa kembali nominal dan rekening tujuan, lalu unggah ulang bukti transfer. Kalau ada kendala, balas lewat kontak resmi kami.',
      ),
      button(orderUrl(ctx, o.orderId), 'Unggah ulang bukti'),
    ].join('\n'),
  });
  const text = `Halo ${o.parentName},\n\nPembayaran pesanan ${o.number} belum bisa kami cocokkan.\nCatatan: ${o.note || '-'}\nUnggah ulang bukti: ${orderUrl(ctx, o.orderId)}${footerText(ctx)}`;
  return { subject, html, text };
}

// ------------------------------------------------------------------ salinan untuk direksi

export type DirectorEvent = 'created' | 'proof' | 'paid' | 'rejected';
const directorTitle: Record<DirectorEvent, string> = {
  created: 'Pesanan baru',
  proof: 'Bukti transfer masuk — perlu verifikasi',
  paid: 'Pesanan lunas',
  rejected: 'Bukti transfer ditolak',
};

export function directorNotice(ctx: MailContext, ev: DirectorEvent, o: OrderMail): MailContent {
  const subject = `[${ctx.brand}] ${directorTitle[ev]} · ${o.number} · ${rupiah(o.amount)}`;
  const tone: Tone =
    ev === 'paid' ? 'leaf' : ev === 'rejected' ? 'coral' : ev === 'proof' ? 'sun' : 'grape';
  const rows: [string, string][] = [
    ['Nomor', o.number],
    ['Orang tua', `${o.parentName} <${o.parentEmail}>`],
    ['Paket', o.packageName],
    ['Total', rupiah(o.amount)],
    ['Kode unik', String(o.uniqueCode)],
    ['Metode', `${o.method.provider} ${o.method.accountNumber}`],
    ...(ev === 'rejected' && o.note ? ([['Alasan', o.note]] as [string, string][]) : []),
  ];
  const html = layout(ctx, {
    title: directorTitle[ev],
    preheader: `${o.number} · ${o.parentName} · ${rupiah(o.amount)}`,
    tone,
    body: [
      p('Ringkasan transaksi untuk direksi:'),
      infoBox(rows, tone),
      ...(ev === 'proof'
        ? [p('Mohon cocokkan mutasi rekening dengan nominal di atas, lalu setujui atau tolak.')]
        : []),
      button(adminUrl(ctx), 'Buka transaksi di admin'),
    ].join('\n'),
  });
  const text = `${directorTitle[ev]}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nAdmin: ${adminUrl(ctx)}${footerText(ctx)}`;
  return { subject, html, text };
}

export function testEmail(ctx: MailContext, d: { to: string }): MailContent {
  const subject = `Tes email ${ctx.brand} berhasil`;
  const html = layout(ctx, {
    title: 'Email sudah tersambung',
    preheader: 'Pengaturan pengiriman email berhasil.',
    tone: 'leaf',
    body: [p(`Kalau Anda membaca ini, ${ctx.brand} sudah bisa mengirim email ke ${d.to}.`)].join(
      '\n',
    ),
  });
  return {
    subject,
    html,
    text: `Tes email ${ctx.brand} berhasil dikirim ke ${d.to}.${footerText(ctx)}`,
  };
}

// ------------------------------------------------------------------ info materi baru (D-053)

export type NewsBook = { title: string; topics: string[]; levels: number };

export function newContent(
  ctx: MailContext,
  d: { name: string; books: NewsBook[]; total: number; unsubscribeUrl: string },
): MailContent {
  const base = ctx.appUrl.replace(/\/$/, '');
  const subject = `Ada ${d.total} level latihan baru di ${ctx.brand}!`;
  const list = d.books
    .map(
      (b) =>
        `<tr><td style="padding:10px 14px;border-bottom:1px solid #eee6d6"><strong style="color:${C.ink}">${esc(b.title)}</strong><br><span style="font-size:13px;color:${C.muted}">${esc(b.topics.slice(0, 6).join(', '))}${b.topics.length > 6 ? ', …' : ''}</span></td><td align="right" style="padding:10px 14px;border-bottom:1px solid #eee6d6;font-weight:700;color:${C.grape};white-space:nowrap">${b.levels} level</td></tr>`,
    )
    .join('');
  const html = layout(ctx, {
    title: 'Materi latihan baru sudah siap!',
    preheader: `${d.total} level baru: ${d.books.map((b) => b.title).join(', ')}.`,
    tone: 'sun',
    unsubscribe: d.unsubscribeUrl,
    body: [
      p(
        `Halo ${d.name}, Momo punya kabar gembira! Ada ${d.total} level latihan baru yang siap dimainkan si kecil.`,
      ),
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid ${C.ink};border-radius:16px;border-collapse:separate;overflow:hidden;margin:6px 0 16px">${list}</table>`,
      p(
        'Ajak si kecil mencoba satu level hari ini. Belajar sedikit-sedikit setiap hari lebih menyenangkan daripada banyak sekaligus.',
      ),
      button(`${base}/play`, 'Main sekarang'),
      note(
        'Sebagian level mungkin khusus akun Premium. Satu paket berlaku untuk semua anak di akun Anda; lihat pilihannya di dasbor orang tua.',
      ),
    ].join('\n'),
  });
  const text = `Halo ${d.name}, ada ${d.total} level latihan baru di ${ctx.brand}:\n${d.books
    .map((b) => `- ${b.title}: ${b.levels} level (${b.topics.join(', ')})`)
    .join(
      '\n',
    )}\n\nMain sekarang: ${base}/play${footerText(ctx)}\n\nBerhenti menerima info materi baru: ${d.unsubscribeUrl}`;
  return { subject, html, text };
}

export function newsDirectorCopy(
  ctx: MailContext,
  d: { books: NewsBook[]; total: number; recipients: number },
): MailContent {
  const subject = `[${ctx.brand}] Info materi baru dikirim ke ${d.recipients} orang tua`;
  const html = layout(ctx, {
    title: 'Info materi baru terkirim',
    preheader: `${d.total} level baru, ${d.recipients} penerima.`,
    body: [
      p(
        `Email info materi baru masuk antrean untuk ${d.recipients} orang tua (dikirim bertahap sesuai batas harian).`,
      ),
      infoBox(d.books.map((b) => [b.title, `${b.levels} level`] as [string, string])),
    ].join('\n'),
  });
  const text = `Info materi baru (${d.total} level) masuk antrean untuk ${d.recipients} orang tua.\n${d.books.map((b) => `- ${b.title}: ${b.levels} level`).join('\n')}${footerText(ctx)}`;
  return { subject, html, text };
}

// ------------------------------------------------------------------ pengingat masa paket (D-054)

export function expiryReminder(
  ctx: MailContext,
  d: {
    name: string;
    packageName: string;
    endsAt: Date;
    daysLeft: number;
    childName: string | null;
  },
): MailContent {
  const url = `${ctx.appUrl.replace(/\/$/, '')}/orang-tua/paket`;
  const when = d.daysLeft === 1 ? 'besok' : `${d.daysLeft} hari lagi`;
  const subject = `Paket ${d.packageName} berakhir ${when}`;
  const who = d.childName ? `untuk ${d.childName}` : 'untuk semua anak di akun Anda';
  const html = layout(ctx, {
    title: `Paket Premium berakhir ${when}`,
    preheader: `${d.packageName} aktif sampai ${dateTime(d.endsAt)}.`,
    tone: d.daysLeft === 1 ? 'coral' : 'sun',
    body: [
      p(`Halo ${d.name}, terima kasih sudah menemani si kecil belajar bersama Momo.`),
      p(`Paket **${d.packageName}** ${who} akan berakhir ${when}.`),
      bigBox('Aktif sampai', dateTime(d.endsAt), d.daysLeft === 1 ? 'coral' : 'sun'),
      p(
        'Setelah berakhir, level Premium terkunci lagi. Skor, riwayat, dan progres si kecil tetap tersimpan, dan langsung terbuka kembali begitu paket diperpanjang.',
      ),
      button(url, 'Perpanjang paket'),
      note(
        'Pembayaran lewat transfer bank atau e-wallet di dasbor orang tua. Abaikan email ini bila Anda sudah memperpanjang.',
      ),
    ].join('\n'),
  });
  const text = `Halo ${d.name},\nPaket ${d.packageName} ${who} berakhir ${when} (${dateTime(d.endsAt)}).\nSetelah berakhir, level Premium terkunci lagi, tetapi skor dan progres tetap tersimpan.\nPerpanjang: ${url}${footerText(ctx)}`;
  return { subject, html, text };
}

// ------------------------------------------------------------------ afiliasi (D-063)

const affiliateUrl = (ctx: MailContext) => `${ctx.appUrl.replace(/\/$/, '')}/orang-tua/afiliasi`;
const adminAffiliateUrl = (ctx: MailContext) => `${ctx.appUrl.replace(/\/$/, '')}/admin/afiliasi`;

/** Kode untuk mengubah rekening pencairan (aksi sensitif). */
export function affiliateActionCode(
  ctx: MailContext,
  d: { name: string; code: string; minutes: number },
): MailContent {
  const subject = `${d.code} adalah kode untuk mengubah rekening pencairan ${ctx.brand}`;
  const html = layout(ctx, {
    title: `Halo, ${d.name}`,
    preheader: `Kode Anda: ${d.code}. Berlaku ${d.minutes} menit.`,
    body: [
      p('Seseorang (semoga Anda) ingin menyimpan atau mengubah rekening pencairan afiliasi.'),
      bigBox('Kode verifikasi', d.code, 'grape', `Berlaku ${d.minutes} menit`),
      note(
        'Kalau bukan Anda, abaikan email ini dan segera ganti kata sandi akun. Rekening tidak berubah tanpa kode ini.',
      ),
    ].join('\n'),
  });
  const text = `Halo, ${d.name}\n\nKode untuk mengubah rekening pencairan: ${d.code} (berlaku ${d.minutes} menit).\nKalau bukan Anda, abaikan email ini dan ganti kata sandi akun.${footerText(ctx)}`;
  return { subject, html, text };
}

type PayoutMail = {
  number: string;
  name: string;
  amount: number;
  provider: string;
  last4: string;
  holderName: string;
};

export function affiliatePayoutRequested(ctx: MailContext, d: PayoutMail): MailContent {
  const subject = `[Afiliasi] Pengajuan pencairan ${d.number} · ${rupiah(d.amount)}`;
  const html = layout(ctx, {
    title: 'Pengajuan pencairan afiliasi baru',
    preheader: `${d.name} mengajukan ${rupiah(d.amount)}.`,
    body: [
      infoBox([
        ['Nomor', d.number],
        ['Akun', d.name],
        ['Jumlah', rupiah(d.amount)],
        ['Tujuan', `${d.provider} •••• ${d.last4} a.n. ${d.holderName}`],
      ]),
      button(adminAffiliateUrl(ctx), 'Buka antrean pencairan'),
    ].join('\n'),
  });
  const text = `Pengajuan pencairan afiliasi ${d.number}\nAkun: ${d.name}\nJumlah: ${rupiah(d.amount)}\nTujuan: ${d.provider} •••• ${d.last4} a.n. ${d.holderName}\n${adminAffiliateUrl(ctx)}${footerText(ctx)}`;
  return { subject, html, text };
}

export function affiliatePayoutPaid(
  ctx: MailContext,
  d: PayoutMail & { transferRef: string | null },
): MailContent {
  const subject = `Pencairan ${rupiah(d.amount)} sudah ditransfer`;
  const html = layout(ctx, {
    title: `Terima kasih, ${d.name}!`,
    preheader: `Pencairan ${d.number} sudah ditransfer.`,
    tone: 'leaf',
    body: [
      p('Pencairan saldo afiliasi Anda sudah kami transfer.'),
      infoBox(
        [
          ['Nomor', d.number],
          ['Jumlah', rupiah(d.amount)],
          ['Tujuan', `${d.provider} •••• ${d.last4} a.n. ${d.holderName}`],
          ...(d.transferRef ? ([['Referensi transfer', d.transferRef]] as [string, string][]) : []),
        ],
        'leaf',
      ),
      button(affiliateUrl(ctx), 'Lihat riwayat afiliasi'),
    ].join('\n'),
  });
  const text = `Pencairan ${d.number} sebesar ${rupiah(d.amount)} sudah ditransfer ke ${d.provider} •••• ${d.last4} a.n. ${d.holderName}.${d.transferRef ? `\nReferensi: ${d.transferRef}` : ''}\n${affiliateUrl(ctx)}${footerText(ctx)}`;
  return { subject, html, text };
}

export function affiliatePayoutRejected(
  ctx: MailContext,
  d: PayoutMail & { reason: string },
): MailContent {
  const subject = `Pencairan ${d.number} belum bisa diproses`;
  const html = layout(ctx, {
    title: `Halo, ${d.name}`,
    preheader: 'Saldo sudah dikembalikan ke akun Anda.',
    tone: 'coral',
    body: [
      p(
        'Pengajuan pencairan berikut belum bisa kami proses. Saldonya sudah dikembalikan ke akun Anda.',
      ),
      infoBox(
        [
          ['Nomor', d.number],
          ['Jumlah', rupiah(d.amount)],
          ['Alasan', d.reason],
        ],
        'coral',
      ),
      button(affiliateUrl(ctx), 'Buka menu Afiliasi'),
    ].join('\n'),
  });
  const text = `Pencairan ${d.number} (${rupiah(d.amount)}) belum bisa diproses: ${d.reason}\nSaldo sudah dikembalikan.\n${affiliateUrl(ctx)}${footerText(ctx)}`;
  return { subject, html, text };
}

export function affiliateAccountReviewed(
  ctx: MailContext,
  d: { name: string; provider: string; last4: string; approved: boolean; reason?: string | null },
): MailContent {
  const subject = d.approved
    ? 'Rekening pencairan Anda sudah terverifikasi'
    : 'Rekening pencairan Anda perlu diperbaiki';
  const html = layout(ctx, {
    title: `Halo, ${d.name}`,
    preheader: subject,
    tone: d.approved ? 'leaf' : 'coral',
    body: [
      p(
        d.approved
          ? `Rekening ${d.provider} •••• ${d.last4} sudah kami verifikasi dan bisa dipakai untuk pencairan.`
          : `Rekening ${d.provider} •••• ${d.last4} belum bisa kami verifikasi.`,
      ),
      ...(d.reason ? [note(`Catatan admin: ${d.reason}`)] : []),
      button(affiliateUrl(ctx), 'Buka menu Afiliasi'),
    ].join('\n'),
  });
  const text = `${subject}.\nRekening: ${d.provider} •••• ${d.last4}${d.reason ? `\nCatatan admin: ${d.reason}` : ''}\n${affiliateUrl(ctx)}${footerText(ctx)}`;
  return { subject, html, text };
}
