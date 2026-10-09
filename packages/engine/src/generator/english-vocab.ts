import type { BodyPart, ObjectId, ShapeId } from './assets.js';

/**
 * Kosakata English TK (Olimpiade), D-071 — kisi-kisi: hewan, cuaca, bagian tubuh, buah & sayur; benda di kelas,
 * kamar mandi, dan benda umum; bangun datar; he/she/it & percakapan. Setiap kata punya gambar sendiri (SVG
 * UdaKids, bukan salinan lembar soal mana pun). Kata ditulis huruf kecil; kartu menampilkannya huruf besar
 * seperti lembar olimpiade.
 */
export const EN_TOPICS = [
  'animal',
  'fruit',
  'vegetable',
  'weather',
  'body',
  'classroom',
  'bathroom',
  'thing',
  'toy',
  'shape',
  'person',
  // KMSI Level A (D-074): alat transportasi.
  'transport',
] as const;
export type EnTopic = (typeof EN_TOPICS)[number];

/** Nama topik dalam English (untuk "Ketuk semua animals") dan Indonesia. */
export const EN_TOPIC_NAME: Record<EnTopic, { en: string; id: string }> = {
  animal: { en: 'animals', id: 'hewan' },
  fruit: { en: 'fruits', id: 'buah' },
  vegetable: { en: 'vegetables', id: 'sayur' },
  weather: { en: 'weather', id: 'cuaca' },
  body: { en: 'body parts', id: 'bagian tubuh' },
  classroom: { en: 'classroom things', id: 'benda di kelas' },
  bathroom: { en: 'bathroom things', id: 'benda di kamar mandi' },
  thing: { en: 'things', id: 'benda' },
  toy: { en: 'toys', id: 'mainan' },
  shape: { en: 'shapes', id: 'bangun datar' },
  person: { en: 'people', id: 'orang' },
  transport: { en: 'transportation', id: 'alat transportasi' },
};

export type EnPicture =
  | { kind: 'object'; object: ObjectId }
  | { kind: 'body'; part: BodyPart }
  | { kind: 'shape'; shape: ShapeId };

export type EnWord = {
  word: string;
  /** Arti Indonesia (pembahasan). */
  id: string;
  topic: EnTopic;
  pic: EnPicture;
  /** he/she/it untuk orang dan hewan/benda. */
  pronoun?: 'he' | 'she' | 'it';
};

const o = (object: ObjectId): EnPicture => ({ kind: 'object', object });
const w = (topic: EnTopic, list: [string, string, EnPicture][]): EnWord[] =>
  list.map(([word, id, pic]) => ({ word, id, topic, pic }));

