import type { Visual } from '@little-coder/engine';

/** Jenis visual yang bisa dipilih lewat form (sisanya lewat JSON). */
export const PICKER_KINDS = [
  'object',
  'objects',
  'numeral',
  'dots',
  'shape',
  'solid',
  'coin',
  'word',
  'cubes',
  'frame',
  'equation',
  'swatch',
  'yesno',
] as const;
export type PickerKind = (typeof PICKER_KINDS)[number];

export const isPickerKind = (k: string): k is PickerKind =>
  (PICKER_KINDS as readonly string[]).includes(k);

/** Visual awal yang valid untuk setiap jenis. */
export function defaultVisual(kind: PickerKind): Visual {
  switch (kind) {
    case 'object':
      return { kind: 'object', object: 'apel' };
    case 'objects':
      return { kind: 'objects', object: 'apel', count: 3, layout: 'row' };
    case 'numeral':
      return { kind: 'numeral', value: 1 };
    case 'dots':
      return { kind: 'dots', count: 3, layout: 'row' };
    case 'shape':
      return { kind: 'shape', shape: 'lingkaran', color: 'merah', size: 'm' };
    case 'solid':
      return { kind: 'solid', solid: 'kubus', color: 'biru' };
    case 'coin':
      return { kind: 'coin', value: 500 };
    case 'word':
      return { kind: 'word', text: 'kata' };
    case 'cubes':
      return { kind: 'cubes', counts: [3], colors: ['biru'] };
    case 'frame':
      return { kind: 'frame', filled: 3, size: 10 };
    case 'equation':
      return { kind: 'equation', left: 2, op: '+', right: 1 };
    case 'swatch':
      return { kind: 'swatch', color: 'merah' };
    case 'yesno':
      return { kind: 'yesno', value: true };
  }
}
