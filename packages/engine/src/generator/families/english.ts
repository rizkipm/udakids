import { z } from 'zod';
import { COLORS, NAMES, OBJECTS, type Color } from '../assets.js';
import {
  article,
  EN_NUMBERS,
  EN_TOPIC_NAME,
  EN_TOPICS,
  EN_WORDS,
  enSentence,
  enWordsOf,
  type EnPicture,
  type EnTopic,
  type EnWord,
} from '../english-vocab.js';
import type { Choice, Interaction, ItemCore, Visual } from '../item.js';
import type { Rng } from '../rng.js';
import { between, defineFamily, range, reject } from './common.js';

/**
 * English TK Olimpiade (D-071). Soal DIBUAT dari kosakata (bukan bank soal tetap), sehingga setiap ronde berbeda:
 * pilih nama gambar, pilih gambar dari kalimat ("I like my fish."), dengar lalu pilih, lengkapi huruf, kelompokkan,
 * hitung lalu pilih kata bilangan, he/she/it, dan percakapan sehari-hari. Perintah berbahasa Indonesia, kata target
 * English; kartu kata ditulis huruf besar seperti lembar olimpiade.
 */

const UP = (s: string) => s.toUpperCase();
const EN_COLOR: Record<Color, string> = {
  merah: 'red',
  biru: 'blue',
  kuning: 'yellow',
  hijau: 'green',
  ungu: 'purple',
  oranye: 'orange',
};

/** Gambar satu kata. Bangun datar diberi warna acak (bentuk yang dinilai, bukan warnanya). */
export function enPicture(p: EnPicture, rng?: Rng): Visual {
  if (p.kind === 'object') return { kind: 'object', object: p.object };
  if (p.kind === 'body') return { kind: 'body', part: p.part };
  return { kind: 'shape', shape: p.shape, color: rng ? rng.pick(COLORS) : 'biru', size: 'm' };
}

const sameThing = (a: EnWord, b: EnWord) =>
  JSON.stringify(a.pic) === JSON.stringify(b.pic) || a.word === b.word;

/** Pengecoh: utamakan topik yang sama (lebih menantang), lalu topik lain. `similar` = huruf awal/panjang mirip. */
function distractors(
  rng: Rng,
  target: EnWord,
  pool: readonly EnWord[],
  k: number,
  similar = false,
) {
  const others = (list: readonly EnWord[]) => list.filter((x) => !sameThing(x, target));
  let cands = others(pool.filter((x) => x.topic === target.topic));
  if (similar) {
    const close = cands.filter(
      (x) => x.word[0] === target.word[0] || Math.abs(x.word.length - target.word.length) <= 1,
    );
    if (close.length >= k) cands = close;
  }
  const picked = rng.sample(cands, Math.min(k, cands.length));
  if (picked.length < k) {
    const rest = others(EN_WORDS.filter((x) => x.topic === target.topic && !picked.includes(x)));
    picked.push(...rng.sample(rest, Math.min(k - picked.length, rest.length)));
  }
  if (picked.length < k) reject('kosakata topik ini kurang untuk pengecoh');
  return picked;
}

const choiceOf = (id: string, visual: Visual, say?: string): Choice => ({
  id,
  visual,
  ...(say && { say }),
});

const wordCard = (x: EnWord, i: number) =>
  choiceOf(`w${i}`, { kind: 'word', text: UP(x.word) }, x.word);

const reteachOf = (x: EnWord, rng?: Rng) => ({
  say: `${UP(x.word[0]!)}${x.word.slice(1)} artinya ${x.id}.`,
  show: [enPicture(x.pic, rng), { kind: 'word', text: UP(x.word) } as Visual],
});

const NAME_PROMPT: Partial<Record<EnTopic, string>> = {
  animal: 'Lingkari nama hewan yang benar.',
  fruit: 'Silang nama buah yang tepat sesuai gambar.',
  vegetable: 'Silang nama sayur yang tepat sesuai gambar.',
  weather: 'Cuaca apa ini? Pilih kata yang benar.',
  body: 'Bagian tubuh yang ditunjuk namanya apa?',
  shape: 'Bangun datar apa ini? Pilih namanya.',
  transport: 'Kendaraan apa ini? Pilih namanya.',
};

