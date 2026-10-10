import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AboutNameSection } from '../../src/site/AboutName';
import { t } from '../../src/i18n';

describe('Kenapa namanya UdaKids? (D-107)', () => {
  it('menjelaskan Uda, atap gonjong, dan marawa; hanya nama UdaKids yang tampil', () => {
    const { container } = render(<AboutNameSection />);
    const section = container.querySelector('#tentang')!;
    expect(
      within(section as HTMLElement).getByRole('heading', { name: 'Kenapa namanya UdaKids?' }),
    ).toBeInTheDocument();
    for (const key of ['udaTitle', 'gonjongTitle', 'marawaTitle'] as const)
      expect(screen.getByRole('heading', { name: t(`site.about.${key}`) })).toBeInTheDocument();
    expect(section.textContent).toMatch(/bahasa Minang/);
    expect(section.textContent).toMatch(/Momo/);
    // Satu nama, satu wajah (BRAND.md): nama produk/perusahaan lain tidak tampil di landing anak.
    expect(section.textContent).not.toMatch(/Eduskul|Udacoding|Little Coder/i);
    // Pita pucuk rebung satu kali saja.
    expect(section.querySelectorAll('.uk-rebung')).toHaveLength(1);
  });
});
