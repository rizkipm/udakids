import { SENSE_IDS, type Choice, type SenseId } from '@little-coder/engine';
import { FACE_H, FACE_W, FaceFigure, SENSE_SPOTS } from '../../components/visuals/senses';

/**
 * Game "ketuk di wajah" (D-089): pilihan `pick-one` bersusunan `face` tampil sebagai titik yang bisa diketuk
 * langsung pada gambar wajah besar (mata, telinga, hidung, lidah, tangan). Target sentuh ≥ 64 px; tanda benar
 * hijau, keliru oranye lembut (tanpa merah besar).
 */
export function FacePick({
  choices,
  chosen,
  marks,
  disabled,
  onPick,
}: {
  choices: Choice[];
  chosen?: string;
  marks: (c: Choice) => 'answer' | 'right' | 'wrong' | undefined;
  disabled?: boolean;
  onPick: (c: Choice) => void;
}) {
  const bySense = new Map<SenseId, Choice>();
  for (const c of choices) if (c.visual.kind === 'sense') bySense.set(c.visual.sense, c);
  const dim = SENSE_IDS.filter((s) => !bySense.has(s));
  return (
    <div className="face-pick">
      <svg viewBox={`0 0 ${FACE_W} ${FACE_H}`} className="face-pick-art" aria-hidden>
        <FaceFigure dim={dim} />
      </svg>
      {[...bySense].map(([sense, c]) => {
        const p = SENSE_SPOTS[sense];
        const mark = marks(c);
        return (
          <button
            key={c.id}
            type="button"
            className={`face-spot${chosen === c.id ? ' is-selected' : ''}${mark ? ` is-${mark}` : ''}`}
            style={{
              left: `${(p.x / FACE_W) * 100}%`,
              top: `${(p.y / FACE_H) * 100}%`,
              ['--spot' as string]: `${p.r >= 26 ? 72 : 64}px`,
            }}
            aria-label={c.say}
            aria-pressed={chosen === c.id}
            disabled={disabled}
            onClick={() => onPick(c)}
          />
        );
      })}
    </div>
  );
}