export const englishWord = defineFamily({
  description:
    'English TK Olimpiade: kosakata bergambar (pilih nama, pilih gambar dari kalimat, dengar, lengkapi huruf, kelompokkan).',
  params: z.strictObject({
    topics: z.array(z.enum(EN_TOPICS)).min(1).default(['animal']),
    mode: z
      .enum(['pick-word', 'pick-picture', 'listen', 'spell', 'sort', 'tap-same'])
      .default('pick-word'),
    choices: z.number().int().min(2).max(4).default(3),
    /** Banyak huruf yang hilang (mode spell). */
    blanks: range(1, 4).default([1, 1]),
    /** Pengecoh mirip (huruf awal / panjang kata sama). */
    similar: z.boolean().default(false),
  }),
  generate(p, rng): ItemCore {
    const pool = enWordsOf(p.topics);
    if (pool.length < 2) reject('kosakata kurang');
    switch (p.mode) {
      case 'pick-word': {
        const target = rng.pick(pool);
        const opts = rng.shuffle([
          target,
          ...distractors(rng, target, pool, p.choices - 1, p.similar),
        ]);
        const choices = opts.map(wordCard);
        return {
          prompt: NAME_PROMPT[target.topic] ?? 'Pilih nama yang tepat untuk gambar ini.',
          say: 'Lihat gambarnya. Apa namanya dalam bahasa Inggris? Pilih kartunya.',
          stimulus: [enPicture(target.pic, rng)],
          interaction: { type: 'pick-one', choices, answer: `w${opts.indexOf(target)}` },
          reteach: reteachOf(target, rng),
        };
      }
      case 'pick-picture':
      case 'listen': {
        const target = rng.pick(pool);
        const opts = rng.shuffle([
          target,
          ...distractors(rng, target, pool, p.choices - 1, p.similar),
        ]);
        const choices = opts.map((x, i) => choiceOf(`p${i}`, enPicture(x.pic, rng)));
        const sentence = enSentence(target);
        return p.mode === 'listen'
          ? {
              prompt: 'Dengarkan, lalu ketuk gambarnya.',
              say: `Dengarkan. ${target.word}. ${target.word}. Ketuk gambarnya.`,
              stimulus: [],
              interaction: { type: 'pick-one', choices, answer: `p${opts.indexOf(target)}` },
              reteach: reteachOf(target, rng),
            }
          : {
              prompt: 'Lingkari gambar yang sesuai dengan kalimat ini.',
              say: `${sentence} Pilih gambar yang sesuai.`,
              stimulus: [{ kind: 'text', text: sentence }],
              interaction: { type: 'pick-one', choices, answer: `p${opts.indexOf(target)}` },
              reteach: reteachOf(target, rng),
            };
      }
      case 'spell': {
        const words = pool.filter((x) => /^[a-z]{3,9}$/.test(x.word));
        if (words.length === 0) reject('tidak ada kata untuk dieja');
        const target = rng.pick(words);
        const letters = [...target.word];
        const k = Math.min(between(rng, p.blanks), letters.length - 2);
        // Huruf pertama selalu tampil (seperti lembar "D _ _"); huruf yang hilang harus berbeda semua.
        const spots = rng
          .sample(
            letters.map((_, i) => i).filter((i) => i > 0),
            k,
          )
          .sort((a, b) => a - b);
        const missing = spots.map((i) => letters[i]!);
        if (new Set(missing).size !== missing.length) reject('huruf hilang kembar');
        const shown = letters.map((l, i) => (spots.includes(i) ? '' : l));
        const stimulus: Visual[] = [
          enPicture(target.pic, rng),
          { kind: 'letters', letters: shown },
        ];
        let interaction: Interaction;
        if (k === 1) {
          const alphabet = [...'abcdefghijklmnoprstuwy'].filter((l) => l !== missing[0]);
          const opts = rng.shuffle([missing[0]!, ...rng.sample(alphabet, 3)]);
          interaction = {
            type: 'pick-one',
            choices: opts.map((l, i) => choiceOf(`l${i}`, { kind: 'word', text: UP(l) })),
            answer: `l${opts.indexOf(missing[0]!)}`,
          };
        } else {
          let order = rng.shuffle(missing);
          if (order.every((l, i) => l === missing[i])) order = [...order.slice(1), order[0]!];
          interaction = {
            type: 'order',
            choices: order.map((l) => choiceOf(`l-${l}`, { kind: 'word', text: UP(l) })),
            answer: missing.map((l) => `l-${l}`),
          };
        }
        return {
          prompt:
            k === 1
              ? 'Lengkapi nama gambar ini. Huruf apa yang hilang?'
              : 'Lengkapi nama gambar ini. Ketuk huruf yang hilang berurutan.',
          say:
            k === 1
              ? 'Lengkapi nama gambar ini dalam bahasa Inggris. Huruf apa yang hilang?'
              : 'Lengkapi nama gambar ini. Ketuk huruf yang hilang dari kiri ke kanan.',
          stimulus,
          interaction,
          reteach: {
            say: `${UP(target.word[0]!)}${target.word.slice(1)} dieja ${letters.map(UP).join(', ')}. Artinya ${target.id}.`,
            show: [{ kind: 'letters', letters }],
          },
        };
      }
      case 'sort': {
        const topics = [...new Set(pool.map((x) => x.topic))].filter(
          (t) => t !== 'body' && t !== 'shape' && t !== 'weather' && t !== 'transport',
        );
        if (topics.length === 0) reject('topik tidak bisa dikelompokkan');
        const topic = rng.pick(topics);
        const inTopic = EN_WORDS.filter((x) => x.topic === topic);
        const outTopic = EN_WORDS.filter(
          (x) =>
            x.topic !== topic &&
            x.pic.kind === 'object' &&
            x.topic !== 'person' &&
            x.topic !== 'transport',
        );
        const yes = rng.sample(inTopic, rng.int(2, 3));
        const no = rng
          .sample(outTopic, 6 - yes.length)
          .filter((x, i, a) => a.findIndex((y) => sameThing(x, y)) === i);
        const all = rng.shuffle([...yes, ...no]);
        const name = EN_TOPIC_NAME[topic];
        return {
          prompt: `Ketuk semua ${name.en} (${name.id}), lalu tekan Periksa.`,
          say: `Ketuk semua ${name.en}. ${name.en} artinya ${name.id}.`,
          stimulus: [],
          interaction: {
            type: 'tap-all',
            choices: all.map((x, i) => choiceOf(`s${i}`, enPicture(x.pic, rng), x.word)),
            answer: all.flatMap((x, i) => (yes.includes(x) ? [`s${i}`] : [])),
          },
          reteach: {
            say: `${UP(name.en[0]!)}${name.en.slice(1)} artinya ${name.id}: ${yes.map((x) => x.word).join(', ')}.`,
          },
        };
      }
      case 'tap-same': {
        const shapes = pool.filter((x) => x.pic.kind === 'shape');
        if (shapes.length < 3) reject('butuh bangun datar');
        const target = rng.pick(shapes);
        const hits = rng.int(2, 3);
        const others = rng.sample(
          shapes.filter((x) => x !== target),
          6 - hits,
        );
        const all = rng.shuffle([...Array.from({ length: hits }, () => target), ...others]);
        const plural = target.word === 'diamond' ? 'diamonds' : `${target.word}s`;
        return {
          prompt: `Ketuk semua ${plural}, lalu tekan Periksa.`,
          say: `Ketuk semua ${plural}.`,
          stimulus: [],
          interaction: {
            type: 'tap-all',
            choices: all.map((x, i) => choiceOf(`h${i}`, enPicture(x.pic, rng))),
            answer: all.flatMap((x, i) => (x === target ? [`h${i}`] : [])),
          },
          reteach: reteachOf(target, rng),
        };
      }
    }
  },
});

