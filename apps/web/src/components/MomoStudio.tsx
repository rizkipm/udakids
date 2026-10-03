import {
  MOMO_ACCESSORIES,
  MOMO_COLORS,
  MOMO_TONES,
  MOMO_TONE_IDS,
  SAY_COLOR,
  type Color,
  type MomoAccessory,
  type MomoLook,
  type MomoTone,
} from '@little-coder/engine';
import { speak } from '../audio/speech';
import { t, type MessageKey } from '../i18n';
import { Momo } from './Momo';
import './MomoStudio.css';

export type MomoStyle = { color: Color; look: MomoLook };
export const plainLook = (): MomoLook => ({
  accessory: 'none',
  gradient: null,
  accessoryColor: null,
});

const toneName = (tone: MomoTone) => t(`play.momo.tone.${tone}` as MessageKey);
const accName = (a: MomoAccessory) => t(`play.momo.acc.${a}` as MessageKey);

function Swatch({ fill, second }: { fill: string; second?: string }) {
  return (
    <span
      className="ms-swatch"
      aria-hidden
      style={{ background: second ? `linear-gradient(135deg, ${fill}, ${second})` : fill }}
    />
  );
}

/**
 * Studio Momo (D-051): warna utama, gradasi dua warna, aksesori (rambut, topi, peci, jilbab, pita), dan
 * warna aksesori. Semua pilihan untuk semua anak — tanpa label laki-laki/perempuan. Pilihan berupa gambar
 * besar (≥ 64 px) dan dibacakan saat diketuk, jadi tidak perlu bisa membaca.
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
  const set = (patch: Partial<MomoLook>, say?: string) => {
    if (say) speak(say);
    onChange({ color, look: { ...look, ...patch } });
  };
  const base = MOMO_TONES[color as MomoTone] ?? MOMO_TONES.ungu;
  return (
    <div className="ms">
      <div className="ms-preview">
        <Momo color={color} look={look} mood="happy" size={130} />
      </div>

      {showPrimary && (
        <fieldset className="ms-group">
          <legend>{t('play.momo.primary')}</legend>
          <div className="ms-row">
            {MOMO_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`ms-opt${c === color ? ' is-on' : ''}`}
                aria-pressed={c === color}
                aria-label={SAY_COLOR[c]}
                onClick={() => {
                  speak(SAY_COLOR[c]);
                  onChange({ color: c, look });
                }}
              >
                <Swatch fill={MOMO_TONES[c as MomoTone]} />
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="ms-group">
        <legend>{t('play.momo.gradient')}</legend>
        <div className="ms-row">
          <button
            type="button"
            className={`ms-opt${!look.gradient ? ' is-on' : ''}`}
            aria-pressed={!look.gradient}
            aria-label={t('play.momo.plain')}
            onClick={() => set({ gradient: null }, t('play.momo.plain'))}
          >
            <Swatch fill={base} />
          </button>
          {MOMO_TONE_IDS.map((tone) => (
            <button
              key={tone}
              type="button"
              className={`ms-opt${look.gradient === tone ? ' is-on' : ''}`}
              aria-pressed={look.gradient === tone}
              aria-label={toneName(tone)}
              onClick={() => set({ gradient: tone }, toneName(tone))}
            >
              <Swatch fill={base} second={MOMO_TONES[tone]} />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="ms-group">
        <legend>{t('play.momo.accessory')}</legend>
        <div className="ms-row">
          {MOMO_ACCESSORIES.map((a) => (
            <button
              key={a}
              type="button"
              className={`ms-opt ms-acc${look.accessory === a ? ' is-on' : ''}`}
              aria-pressed={look.accessory === a}
              aria-label={accName(a)}
              onClick={() => set({ accessory: a }, accName(a))}
            >
              <Momo
                color={color}
                look={{ ...look, accessory: a }}
                mood="happy"
                size={54}
                label={accName(a)}
              />
            </button>
          ))}
        </div>
      </fieldset>

      {look.accessory !== 'none' && (
        <fieldset className="ms-group">
          <legend>{t('play.momo.accessoryColor')}</legend>
          <div className="ms-row">
            {MOMO_TONE_IDS.map((tone) => (
              <button
                key={tone}
                type="button"
                className={`ms-opt${look.accessoryColor === tone ? ' is-on' : ''}`}
                aria-pressed={look.accessoryColor === tone}
                aria-label={toneName(tone)}
                onClick={() => set({ accessoryColor: tone }, toneName(tone))}
              >
                <Swatch fill={MOMO_TONES[tone]} />
              </button>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
