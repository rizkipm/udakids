import { describe, expect, it } from 'vitest';
import { analyzeMailDns, type MailDnsInput } from '../src/mail/dns-check.js';

const base: MailDnsInput = {
  domain: 'eduskul.my.id',
  smtpHost: 'srv176.niagahoster.com',
  smtpIps: ['45.143.81.101'],
  txtRoot: ['google-site-verification=abc'],
  txtDmarc: ['v=DMARC1; p=none; rua=mailto:x@contoh.id'],
  txtDkim: ['v=DKIM1; k=rsa; p=MIIBIjANBg'],
  dkimSelector: 'default',
};

describe('pemeriksa DNS email (Admin → Email)', () => {
  it('SPF memasukkan domainnya sendiri → masalah (PermError lewat relay) + usulan SPF yang benar', () => {
    const r = analyzeMailDns({
      ...base,
      txtRoot: [
        ...base.txtRoot,
        'v=spf1 +ip4:45.143.81.101 +include:relay.mailchannels.net +ip4:45.143.81.145 +include:eduskul.my.id ~all',
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.spf.ok).toBe(false);
    expect(r.spf.issues[0]).toMatch(/memasukkan domainnya sendiri.*PermError/);
    expect(r.spf.suggested).toBe(
      'v=spf1 ip4:45.143.81.101 include:relay.mailchannels.net ip4:45.143.81.145 ~all',
    );
    expect(r.dkim.found).toBe(true);
    expect(r.dmarc.policy).toBe('none');
  });

  it('SPF, DKIM, DMARC lengkap → aman', () => {
    const r = analyzeMailDns({
      ...base,
      txtRoot: ['v=spf1 ip4:45.143.81.101 include:relay.mailchannels.net ~all'],
    });
    expect(r).toMatchObject({
      ok: true,
      spf: { ok: true, issues: [], warnings: [], suggested: null },
    });
  });

  it('SPF ganda, "+all", IP server tidak tercantum, DKIM & DMARC tidak ada', () => {
    const two = analyzeMailDns({ ...base, txtRoot: ['v=spf1 ip4:1.1.1.1 ~all', 'v=spf1 -all'] });
    expect(two.spf.issues.join(' ')).toMatch(/lebih dari satu/);
    const open = analyzeMailDns({ ...base, txtRoot: ['v=spf1 ip4:9.9.9.9 +all'] });
    expect(open.spf.issues.join(' ')).toMatch(/\+all/);
    expect(open.spf.issues.join(' ')).toMatch(/45\.143\.81\.101/);
    expect(open.spf.suggested).toBe('v=spf1 ip4:45.143.81.101 ip4:9.9.9.9 ~all');
    const none = analyzeMailDns({ ...base, txtRoot: [], txtDkim: [], txtDmarc: [] });
    expect(none.spf.issues[0]).toMatch(/Tidak ada catatan SPF/);
    expect(none.spf.suggested).toBe('v=spf1 ip4:45.143.81.101 ~all');
    expect(none.dkim.found).toBe(false);
    expect(none.dmarc.issues[0]).toMatch(/DMARC/);
    expect(none.ok).toBe(false);
  });
});
