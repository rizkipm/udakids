import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { peragaSchema } from '@little-coder/engine';
import { Peraga } from '../../src/play/peraga/Peraga';

/** Simulasi pelajaran SD (D-093): bisa dimainkan dengan ketukan saja, tanpa foto (cadangan SVG). */
const step = { teks: 'Langkah', suara: 'Langkah', selesai: 'Bagus sekali' };
const card = (id: string) => ({
  id,
  nama: id,
  teks: `Ini ${id}.`,
  suara: `Ini ${id}.`,
  gambar: { word: id },
});

describe('peraga', () => {
  it('jelajah: lihat semua kartu → pertanyaan → jawaban lengkap → aha', () => {
    const data = peragaSchema.parse({
      tipe: 'jelajah',
      jelajahSuara: 'Ketuk kartunya',
      bagian: [card('akar'), card('batang'), card('daun')],
      tanya: [
        {
          teks: 'Ketuk jalan air',
          suara: 'Ketuk jalan air',
          jawaban: ['akar', 'batang'],
          selesai: 'Betul',
        },
      ],
      aha: 'Semua bekerja sama!',
      tutup: 'Hebat.',
    });
    render(<Peraga data={data} />);
    for (const n of ['akar', 'batang', 'daun'])
      fireEvent.click(screen.getByRole('button', { name: n }));
    expect(screen.getByText('Ini daun.', { exact: false })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Jawab pertanyaan Momo' }));
    expect(screen.getByText('Ketuk jalan air')).toBeTruthy();
    // Kartu yang bukan jawaban tidak dihitung; dua jawaban → lanjut → aha.
    fireEvent.click(screen.getByRole('button', { name: 'daun' }));
    fireEvent.click(screen.getByRole('button', { name: 'akar' }));
    expect(screen.queryByRole('button', { name: 'Berikutnya' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'batang' }));
    fireEvent.click(screen.getByRole('button', { name: 'Berikutnya' }));
    expect(screen.getByText('Semua bekerja sama!')).toBeTruthy();
  });

  it('alat garis bilangan: lompat sampai target → langkah selesai', () => {
    const data = peragaSchema.parse({
      tipe: 'alat',
      alat: 'garis-bilangan',
      pengantar: 'Ayo',
      langkah: [{ ...step, min: 0, max: 10, dari: 3, ubah: 2 }],
      aha: 'Lompat ke kanan menambah!',
      tutup: 'Hebat.',
    });
    render(<Peraga data={data} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mulai simulasi' }));
    fireEvent.click(screen.getByRole('button', { name: '+ 1' }));
    expect(screen.queryByRole('button', { name: 'Selesai' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '+ 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Selesai' }));
    expect(screen.getByText('Lompat ke kanan menambah!')).toBeTruthy();
  });

  it('alat blok puluhan & benda', () => {
    const blok = peragaSchema.parse({
      tipe: 'alat',
      alat: 'blok-puluhan',
      pengantar: 'Ayo',
      langkah: [{ ...step, target: 21 }],
      aha: 'Dua puluhan satu satuan!',
      tutup: 'Hebat.',
    });
    const { unmount } = render(<Peraga data={blok} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mulai simulasi' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Puluhan' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Puluhan' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Satuan' }));
    expect(screen.getByRole('button', { name: 'Selesai' })).toBeTruthy();
    unmount();

    const benda = peragaSchema.parse({
      tipe: 'alat',
      alat: 'benda',
      pengantar: 'Ayo',
      langkah: [{ ...step, benda: 'apel', a: 4, b: 1, op: '-' }],
      aha: 'Mengambil membuat berkurang!',
      tutup: 'Hebat.',
    });
    render(<Peraga data={benda} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mulai simulasi' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'apel' })[0]!);
    expect(screen.getByText('4 − 1 = 3')).toBeTruthy();
  });

  it('proses & kata', () => {
    const tahap = (nama: string) => ({
      nama,
      teks: `${nama} terjadi.`,
      suara: nama,
      gambar: { object: 'es-batu' },
    });
    const proses = peragaSchema.parse({
      tipe: 'proses',
      tombol: 'Panaskan',
      tahap: [tahap('Es'), tahap('Air')],
      aha: 'Es menjadi air!',
      tutup: 'Hebat.',
    });
    const { unmount } = render(<Peraga data={proses} />);
    fireEvent.click(screen.getByRole('button', { name: 'Panaskan' }));
    expect(screen.getByText('Es menjadi air!')).toBeTruthy();
    unmount();

    const k = (en: string, id: string) => ({ en, id, gambar: { word: en } });
    const kata = peragaSchema.parse({
      tipe: 'kata',
      pengantar: 'Ayo',
      kata: [k('red', 'merah'), k('blue', 'biru'), k('green', 'hijau')],
      aha: 'Warna di sekitar kita!',
      tutup: 'Hebat.',
    });
    render(<Peraga data={kata} />);
    for (const n of ['red, merah', 'blue, biru', 'green, hijau'])
      fireEvent.click(screen.getByRole('button', { name: n }));
    fireEvent.click(screen.getByRole('button', { name: 'Jawab pertanyaan Momo' }));
    // Tebakan berurutan: red, blue, green.
    fireEvent.click(screen.getByRole('button', { name: 'red, merah' }));
    fireEvent.click(screen.getByRole('button', { name: 'blue, biru' }));
    fireEvent.click(screen.getByRole('button', { name: 'green, hijau' }));
    expect(screen.getByText('Warna di sekitar kita!')).toBeTruthy();
  });

  it('alat Kelas 4 (D-096): luas, keliling, sudut, diagram, desimal, ribuan', () => {
    const alat = (a: string, langkah: unknown[]) =>
      peragaSchema.parse({
        tipe: 'alat',
        alat: a,
        pengantar: 'Ayo',
        langkah,
        aha: 'Aha!',
        tutup: 'Hebat.',
      });
    const start = () => fireEvent.click(screen.getByRole('button', { name: 'Mulai simulasi' }));
    const done = () => expect(screen.getByRole('button', { name: 'Selesai' })).toBeTruthy();

    let v = render(
      <Peraga data={alat('luas', [{ ...step, panjang: 4, lebar: 2, hitung: 'luas' }])} />,
    );
    start();
    fireEvent.click(screen.getByRole('button', { name: 'Isi satu baris' }));
    expect(screen.queryByRole('button', { name: 'Selesai' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Isi satu baris' }));
    done();
    v.unmount();

    v = render(
      <Peraga data={alat('luas', [{ ...step, panjang: 4, lebar: 2, hitung: 'keliling' }])} />,
    );
    start();
    for (const s of ['atas', 'kanan', 'bawah', 'kiri'])
      fireEvent.click(screen.getByRole('button', { name: `Ukur sisi ${s}` }));
    expect(screen.getByText('Keliling sejauh ini: 12 satuan')).toBeTruthy();
    done();
    v.unmount();

    v = render(<Peraga data={alat('sudut', [{ ...step, target: 105 }])} />);
    start();
    fireEvent.click(screen.getByRole('button', { name: '+ 90°' }));
    expect(screen.getByText('90° · sudut siku-siku')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '+ 15°' }));
    done();
    v.unmount();

    v = render(
      <Peraga
        data={alat('diagram', [
          {
            ...step,
            satuan: 'anak',
            skala: 5,
            data: [
              { nama: 'apel', nilai: 10 },
              { nama: 'jeruk', nilai: 5 },
            ],
          },
        ])}
      />,
    );
    start();
    const plus = screen.getAllByRole('button', { name: '+' });
    fireEvent.click(plus[0]!);
    fireEvent.click(plus[0]!);
    fireEvent.click(plus[1]!);
    done();
    v.unmount();

    v = render(<Peraga data={alat('desimal', [{ ...step, perseratus: 23 }])} />);
    start();
    fireEvent.click(screen.getByRole('button', { name: '+ 0,1' }));
    fireEvent.click(screen.getByRole('button', { name: '+ 0,1' }));
    for (let k = 0; k < 3; k++) fireEvent.click(screen.getByRole('button', { name: '+ 0,01' }));
    expect(screen.getByText('0,23 = 23/100')).toBeTruthy();
    done();
    v.unmount();

    render(<Peraga data={alat('blok-puluhan', [{ ...step, target: 2010 }])} />);
    start();
    fireEvent.click(screen.getByRole('button', { name: '+ Ribuan' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Ribuan' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Puluhan' }));
    expect(screen.getByText('2.010')).toBeTruthy();
    done();
  });
});
