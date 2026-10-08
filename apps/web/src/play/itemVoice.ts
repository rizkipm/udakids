import { createContext, useContext } from 'react';
import type { Choice, Item } from '@little-coder/engine';
import { speakChoice } from '../audio/speech';

/** Soal yang sedang tampil: kartu pilihan English diucapkan suara Momo dari server (D-059, D-062). */
export const ItemVoice = createContext<Item | undefined>(undefined);

/** Ucapkan kartu dengan suara yang tepat untuk bukunya (English → en-GB). Dipakai game seru (D-078). */
export function useSayChoice() {
  const item = useContext(ItemVoice);
  return (choice: Pick<Choice, 'id' | 'say'>) => speakChoice(item, choice);
}
