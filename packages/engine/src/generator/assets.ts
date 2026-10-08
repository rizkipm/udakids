/**
 * Daftar aset ilustrasi yang boleh dirujuk soal. Validator memastikan setiap soal hanya memakai id
 * di sini (PRD A7 no. 7 "semua gambar ada"); web wajib punya ilustrasi SVG untuk setiap id.
 * `say` = cara menyebutnya (untuk suara), `countable` = boleh dipakai di soal membilang.
 */
export const OBJECTS = {
  apel: { say: 'apel', countable: true },
  jeruk: { say: 'jeruk', countable: true },
  pisang: { say: 'pisang', countable: true },
  anggur: { say: 'anggur', countable: false },
  semangka: { say: 'semangka', countable: false },
  wortel: { say: 'wortel', countable: true },
  bebek: { say: 'bebek', countable: true },
  ayam: { say: 'ayam', countable: true },
  kucing: { say: 'kucing', countable: true },
  ikan: { say: 'ikan', countable: true },
  kelinci: { say: 'kelinci', countable: true },
  'kupu-kupu': { say: 'kupu-kupu', countable: true },
  semut: { say: 'semut', countable: false },
  gajah: { say: 'gajah', countable: false },
  bunga: { say: 'bunga', countable: true },
  pohon: { say: 'pohon', countable: false },
  bola: { say: 'bola', countable: true },
  balon: { say: 'balon', countable: true },
  mobil: { say: 'mobil', countable: true },
  sepeda: { say: 'sepeda', countable: false },
  'layang-layang': { say: 'layang-layang', countable: true },
  bintang: { say: 'bintang', countable: true },
  kue: { say: 'kue', countable: true },
  topi: { say: 'topi', countable: true },
  pensil: { say: 'pensil', countable: true },
  buku: { say: 'buku', countable: true },
  pita: { say: 'pita', countable: false },
  gedung: { say: 'gedung', countable: false },
  pintu: { say: 'pintu', countable: false },
  meja: { say: 'meja', countable: false },
  batu: { say: 'batu', countable: false },
  bulu: { say: 'bulu', countable: false },
  ember: { say: 'ember', countable: false },
  gelas: { say: 'gelas', countable: false },
  panci: { say: 'panci', countable: false },
  cangkir: { say: 'cangkir', countable: false },
  botol: { say: 'botol', countable: false },
  sendok: { say: 'sendok', countable: false },
  kotak: { say: 'kotak', countable: false },
  'jam-dinding': { say: 'jam dinding', countable: false },
  piring: { say: 'piring', countable: false },
  'roti-lapis': { say: 'roti lapis', countable: false },
  jendela: { say: 'jendela', countable: false },
  kado: { say: 'kado', countable: false },
  dadu: { say: 'dadu', countable: false },
  kaleng: { say: 'kaleng', countable: false },
  drum: { say: 'drum', countable: false },
  'topi-ulang-tahun': { say: 'topi ulang tahun', countable: false },
  'es-krim': { say: 'es krim', countable: false },
  'kotak-susu': { say: 'kotak susu', countable: false },
  stiker: { say: 'stiker', countable: false },
  // Tambahan D-055: lebih banyak hewan, buah/sayur, kendaraan, dan benda alam.
  sapi: { say: 'sapi', countable: true },
  kambing: { say: 'kambing', countable: true },
  kuda: { say: 'kuda', countable: true },
  monyet: { say: 'monyet', countable: true },
  singa: { say: 'singa', countable: true },
  jerapah: { say: 'jerapah', countable: true },
  burung: { say: 'burung', countable: true },
  'kura-kura': { say: 'kura-kura', countable: true },
  katak: { say: 'katak', countable: true },
  lebah: { say: 'lebah', countable: true },
  siput: { say: 'siput', countable: true },
  penguin: { say: 'penguin', countable: true },
  beruang: { say: 'beruang', countable: true },
  mangga: { say: 'mangga', countable: true },
  nanas: { say: 'nanas', countable: true },
  stroberi: { say: 'stroberi', countable: true },
  tomat: { say: 'tomat', countable: true },
  jagung: { say: 'jagung', countable: true },
  brokoli: { say: 'brokoli', countable: true },
  pesawat: { say: 'pesawat', countable: true },
  kapal: { say: 'kapal', countable: true },
  bus: { say: 'bus', countable: true },
  kereta: { say: 'kereta', countable: true },
  matahari: { say: 'matahari', countable: false },
  awan: { say: 'awan', countable: true },
  bulan: { say: 'bulan', countable: false },
  payung: { say: 'payung', countable: true },
  api: { say: 'api', countable: false },
  'es-batu': { say: 'es batu', countable: true },
  // Tambahan D-058 (buku English Pra-TK): kata bergambar, perasaan, dan kata kerja. Tidak dipakai
  // generator membilang (countable: false) agar soal matematika yang ada tidak berubah.
  igloo: { say: 'igloo', countable: false },
  selai: { say: 'selai', countable: false },
  kunci: { say: 'kunci', countable: false },
  sarang: { say: 'sarang burung', countable: false },
  van: { say: 'mobil van', countable: false },
  biola: { say: 'biola', countable: false },
  xilofon: { say: 'xilofon', countable: false },
  yoyo: { say: 'yoyo', countable: false },
  zebra: { say: 'zebra', countable: false },
  anjing: { say: 'anjing', countable: false },
  rumah: { say: 'rumah', countable: false },
  tikus: { say: 'tikus', countable: false },
  ular: { say: 'ular', countable: false },
  rubah: { say: 'rubah', countable: false },
  telur: { say: 'telur', countable: false },
  ranjang: { say: 'tempat tidur', countable: false },
  babi: { say: 'babi', countable: false },
  'wajah-senang': { say: 'wajah senang', countable: false },
  'wajah-sedih': { say: 'wajah sedih', countable: false },
  'wajah-marah': { say: 'wajah marah', countable: false },
  'wajah-takut': { say: 'wajah takut', countable: false },
  'wajah-ngantuk': { say: 'wajah mengantuk', countable: false },
  'anak-lari': { say: 'anak berlari', countable: false },
  'anak-lompat': { say: 'anak melompat', countable: false },
  'anak-makan': { say: 'anak makan', countable: false },
  'anak-tidur': { say: 'anak tidur', countable: false },
  'anak-berenang': { say: 'anak berenang', countable: false },
  'anak-membaca': { say: 'anak membaca', countable: false },
  'anak-menyanyi': { say: 'anak menyanyi', countable: false },
  'anak-duduk': { say: 'anak duduk', countable: false },
  // Tambahan D-069 (EMC TK): benda berbentuk belah ketupat.
  ketupat: { say: 'ketupat', countable: false },
  // Tambahan D-070 (ESC Sains TK): hewan laut & makanannya, kendaraan, alat kebersihan, benda alam, api & air,
  // dan anak memakai pancaindra. countable: false agar soal membilang yang ada tidak berubah.
  paus: { say: 'paus', countable: false },
  hiu: { say: 'hiu', countable: false },
  gurita: { say: 'gurita', countable: false },
  kepiting: { say: 'kepiting', countable: false },
  penyu: { say: 'penyu', countable: false },
  buaya: { say: 'buaya', countable: false },
  ulat: { say: 'ulat', countable: false },
  'lumba-lumba': { say: 'lumba-lumba', countable: false },
  daun: { say: 'daun', countable: false },
  rumput: { say: 'rumput', countable: false },
  motor: { say: 'sepeda motor', countable: false },
  helikopter: { say: 'helikopter', countable: false },
  perahu: { say: 'perahu', countable: false },
  truk: { say: 'truk', countable: false },
  sapu: { say: 'sapu', countable: false },
  pel: { say: 'alat pel', countable: false },
  kemoceng: { say: 'kemoceng', countable: false },
  'tempat-sampah': { say: 'tempat sampah', countable: false },
  'sikat-gigi': { say: 'sikat gigi', countable: false },
  sabun: { say: 'sabun', countable: false },
  gunung: { say: 'gunung', countable: false },
  pelangi: { say: 'pelangi', countable: false },
  laut: { say: 'laut', countable: false },
  lilin: { say: 'lilin', countable: false },
  kompor: { say: 'kompor', countable: false },
  'api-unggun': { say: 'api unggun', countable: false },
  keran: { say: 'keran air', countable: false },
  gembor: { say: 'penyiram tanaman', countable: false },
  'anak-mendengar': { say: 'anak mendengar', countable: false },
  'anak-melihat': { say: 'anak melihat', countable: false },
  'anak-mencium': { say: 'anak mencium bunga', countable: false },
  'anak-meraba': { say: 'tangan meraba', countable: false },
  'anak-mandi': { say: 'anak mandi', countable: false },
  'anak-menyiram': { say: 'anak menyiram tanaman', countable: false },
  // Tambahan D-071 (English TK Olimpiade): cuaca, benda kelas, kamar mandi, mainan, sayur/buah, harimau, dan
  // orang (untuk he/she). countable: false agar soal membilang yang ada tidak berubah.
  hujan: { say: 'hujan', countable: false },
  salju: { say: 'salju', countable: false },
  angin: { say: 'angin', countable: false },
  petir: { say: 'badai petir', countable: false },
  kursi: { say: 'kursi', countable: false },
  tas: { say: 'tas', countable: false },
  penghapus: { say: 'penghapus', countable: false },
  penggaris: { say: 'penggaris', countable: false },
  gunting: { say: 'gunting', countable: false },
  krayon: { say: 'krayon', countable: false },
  'papan-tulis': { say: 'papan tulis', countable: false },
  kloset: { say: 'kloset', countable: false },
  handuk: { say: 'handuk', countable: false },
  sisir: { say: 'sisir', countable: false },
  'pasta-gigi': { say: 'pasta gigi', countable: false },
  cermin: { say: 'cermin', countable: false },
  boneka: { say: 'boneka', countable: false },
  robot: { say: 'robot', countable: false },
  'boneka-beruang': { say: 'boneka beruang', countable: false },
  ceri: { say: 'ceri', countable: false },
  bawang: { say: 'bawang', countable: false },
  kentang: { say: 'kentang', countable: false },
  harimau: { say: 'harimau', countable: false },
  'anak-laki-laki': { say: 'anak laki-laki', countable: false },
  'anak-perempuan': { say: 'anak perempuan', countable: false },
  ayah: { say: 'ayah', countable: false },
  ibu: { say: 'ibu', countable: false },
  kakek: { say: 'kakek', countable: false },
  nenek: { say: 'nenek', countable: false },
  // Tambahan D-074 (KMSI Level A Sains): rasa makanan, lidah, dan tempat tinggal hewan.
  permen: { say: 'permen', countable: false },
  madu: { say: 'madu', countable: false },
  gula: { say: 'gula', countable: false },
  garam: { say: 'garam', countable: false },
  kerupuk: { say: 'kerupuk', countable: false },
  kopi: { say: 'kopi', countable: false },
  obat: { say: 'obat', countable: false },
  pare: { say: 'pare', countable: false },
  'jeruk-nipis': { say: 'jeruk nipis', countable: false },
  lidah: { say: 'lidah', countable: false },
  kandang: { say: 'kandang', countable: false },
  kolam: { say: 'kolam', countable: false },
  'sarang-lebah': { say: 'sarang lebah', countable: false },
  // Tambahan D-075 (Worksheet PAUD — huruf vokal): kata berawalan i, u, e, o.
  itik: { say: 'itik', countable: false },
  udang: { say: 'udang', countable: false },
  unta: { say: 'unta', countable: false },
  elang: { say: 'elang', countable: false },
  emas: { say: 'emas', countable: false },
  obor: { say: 'obor', countable: false },
  obeng: { say: 'obeng', countable: false },
  ombak: { say: 'ombak', countable: false },
  // Tambahan D-078 (game seru): kendaraan, luar angkasa, laut, dan pertumbuhan tanaman.
  traktor: { say: 'traktor', countable: false },
  roket: { say: 'roket', countable: true },
  planet: { say: 'planet', countable: true },
  astronot: { say: 'astronot', countable: false },
  kerang: { say: 'kerang', countable: true },
  benih: { say: 'benih', countable: false },
  tunas: { say: 'tunas', countable: false },
} as const satisfies Record<string, { say: string; countable: boolean }>;

