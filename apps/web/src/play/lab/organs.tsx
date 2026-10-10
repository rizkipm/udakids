import type { LabFigure, LabTaste } from '@little-coder/engine';

/**
 * Ilustrasi organ besar untuk Lab Pancaindra (digambar sendiri, viewBox 400×300). `ORGAN_SPOTS` = titik ketuk
 * tiap bagian (persen dari lebar/tinggi) supaya tombol HTML ≥ 64 px bisa diletakkan di atas gambar.
 */
export const ORGAN_W = 400;
export const ORGAN_H = 300;

const INK = '#2b2540';
const SKIN = '#f6c79a';
const SKIN_DARK = '#e2a273';
const HAIR = '#4a2f20';
const LINE = {
  stroke: INK,
  strokeWidth: 5,
  strokeLinejoin: 'round' as const,
  strokeLinecap: 'round' as const,
};

export const ORGAN_SPOTS: Record<LabFigure, Record<string, { x: number; y: number }>> = {
  mata: {
    alis: { x: 200, y: 46 },
    kelopak: { x: 290, y: 92 },
    'bulu-mata': { x: 112, y: 112 },
    manik: { x: 200, y: 166 },
    putih: { x: 290, y: 178 },
    'air-mata': { x: 76, y: 196 },
  },
  telinga: {
    'daun-telinga': { x: 92, y: 98 },
    'lubang-telinga': { x: 196, y: 164 },
    'gendang-telinga': { x: 268, y: 164 },
    'rumah-siput': { x: 336, y: 196 },
  },
  hidung: {
    'batang-hidung': { x: 200, y: 62 },
    'ruang-hidung': { x: 290, y: 128 },
    'lubang-hidung': { x: 158, y: 236 },
    'bulu-hidung': { x: 248, y: 244 },
  },
  lidah: {
    gigi: { x: 200, y: 70 },
    'ujung-lidah': { x: 200, y: 236 },
    bintil: { x: 268, y: 186 },
    'air-liur': { x: 108, y: 176 },
  },
  pencernaan: {
    mulut: { x: 200, y: 44 },
    kerongkongan: { x: 214, y: 104 },
    lambung: { x: 236, y: 156 },
    hati: { x: 150, y: 150 },
    'usus-halus': { x: 200, y: 216 },
    'usus-besar': { x: 128, y: 230 },
  },
  tumbuhan: {
    akar: { x: 200, y: 262 },
    batang: { x: 200, y: 180 },
    daun: { x: 130, y: 150 },
    bunga: { x: 200, y: 52 },
    buah: { x: 290, y: 120 },
    biji: { x: 330, y: 230 },
  },
  tubuh: {
    kepala: { x: 200, y: 46 },
    bahu: { x: 150, y: 104 },
    tangan: { x: 92, y: 168 },
    perut: { x: 200, y: 150 },
    lutut: { x: 176, y: 236 },
    kaki: { x: 224, y: 282 },
  },
  kulit: {
    'ujung-jari': { x: 147, y: 38 },
    kuku: { x: 222, y: 30 },
    telapak: { x: 214, y: 186 },
    'rambut-halus': { x: 236, y: 276 },
  },
};

export type OrganFx = {
  /** Mata: jari-jari manik (12 terang … 40 gelap). */
  pupil?: number;
  blink?: number;
  tear?: number;
  /** Telinga/hidung/kulit: penghitung animasi (berubah = putar ulang). */
  pulse?: number;
  /** Bagian yang sedang disorot. */
  on?: string;
};

