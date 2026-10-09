import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Momo, OwnMomoLook } from '../../src/components/Momo';
import {
  MomoStudio,
  normalizeHex,
  plainLook,
  randomStyle,
  type MomoStyle,
} from '../../src/components/MomoStudio';
import { momoLookSchema } from '@little-coder/engine';

function Harness({ onChange }: { onChange?: (v: MomoStyle) => void }) {
  const [v, setV] = useState<MomoStyle>({ color: 'ungu', look: plainLook() });
  return (
    <MomoStudio
      value={v}
      onChange={(n) => {
        setV(n);
        onChange?.(n);
      }}
    />
  );
}

describe('Momo & Studio Momo (D-051)', () => {
  it('gradasi memakai linearGradient; aksesori penutup kepala menyembunyikan antena', () => {
    const { container, rerender } = render(<Momo color="biru" />);
    expect(container.querySelector('linearGradient')).toBeNull();
    expect(container.querySelectorAll('line')).toHaveLength(1);
    rerender(<Momo color="biru" look={{ gradient: 'toska', accessory: 'jilbab' }} />);
    expect(container.querySelector('linearGradient')).not.toBeNull();
    expect(container.querySelectorAll('line')).toHaveLength(0);
    rerender(<Momo color="biru" look={{ accessory: 'pita' }} />);
    expect(container.querySelectorAll('line')).toHaveLength(1);
  });

  it('<Momo own> memakai tampilan anak yang sedang bermain, Momo lain tidak', () => {
    const { container } = render(
      <OwnMomoLook look={{ accessory: 'topi', gradient: 'kuning' }}>
        <Momo own color="hijau" />
        <Momo color="hijau" />
      </OwnMomoLook>,
    );
    const svgs = container.querySelectorAll('svg');
    expect(svgs[0]!.querySelector('linearGradient')).not.toBeNull();
    expect(svgs[1]!.querySelector('linearGradient')).toBeNull();
  });

  it('studio: tab Kepala berisi semua aksesori; warna aksesori muncul setelah memilih aksesori', () => {
    let last: MomoStyle | undefined;
    render(<Harness onChange={(v) => (last = v)} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Kepala' }));
    for (const name of [
      'Rambut poni',
      'Rambut kuncir',
      'Rambut keriting',
      'Topi',
      'Peci',
      'Jilbab',
      'Pita',
      'Mahkota',
      'Bunga',
      // D-104: gaya rambut pendek & gaya keren — tanpa label laki-laki/perempuan.
      'Rambut cepak',
      'Rambut jabrik',
      'Rambut belah samping',
      'Rambut mohawk',
      'Rambut gelombang',
      'Topi terbalik',
      'Bandana',
    ])
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    expect(screen.queryByText('Warna aksesori')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Jilbab' }));
    expect(last?.look.accessory).toBe('jilbab');
    expect(screen.getByText('Warna aksesori')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Toska' }));
    expect(last?.look.accessoryColor).toBe('toska');
  });

  it('D-102: model karakter, pola, pernak-pernik', () => {
    let last: MomoStyle | undefined;
    const { container } = render(<Harness onChange={(v) => (last = v)} />);
    for (const name of [
      'Momo kucing',
      'Momo kelinci',
      'Momo beruang',
      'Momo alien',
      'Momo TV',
      'Momo dino',
    ])
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Momo kucing' }));
    expect(last?.look.model).toBe('kucing');
    fireEvent.click(screen.getByRole('tab', { name: 'Pola' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hati' }));
    expect(last?.look.pattern).toBe('hati');
    // Pola digambar sebagai <pattern> di pratinjau.
    expect(container.querySelector('.ms-preview pattern')).not.toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Pernik' }));
    fireEvent.click(screen.getByRole('button', { name: 'Kacamata' }));
    expect(last?.look.extra).toBe('kacamata');
    for (const name of ['Dasi', 'Medali'])
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    expect(screen.getByText('Warna pernak-pernik')).toBeInTheDocument();
  });

  it('D-102: warna utama dari palet lain, warna bebas, dan kode warna ketikan', () => {
    let last: MomoStyle | undefined;
    render(<Harness onChange={(v) => (last = v)} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Warna' }));
    const main = screen.getByRole('group', { name: 'Warna utama' });
    // Salah satu dari 6 warna Momo → momoColor; warna palet lain → warna badan sendiri.
    fireEvent.click(within(main).getByRole('button', { name: 'Merah' }));
    expect(last).toMatchObject({ color: 'merah', look: { body: null } });
    fireEvent.click(within(main).getByRole('button', { name: 'Toska' }));
    expect(last).toMatchObject({ color: 'merah', look: { body: '#2bb5a8' } });
    fireEvent.change(within(main).getByLabelText(/Warna sendiri/), {
      target: { value: '#123ABC' },
    });
    expect(last?.look.body).toBe('#123abc');
    const code = within(main).getByRole('textbox', { name: /Kode warna/ });
    fireEvent.change(code, { target: { value: 'zz' } });
    fireEvent.keyDown(code, { key: 'Enter' });
    expect(screen.getByRole('status')).toHaveTextContent('#FF8800');
    expect(last?.look.body).toBe('#123abc');
    fireEvent.change(code, { target: { value: 'f80' } });
    fireEvent.keyDown(code, { key: 'Enter' });
    expect(last?.look.body).toBe('#ff8800');
    // Gradasi juga bisa kode warna sendiri.
    const grad = screen.getByRole('group', { name: 'Gradasi warna' });
    const gcode = within(grad).getByRole('textbox', { name: /Kode warna/ });
    fireEvent.change(gcode, { target: { value: '#00AA55' } });
    fireEvent.keyDown(gcode, { key: 'Enter' });
    expect(last?.look.gradient).toBe('#00aa55');
  });

  it('Acak & Kembalikan; Momo bereaksi saat diketuk', () => {
    let last: MomoStyle | undefined;
    const { container } = render(<Harness onChange={(v) => (last = v)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Momo kucing' }));
    fireEvent.click(screen.getByRole('button', { name: /Acak/ }));
    expect(momoLookSchema.safeParse(last?.look).success).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Kembalikan/ }));
    expect(last).toEqual({ color: 'ungu', look: plainLook() });
    fireEvent.click(screen.getByRole('button', { name: 'Ketuk Momo' }));
    expect(container.querySelector('.ms-preview .momo-proud')).not.toBeNull();
  });

  it('randomStyle selalu valid; normalizeHex', () => {
    let seed = 0.13;
    const rand = () => (seed = (seed * 9301 + 0.4927) % 1);
    for (let i = 0; i < 50; i++)
      expect(momoLookSchema.safeParse(randomStyle(rand).look).success).toBe(true);
    expect(normalizeHex('F80')).toBe('#ff8800');
    expect(normalizeHex(' #13C2C2 ')).toBe('#13c2c2');
    expect(normalizeHex('#12345')).toBeNull();
    expect(normalizeHex('merah')).toBeNull();
  });
});