// ------------------------------------------------------------------ angka & kata bilangan

const COUNT_NOUNS = EN_WORDS.filter(
  (x) =>
    x.pic.kind === 'object' &&
    OBJECTS[x.pic.object].countable &&
    x.word !== 'grapes' &&
    x.topic !== 'transport',
);
const IRREGULAR: Record<string, string> = {
  fish: 'fish',
  mouse: 'mice',
  butterfly: 'butterflies',
  cherry: 'cherries',
  strawberry: 'strawberries',
  tomato: 'tomatoes',
  potato: 'potatoes',
  bus: 'buses',
  box: 'boxes',
  glass: 'glasses',
};
export const plural = (word: string, n: number) =>
  n === 1 ? word : (IRREGULAR[word] ?? `${word}s`);

export const englishCount = defineFamily({
  description:
    'English TK Olimpiade: hitung benda lalu pilih kata bilangan (one … twenty), atau sebaliknya.',
  params: z.strictObject({
    mode: z
      .enum(['count-word', 'word-picture', 'numeral-word', 'spell-number'])
      .default('count-word'),
    range: range(1, 20).default([1, 10]),
    choices: z.number().int().min(2).max(4).default(2),
  }),
  generate(p, rng): ItemCore {
    const n = between(rng, p.range);
    const near = (k: number) => {
      const out = new Set<number>([n]);
      for (let guard = 0; out.size < k && guard < 50; guard++) {
        const d = rng.pick([-2, -1, 1, 2, 3]);
        const v = n + d;
        if (v >= 1 && v <= 20) out.add(v);
      }
      if (out.size < k) reject('angka pengecoh kurang');
      return rng.shuffle([...out]);
    };
    const reteach = {
      say: `${UP(EN_NUMBERS[n]![0]!)}${EN_NUMBERS[n]!.slice(1)} artinya ${n}.`,
      show: [{ kind: 'numeral', value: n } as Visual],
    };
    const noun = rng.pick(COUNT_NOUNS);
    const object =
      noun.pic.kind === 'object' ? noun.pic.object : reject('benda tidak bisa dihitung');
    const group = (k: number): Visual => ({
      kind: 'objects',
      object,
      count: k,
      layout: k <= 5 ? 'row' : 'rows',
    });
    switch (p.mode) {
      case 'count-word':
      case 'numeral-word': {
        const opts = near(p.choices);
        return {
          prompt:
            p.mode === 'count-word'
              ? 'Hitung dan lingkari jumlah yang benar.'
              : 'Pilih kata bilangan untuk angka ini.',
          say:
            p.mode === 'count-word'
              ? `Hitung ${OBJECTS[object].say}nya. Berapa banyak? Pilih kata bilangannya.`
              : 'Angka berapa ini dalam bahasa Inggris? Pilih kartunya.',
          stimulus: [p.mode === 'count-word' ? group(n) : { kind: 'numeral', value: n }],
          interaction: {
            type: 'pick-one',
            choices: opts.map((v, i) =>
              choiceOf(`n${i}`, { kind: 'word', text: UP(EN_NUMBERS[v]!) }, EN_NUMBERS[v]),
            ),
            answer: `n${opts.indexOf(n)}`,
          },
          reteach,
        };
      }
      case 'word-picture': {
        const opts = near(Math.max(3, p.choices));
        const phrase = `${EN_NUMBERS[n]} ${plural(noun.word, n)}`;
        return {
          prompt: 'Lingkari gambar yang sesuai dengan tulisan ini.',
          say: `Cari gambar ${phrase}.`,
          stimulus: [{ kind: 'word', text: UP(phrase) }],
          interaction: {
            type: 'pick-one',
            choices: opts.map((v, i) => choiceOf(`g${i}`, group(v))),
            answer: `g${opts.indexOf(n)}`,
          },
          reteach,
        };
      }
      case 'spell-number': {
        const word = EN_NUMBERS[n]!;
        const letters = [...word];
        const spots = letters.map((_, i) => i).filter((i) => i > 0);
        const at = rng.pick(spots);
        const missing = letters[at]!;
        const alphabet = [...'abcdefghilnorstuvwx'].filter((l) => l !== missing);
        const opts = rng.shuffle([missing, ...rng.sample(alphabet, 3)]);
        return {
          prompt: 'Lengkapi kata bilangan untuk angka ini. Huruf apa yang hilang?',
          say: 'Lengkapi kata bilangannya. Huruf apa yang hilang?',
          stimulus: [
            { kind: 'numeral', value: n },
            { kind: 'letters', letters: letters.map((l, i) => (i === at ? '' : l)) },
          ],
          interaction: {
            type: 'pick-one',
            choices: opts.map((l, i) => choiceOf(`l${i}`, { kind: 'word', text: UP(l) })),
            answer: `l${opts.indexOf(missing)}`,
          },
          reteach: { ...reteach, show: [{ kind: 'letters', letters }] },
        };
      }
    }
  },
});