export type ObjectId = keyof typeof OBJECTS;
export const OBJECT_IDS = Object.keys(OBJECTS) as ObjectId[];
export const COUNTABLE_OBJECTS = OBJECT_IDS.filter((id) => OBJECTS[id].countable);

/** Bagian tubuh yang bisa ditunjuk pada visual `body` (D-070). */
export const BODY_PARTS = {
  kepala: 'kepala',
  rambut: 'rambut',
  mata: 'mata',
  telinga: 'telinga',
  hidung: 'hidung',
  mulut: 'mulut',
  tangan: 'tangan',
  perut: 'perut',
  kaki: 'kaki',
} as const;
export type BodyPart = keyof typeof BODY_PARTS;
export const BODY_PART_IDS = Object.keys(BODY_PARTS) as BodyPart[];

export const COLORS = ['merah', 'biru', 'kuning', 'hijau', 'ungu', 'oranye'] as const;
export type Color = (typeof COLORS)[number];

export const SHAPES = {
  lingkaran: { say: 'lingkaran', sides: 0 },
  segitiga: { say: 'segitiga', sides: 3 },
  persegi: { say: 'persegi', sides: 4 },
  'persegi-panjang': { say: 'persegi panjang', sides: 4 },
  'segi-lima': { say: 'segi lima', sides: 5 },
  'segi-enam': { say: 'segi enam', sides: 6 },
  'belah-ketupat': { say: 'belah ketupat', sides: 4 },
} as const;
export type ShapeId = keyof typeof SHAPES;
/** Semua bangun datar yang bisa digambar (skema visual, pilihan `pool`). */
export const ALL_SHAPE_IDS = Object.keys(SHAPES) as ShapeId[];
/**
 * Bangun datar bawaan generator (pilihan acak & `pool` default). Belah ketupat (D-069) hanya muncul
 * bila disebut di `pool`, agar soal lama tidak berubah dan tidak tertukar dengan persegi miring.
 */
