import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '../../src/i18n';
import { MailPage } from '../../src/admin/mail/MailPage';
import { mockApi, renderAdmin } from './helpers';

const overview = {
  configured: true,
  host: 'srv176.niagahoster.com',
  port: 465,
  from: 'UdaKids <helo@eduskul.my.id>',
  user: 'h•••@eduskul.my.id',
  director: ['udacodingofficial@gmail.com'],
  appUrl: 'https://kids.eduskul.my.id',
  counts: { sent: 3 },
  recent: [
    {
      id: '00000000-0000-4000-8000-000000000001',
      toEmail: 'ortu@gmail.com',
      subject: 'Selamat datang di UdaKids!',
      kind: 'welcome',
      status: 'sent',
      attempts: 1,
      lastError: null,
      smtpResponse: '250 OK id=1xDmjJ-00000006VtE-2nIE',
      createdAt: '2026-10-06T12:00:00Z',
      sentAt: '2026-10-06T12:00:05Z',
    },
  ],
};

describe('Admin → Email: keterkiriman', () => {
  it('status "Diterima server" + ID server untuk dilacak di cPanel', async () => {
    mockApi({ '/admin/mail': overview, '/admin/news': null });
    renderAdmin(<MailPage />, '/admin/email');
    expect(await screen.findByText(t('admin.mail.sentNote'))).toBeInTheDocument();
    expect(
      screen.getByText(t('admin.mail.smtpId', { id: '1xDmjJ-00000006VtE-2nIE' })),
    ).toBeInTheDocument();
    expect(screen.getAllByText(t('admin.mail.status.sent')).length).toBeGreaterThan(0);
  });

  it('Periksa DNS: SPF bermasalah ditandai, lengkap dengan usulan catatan SPF', async () => {
    mockApi({
      '/admin/mail': overview,
      '/admin/news': null,
      '/admin/mail/dns': {
        report: {
          domain: 'eduskul.my.id',
          smtpHost: 'srv176.niagahoster.com',
          smtpIps: ['45.143.81.101'],
          spf: {
            record: 'v=spf1 +ip4:45.143.81.101 +include:eduskul.my.id ~all',
            ok: false,
            issues: ['IP server SMTP (45.143.81.101) tidak tercantum di SPF.'],
            warnings: ['SPF memasukkan domainnya sendiri (include:eduskul.my.id).'],
            suggested: 'v=spf1 ip4:45.143.81.101 ~all',
          },
          dkim: { selector: 'default', found: true, issues: [] },
          dmarc: { record: 'v=DMARC1; p=none', policy: 'none', issues: [] },
          ok: false,
        },
      },
    });
    renderAdmin(<MailPage />, '/admin/email');
    fireEvent.click(await screen.findByRole('button', { name: t('admin.mail.dns.check') }));
    expect(await screen.findByText(t('admin.mail.dns.problem'))).toBeInTheDocument();
    expect(screen.getByText(/tidak tercantum di SPF/)).toBeInTheDocument();
    expect(screen.getByText(/memasukkan domainnya sendiri/)).toBeInTheDocument();
    expect(screen.getByText('v=spf1 ip4:45.143.81.101 ~all')).toBeInTheDocument();
  });
});