export function Organ({
  sense,
  fx = {},
  label,
}: {
  sense: LabFigure;
  fx?: OrganFx;
  label: string;
}) {
  return (
    <svg
      className={`lab-organ is-${sense}`}
      viewBox={`0 0 ${ORGAN_W} ${ORGAN_H}`}
      role="img"
      aria-label={label}
    >
      {sense === 'mata' && <Eye fx={fx} />}
      {sense === 'telinga' && <Ear fx={fx} />}
      {sense === 'hidung' && <Nose fx={fx} />}
      {sense === 'lidah' && <Mouth fx={fx} />}
      {sense === 'kulit' && <Hand fx={fx} />}
      {sense === 'pencernaan' && <Digest fx={fx} />}
      {sense === 'tumbuhan' && <Plant fx={fx} />}
      {sense === 'tubuh' && <Body fx={fx} />}
    </svg>
  );
}

const glow = (on: boolean) => (on ? { filter: 'url(#lab-glow)' } : undefined);

function GlowDef() {
  return (
    <defs>
      <filter id="lab-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#f7c948" floodOpacity="1" />
      </filter>
    </defs>
  );
}

function Eye({ fx }: { fx: OrganFx }) {
  const pupil = fx.pupil ?? 18;
  return (
    <g>
      <GlowDef />
      <rect x="10" y="10" width="380" height="280" rx="40" fill={SKIN} />
      {/* Alis */}
      <path
        d="M98 64 Q200 10 302 64"
        fill="none"
        stroke={HAIR}
        strokeWidth={22}
        strokeLinecap="round"
        style={glow(fx.on === 'alis')}
      />
      {/* Lipatan kelopak */}
      <path
        d="M86 140 Q200 46 314 140"
        fill="none"
        stroke={SKIN_DARK}
        strokeWidth={7}
        strokeLinecap="round"
        style={glow(fx.on === 'kelopak')}
      />
      <clipPath id="lab-eye-clip">
        <path d="M78 168 Q200 70 322 168 Q200 262 78 168 Z" />
      </clipPath>
      <path
        d="M78 168 Q200 70 322 168 Q200 262 78 168 Z"
        fill="#fff"
        {...LINE}
        style={glow(fx.on === 'putih')}
      />
      <g clipPath="url(#lab-eye-clip)">
        <circle cx="200" cy="166" r="56" fill="#7a4a2b" {...LINE} style={glow(fx.on === 'manik')} />
        <circle cx="200" cy="166" r="44" fill="none" stroke="#a46a3f" strokeWidth={6} />
        <circle className="lab-pupil" cx="200" cy="166" r={pupil} fill="#16131f" />
        <circle cx="218" cy="146" r="11" fill="#fff" opacity="0.9" />
        {/* Kelopak yang berkedip */}
        <rect
          key={`b${fx.blink ?? 0}`}
          className={fx.blink ? 'lab-lid is-blink' : 'lab-lid'}
          x="70"
          y="60"
          width="260"
          height="210"
          fill={SKIN}
        />
      </g>
      {/* Bulu mata */}
      <g style={glow(fx.on === 'bulu-mata')}>
        {[
          [96, 152, 80, 136],
          [126, 128, 114, 108],
          [162, 112, 156, 90],
          [200, 107, 200, 84],
          [238, 112, 244, 90],
          [274, 128, 286, 108],
          [304, 152, 320, 136],
        ].map(([x1, y1, x2, y2], k) => (
          <line
            key={k}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={INK}
            strokeWidth={6}
            strokeLinecap="round"
          />
        ))}
      </g>
      {/* Air mata */}
      <path
        key={`t${fx.tear ?? 0}`}
        className={fx.tear ? 'lab-tear is-fall' : 'lab-tear'}
        d="M80 180 C70 196 72 210 82 210 C92 210 94 196 80 180 Z"
        fill="#7cc6ff"
        {...LINE}
        strokeWidth={3}
        style={glow(fx.on === 'air-mata')}
      />
    </g>
  );
}