export const SHAPE_IDS: ShapeId[] = [
  'lingkaran',
  'segitiga',
  'persegi',
  'persegi-panjang',
  'segi-lima',
  'segi-enam',
];

export const SOLIDS = {
  bola: { say: 'bola', rolls: true, stacks: false, face: 'lingkaran' },
  kubus: { say: 'kubus', rolls: false, stacks: true, face: 'persegi' },
  balok: { say: 'balok', rolls: false, stacks: true, face: 'persegi-panjang' },
  tabung: { say: 'tabung', rolls: true, stacks: true, face: 'lingkaran' },
  kerucut: { say: 'kerucut', rolls: true, stacks: false, face: 'lingkaran' },
} as const satisfies Record<
  string,
  { say: string; rolls: boolean; stacks: boolean; face: ShapeId | null }
>;
export type SolidId = keyof typeof SOLIDS;
export const SOLID_IDS = Object.keys(SOLIDS) as SolidId[];

/** Koin Rupiah yang beredar (emisi 2016). */
export const COINS = [100, 200, 500, 1000] as const;
export type CoinValue = (typeof COINS)[number];

export const SIZES = ['s', 'm', 'l'] as const;
export type Size = (typeof SIZES)[number];

/** Benda di dunia nyata → bentuk datar / bangun ruang (Dunia nyata, kategori S). */
export const REAL_WORLD_SHAPES: Partial<Record<ObjectId, ShapeId>> = {
  'jam-dinding': 'lingkaran',
  piring: 'lingkaran',
  'roti-lapis': 'segitiga',
  buku: 'persegi-panjang',
  pintu: 'persegi-panjang',
  jendela: 'persegi',
  ketupat: 'belah-ketupat',
};
export const REAL_WORLD_SOLIDS: Partial<Record<ObjectId, SolidId>> = {
  bola: 'bola',
  jeruk: 'bola',
  kado: 'kubus',
  dadu: 'kubus',
  kaleng: 'tabung',
  drum: 'tabung',
  'topi-ulang-tahun': 'kerucut',
  'es-krim': 'kerucut',
  'kotak-susu': 'balok',
};

