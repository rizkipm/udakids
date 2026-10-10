import type { LabPic } from '@little-coder/engine';
import { OBJECTS } from '@little-coder/engine';
import { VisualView } from '../../components/visuals';
import { PeragaPicture } from '../peraga/photo';

/** Slot gambar lab: foto asli (Pexels, D-095) bila sudah disetujui, selain itu cadangan SVG. */
export function LabPicView({ pic, size = 96, alt }: { pic: LabPic; size?: number; alt?: string }) {
  const svg = pic.visual ? (
    <VisualView visual={pic.visual} size={size} />
  ) : pic.benda ? (
    <VisualView visual={{ kind: 'object', object: pic.benda }} size={size} />
  ) : null;
  const label = alt ?? pic.foto?.label ?? (pic.benda ? OBJECTS[pic.benda].say : '');
  if (!pic.foto) return <span className="lab-pic is-svg">{svg}</span>;
  return (
    <span className="lab-pic" style={{ width: size * 1.25, height: size }}>
      <PeragaPicture foto={pic.foto} alt={label} size={size} fallback={svg} />
    </span>
  );
}