export const EN_WORDS: EnWord[] = [
  ...w('animal', [
    ['cat', 'kucing', o('kucing')],
    ['dog', 'anjing', o('anjing')],
    ['rabbit', 'kelinci', o('kelinci')],
    ['duck', 'bebek', o('bebek')],
    ['chicken', 'ayam', o('ayam')],
    ['fish', 'ikan', o('ikan')],
    ['butterfly', 'kupu-kupu', o('kupu-kupu')],
    ['elephant', 'gajah', o('gajah')],
    ['cow', 'sapi', o('sapi')],
    ['goat', 'kambing', o('kambing')],
    ['horse', 'kuda', o('kuda')],
    ['monkey', 'monyet', o('monyet')],
    ['lion', 'singa', o('singa')],
    ['tiger', 'harimau', o('harimau')],
    ['giraffe', 'jerapah', o('jerapah')],
    ['bird', 'burung', o('burung')],
    ['turtle', 'kura-kura', o('kura-kura')],
    ['frog', 'katak', o('katak')],
    ['bee', 'lebah', o('lebah')],
    ['snail', 'siput', o('siput')],
    ['penguin', 'penguin', o('penguin')],
    ['bear', 'beruang', o('beruang')],
    ['zebra', 'zebra', o('zebra')],
    ['mouse', 'tikus', o('tikus')],
    ['snake', 'ular', o('ular')],
    ['fox', 'rubah', o('rubah')],
    ['whale', 'paus', o('paus')],
    ['shark', 'hiu', o('hiu')],
    ['octopus', 'gurita', o('gurita')],
    ['crab', 'kepiting', o('kepiting')],
    ['crocodile', 'buaya', o('buaya')],
    ['dolphin', 'lumba-lumba', o('lumba-lumba')],
  ]),
  ...w('fruit', [
    ['apple', 'apel', o('apel')],
    ['orange', 'jeruk', o('jeruk')],
    ['banana', 'pisang', o('pisang')],
    ['grapes', 'anggur', o('anggur')],
    ['watermelon', 'semangka', o('semangka')],
    ['mango', 'mangga', o('mangga')],
    ['pineapple', 'nanas', o('nanas')],
    ['strawberry', 'stroberi', o('stroberi')],
    ['cherry', 'ceri', o('ceri')],
  ]),
  ...w('vegetable', [
    ['carrot', 'wortel', o('wortel')],
    ['tomato', 'tomat', o('tomat')],
    ['corn', 'jagung', o('jagung')],
    ['broccoli', 'brokoli', o('brokoli')],
    ['onion', 'bawang', o('bawang')],
    ['potato', 'kentang', o('kentang')],
  ]),
  ...w('weather', [
    ['sunny', 'cerah', o('matahari')],
    ['cloudy', 'berawan', o('awan')],
    ['rainy', 'hujan', o('hujan')],
    ['snowy', 'bersalju', o('salju')],
    ['windy', 'berangin', o('angin')],
    ['stormy', 'badai', o('petir')],
  ]),
  ...w('body', [
    ['head', 'kepala', { kind: 'body', part: 'kepala' }],
    ['hair', 'rambut', { kind: 'body', part: 'rambut' }],
    ['eye', 'mata', { kind: 'body', part: 'mata' }],
    ['ear', 'telinga', { kind: 'body', part: 'telinga' }],
    ['nose', 'hidung', { kind: 'body', part: 'hidung' }],
    ['mouth', 'mulut', { kind: 'body', part: 'mulut' }],
    ['hand', 'tangan', { kind: 'body', part: 'tangan' }],
    ['tummy', 'perut', { kind: 'body', part: 'perut' }],
    ['leg', 'kaki', { kind: 'body', part: 'kaki' }],
  ]),
  ...w('classroom', [
    ['pencil', 'pensil', o('pensil')],
    ['book', 'buku', o('buku')],
    ['table', 'meja', o('meja')],
    ['chair', 'kursi', o('kursi')],
    ['bag', 'tas', o('tas')],
    ['eraser', 'penghapus', o('penghapus')],
    ['ruler', 'penggaris', o('penggaris')],
    ['scissors', 'gunting', o('gunting')],
    ['crayon', 'krayon', o('krayon')],
    ['board', 'papan tulis', o('papan-tulis')],
    ['clock', 'jam dinding', o('jam-dinding')],
    ['door', 'pintu', o('pintu')],
    ['window', 'jendela', o('jendela')],
    ['bin', 'tempat sampah', o('tempat-sampah')],
  ]),
  ...w('bathroom', [
    ['toothbrush', 'sikat gigi', o('sikat-gigi')],
    ['toothpaste', 'pasta gigi', o('pasta-gigi')],
    ['soap', 'sabun', o('sabun')],
    ['towel', 'handuk', o('handuk')],
    ['comb', 'sisir', o('sisir')],
    ['mirror', 'cermin', o('cermin')],
    ['toilet', 'kloset', o('kloset')],
    ['tap', 'keran', o('keran')],
    ['bucket', 'ember', o('ember')],
  ]),
  ...w('thing', [
    ['umbrella', 'payung', o('payung')],
    ['cup', 'cangkir', o('cangkir')],
    ['glass', 'gelas', o('gelas')],
    ['spoon', 'sendok', o('sendok')],
    ['plate', 'piring', o('piring')],
    ['bottle', 'botol', o('botol')],
    ['key', 'kunci', o('kunci')],
    ['hat', 'topi', o('topi')],
    ['bed', 'tempat tidur', o('ranjang')],
    ['box', 'kotak', o('kotak')],
    ['candle', 'lilin', o('lilin')],
    ['house', 'rumah', o('rumah')],
    ['tree', 'pohon', o('pohon')],
    ['flower', 'bunga', o('bunga')],
    ['broom', 'sapu', o('sapu')],
  ]),
  ...w('toy', [
    ['ball', 'bola', o('bola')],
    ['balloon', 'balon', o('balon')],
    ['kite', 'layang-layang', o('layang-layang')],
    ['car', 'mobil', o('mobil')],
    ['doll', 'boneka', o('boneka')],
    ['robot', 'robot', o('robot')],
    ['teddy bear', 'boneka beruang', o('boneka-beruang')],
    ['train', 'kereta', o('kereta')],
    ['plane', 'pesawat', o('pesawat')],
    ['boat', 'perahu', o('perahu')],
    ['drum', 'drum', o('drum')],
    ['yo-yo', 'yoyo', o('yoyo')],
    ['bicycle', 'sepeda', o('sepeda')],
  ]),
  ...w('shape', [
    ['circle', 'lingkaran', { kind: 'shape', shape: 'lingkaran' }],
    ['triangle', 'segitiga', { kind: 'shape', shape: 'segitiga' }],
    ['square', 'persegi', { kind: 'shape', shape: 'persegi' }],
    ['rectangle', 'persegi panjang', { kind: 'shape', shape: 'persegi-panjang' }],
    ['pentagon', 'segi lima', { kind: 'shape', shape: 'segi-lima' }],
    ['hexagon', 'segi enam', { kind: 'shape', shape: 'segi-enam' }],
    ['diamond', 'belah ketupat', { kind: 'shape', shape: 'belah-ketupat' }],
    ['star', 'bintang', o('bintang')],
  ]),
  // KMSI Level A (D-074). Tidak ikut mode "kelompokkan" dan soal hitung (train/plane/boat/bicycle juga mainan).
  ...w('transport', [
    ['car', 'mobil', o('mobil')],
    ['bus', 'bus', o('bus')],
    ['motorcycle', 'sepeda motor', o('motor')],
    ['truck', 'truk', o('truk')],
    ['bicycle', 'sepeda', o('sepeda')],
    ['train', 'kereta', o('kereta')],
    ['plane', 'pesawat', o('pesawat')],
    ['helicopter', 'helikopter', o('helikopter')],
    ['ship', 'kapal', o('kapal')],
    ['boat', 'perahu', o('perahu')],
  ]),
  ...[
    ['boy', 'anak laki-laki', 'anak-laki-laki', 'he'],
    ['girl', 'anak perempuan', 'anak-perempuan', 'she'],
    ['father', 'ayah', 'ayah', 'he'],
    ['mother', 'ibu', 'ibu', 'she'],
    ['grandfather', 'kakek', 'kakek', 'he'],
    ['grandmother', 'nenek', 'nenek', 'she'],
  ].map(([word, id, object, pronoun]): EnWord => ({
    word: word!,
    id: id!,
    topic: 'person',
    pic: o(object as ObjectId),
    pronoun: pronoun as 'he' | 'she',
  })),
];

