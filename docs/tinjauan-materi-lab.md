# Tinjauan materi lab (D-109) — catatan dari produksi 2026-10-10

Kumpulan temuan penulis saat membuat 726 Materi Topik + 28 Lab Buku. Belum ditinjau guru. Centang bila sudah
ditangani; catat keputusan di `docs/decisions.md` bila mengubah aturan.

## A. Bank soal (file level di `content/skills/`, bukan materi) — kemungkinan keliru

- [ ] sains/smp79 A05, A08: pembahasan "Dinding sel dimiliki hewan dan tumbuhan" (terbalik dari kunci)
- [ ] sains/smp79 B05, B08: pembahasan "Jantung termasuk tingkat jaringan" (seharusnya organ)
- [ ] sains/smp79 C04, C05, C08: pembahasan "Mm adalah genotipe homozigot" (seharusnya heterozigot)
- [ ] sains/sd34 K09: bunglon disebut "Mimikri" (yang tepat kamuflase)
- [ ] sains/sd12 Q5: kunci "kertas bekas anorganik" dipertanyakan; L8 kunci soal bensin dipertanyakan
- [ ] sains/sd4 E01: butir "Air mendidih memiliki energi bunyi → Salah" bisa diperdebatkan
- [ ] sains/sd3 D: kalimat "Benar atau salah: … bukan sumber cahaya" / "Lilin yang menyala adalah bukan sumber panas"
      membingungkan
- [ ] sains/sd56 D: bunglon berganti warna digolongkan adaptasi tingkah laku; rafflesia "untuk memperoleh makanan"
      (baunya menarik lalat penyerbuk)
- [ ] math/smp79 H6: pembahasan kasus jumlah ganjil ("Hasil 0 genap, maka Tidak bisa …") membingungkan
- [ ] math/smp79 O05: "bilangan positif terkecil yang bersisa sama" — sisa itu sendiri lebih kecil; perjelas kalimat
- [ ] english/smp79 I: "After graduating from ITB in 1958, he…" bila dikaitkan dengan Habibie keliru (pindah ke
      Jerman 1955)
- [ ] english/smp79 K: Nil vs Amazon (sungai terpanjang diperdebatkan), "ibu kota Jakarta, sedang pindah ke IKN"
- [ ] Berbagai buku: pilihan "Benar / Salah" di soal benar-salah — konfirmasi apakah sesuai aturan UX anak
      (materi memakai "benar / belum tepat")
- [ ] math/sd56 A: skor lomba memakai kata "salah" (−1); materi memakai "keliru"

## B. Fakta di materi yang perlu dicek

- Tinggi Semeru (±3.676 m), Everest 8.849 m, gurita 3 jantung, salju Papua, Anak Krakatau muncul 1927, ±127 gunung
  api aktif, Borobudur ±2 juta balok andesit / candi Buddha terbesar, Kartini lahir Jepara 21 April 1879
- Cahaya Matahari ±8 menit ke Bumi; hari Venus lebih lama dari tahunnya; Venus sedikit lebih kecil dari Bumi
- Jantung ±100.000 detak/hari; detak anak istirahat 70–110/menit; usus halus 6–7 m; suhu tubuh 36–37 °C
- Kamojang PLTP pertama; PLTU Paiton; pembangkit Asam-Asam, Tambak Lorok, Sidrap, Jeneponto, Sarulla
- Hiu macan ovovivipar; planaria fragmentasi; Rhizopus (tempe) vs Aspergillus (tauco)
- Konvensi buku: rambut keriting "dominan", raksa satu-satunya logam cair, lisosom/sentriol "hanya hewan",
  hati sebagai alat ekskresi (empedu), takson padi Monocotyledoneae (sistem klasik)
- Angka contoh buatan (bukan data): uji lereng, gelembung Hydrilla, jarak luncur, magnitudo, data diagram

## C. Penyederhanaan karena batas widget (kandidat diperbaiki bila widget diperluas)

- Bilangan > 1.000 (Kelas 4–SMP): kereta/urutkan/dengar-ketuk/nilai-tempat memakai contoh diperkecil
- Desimal (math sd34 D, sd4 U/V): lewat pasang/pilah teks; `banding` desimal ditampilkan sebagai perseratus
- Bilangan negatif & aljabar (sd56, smp79): hanya poster/peragaan/kartu teks
- Bagi bersisa (sd4 M): widget `bagi` tidak menampilkan sisa
- Sudut (sd34 G/N, sd4 BB): widget `jam` tidak menampilkan derajat
- Skala peta (sd56 E, smp79 FG): `ukur` hanya cm benda
- Kali/luas maks 6×6/6×8; garis bilangan hanya 1–100 tanpa langkah paksa
- English: belum ada widget phonics & dialog bergambar

## D. Gambar

- 1.232 slot `benda` sengaja tanpa foto (angka, kata, konsep abstrak) — SVG
- Cadangan SVG yang hanya mendekati (komodo→buaya, kaktus→pohon, nyamuk→lebah, termometer→jam dinding, dst.) —
  tertutup bila foto Pexels/AI tersedia
- Foto sensitif perlu dilihat setelah `lesson:photos`: vaksinasi, bayi menyusu, sel telur bayi tabung, perban
  hemofilia, wajah ekspresi anak, "Tsunami" (rambu evakuasi)
- 306 id foto dipakai di beberapa topik dengan label sedikit berbeda (subjek sama; satu id = satu foto)
