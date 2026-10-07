import {
  contestPhase,
  type ContestPhase,
  type Interaction,
  type Item,
  type PublicItem,
} from '@little-coder/engine';

/**
 * Soal lomba (tanpa kunci) → bentuk `Item` agar bisa ditampilkan `ItemPlayer` dalam mode "kirim saja".
 * Kolom kunci diisi nilai kosong yang tidak pernah dipakai (perangkat tidak memeriksa jawaban).
 */
export function toPlayable(p: PublicItem, index: number): Item {
  const it = p.interaction;
  let interaction: Interaction;
  switch (it.type) {
    case 'pick-one':
      interaction = { ...it, answer: '' };
      break;
    case 'tap-all':
    case 'order':
      interaction = { ...it, answer: [] };
      break;
    case 'group':
    case 'match':
      interaction = { ...it, answer: {} };
      break;
    case 'build':
      interaction = it;
      break;
    case 'number-line':
    case 'number-input':
      interaction = { ...it, answer: Number.NaN };
      break;
    case 'trace':
      interaction = it;
      break;
    case 'connect':
    case 'spell':
      interaction = { ...it, answer: [] };
      break;
    case 'maze':
      interaction = it;
      break;
    case 'word-search':
      // Letak kata tidak dikirim saat lomba; papan mencocokkan dari huruf di kotak.
      interaction = { ...it, words: it.words.map((w) => ({ ...w, cells: [] })) };
      break;
  }
  return {
    prompt: p.prompt,
    ...(p.say !== undefined && { say: p.say }),
    stimulus: p.stimulus,
    interaction,
    reteach: { say: '' },
    skillId: 'contest',
    version: 1,
    seed: index,
    band: 0,
  };
}

/** Fase lomba menurut jam server (ms). */
export const phaseAt = (c: { startsAt: string; endsAt: string }, serverNow: number): ContestPhase =>
  contestPhase(c, new Date(serverNow));

/** Soal berikutnya yang belum dijawab setelah `from` (berputar); -1 bila semua sudah dijawab. */
export function nextUnanswered(total: number, answered: ReadonlySet<number>, from: number): number {
  for (let k = 1; k <= total; k++) {
    const i = (from + k) % total;
    if (!answered.has(i)) return i;
  }
  return -1;
}
