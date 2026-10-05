# Petunjuk: generate Menu Belajar satu per satu

Untuk pemilik produk dan tim konten. Rencana lengkapnya ada di
[rencana-gudang-gambar-menu-belajar.md](../rencana-gudang-gambar-menu-belajar.md).

## File di folder ini

| File                | Isi                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `menu-belajar.xlsx` | Buka di Excel/Google Sheets. Rencana 156 unit + kolom pelacak (Status, Tanggal, PIC, Catatan) + perintah dan prompt per unit |
| `menu-belajar.csv`  | Data yang sama tanpa format (sumber untuk sistem dan Claude Code)                                                            |
| `gambar-kurang.csv` | Dibuat otomatis saat generate: daftar kata yang belum punya gambar                                                           |

Sheet di Excel: **Petunjuk**, **Menu Belajar** (tabel utama), **Ringkasan** (progres otomatis), **Model Soal**,
**Layar Pelajaran**, dan **Prompt Gambar**.

## Cara A: generate dengan Claude Code (disarankan)

1. Buka proyek Udakids di VS Code, lalu buka panel Claude Code.
2. Pilih satu baris di sheet **Menu Belajar**, lalu salin kolom **Perintah Claude Code**, misalnya:

   ```text
   /generate-unit P-BT-04
   ```

3. Claude Code akan:
   - membaca baris itu dan aturan Udakids;
   - membuat **draf pelajaran** (`content/lessons/<jenjang>/<kode>.json`);
   - membuat **10 level soal** bila kolom Tantangan berisi "BARU 10 level";
   - mencatat **gambar yang kurang** di `gambar-kurang.csv`;
   - menjalankan validator, lalu melaporkan hasil dan contoh soal.
4. Periksa contoh soal dan isi pelajaran di laporan. Minta perbaikan bila perlu ("Level 3 terlalu sulit",
   "ganti contoh kata").
5. Setelah cocok, ubah **Status** di Excel menjadi **Draf**, lalu **Review**. Status **Terbit** dipakai setelah unit
   tampil di aplikasi dan sudah dicoba.
6. Lanjut ke baris berikutnya. Satu perintah = satu unit, supaya mudah direview.

Bila Claude Code bertanya soal keputusan yang belum disetujui (misalnya membuat buku Baca Tulis baru), jawab dulu.
Keputusan itu akan dicatat di `docs/decisions.md`.

## Cara B: generate dengan ChatGPT (tanpa Claude Code)

1. Salin kolom **Prompt GPT** dari baris yang dipilih, lalu tempel di ChatGPT.
2. Simpan hasilnya (JSON pelajaran, JSON soal, dan daftar gambar) ke satu file teks bernama sesuai kode, misalnya
   `P-BT-04.txt`.
3. Serahkan file itu ke tim pengembang, atau minta Claude Code: "masukkan dan validasi hasil GPT untuk P-BT-04".
   Hasil GPT **tidak boleh** langsung masuk ke aplikasi tanpa validator.
4. Ubah Status di Excel seperti pada Cara A.

## Urutan kerja yang disarankan

1. **Fase G4 (Pra-TK):** kerjakan dari kode terkecil per mapel (P-BT-01, P-BT-02, …), karena unit awal menjadi
   dasar unit berikutnya.
2. **Fase G5 (TK)**, lalu **G6 (Kelas 1)**.
3. Unit yang Tantangan-nya "Ada: …" lebih cepat, karena hanya perlu pelajaran.

## Yang perlu diketahui

- **Soal bisa dipakai segera** setelah divalidasi dan di-seed. **Pelajaran** disimpan sebagai draf dan baru tampil
  setelah pemutar pelajaran selesai dibangun (fase G3).
- **Model latihan berstatus "Baru"** (sheet Model Soal) belum ada di aplikasi. Sementara itu, soal memakai model
  yang sudah ada, dan laporan menyebut model mana yang diganti.
- **Gambar** yang kurang dikumpulkan di `gambar-kurang.csv`. Setelah fitur AI Gambar di admin selesai (fase G1),
  daftar ini tinggal diunggah untuk digenerate sekaligus lewat Batch (hemat 50%).
- Mengirim konten ke server produksi tetap lewat langkah deploy biasa (`docs/deploy.md`).

## Membuat ulang file Excel

Bila CSV diubah, misalnya karena ada unit baru, minta Claude Code: "buat ulang menu-belajar.xlsx dari CSV", atau
jalankan `python3 -m pip install openpyxl && python3 docs/blueprint/build_xlsx.py`.
Kolom Status yang sudah diisi di Excel lama perlu disalin ulang, atau simpan Excel lama sebagai cadangan.
