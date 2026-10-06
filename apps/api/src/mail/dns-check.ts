import { resolve4, resolveTxt } from 'node:dns/promises';

/**
 * Pemeriksa DNS email untuk Admin → Email. Email bisa "Terkirim" (diterima server SMTP) tetapi ditolak Gmail
 * bila SPF/DKIM domain pengirim tidak lolos. Fungsi ini membaca SPF, DKIM, dan DMARC domain pengirim, lalu
 * memberi daftar masalah dan usulan catatan SPF yang benar. Tidak mengubah apa pun.
 */
export type MailDnsInput = {
  domain: string;
  smtpHost: string;
  smtpIps: string[];
  txtRoot: string[];
  txtDmarc: string[];
  txtDkim: string[];
  dkimSelector: string;
};

export type MailDnsReport = {
  domain: string;
  smtpHost: string;
  smtpIps: string[];
  /** `issues` = membuat email ditolak/spam; `warnings` = sebaiknya dirapikan, tidak langsung menggagalkan. */
  spf: {
    record: string | null;
    ok: boolean;
    issues: string[];
    warnings: string[];
    suggested: string | null;
  };
  dkim: { selector: string; found: boolean; issues: string[] };
  dmarc: { record: string | null; policy: string | null; issues: string[] };
  ok: boolean;
};

/** Mekanisme SPF yang memakai pencarian DNS (batas 10, RFC 7208 4.6.4). */
const LOOKUP = /^[+?~-]?(include:|a\b|a:|a\/|mx\b|mx:|mx\/|ptr\b|ptr:|exists:|redirect=)/i;

export function analyzeMailDns(i: MailDnsInput): MailDnsReport {
  const domain = i.domain.toLowerCase();
  const spfs = i.txtRoot.filter((t) => /^v=spf1(\s|$)/i.test(t.trim()));
  const spfIssues: string[] = [];
  const spfWarnings: string[] = [];
  let suggested: string | null = null;
  const record = spfs[0]?.trim() ?? null;
  if (spfs.length === 0)
    spfIssues.push('Tidak ada catatan SPF (TXT "v=spf1 …") di domain pengirim.');
  if (spfs.length > 1)
    spfIssues.push(
      'Ada lebih dari satu catatan SPF. Gabungkan menjadi satu (bila tidak, hasilnya PermError).',
    );
  if (record) {
    const terms = record.split(/\s+/).slice(1);
    const selfInclude = terms.some((x) =>
      new RegExp(`^[+?~-]?include:${domain.replace(/\./g, '\\.')}$`, 'i').test(x),
    );
    // Pengiriman Niagahoster keluar lewat relay MailChannels (IP tidak tercantum lebih dulu), sehingga pemeriksa
    // sampai ke include ini dan mendapat PermError (terbukti di uji mail-tester 2026-10-07: T_SPF_PERMERROR).
    if (selfInclude)
      spfIssues.push(
        `SPF memasukkan domainnya sendiri (include:${domain}). Email yang keluar lewat relay (mis. MailChannels) mendapat PermError, sehingga lebih mudah masuk Spam.`,
      );
    const lookups = terms.filter((x) => LOOKUP.test(x)).length;
    if (lookups > 10)
      spfIssues.push(`SPF memakai ${lookups} pencarian DNS (maksimal 10) → PermError.`);
    if (terms.some((x) => /^\+?all$/i.test(x)))
      spfIssues.push('SPF diakhiri "+all" (semua server boleh mengirim). Pakai "~all".');
    const listed = new Set(
      terms.map((x) => /^[+]?ip4:([\d.]+)(\/\d+)?$/i.exec(x)?.[1]).filter((x): x is string => !!x),
    );
    const missing = i.smtpIps.filter((ip) => !listed.has(ip));
    const hasIncludes = terms.some((x) => /include:/i.test(x) && !x.toLowerCase().endsWith(domain));
    if (missing.length && !hasIncludes)
      spfIssues.push(`IP server SMTP (${missing.join(', ')}) tidak tercantum di SPF.`);
    if (spfIssues.length || spfWarnings.length) {
      const keep = terms.filter(
        (x) =>
          !/^[+?~-]?all$/i.test(x) &&
          !new RegExp(`^[+?~-]?include:${domain.replace(/\./g, '\\.')}$`, 'i').test(x),
      );
      const clean = keep.map((x) => x.replace(/^\+/, ''));
      for (const ip of i.smtpIps) if (!clean.includes(`ip4:${ip}`)) clean.unshift(`ip4:${ip}`);
      suggested = ['v=spf1', ...[...new Set(clean)], '~all'].join(' ');
    }
  } else if (i.smtpIps.length) {
    suggested = ['v=spf1', ...i.smtpIps.map((ip) => `ip4:${ip}`), '~all'].join(' ');
  }

  const dkimRecord = i.txtDkim.find((t) => /v=DKIM1|(^|;)\s*p=/i.test(t));
  const dkimIssues: string[] = [];
  if (!dkimRecord)
    dkimIssues.push(
      `Tidak ada kunci DKIM di ${i.dkimSelector}._domainkey.${domain}. Salin dari cPanel → Email Deliverability.`,
    );
  else if (/(^|;)\s*p=\s*(;|$)/i.test(dkimRecord))
    dkimIssues.push('Kunci DKIM kosong (p= tanpa isi).');

  const dmarc = i.txtDmarc.find((t) => /^v=DMARC1/i.test(t.trim()))?.trim() ?? null;
  const policy = dmarc ? (/\bp=(\w+)/i.exec(dmarc)?.[1]?.toLowerCase() ?? null) : null;
  const dmarcIssues: string[] = [];
  if (!dmarc) dmarcIssues.push(`Tidak ada catatan DMARC di _dmarc.${domain}.`);

  const spfOk = !!record && spfIssues.length === 0;
  return {
    domain,
    smtpHost: i.smtpHost,
    smtpIps: i.smtpIps,
    spf: { record, ok: spfOk, issues: spfIssues, warnings: spfWarnings, suggested },
    dkim: {
      selector: i.dkimSelector,
      found: !!dkimRecord && dkimIssues.length === 0,
      issues: dkimIssues,
    },
    dmarc: { record: dmarc, policy, issues: dmarcIssues },
    ok: spfOk && dkimIssues.length === 0 && dmarcIssues.length === 0,
  };
}

const txt = (name: string) =>
  resolveTxt(name)
    .then((rows) => rows.map((r) => r.join('')))
    .catch(() => [] as string[]);

/** Baca DNS sungguhan lalu analisis. `from` = alamat pengirim (MAIL_FROM), `host` = SMTP_HOST. */
export async function checkMailDns(from: string, host: string, selector = 'default') {
  const address = /<([^>]+)>/.exec(from)?.[1] ?? from;
  const domain = address.split('@')[1]?.trim().toLowerCase() ?? '';
  // Gmail/Google Workspace pribadi diurus Google sendiri; yang diperiksa hanya domain milik sendiri.
  if (!domain || /^(gmail|googlemail)\.com$/.test(domain)) return null;
  const [smtpIps, txtRoot, txtDmarc, txtDkim] = await Promise.all([
    resolve4(host).catch(() => [] as string[]),
    txt(domain),
    txt(`_dmarc.${domain}`),
    txt(`${selector}._domainkey.${domain}`),
  ]);
  return analyzeMailDns({
    domain,
    smtpHost: host,
    smtpIps,
    txtRoot,
    txtDmarc,
    txtDkim,
    dkimSelector: selector,
  });
}