// ------------------------------------------------------------------ he / she / it

const PEOPLE = EN_WORDS.filter((x) => x.topic === 'person');
const IT_WORDS = EN_WORDS.filter(
  (x) =>
    (x.topic === 'animal' || x.topic === 'toy' || x.topic === 'thing') && x.pic.kind === 'object',
);
const pronounOf = (x: EnWord): 'he' | 'she' | 'it' => x.pronoun ?? 'it';

function pronounSentence(rng: Rng, x: EnWord): string {
  const p = pronounOf(x);
  const P = `${UP(p[0]!)}${p.slice(1)}`;
  if (p === 'it') {
    const t = rng.pick([
      `${P} is ${article(x.word)} ${x.word}.`,
      `${P} is cute.`,
      `${P} is big.`,
      `${P} is new.`,
    ]);
    return x.topic === 'animal' && t.endsWith('new.') ? `${P} is cute.` : t;
  }
  const family = x.word !== 'boy' && x.word !== 'girl';
  return rng.pick([
    family ? `${P} is my ${x.word}.` : `${P} is ${article(x.word)} ${x.word}.`,
    `${P} is happy.`,
    `${P} is kind.`,
    `${P} is smiling.`,
  ]);
}

export const englishPronoun = defineFamily({
  description:
    'English TK Olimpiade: he, she, it — isi kata ganti dari gambar, atau pilih gambar dari kalimat.',
  params: z.strictObject({
    mode: z.enum(['fill', 'pick', 'listen']).default('fill'),
    /** `people` = he/she saja; `mixed` = he/she/it. */
    pool: z.enum(['people', 'mixed']).default('mixed'),
  }),
  generate(p, rng): ItemCore {
    const subjects = p.pool === 'people' ? PEOPLE : [...PEOPLE, ...PEOPLE, ...IT_WORDS];
    const x = rng.pick(subjects);
    const pron = pronounOf(x);
    const sentence = pronounSentence(rng, x);
    const reteach = {
      say:
        pron === 'he'
          ? 'He untuk laki-laki: boy, father, grandfather.'
          : pron === 'she'
            ? 'She untuk perempuan: girl, mother, grandmother.'
            : 'It untuk hewan dan benda.',
      show: [enPicture(x.pic)],
    };
    if (p.mode === 'fill') {
      const opts =
        p.pool === 'people' ? rng.shuffle(['he', 'she']) : rng.shuffle(['he', 'she', 'it']);
      const blanked = sentence.replace(/^(He|She|It)\b/, '___');
      return {
        prompt: 'Lengkapi kalimat untuk gambar ini: he, she, atau it?',
        say: 'Lihat gambarnya. Pilih kata yang tepat: he, she, atau it?',
        stimulus: [enPicture(x.pic), { kind: 'text', text: blanked }],
        interaction: {
          type: 'pick-one',
          choices: opts.map((w, i) => choiceOf(`k${i}`, { kind: 'word', text: UP(w) }, w)),
          answer: `k${opts.indexOf(pron)}`,
        },
        reteach,
      };
    }
    // pick / listen: kalimat tanpa nama bendanya; tepat satu gambar yang cocok dengan kata gantinya.
    const said =
      pron === 'it'
        ? x.topic === 'animal'
          ? 'It is cute.'
          : 'It is new.'
        : `${pron === 'he' ? 'He' : 'She'} is ${rng.pick(['happy', 'kind', 'smiling'])}.`;
    const pools =
      pron === 'it'
        ? [PEOPLE.filter((y) => y.pronoun === 'he'), PEOPLE.filter((y) => y.pronoun === 'she')]
        : p.pool === 'people'
          ? [PEOPLE.filter((y) => y.pronoun !== pron), PEOPLE.filter((y) => y.pronoun !== pron)]
          : [PEOPLE.filter((y) => y.pronoun !== pron), IT_WORDS];
    const first = rng.pick(pools[0]!);
    const second = rng.pick(pools[1]!.filter((y) => y !== first));
    const opts = rng.shuffle([x, first, second]);
    return {
      prompt:
        p.mode === 'listen'
          ? 'Dengarkan kalimatnya, lalu ketuk gambar yang cocok.'
          : 'Lingkari gambar yang cocok dengan kalimat ini.',
      say:
        p.mode === 'listen'
          ? `Dengarkan. ${said} Ketuk gambarnya.`
          : `${said} Pilih gambar yang cocok.`,
      stimulus: p.mode === 'listen' ? [] : [{ kind: 'text', text: said }],
      interaction: {
        type: 'pick-one',
        choices: opts.map((y, i) => choiceOf(`g${i}`, enPicture(y.pic))),
        answer: `g${opts.indexOf(x)}`,
      },
      reteach,
    };
  },
});