/** Pasangan untuk "berat/ringan" dan "muat lebih banyak/sedikit": [lebih, kurang]. */
export const HEAVY_PAIRS: [ObjectId, ObjectId][] = [
  ['gajah', 'semut'],
  ['batu', 'bulu'],
  ['semangka', 'anggur'],
  ['mobil', 'sepeda'],
];
export const CAPACITY_PAIRS: [ObjectId, ObjectId][] = [
  ['ember', 'gelas'],
  ['panci', 'cangkir'],
  ['botol', 'sendok'],
];
/** Benda yang ukurannya bisa diregangkan untuk soal panjang/tinggi/lebar. */
export const STRETCHABLE: Record<'long' | 'tall' | 'wide', ObjectId[]> = {
  long: ['pensil', 'pita'],
  tall: ['pohon', 'gedung', 'bunga'],
  wide: ['pintu', 'meja', 'buku'],
};
/** Pasangan "apakah cukup?": [yang butuh, yang diberikan]. */
export const ENOUGH_PAIRS: [ObjectId, ObjectId][] = [
  ['kelinci', 'wortel'],
  ['kucing', 'ikan'],
  ['bebek', 'topi'],
];
/** Benda wadah/acuan untuk soal posisi, dan subjeknya. */
export const POSITION_REFERENCES: ObjectId[] = ['kotak', 'meja', 'pohon'];
export const POSITION_SUBJECTS: ObjectId[] = ['kucing', 'bola', 'bebek', 'kelinci'];

/** Nama anak untuk soal cerita. */
export const NAMES = ['Alya', 'Raka', 'Dimas', 'Sari', 'Budi', 'Putri', 'Nina', 'Adit'] as const;

export const SAY_COLOR: Record<Color, string> = {
  merah: 'merah',
  biru: 'biru',
  kuning: 'kuning',
  hijau: 'hijau',
  ungu: 'ungu',
  oranye: 'oranye',
};