function Ear({ fx }: { fx: OrganFx }) {
  const p = fx.pulse ?? 0;
  return (
    <g>
      <GlowDef />
      <rect x="10" y="10" width="380" height="280" rx="40" fill="#fff4e6" />
      {/* Kepala (potongan) */}
      <path d="M150 20 H380 V280 H150 Z" fill="#fde3cc" />
      {/* Daun telinga */}
      <path
        d="M150 66 C96 30 30 60 40 128 C48 186 92 196 110 230 C122 254 152 254 160 232"
        fill={SKIN}
        {...LINE}
        style={glow(fx.on === 'daun-telinga')}
      />
      <path
        d="M128 84 C96 72 72 96 80 128 C88 156 116 160 126 186"
        fill="none"
        stroke={SKIN_DARK}
        strokeWidth={9}
        strokeLinecap="round"
      />
      {/* Saluran telinga */}
      <path
        d="M150 146 H252 V182 H150 Z"
        fill="#f4b993"
        {...LINE}
        style={glow(fx.on === 'lubang-telinga')}
      />
      {/* Gendang telinga */}
      <ellipse
        key={`g${p}`}
        className={p ? 'lab-drum is-buzz' : 'lab-drum'}
        cx="262"
        cy="164"
        rx="9"
        ry="30"
        fill="#ffd166"
        {...LINE}
        strokeWidth={4}
        style={glow(fx.on === 'gendang-telinga')}
      />
      {/* Rumah siput */}
      <g style={glow(fx.on === 'rumah-siput')}>
        <path
          key={`s${p}`}
          className={p ? 'lab-cochlea is-lit' : 'lab-cochlea'}
          d="M300 180 C300 150 352 148 356 182 C360 214 316 222 312 196 C308 176 336 172 338 190 C340 202 326 204 324 196"
          fill="none"
          stroke="#e76f51"
          strokeWidth={10}
          strokeLinecap="round"
        />
        <path d="M272 168 C284 168 292 172 300 180" stroke="#e76f51" strokeWidth={8} fill="none" />
      </g>
      {/* Pesan ke otak */}
      <g key={`o${p}`} className={p ? 'lab-brain is-lit' : 'lab-brain'}>
        <path
          d="M336 160 C340 120 340 90 330 70"
          stroke="var(--langit)"
          strokeWidth={5}
          strokeDasharray="8 8"
          fill="none"
        />
        <circle cx="326" cy="58" r="22" fill="#efe7ff" {...LINE} strokeWidth={4} />
        <path
          d="M314 58 C318 48 334 48 338 58 M316 66 C322 62 330 62 336 66"
          stroke="var(--langit)"
          strokeWidth={4}
          fill="none"
        />
      </g>
      {/* Gelombang suara masuk */}
      {p > 0 && (
        <g key={`w${p}`} className="lab-waves-in">
          {[0, 1, 2].map((k) => (
            <path
              key={k}
              d="M20 120 C34 140 34 176 20 196"
              fill="none"
              stroke="var(--langit)"
              strokeWidth={6}
              strokeLinecap="round"
              style={{ animationDelay: `${k * 0.25}s` }}
            />
          ))}
        </g>
      )}
    </g>
  );
}

