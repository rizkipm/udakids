import { useRef, useState, type ReactNode } from 'react';
import {
  MOMO_ACCESSORIES,
  MOMO_COLORS,
  MOMO_EXTRAS,
  MOMO_HEX,
  MOMO_MODELS,
  MOMO_PATTERNS,
  MOMO_TONES,
  MOMO_TONE_IDS,
  momoHex,
  type Color,
  type MomoAccessory,
  type MomoExtra,
  type MomoLook,
  type MomoModel,
  type MomoPattern,
  type MomoTone,
} from '@little-coder/engine';
import { speak as speakAny } from '../audio/speech';
import { t, type MessageKey } from '../i18n';
import { Momo, type MomoMood } from './Momo';
import './MomoStudio.css';

export type MomoStyle = { color: Color; look: MomoLook };
export const plainLook = (): MomoLook => ({
  accessory: 'none',
  gradient: null,
  accessoryColor: null,
});

/** Semua kalimat studio berbahasa Indonesia: selalu suara Chirp Indonesia (D-106), tanpa menebak bahasa. */
const speak = (text: string) => speakAny(text, { lang: 'id-ID' });
const toneName = (tone: MomoTone) => t(`play.momo.tone.${tone}` as MessageKey);
const accName = (a: MomoAccessory) => t(`play.momo.acc.${a}` as MessageKey);
const modelName = (m: MomoModel) => t(`play.momo.model.${m}` as MessageKey);
const patternName = (p: MomoPattern) => t(`play.momo.pattern.${p}` as MessageKey);
const extraName = (e: MomoExtra) => t(`play.momo.extra.${e}` as MessageKey);
/** Nama warna untuk dibacakan: nama palet, atau "warna pilihanmu" untuk kode hex (angkanya tidak dibacakan). */
const colorName = (v: string) =>
  v in MOMO_TONES ? toneName(v as MomoTone) : t('play.momo.customSay');

type Tab = 'model' | 'color' | 'pattern' | 'head' | 'extra';
const TABS: Tab[] = ['model', 'color', 'pattern', 'head', 'extra'];
const MOODS: MomoMood[] = ['proud', 'curious', 'oops', 'sleepy', 'happy'];

/** Tampilan acak dari semua pilihan (tombol "Acak"). `rand` bisa diganti untuk test. */
export function randomStyle(rand: () => number = Math.random): MomoStyle {
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)]!;
  const maybe = <T,>(v: T) => (rand() < 0.5 ? v : null);
  return {
    color: pick(MOMO_COLORS),
    look: {
      model: pick(MOMO_MODELS),
      body: null,
      gradient: maybe(pick(MOMO_TONE_IDS)),
      pattern: pick(MOMO_PATTERNS),
      accessory: pick(MOMO_ACCESSORIES),
      accessoryColor: maybe(pick(MOMO_TONE_IDS)),
      extra: pick(MOMO_EXTRAS),
      extraColor: maybe(pick(MOMO_TONE_IDS)),
    },
  };
}

/** Normalisasi kode warna ketikan: "f80", "#FF8800", "ff8800" → "#ff8800"; selain itu null. */
export function normalizeHex(raw: string): string | null {
  let v = raw.trim().toLowerCase();
  if (!v.startsWith('#')) v = `#${v}`;
  if (/^#[0-9a-f]{3}$/.test(v)) v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return MOMO_HEX.test(v) ? v : null;
}

function Swatch({ fill, second }: { fill: string; second?: string }) {
  return (
    <span
      className="ms-swatch"
      aria-hidden
      style={{ background: second ? `linear-gradient(135deg, ${fill}, ${second})` : fill }}
    />
  );
}

function Opt({
  on,
  label,
  onPick,
  wide,
  children,
}: {
  on: boolean;
  label: string;
  onPick: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`ms-opt${wide ? ' ms-acc' : ''}${on ? ' is-on' : ''}`}
      aria-pressed={on}
      aria-label={label}
      onClick={() => {
        speak(label);
        onPick();
      }}
    >
      {children}
    </button>
  );
}

/**
 * Baris warna: palet + "warna sendiri" (pemilih warna bebas) + kotak kode warna (#RRGGBB) untuk yang ingin
 * mengetik angkanya sendiri (D-102). `value` = nama palet atau hex.
 */