export const enWordsOf = (topics: readonly EnTopic[]) =>
  EN_WORDS.filter((x) => topics.includes(x.topic));

export const EN_NUMBERS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
] as const;

/** "a" / "an" sebelum kata benda tunggal. */
export const article = (word: string) => (/^[aeiou]/.test(word) ? 'an' : 'a');

/** Kalimat contoh per topik untuk soal "pilih gambar" (gaya "I like my fish"). */
export function enSentence(x: EnWord): string {
  switch (x.topic) {
    case 'toy':
    case 'animal':
      return `I like my ${x.word}.`;
    case 'fruit':
    case 'vegetable':
      return x.word === 'grapes' ? 'I like grapes.' : `I eat ${article(x.word)} ${x.word}.`;
    case 'weather':
      return `It is ${x.word} today.`;
    case 'transport':
      return `I go by ${x.word}.`;
    case 'body':
      return `This is my ${x.word}.`;
    case 'shape':
      return `This is ${article(x.word)} ${x.word}.`;
    case 'person':
      return x.word === 'boy' || x.word === 'girl'
        ? `This is a ${x.word}.`
        : `This is my ${x.word}.`;
    default:
      return x.word === 'scissors'
        ? 'These are scissors.'
        : `This is ${article(x.word)} ${x.word}.`;
  }
}
