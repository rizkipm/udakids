import { useSession } from '../../auth/session';
import { recordLab, useProgress } from '../practiceStore';
import { flushPractice } from '../sync';

/**
 * Progres satu lab (D-109) untuk anak yang masuk: bintang per bagian, disimpan di perangkat lalu dikirim ke server
 * lewat outbox (laporan orang tua & fasilitator). Bintang tidak pernah turun.
 */
export function useLabProgress(labKey: string) {
  const childId = useSession('child')?.user.id ?? '';
  const progress = useProgress(childId);
  const parts = progress.labs?.[labKey] ?? {};
  const mark = (part: string, stars = 1) => {
    if (!childId) return;
    recordLab(childId, labKey, part, Math.max(0, Math.min(3, stars)));
    void flushPractice(childId);
  };
  return { parts, mark };
}