function ColorRow({
  legend,
  value,
  onPick,
  none,
  presets = MOMO_TONE_IDS,
  mix,
}: {
  legend: string;
  value: string | null | undefined;
  onPick: (v: string | null) => void;
  /** Pilihan "kosong" (polos / warna bawaan). */
  none?: { label: string; fill: string };
  presets?: readonly MomoTone[];
  /** Warna pertama untuk contoh gradasi. */
  mix?: string;
}) {
  const custom = value && !(value in MOMO_TONES) ? value : null;
  const [draft, setDraft] = useState(custom?.toUpperCase() ?? '');
  const [hint, setHint] = useState(false);
  const commit = () => {
    const hex = normalizeHex(draft);
    setHint(!hex && draft.trim() !== '');
    if (hex) {
      setDraft(hex.toUpperCase());
      speak(colorName(hex));
      onPick(hex);
    }
  };
  return (
    <fieldset className="ms-group">
      <legend>{legend}</legend>
      <div className="ms-row">
        {none && (
          <Opt on={!value} label={none.label} onPick={() => onPick(null)}>
            <Swatch fill={none.fill} />
          </Opt>
        )}
        {presets.map((tone) => (
          <Opt key={tone} on={value === tone} label={toneName(tone)} onPick={() => onPick(tone)}>
            <Swatch fill={mix ?? MOMO_TONES[tone]} second={mix ? MOMO_TONES[tone] : undefined} />
          </Opt>
        ))}
        <label
          className={`ms-opt ms-custom${custom ? ' is-on' : ''}`}
          title={t('play.momo.custom')}
        >
          <span
            className="ms-swatch ms-rainbow"
            aria-hidden
            style={
              custom
                ? { background: mix ? `linear-gradient(135deg, ${mix}, ${custom})` : custom }
                : undefined
            }
          />
          <span className="ms-custom-label" aria-hidden>
            {t('play.momo.customShort')}
          </span>
          <input
            type="color"
            className="ms-color-input"
            aria-label={`${legend}: ${t('play.momo.custom')}`}
            value={custom ?? momoHex(value) ?? '#8a6cf0'}
            onChange={(e) => {
              const hex = normalizeHex(e.target.value);
              if (!hex) return;
              setDraft(hex.toUpperCase());
              setHint(false);
              onPick(hex);
            }}
            onBlur={() => custom && speak(colorName(custom))}
          />
        </label>
      </div>
      <div className="ms-hex">
        <label>
          <span>{t('play.momo.hexLabel')}</span>
          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            maxLength={7}
            placeholder={t('play.momo.hexPlaceholder')}
            aria-label={`${legend}: ${t('play.momo.hexLabel')}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commit();
              }
            }}
          />
        </label>
        <button type="button" className="ms-hex-btn" onClick={commit}>
          {t('play.momo.hexUse')}
        </button>
        {hint && (
          <small className="ms-hex-hint" role="status">
            {t('play.momo.hexHint')}
          </small>
        )}
      </div>
    </fieldset>
  );
}

/**
 * Studio Momo (D-051, D-102): model karakter, warna (palet atau warna sendiri / kode hex), gradasi, pola,
 * aksesori kepala, dan pernak-pernik, dalam tab bergambar. Momo bereaksi saat diketuk; tombol Acak dan
 * Kembalikan. Semua pilihan untuk semua anak, tanpa label laki-laki/perempuan. Pilihan berupa gambar besar
 * (≥ 64 px) dan dibacakan saat diketuk.
 */
export function MomoStudio({
  value,
  onChange,
  showPrimary = true,
}: {
  value: MomoStyle;
  onChange: (v: MomoStyle) => void;
  showPrimary?: boolean;
}) {
  const { color, look } = value;
  const initial = useRef(value);
  const [tab, setTab] = useState<Tab>('model');
  const [mood, setMood] = useState<MomoMood>('happy');
  const [bounce, setBounce] = useState(0);
  const set = (patch: Partial<MomoLook>) => onChange({ color, look: { ...look, ...patch } });
  const base = momoHex(look.body) ?? MOMO_TONES[color as MomoTone] ?? MOMO_TONES.ungu;
  const model = look.model ?? 'kotak';
  const accessory = look.accessory ?? 'none';
  const extra = look.extra ?? 'none';
  const pattern = look.pattern ?? 'none';
  const poke = () => {
    const next = MOODS[(MOODS.indexOf(mood) + 1) % MOODS.length]!;
    setMood(next);
    setBounce((n) => n + 1);
    speak(t(`play.momo.react.${next}` as MessageKey));
  };
  // Warna utama: 6 warna Momo (momoColor) + warna palet lain & warna sendiri lewat `body`.
  const mainValue = look.body ?? color;
  const pickMain = (v: string | null) => {
    if (v && (MOMO_COLORS as readonly string[]).includes(v))
      onChange({ color: v as Color, look: { ...look, body: null } });
    else if (v) onChange({ color, look: { ...look, body: momoHex(v) ?? null } });
  };

  return (
    <div className="ms">
      <div className="ms-stage">
        <button
          type="button"
          className="ms-preview"
          aria-label={t('play.momo.poke')}
          onClick={poke}
        >
          <span key={bounce} className={bounce ? 'ms-bounce' : undefined}>
            <Momo color={color} look={look} mood={mood} size={150} />
          </span>
        </button>
        <div className="ms-stage-actions">
          <button
            type="button"
            className="ms-action"
            onClick={() => {
              const r = randomStyle();
              speak(t('play.momo.randomSay'));
              onChange(showPrimary ? r : { color, look: r.look });
              setBounce((n) => n + 1);
            }}
          >
            <DiceIcon />
            {t('play.momo.random')}
          </button>
          <button
            type="button"
            className="ms-action is-secondary"
            onClick={() => {
              speak(t('play.momo.reset'));
              onChange(initial.current);
            }}
          >
            <UndoIcon />
            {t('play.momo.reset')}
          </button>
        </div>
      </div>

      <div className="ms-tabs" role="tablist" aria-label={t('play.momo.title')}>
        {TABS.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            id={`ms-tab-${k}`}
            aria-selected={tab === k}
            aria-controls={`ms-panel-${k}`}
            className={`ms-tab${tab === k ? ' is-on' : ''}`}
            onClick={() => {
              speak(t(`play.momo.tabSay.${k}` as MessageKey));
              setTab(k);
            }}
          >
            <TabIcon tab={k} color={color} look={look} />
            <span>{t(`play.momo.tab.${k}` as MessageKey)}</span>
          </button>
        ))}
      </div>

      <div
        className="ms-panel"
        role="tabpanel"
        id={`ms-panel-${tab}`}
        aria-labelledby={`ms-tab-${tab}`}
      >
        {tab === 'model' && (
          <fieldset className="ms-group">
            <legend>{t('play.momo.model')}</legend>
            <div className="ms-row">
              {MOMO_MODELS.map((m) => (
                <Opt
                  key={m}
                  wide
                  on={model === m}
                  label={modelName(m)}
                  onPick={() => set({ model: m })}
                >
                  <Momo color={color} look={{ ...look, model: m }} mood="happy" size={54} />
                </Opt>
              ))}
            </div>
          </fieldset>
        )}

        {tab === 'color' && (
          <>
            {showPrimary && (
              <ColorRow
                legend={t('play.momo.primary')}
                value={mainValue}
                presets={MOMO_TONE_IDS}
                onPick={pickMain}
              />
            )}
            <ColorRow
              legend={t('play.momo.gradient')}
              value={look.gradient}
              mix={base}
              none={{ label: t('play.momo.plain'), fill: base }}
              onPick={(v) => set({ gradient: v })}
            />
          </>
        )}

        {tab === 'pattern' && (
          <fieldset className="ms-group">
            <legend>{t('play.momo.pattern')}</legend>
            <div className="ms-row">
              {MOMO_PATTERNS.map((p) => (
                <Opt
                  key={p}
                  wide
                  on={pattern === p}
                  label={patternName(p)}
                  onPick={() => set({ pattern: p })}
                >
                  <Momo color={color} look={{ ...look, pattern: p }} mood="happy" size={54} />
                </Opt>
              ))}
            </div>
          </fieldset>
        )}

        {tab === 'head' && (
          <>
            <fieldset className="ms-group">
              <legend>{t('play.momo.accessory')}</legend>
              <div className="ms-row">
                {MOMO_ACCESSORIES.map((a) => (
                  <Opt
                    key={a}
                    wide
                    on={accessory === a}
                    label={accName(a)}
                    onPick={() => set({ accessory: a })}
                  >
                    <Momo color={color} look={{ ...look, accessory: a }} mood="happy" size={54} />
                  </Opt>
                ))}
              </div>
            </fieldset>
            {accessory !== 'none' && (
              <ColorRow
                legend={t('play.momo.accessoryColor')}
                value={look.accessoryColor}
                onPick={(v) => set({ accessoryColor: v })}
              />
            )}
          </>
        )}

        {tab === 'extra' && (
          <>
            <fieldset className="ms-group">
              <legend>{t('play.momo.extra')}</legend>
              <div className="ms-row">
                {MOMO_EXTRAS.map((e) => (
                  <Opt
                    key={e}
                    wide
                    on={extra === e}
                    label={extraName(e)}
                    onPick={() => set({ extra: e })}
                  >
                    <Momo color={color} look={{ ...look, extra: e }} mood="happy" size={54} />
                  </Opt>
                ))}
              </div>
            </fieldset>
            {extra !== 'none' && (
              <ColorRow
                legend={t('play.momo.extraColor')}
                value={look.extraColor}
                onPick={(v) => set({ extraColor: v })}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Ikon tab: Momo kecil yang menonjolkan kategorinya. */
function TabIcon({ tab, color, look }: { tab: Tab; color: Color; look: MomoLook }) {
  if (tab === 'color') return <span className="ms-tab-icon ms-rainbow" aria-hidden />;
  const focus: MomoLook =
    tab === 'model'
      ? { accessory: 'none', model: look.model }
      : tab === 'pattern'
        ? { accessory: 'none', model: look.model, pattern: look.pattern ?? 'titik' }
        : tab === 'head'
          ? {
              ...look,
              extra: 'none',
              accessory: look.accessory === 'none' ? 'topi' : look.accessory,
            }
          : { ...look, extra: look.extra && look.extra !== 'none' ? look.extra : 'kacamata' };
  return (
    <span className="ms-tab-icon" aria-hidden>
      <Momo color={color} look={{ ...focus, body: look.body }} mood="happy" size={34} />
    </span>
  );
}

function DiceIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden>
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        fill="#fff"
        stroke="currentColor"
        strokeWidth="2"
      />
      {[
        [8, 8],
        [16, 8],
        [12, 12],
        [8, 16],
        [16, 16],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="currentColor" />
      ))}
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M9 7 L4 11 L9 15 M4 11 H14 A6 6 0 0 1 14 23"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(0 -3)"
      />
    </svg>
  );
}
