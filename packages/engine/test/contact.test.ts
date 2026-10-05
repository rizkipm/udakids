import { describe, expect, it } from 'vitest';
import {
  adminWhatsappHref,
  contactSettingsSchema,
  passwordChangeSchema,
  passwordResetSchema,
  whatsappFromPhone,
} from '../src/index.js';

describe('kontak WhatsApp (D-064)', () => {
  it('nomor HP Indonesia menjadi link wa.me', () => {
    expect(whatsappFromPhone('0812-3456-7890')).toBe('https://wa.me/6281234567890');
    expect(whatsappFromPhone('+62 812 3456 7890')).toBe('https://wa.me/6281234567890');
    expect(whatsappFromPhone('https://wa.me/6281')).toBe('https://wa.me/6281');
  });

  it('hanya menerima link WhatsApp yang aman; kosong boleh', () => {
    const ok = contactSettingsSchema.parse({
      adminWhatsapp: '081234567890',
      groupWhatsapp: 'https://chat.whatsapp.com/AbC123',
    });
    expect(ok).toEqual({
      adminWhatsapp: 'https://wa.me/6281234567890',
      adminMessage: '',
      groupWhatsapp: 'https://chat.whatsapp.com/AbC123',
    });
    expect(
      contactSettingsSchema.parse({ adminWhatsapp: '', groupWhatsapp: '' }).adminWhatsapp,
    ).toBe('');
    for (const bad of ['http://wa.me/62812', 'https://evil.com/wa.me', 'javascript:alert(1)'])
      expect(
        contactSettingsSchema.safeParse({ adminWhatsapp: bad, groupWhatsapp: '' }).success,
      ).toBe(false);
    expect(
      contactSettingsSchema.safeParse({ adminWhatsapp: '', groupWhatsapp: 'https://wa.me/62812' })
        .success,
    ).toBe(false);
  });

  it('pesan pembuka ditambahkan ke link', () => {
    expect(
      adminWhatsappHref({ adminWhatsapp: 'https://wa.me/62812', adminMessage: 'Halo admin' }),
    ).toBe('https://wa.me/62812?text=Halo+admin');
    expect(adminWhatsappHref({ adminWhatsapp: '', adminMessage: 'x' })).toBe('');
  });
});

describe('skema akun orang tua (D-064)', () => {
  it('reset password: kode 6 angka + password minimal 8', () => {
    expect(
      passwordResetSchema.safeParse({ email: 'A@B.co', code: '123456', password: 'rahasia123' })
        .success,
    ).toBe(true);
    expect(
      passwordResetSchema.safeParse({ email: 'a@b.co', code: '12345', password: 'rahasia123' })
        .success,
    ).toBe(false);
  });
  it('ganti password: baru harus beda dari lama', () => {
    expect(
      passwordChangeSchema.safeParse({ currentPassword: 'rahasia123', password: 'rahasia123' })
        .success,
    ).toBe(false);
  });
});
