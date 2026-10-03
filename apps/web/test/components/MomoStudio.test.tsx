import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Momo, OwnMomoLook } from '../../src/components/Momo';
import { MomoStudio, plainLook, type MomoStyle } from '../../src/components/MomoStudio';

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

  it('studio: semua aksesori tersedia; warna aksesori muncul setelah memilih aksesori', () => {
    let last: MomoStyle | undefined;
    render(<Harness onChange={(v) => (last = v)} />);
    for (const name of [
      'Rambut poni',
      'Rambut kuncir',
      'Rambut keriting',
      'Topi',
      'Peci',
      'Jilbab',
      'Pita',
    ])
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    expect(screen.queryByText('Warna aksesori')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Jilbab' }));
    expect(last?.look.accessory).toBe('jilbab');
    expect(screen.getByText('Warna aksesori')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Toska' })[0]!);
    expect(last?.look.gradient).toBe('toska');
    fireEvent.click(screen.getByRole('button', { name: 'merah' }));
    expect(last?.color).toBe('merah');
  });
});