// ------------------------------------------------------------------ percakapan sehari-hari

const CITIES = ['Jakarta', 'Bandung', 'Medan', 'Makassar', 'Surabaya', 'Bali', 'Yogyakarta'];
type Talk = { line: string; reply: (rng: Rng) => string };
const TALKS: Talk[] = [
  { line: 'Good morning!', reply: () => 'Good morning!' },
  { line: 'How are you?', reply: () => 'I am fine, thank you.' },
  { line: 'What is your name?', reply: (r) => `My name is ${r.pick(NAMES)}.` },
  { line: 'How old are you?', reply: (r) => `I am ${EN_NUMBERS[r.int(4, 7)]} years old.` },
  { line: 'Thank you!', reply: () => 'You are welcome.' },
  { line: 'Nice to meet you.', reply: () => 'Nice to meet you too.' },
  { line: 'I am sorry.', reply: () => 'That is OK.' },
  { line: 'Happy birthday!', reply: () => 'Thank you very much!' },
  { line: 'Goodbye!', reply: () => 'Goodbye! See you tomorrow.' },
  { line: 'May I come in?', reply: () => 'Yes, please come in.' },
  { line: 'Where do you live?', reply: (r) => `I live in ${r.pick(CITIES)}.` },
  { line: 'Good night!', reply: () => 'Good night! Sleep well.' },
  { line: 'Can I borrow your pencil?', reply: () => 'Sure, here you are.' },
  { line: 'Do you like apples?', reply: () => 'Yes, I do.' },
  {
    line: 'What is your favourite colour?',
    reply: (r) => `My favourite colour is ${EN_COLOR[r.pick(COLORS)]}.`,
  },
  { line: "Let's play together!", reply: () => "OK, let's play!" },
  { line: 'Can you help me?', reply: () => 'Yes, of course.' },
  { line: 'Good afternoon, teacher!', reply: () => 'Good afternoon!' },
];
const GREETS: { object: (typeof EN_WORDS)[number]['pic']; say: string; line: string }[] = [
  {
    object: { kind: 'object', object: 'matahari' },
    say: 'Pagi hari, matahari terbit.',
    line: 'Good morning!',
  },
  {
    object: { kind: 'object', object: 'bulan' },
    say: 'Malam hari, saatnya tidur.',
    line: 'Good night!',
  },
  {
    object: { kind: 'object', object: 'topi-ulang-tahun' },
    say: 'Temanmu berulang tahun.',
    line: 'Happy birthday!',
  },
  { object: { kind: 'object', object: 'kado' }, say: 'Kamu diberi hadiah.', line: 'Thank you!' },
  {
    object: { kind: 'object', object: 'anak-tidur' },
    say: 'Adikmu mau tidur.',
    line: 'Good night!',
  },
  {
    object: { kind: 'object', object: 'kue' },
    say: 'Ada kue ulang tahun untuk temanmu.',
    line: 'Happy birthday!',
  },
  {
    object: { kind: 'object', object: 'pintu' },
    say: 'Kamu mau masuk ke kelas.',
    line: 'May I come in?',
  },
  {
    object: { kind: 'object', object: 'payung' },
    say: 'Temanmu meminjamkan payung.',
    line: 'Thank you!',
  },
];
const COLOUR_OBJECTS = ['bola', 'balon', 'topi', 'mobil', 'tas', 'payung'] as const;