function Nose({ fx }: { fx: OrganFx }) {
  const p = fx.pulse ?? 0;
  return (
    <g>
      <GlowDef />
      <rect x="10" y="10" width="380" height="280" rx="40" fill={SKIN} />
      {/* Mata di atas sebagai penanda wajah */}
      <path
        d="M70 52 Q100 34 130 52 M270 52 Q300 34 330 52"
        stroke={INK}
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
      />
      {/* Hidung */}
      <path
        d="M200 30 C190 100 140 170 132 214 C126 250 168 262 200 246 C232 262 274 250 268 214 C260 170 210 100 200 30 Z"
        fill="#f9b98a"
        {...LINE}
        style={glow(fx.on === 'batang-hidung')}
      />
      {/* Jendela potongan: ruang hidung */}
      <g style={glow(fx.on === 'ruang-hidung')}>
        <path
          d="M206 92 C230 110 250 140 252 172 L214 172 Z"
          fill="#f28b82"
          opacity="0.85"
          {...LINE}
          strokeWidth={3}
        />
        {[0, 1, 2].map((k) => (
          <circle key={k} cx={226 + k * 7} cy={140 + k * 8} r="4" fill="#fff6" />
        ))}
      </g>
      {/* Lubang hidung */}
      <ellipse
        cx="170"
        cy="226"
        rx="20"
        ry="13"
        fill="#5b2a2a"
        style={glow(fx.on === 'lubang-hidung')}
      />
      <ellipse cx="230" cy="226" rx="20" ry="13" fill="#5b2a2a" />
      <g
        stroke="#2b1a14"
        strokeWidth={3}
        strokeLinecap="round"
        style={glow(fx.on === 'bulu-hidung')}
      >
        {[218, 226, 234, 242].map((x) => (
          <line key={x} x1={x} y1={236} x2={x + 3} y2={222} />
        ))}
      </g>
      {/* Udara masuk */}
      {p > 0 && (
        <g key={`a${p}`} className="lab-air">
          {[150, 172, 228, 250].map((x, k) => (
            <circle
              key={x}
              cx={x}
              cy={290}
              r="7"
              fill="#9ad1ff"
              style={{ animationDelay: `${k * 0.15}s` }}
            />
          ))}
        </g>
      )}
    </g>
  );
}

function Mouth({ fx }: { fx: OrganFx }) {
  return (
    <g>
      <GlowDef />
      <rect x="10" y="10" width="380" height="280" rx="40" fill={SKIN} />
      <path
        d="M50 70 Q200 20 350 70 Q380 170 300 250 Q200 300 100 250 Q20 170 50 70 Z"
        fill="#7d1f2c"
        {...LINE}
      />
      {/* Gigi atas */}
      <g style={glow(fx.on === 'gigi')}>
        {[96, 136, 176, 216, 256].map((x) => (
          <rect
            key={x}
            x={x}
            y={56}
            width={38}
            height={34}
            rx={8}
            fill="#fffdf6"
            {...LINE}
            strokeWidth={3}
          />
        ))}
      </g>
      {/* Lidah */}
      <path
        d="M90 190 C100 132 300 132 310 190 C318 250 250 272 200 272 C150 272 82 250 90 190 Z"
        fill="#ff7b95"
        {...LINE}
        style={glow(fx.on === 'ujung-lidah')}
      />
      <path d="M200 160 V240" stroke="#e05a77" strokeWidth={5} strokeLinecap="round" />
      {/* Bintil pengecap */}
      <g style={glow(fx.on === 'bintil')}>
        {[
          [140, 180],
          [160, 206],
          [174, 176],
          [228, 178],
          [244, 204],
          [264, 182],
          [282, 206],
          [124, 210],
          [184, 230],
          [222, 232],
        ].map(([x, y], k) => (
          <circle
            key={k}
            cx={x}
            cy={y}
            r={fx.on === 'bintil' ? 7 : 5}
            fill="#ffc2cf"
            stroke="#e05a77"
            strokeWidth={2}
          />
        ))}
      </g>
      {/* Air liur */}
      <g style={glow(fx.on === 'air-liur')}>
        <path
          d="M104 150 C96 166 98 178 108 178 C118 178 118 166 104 150 Z"
          fill="#cfeeff"
          {...LINE}
          strokeWidth={3}
        />
        <circle cx="300" cy="150" r="7" fill="#cfeeff" stroke={INK} strokeWidth={2} />
      </g>
    </g>
  );
}

