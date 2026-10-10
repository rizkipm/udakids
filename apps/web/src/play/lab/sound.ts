import type { LabSound } from '@little-coder/engine';

/**
 * Bunyi lab pendengaran, dibuat di perangkat dengan Web Audio (tanpa rekaman, tanpa unduhan). Volume dibatasi
 * supaya "keras" tetap aman untuk telinga anak. Aman bila Web Audio tidak ada (jsdom / browser lama): diam saja.
 */
type Ctx = AudioContext;
let ctx: Ctx | undefined;

function audio(): Ctx | undefined {
  if (typeof window === 'undefined') return undefined;
  const Ac =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ac) return undefined;
  try {
    ctx ??= new Ac();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return undefined;
  }
}

/** Batas atas volume (0–1) supaya bunyi "keras" tidak menyakitkan. */
const MAX_GAIN = 0.32;

function tone(
  c: Ctx,
  out: AudioNode,
  at: number,
  o: {
    freq: number;
    to?: number;
    type?: OscillatorType;
    dur: number;
    gain: number;
    attack?: number;
  },
) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, at);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, at + o.dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(o.gain, at + (o.attack ?? 0.01));
  g.gain.exponentialRampToValueAtTime(0.0001, at + o.dur);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + o.dur + 0.05);
  return osc;
}

function noise(c: Ctx, out: AudioNode, at: number, dur: number, gain: number, freq: number) {
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(out);
  src.start(at);
  src.stop(at + dur + 0.05);
}

/** Lama tiap bunyi (ms), untuk animasi gelombang. */
export const SOUND_MS: Record<LabSound, number> = {
  drum: 1100,
  xilofon: 1200,
  biola: 1700,
  hujan: 1800,
  jam: 1900,
};

/** Putar bunyi; `volume` 0–1 (0,25 ≈ telinga ditutup). Mengembalikan lama bunyi dalam ms. */
export function playLabSound(id: LabSound, volume = 1): number {
  const c = audio();
  if (!c) return SOUND_MS[id];
  const out = c.createGain();
  out.gain.value = Math.max(0, Math.min(1, volume)) * MAX_GAIN;
  // Telinga ditutup: bunyi tinggi paling banyak teredam, jadi terdengar "tumpul".
  if (volume < 0.4) {
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 500;
    out.connect(lp).connect(c.destination);
  } else out.connect(c.destination);
  const t = c.currentTime + 0.02;
  switch (id) {
    case 'drum':
      for (const k of [0, 0.5]) {
        tone(c, out, t + k, { freq: 160, to: 48, dur: 0.45, gain: 1 });
        noise(c, out, t + k, 0.08, 0.5, 900);
      }
      break;
    case 'xilofon':
      [523, 659, 784, 1047].forEach((f, k) =>
        tone(c, out, t + k * 0.22, { freq: f, dur: 0.5, gain: 0.8 }),
      );
      break;
    case 'biola': {
      for (const [k, f] of [
        [0, 440],
        [0.8, 494],
      ] as const) {
        const osc = tone(c, out, t + k, {
          freq: f,
          type: 'sawtooth',
          dur: 0.85,
          gain: 0.25,
          attack: 0.18,
        });
        const lfo = c.createOscillator();
        const depth = c.createGain();
        lfo.frequency.value = 5.5;
        depth.gain.value = 6;
        lfo.connect(depth).connect(osc.frequency);
        lfo.start(t + k);
        lfo.stop(t + k + 0.9);
      }
      break;
    }
    case 'hujan':
      noise(c, out, t, 1.8, 0.35, 2500);
      for (let k = 0; k < 14; k++)
        tone(c, out, t + Math.random() * 1.6, {
          freq: 1800 + Math.random() * 1600,
          dur: 0.05,
          gain: 0.3,
        });
      break;
    case 'jam':
      for (let k = 0; k < 4; k++)
        tone(c, out, t + k * 0.45, {
          freq: k % 2 ? 900 : 1300,
          type: 'square',
          dur: 0.04,
          gain: 0.5,
        });
      break;
  }
  return SOUND_MS[id];
}