export const englishTalk = defineFamily({
  description:
    'English TK Olimpiade: percakapan sehari-hari (jawaban yang tepat, sapaan, What is this?, warna).',
  params: z.strictObject({
    mode: z.enum(['reply', 'greet', 'whatis', 'colour']).default('reply'),
    choices: z.number().int().min(2).max(4).default(3),
    /** Topik gambar untuk mode whatis. */
    topics: z.array(z.enum(EN_TOPICS)).min(1).default(['animal', 'toy', 'classroom']),
  }),
  generate(p, rng): ItemCore {
    const cards = (opts: string[], right: string, prefix: string) => ({
      type: 'pick-one' as const,
      choices: opts.map((t, i) => choiceOf(`${prefix}${i}`, { kind: 'text', text: t }, t)),
      answer: `${prefix}${opts.indexOf(right)}`,
    });
    switch (p.mode) {
      case 'reply': {
        const talk = rng.pick(TALKS);
        const right = talk.reply(rng);
        const wrong = rng
          .sample(
            TALKS.filter((t) => t !== talk),
            p.choices - 1,
          )
          .map((t) => t.reply(rng))
          .filter((t) => t !== right);
        if (wrong.length < p.choices - 1) reject('jawaban kembar');
        const opts = rng.shuffle([right, ...wrong]);
        return {
          prompt: 'Temanmu berkata begini. Pilih jawaban yang tepat.',
          say: `Temanmu berkata, ${talk.line} Jawaban yang tepat adalah?`,
          stimulus: [{ kind: 'text', text: `“${talk.line}”` }],
          interaction: cards(opts, right, 'r'),
          reteach: { say: `Kalau ada yang berkata ${talk.line}, kita jawab: ${right}` },
        };
      }
      case 'greet': {
        const g = rng.pick(GREETS);
        const lines = [...new Set(GREETS.map((x) => x.line))].filter((l) => l !== g.line);
        const wrong = rng.sample(lines, Math.min(p.choices - 1, lines.length));
        const opts = rng.shuffle([g.line, ...wrong]);
        return {
          prompt: `${g.say} Apa yang kamu ucapkan?`,
          say: `${g.say} Apa yang kamu ucapkan dalam bahasa Inggris?`,
          stimulus: [enPicture(g.object)],
          interaction: cards(opts, g.line, 'g'),
          reteach: { say: `${g.say} Kita bilang: ${g.line}` },
        };
      }
      case 'whatis': {
        const pool = enWordsOf(p.topics).filter(
          (x) => x.word !== 'scissors' && x.word !== 'grapes',
        );
        const target = rng.pick(pool);
        const sentence = (x: EnWord) => `It is ${article(x.word)} ${x.word}.`;
        const opts = rng
          .shuffle([target, ...distractors(rng, target, pool, p.choices - 1)])
          .map(sentence);
        return {
          prompt: 'What is this? Pilih jawaban yang tepat.',
          say: 'What is this? Pilih jawaban yang tepat.',
          stimulus: [enPicture(target.pic, rng)],
          interaction: cards(opts, sentence(target), 'w'),
          reteach: reteachOf(target, rng),
        };
      }
      case 'colour': {
        const object = rng.pick(COLOUR_OBJECTS);
        const color = rng.pick(COLORS);
        const right = `It is ${EN_COLOR[color]}.`;
        const wrong = rng
          .sample(
            COLORS.filter((c) => c !== color),
            p.choices - 1,
          )
          .map((c) => `It is ${EN_COLOR[c]}.`);
        const opts = rng.shuffle([right, ...wrong]);
        return {
          prompt: 'What colour is it? Pilih jawaban yang tepat.',
          say: 'What colour is it? Pilih jawaban yang tepat.',
          stimulus: [{ kind: 'object', object, color }],
          interaction: cards(opts, right, 'c'),
          reteach: {
            say: `${UP(EN_COLOR[color][0]!)}${EN_COLOR[color].slice(1)} artinya ${color}.`,
          },
        };
      }
    }
  },
});