function Hand({ fx }: { fx: OrganFx }) {
  const p = fx.pulse ?? 0;
  return (
    <g>
      <GlowDef />
      <rect x="10" y="10" width="380" height="280" rx="40" fill="#eaf6ff" />
      {/* Lengan */}
      <path d="M168 300 L176 236 H254 L262 300 Z" fill={SKIN} {...LINE} />
      <g
        stroke="#b98b62"
        strokeWidth={3}
        strokeLinecap="round"
        style={glow(fx.on === 'rambut-halus')}
      >
        {[190, 206, 222, 238].map((x, k) => (
          <path key={x} d={`M${x} ${262 + (k % 2) * 10} q4 -8 8 0`} fill="none" />
        ))}
      </g>
      {/* Telapak & jari */}
      <path
        d="M150 238 C130 200 120 170 118 140 L104 92 C98 72 124 64 132 86 L148 128 L144 54 C142 30 172 30 172 54 L178 120 L190 40 C192 16 222 18 220 42 L214 120 L232 52 C238 30 266 36 260 60 L244 128 L272 92 C286 74 308 92 294 112 L254 180 C246 206 248 224 254 238 Z"
        fill={SKIN}
        {...LINE}
        style={glow(fx.on === 'telapak')}
      />
      <path
        d="M170 178 C190 192 220 192 236 176"
        fill="none"
        stroke={SKIN_DARK}
        strokeWidth={4}
        strokeLinecap="round"
      />
      {/* Kuku (terlihat di ujung) */}
      <g style={glow(fx.on === 'kuku')}>
        {[
          [158, 40],
          [205, 28],
          [248, 44],
        ].map(([x, y]) => (
          <ellipse
            key={x}
            cx={x}
            cy={y! + 8}
            rx="10"
            ry="7"
            fill="#ffd6e0"
            stroke={INK}
            strokeWidth={3}
          />
        ))}
      </g>
      {/* Ujung jari: sentuhan */}
      <circle cx="147" cy="58" r="12" fill="#ffe08a" opacity={fx.on === 'ujung-jari' ? 1 : 0} />
      {p > 0 && (
        <g key={`r${p}`} className="lab-ripple">
          <circle cx="147" cy="58" r="16" fill="none" stroke="var(--langit)" strokeWidth={4} />
          <circle
            cx="147"
            cy="58"
            r="16"
            fill="none"
            stroke="var(--langit)"
            strokeWidth={4}
            style={{ animationDelay: '0.3s' }}
          />
        </g>
      )}
    </g>
  );
}

/** Wajah pencicip untuk dapur rasa: ekspresi lucu per rasa (tanpa raut sedih/menakutkan). */
export function TasterFace({ taste, eating }: { taste?: LabTaste; eating: number }) {
  const eyes =
    taste === 'manis' ? (
      <g stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round">
        <path d="M70 92 Q84 78 98 92" />
        <path d="M142 92 Q156 78 170 92" />
      </g>
    ) : taste === 'asam' ? (
      <g stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round">
        <path d="M70 82 L96 92 L70 102" />
        <path d="M170 82 L144 92 L170 102" />
      </g>
    ) : taste === 'asin' ? (
      <g>
        <circle cx="84" cy="92" r="10" fill={INK} />
        <circle cx="156" cy="92" r="10" fill={INK} />
        <path
          d="M66 70 L100 64 M140 64 L174 70"
          stroke={INK}
          strokeWidth={5}
          strokeLinecap="round"
        />
      </g>
    ) : taste === 'pahit' ? (
      <g stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round">
        <path d="M70 92 H98" />
        <path d="M142 92 H170" />
        <path d="M70 74 L98 82 M170 74 L142 82" />
      </g>
    ) : (
      <g>
        <circle cx="84" cy="92" r="10" fill={INK} />
        <circle cx="156" cy="92" r="10" fill={INK} />
      </g>
    );
  const mouth =
    taste === 'manis' ? (
      <path d="M80 140 Q120 182 160 140 Z" fill="#7d1f2c" stroke={INK} strokeWidth={5} />
    ) : taste === 'asam' ? (
      <circle cx="120" cy="150" r="12" fill="#7d1f2c" stroke={INK} strokeWidth={5} />
    ) : taste === 'asin' ? (
      <path
        d="M92 150 Q120 138 148 150"
        fill="none"
        stroke={INK}
        strokeWidth={6}
        strokeLinecap="round"
      />
    ) : taste === 'pahit' ? (
      <g>
        <path
          d="M86 146 Q100 136 114 146 Q128 156 142 146 Q150 140 156 146"
          fill="none"
          stroke={INK}
          strokeWidth={6}
          strokeLinecap="round"
        />
        <path d="M118 150 Q126 172 136 150" fill="#ff7b95" stroke={INK} strokeWidth={4} />
      </g>
    ) : (
      <ellipse
        cx="120"
        cy="150"
        rx="30"
        ry={eating ? 22 : 10}
        fill="#7d1f2c"
        stroke={INK}
        strokeWidth={5}
      />
    );
  return (
    <svg viewBox="0 0 240 220" className={`lab-taster${taste ? ` is-${taste}` : ''}`} aria-hidden>
      <circle cx="120" cy="110" r="100" fill={SKIN} stroke={INK} strokeWidth={6} />
      <path d="M30 70 C40 10 200 10 210 70 C180 40 60 40 30 70 Z" fill={HAIR} />
      {(taste === 'manis' || taste === 'asam') && (
        <g fill="#ff9ec7" opacity="0.8">
          <circle cx="58" cy="128" r="14" />
          <circle cx="182" cy="128" r="14" />
        </g>
      )}
      {eyes}
      {mouth}
    </svg>
  );
}

