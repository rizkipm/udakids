import { useState, type CSSProperties, type ReactNode } from 'react';
import {
  COINS,
  COLORS,
  OBJECT_IDS,
  POSITION_REFERENCES,
  ALL_SHAPE_IDS,
  SIZES,
  SOLID_IDS,
  type Layout,
  type Visual,
} from '@little-coder/engine';
import { RELATIONS, SAMPLE_VISUALS } from './samples';
import { VisualView } from './VisualView';

const grid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
  gap: 12,
  alignItems: 'end',
};
const tile: CSSProperties = {
  background: 'var(--kertas)',
  border: '2px solid var(--garis)',
  borderRadius: 12,
  padding: 8,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
};
const caption: CSSProperties = {
  fontSize: 12,
  color: 'var(--malam-muted)',
  fontFamily: 'monospace',
};

function Tile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure style={{ ...tile, margin: 0 }}>
      {children}
      <figcaption style={caption}>{label}</figcaption>
    </figure>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 18, margin: '0 0 10px' }}>{title}</h2>
      <div style={grid}>{children}</div>
    </section>
  );
}

const LAYOUTS: Layout[] = ['row', 'rows', 'scatter', 'ring', 'grid'];

/** Galeri dev: semua ilustrasi benda dan semua jenis Visual. Hanya untuk pengembang. */
export function VisualGallery() {
  const [step, setStep] = useState(0);
  const countables: [string, Visual][] = [
    ['objects', { kind: 'objects', object: 'bebek', count: 8, layout: 'rows' }],
    ['dots', { kind: 'dots', count: 8, layout: 'grid' }],
    ['cubes', { kind: 'cubes', counts: [5, 3], colors: ['kuning', 'hijau'], separated: true }],
    ['frame', { kind: 'frame', filled: 8, size: 10 }],
    [
      'shapes',
      {
        kind: 'shapes',
        items: ALL_SHAPE_IDS.map((shape, i) => ({ shape, color: COLORS[i % COLORS.length]! })),
        layout: 'row',
      },
    ],
  ];
  return (
    <main
      style={{ padding: 16, background: 'var(--awan)', color: 'var(--malam)', minHeight: '100vh' }}
    >
      <h1 style={{ fontSize: 22 }}>Visual gallery</h1>

      <Section title="Visual kinds">
        {Object.entries(SAMPLE_VISUALS).map(([kind, v]) => (
          <Tile key={kind} label={kind}>
            <VisualView visual={v} size={110} />
          </Tile>
        ))}
      </Section>

      <Section title={`Objects (${OBJECT_IDS.length})`}>
        {OBJECT_IDS.map((id) => (
          <Tile key={id} label={id}>
            <VisualView visual={{ kind: 'object', object: id }} size={96} />
          </Tile>
        ))}
      </Section>

      <Section title="Objects tinted (biru)">
        {OBJECT_IDS.map((id) => (
          <Tile key={id} label={id}>
            <VisualView visual={{ kind: 'object', object: id, color: 'biru' }} size={64} />
          </Tile>
        ))}
      </Section>

      <Section title="Stretch (1 vs 0.5)">
        {(['pensil', 'pita', 'pohon', 'gedung', 'bunga', 'pintu', 'meja', 'buku'] as const).flatMap(
          (id) =>
            [1, 0.5].map((k) => {
              const tall = id === 'pohon' || id === 'gedung' || id === 'bunga';
              return (
                <Tile key={`${id}-${k}`} label={`${id} ${k}`}>
                  <VisualView
                    visual={{
                      kind: 'object',
                      object: id,
                      scaleX: tall ? 1 : k,
                      scaleY: tall ? k : 1,
                    }}
                    size={110}
                  />
                </Tile>
              );
            }),
        )}
      </Section>

      <Section title="Layouts">
        {LAYOUTS.map((layout) => (
          <Tile key={layout} label={layout}>
            <VisualView visual={{ kind: 'objects', object: 'apel', count: 9, layout }} size={120} />
          </Tile>
        ))}
      </Section>

      <Section title="Scenes">
        {POSITION_REFERENCES.flatMap((reference) =>
          RELATIONS.map((relation) => (
            <Tile key={`${reference}-${relation}`} label={`${relation} ${reference}`}>
              <VisualView
                visual={{ kind: 'scene', relation, subject: 'kucing', reference }}
                size={110}
              />
            </Tile>
          )),
        )}
      </Section>

      <Section title="Shapes, solids, coins">
        {ALL_SHAPE_IDS.flatMap((shape) =>
          SIZES.map((size) => (
            <Tile key={`${shape}-${size}`} label={`${shape} ${size}`}>
              <VisualView visual={{ kind: 'shape', shape, color: 'biru', size }} size={80} />
            </Tile>
          )),
        )}
        {SOLID_IDS.map((solid) => (
          <Tile key={solid} label={solid}>
            <VisualView visual={{ kind: 'solid', solid, color: 'oranye' }} size={96} />
          </Tile>
        ))}
        {COINS.map((value) => (
          <Tile key={value} label={`coin ${value}`}>
            <VisualView visual={{ kind: 'coin', value }} size={96} />
          </Tile>
        ))}
        {COLORS.map((color) => (
          <Tile key={color} label={color}>
            <VisualView visual={{ kind: 'swatch', color }} size={64} />
          </Tile>
        ))}
      </Section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, margin: '0 0 10px' }}>countStep = {step}</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))}>
            -1
          </button>
          <button type="button" onClick={() => setStep((s) => s + 1)}>
            +1
          </button>
          <button type="button" onClick={() => setStep(0)}>
            0
          </button>
        </div>
        <div style={grid}>
          {countables.map(([label, v]) => (
            <Tile key={label} label={label}>
              <VisualView visual={v} size={110} countStep={step} />
            </Tile>
          ))}
        </div>
      </section>
    </main>
  );
}