/** Wajah pencium untuk botol bau. `pilek` = hidung tersumbat (plester kecil, bukan merah). */
export function SnifferFace({ mood, pilek }: { mood?: 'harum' | 'tidak'; pilek: boolean }) {
  return (
    <svg viewBox="0 0 240 220" className="lab-sniffer" aria-hidden>
      <circle cx="120" cy="110" r="100" fill={SKIN} stroke={INK} strokeWidth={6} />
      <path d="M30 70 C40 10 200 10 210 70 C180 40 60 40 30 70 Z" fill={HAIR} />
      {mood === 'harum' ? (
        <g stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round">
          <path d="M70 92 Q84 78 98 92" />
          <path d="M142 92 Q156 78 170 92" />
        </g>
      ) : mood === 'tidak' ? (
        <g stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round">
          <path d="M70 84 L96 92 L70 100" />
          <path d="M170 84 L144 92 L170 100" />
        </g>
      ) : (
        <g>
          <circle cx="84" cy="92" r="10" fill={INK} />
          <circle cx="156" cy="92" r="10" fill={INK} />
        </g>
      )}
      <path
        d="M120 96 C112 120 100 134 104 142 C108 150 132 150 136 142 C140 134 128 120 120 96 Z"
        fill="#f9b98a"
        stroke={INK}
        strokeWidth={4}
      />
      {pilek && (
        <rect
          x="100"
          y="120"
          width="40"
          height="16"
          rx="5"
          fill="#fff"
          stroke={INK}
          strokeWidth={3}
          transform="rotate(-12 120 128)"
        />
      )}
      {mood === 'tidak' ? (
        <path
          d="M92 172 Q120 160 148 172"
          fill="none"
          stroke={INK}
          strokeWidth={6}
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M88 166 Q120 194 152 166"
          fill="none"
          stroke={INK}
          strokeWidth={6}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

/** Sistem pencernaan: makanan berjalan mulut → kerongkongan → lambung → usus halus → usus besar. */
const FOOD_PATH =
  'M200 44 L200 70 C206 100 216 120 230 140 C252 150 262 176 236 186 C212 194 190 196 180 204 C160 214 230 222 214 232 C196 240 168 238 160 222 C150 206 120 210 118 230 C116 252 150 262 200 262';
function Digest({ fx }: { fx: OrganFx }) {
  const p = fx.pulse ?? 0;
  return (
    <g>
      <GlowDef />
      <rect x="10" y="10" width="380" height="280" rx="40" fill="#fff4e6" />
      {/* Kepala & badan */}
      <circle cx="200" cy="40" r="30" fill={SKIN} {...LINE} />
      <path d="M110 84 C110 74 290 74 290 84 L300 290 H100 Z" fill="#fde3cc" {...LINE} />
      <path
        d="M186 50 Q200 60 214 50"
        fill="#7d1f2c"
        stroke={INK}
        strokeWidth={3}
        style={glow(fx.on === 'mulut')}
      />
      {/* Kerongkongan */}
      <path
        d="M200 70 C206 100 216 120 230 140"
        fill="none"
        stroke="#f28b82"
        strokeWidth={14}
        strokeLinecap="round"
        style={glow(fx.on === 'kerongkongan')}
      />
      {/* Hati */}
      <path
        d="M110 132 C130 112 196 118 206 134 C200 160 150 172 118 162 C104 156 102 142 110 132 Z"
        fill="#8c3b2e"
        {...LINE}
        strokeWidth={4}
        style={glow(fx.on === 'hati')}
      />
      {/* Lambung */}
      <path
        d="M226 136 C262 128 282 160 262 182 C246 198 214 194 206 182 C218 178 236 174 236 160 C236 150 228 146 226 136 Z"
        fill="#f4a3a8"
        {...LINE}
        strokeWidth={4}
        style={glow(fx.on === 'lambung')}
      />
      {/* Usus besar (bingkai) */}
      <path
        d="M132 268 L120 210 C118 196 130 190 150 192 L254 192 C270 192 280 202 278 218 L270 268"
        fill="none"
        stroke="#c9844e"
        strokeWidth={18}
        strokeLinecap="round"
        style={glow(fx.on === 'usus-besar')}
      />
      {/* Usus halus (berkelok) */}
      <path
        d="M160 210 C200 200 240 214 230 226 C214 240 170 226 166 242 C164 256 220 254 240 250"
        fill="none"
        stroke="#f6b3a0"
        strokeWidth={10}
        strokeLinecap="round"
        style={glow(fx.on === 'usus-halus')}
      />
      {p > 0 && (
        <circle key={`f${p}`} r="9" fill="#e9a400" stroke={INK} strokeWidth={3}>
          <animateMotion dur="3.6s" path={FOOD_PATH} fill="freeze" />
        </circle>
      )}
    </g>
  );
}

/** Tumbuhan: air naik dari akar ke daun saat disiram. */
function Plant({ fx }: { fx: OrganFx }) {
  const p = fx.pulse ?? 0;
  return (
    <g>
      <GlowDef />
      <rect x="10" y="10" width="380" height="280" rx="40" fill="#e9f7ff" />
      <rect x="10" y="226" width="380" height="64" rx="0" fill="#a87b52" />
      <g style={glow(fx.on === 'akar')}>
        <path
          d="M200 226 C196 246 176 258 166 276 M200 226 C204 250 224 262 236 280 M200 230 V284"
          stroke="#e8d3a8"
          strokeWidth={7}
          fill="none"
          strokeLinecap="round"
        />
      </g>
      <path
        d="M200 226 C196 170 204 120 200 80"
        stroke="#3f8f3a"
        strokeWidth={14}
        fill="none"
        strokeLinecap="round"
        style={glow(fx.on === 'batang')}
      />
      <g style={glow(fx.on === 'daun')}>
        <path
          d="M198 160 C160 130 120 138 106 160 C130 176 170 176 198 160 Z"
          fill="#5cbf4a"
          {...LINE}
          strokeWidth={4}
        />
        <path
          d="M202 120 C240 96 276 104 288 124 C264 138 228 138 202 120 Z"
          fill="#5cbf4a"
          {...LINE}
          strokeWidth={4}
        />
      </g>
      <g style={glow(fx.on === 'bunga')}>
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse
            key={a}
            cx="200"
            cy="44"
            rx="13"
            ry="22"
            fill="#ff9ec7"
            stroke={INK}
            strokeWidth={3}
            transform={`rotate(${a} 200 62)`}
          />
        ))}
        <circle cx="200" cy="62" r="12" fill="#f7c948" stroke={INK} strokeWidth={3} />
      </g>
      <g style={glow(fx.on === 'buah')}>
        <path d="M262 120 C276 104 300 104 304 124" stroke="#3f8f3a" strokeWidth={4} fill="none" />
        <circle cx="300" cy="140" r="20" fill="#e63946" stroke={INK} strokeWidth={4} />
      </g>
      <g style={glow(fx.on === 'biji')}>
        {[318, 334, 346].map((x, k) => (
          <ellipse
            key={x}
            cx={x}
            cy={240 + (k % 2) * 6}
            rx="7"
            ry="5"
            fill="#5a3b1e"
            stroke={INK}
            strokeWidth={2}
          />
        ))}
      </g>
      {p > 0 && (
        <g key={`w${p}`} className="lab-air">
          {[0, 1, 2].map((k) => (
            <circle
              key={k}
              cx="200"
              cy="270"
              r="6"
              fill="#7cc6ff"
              style={{ animationDelay: `${k * 0.25}s` }}
            />
          ))}
        </g>
      )}
    </g>
  );
}

/** Tubuh anak tampak depan: lengan melambai saat digerakkan. */
function Body({ fx }: { fx: OrganFx }) {
  const p = fx.pulse ?? 0;
  return (
    <g>
      <GlowDef />
      <rect x="10" y="10" width="380" height="280" rx="40" fill="#f3f8ff" />
      <circle cx="200" cy="48" r="32" fill={SKIN} {...LINE} style={glow(fx.on === 'kepala')} />
      <path d="M168 34 C176 10 224 10 232 34 C214 26 186 26 168 34 Z" fill={HAIR} />
      <circle cx="188" cy="48" r="4" fill={INK} />
      <circle cx="212" cy="48" r="4" fill={INK} />
      <path
        d="M190 62 Q200 70 210 62"
        fill="none"
        stroke={INK}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <path
        d="M148 96 C150 86 250 86 252 96 L246 196 H154 Z"
        fill="#7cc6ff"
        {...LINE}
        style={glow(fx.on === 'perut')}
      />
      <circle
        cx="150"
        cy="104"
        r="14"
        fill="#7cc6ff"
        stroke={INK}
        strokeWidth={4}
        style={glow(fx.on === 'bahu')}
      />
      <circle cx="250" cy="104" r="14" fill="#7cc6ff" stroke={INK} strokeWidth={4} />
      <g
        key={`a${p}`}
        className={p ? 'lab-wave' : undefined}
        style={{ transformOrigin: '150px 104px', ...glow(fx.on === 'tangan') }}
      >
        <path d="M146 108 L100 160" stroke={SKIN} strokeWidth={18} strokeLinecap="round" />
        <circle cx="96" cy="166" r="14" fill={SKIN} stroke={INK} strokeWidth={3} />
      </g>
      <path d="M254 108 L300 160" stroke={SKIN} strokeWidth={18} strokeLinecap="round" />
      <circle cx="304" cy="166" r="14" fill={SKIN} stroke={INK} strokeWidth={3} />
      <path
        d="M176 196 V274 M224 196 V274"
        stroke="#4a6fa5"
        strokeWidth={22}
        strokeLinecap="round"
      />
      <circle cx="176" cy="236" r="10" fill="#3b5b8a" style={glow(fx.on === 'lutut')} />
      <circle cx="224" cy="236" r="10" fill="#3b5b8a" />
      <g style={glow(fx.on === 'kaki')}>
        <ellipse cx="170" cy="282" rx="22" ry="9" fill={INK} />
        <ellipse cx="230" cy="282" rx="22" ry="9" fill={INK} />
      </g>
    </g>
  );
}
