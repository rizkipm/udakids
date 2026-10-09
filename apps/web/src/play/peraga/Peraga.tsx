import { useEffect, useState } from 'react';
import type { Peraga as PeragaData } from '@little-coder/engine';
import { speak } from '../../audio/speech';
import { Momo } from '../../components/Momo';
import { t } from '../../i18n';
import { AlatPeraga } from './Alat';
import { PeragaPicture } from './photo';
import './peraga.css';

/**
 * Simulasi pelajaran SD (D-093): jelajah kartu foto, proses sebab-akibat, alat peraga matematika, dan kartu kata
 * English. Tanpa nilai; tanpa kata "salah" — pilihan yang belum tepat hanya bergoyang dan Momo memberi petunjuk.
 */
export function Peraga({ data }: { data: PeragaData }) {
  switch (data.tipe) {
    case 'jelajah':
      return <Jelajah data={data} />;
    case 'proses':
      return <Proses data={data} />;
    case 'alat':
      return <AlatPeraga data={data} />;
    default:
      return <Kata data={data} />;
  }
}

/** Penutup simulasi: momen "aha" lalu ajakan; Momo bangga. */
export function PeragaEnd({ aha, tutup }: { aha: string; tutup: string }) {
  useEffect(() => speak(`${aha} ${tutup}`), [aha, tutup]);
  return (
    <div className="peraga-end" role="status">
      <Momo own mood="proud" size={72} />
      <div>
        <strong>{aha}</strong>
        <p>{tutup}</p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ jelajah

type JelajahData = Extract<PeragaData, { tipe: 'jelajah' }>;

function Jelajah({ data }: { data: JelajahData }) {
  const [seen, setSeen] = useState<string[]>([]);
  const [active, setActive] = useState<string>();
  const [q, setQ] = useState(-1); // -1 = menjelajah; 0.. = pertanyaan ke-q
  const [picked, setPicked] = useState<string[]>([]);
  const [wiggle, setWiggle] = useState<string>();
  const all = seen.length === data.bagian.length;
  const asking = q >= 0 && q < data.tanya.length;
  const ask = asking ? data.tanya[q]! : undefined;
  const done = q >= data.tanya.length;

  useEffect(() => speak(data.jelajahSuara), [data.jelajahSuara]);

  const tap = (id: string) => {
    const b = data.bagian.find((x) => x.id === id)!;
    if (!asking) {
      setActive(id);
      setSeen((s) => (s.includes(id) ? s : [...s, id]));
      speak(b.suara);
      return;
    }
    if (ask!.jawaban.includes(id)) {
      const next = picked.includes(id) ? picked : [...picked, id];
      setPicked(next);
      if (ask!.jawaban.every((j) => next.includes(j))) speak(ask!.selesai);
      else speak(b.nama);
    } else {
      // Belum tepat: kartu bergoyang pelan, Momo mengulang pertanyaannya (tanpa kata "salah").
      setWiggle(id);
      setTimeout(() => setWiggle(undefined), 600);
      speak(`${b.nama}. ${ask!.suara}`);
    }
  };
  const solved = ask ? ask.jawaban.every((j) => picked.includes(j)) : false;
  const nextQ = () => {
    const n = q + 1;
    setQ(n);
    setPicked([]);
    if (n < data.tanya.length) speak(data.tanya[n]!.suara);
  };
  const info = active ? data.bagian.find((b) => b.id === active) : undefined;

  return (
    <div className="peraga">
      {data.foto && (
        <PeragaPicture foto={data.foto} alt={data.foto.label} className="peraga-hero" />
      )}
      <p className="peraga-hint" aria-live="polite">
        {ask
          ? ask.teks
          : done
            ? ''
            : all
              ? t('play.peraga.allSeen')
              : t('play.peraga.explore', { n: seen.length, of: data.bagian.length })}
      </p>
      <div className="peraga-cards">
        {data.bagian.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`peraga-card${active === b.id && !asking ? ' is-active' : ''}${seen.includes(b.id) ? ' is-seen' : ''}${picked.includes(b.id) ? ' is-picked' : ''}${wiggle === b.id ? ' is-wiggle' : ''}`}
            onClick={() => tap(b.id)}
            aria-label={b.nama}
          >
            <PeragaPicture foto={b.foto} gambar={b.gambar} alt={b.nama} size={96} />
            <span className="peraga-card-name">{b.nama}</span>
          </button>
        ))}
      </div>
      {info && !asking && !done && (
        <p className="peraga-info" key={info.id}>
          <strong>{info.nama}.</strong> {info.teks}
        </p>
      )}
      {!asking && !done && all && (
        <button type="button" className="kid-btn peraga-next" onClick={nextQ}>
          {t('play.peraga.tryAsk')}
        </button>
      )}
      {asking && solved && (
        <button type="button" className="kid-btn peraga-next" onClick={nextQ}>
          {t('play.peraga.next')}
        </button>
      )}
      {done && <PeragaEnd aha={data.aha} tutup={data.tutup} />}
    </div>
  );
}

// ------------------------------------------------------------ proses

type ProsesData = Extract<PeragaData, { tipe: 'proses' }>;

function Proses({ data }: { data: ProsesData }) {
  const [i, setI] = useState(0);
  const stage = data.tahap[i]!;
  const last = i === data.tahap.length - 1;
  useEffect(() => speak(stage.suara), [stage]);
  return (
    <div className="peraga">
      <div className="peraga-stages" aria-hidden>
        {data.tahap.map((s, k) => (
          <span key={k} className={k < i ? 'is-past' : k === i ? 'is-on' : undefined}>
            {s.nama}
          </span>
        ))}
      </div>
      <div className="peraga-stage" key={i}>
        <PeragaPicture foto={stage.foto} gambar={stage.gambar} alt={stage.nama} size={200} />
        <p>
          <strong>{stage.nama}.</strong> {stage.teks}
        </p>
      </div>
      {!last ? (
        <button type="button" className="kid-btn peraga-next" onClick={() => setI(i + 1)}>
          {data.tombol}
        </button>
      ) : (
        <>
          <PeragaEnd aha={data.aha} tutup={data.tutup} />
          <button type="button" className="kid-link" onClick={() => setI(0)}>
            {t('play.peraga.again')}
          </button>
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------ kata (English)

type KataData = Extract<PeragaData, { tipe: 'kata' }>;

function Kata({ data }: { data: KataData }) {
  const [seen, setSeen] = useState<string[]>([]);
  const [quiz, setQuiz] = useState<number>(-1);
  const [wiggle, setWiggle] = useState<string>();
  const all = seen.length === data.kata.length;
  // Urutan tebakan tetap (deterministik): setiap kata sekali.
  const order = data.kata.map((k) => k.en);
  const target = quiz >= 0 && quiz < order.length ? order[quiz] : undefined;
  const done = quiz >= order.length;

  useEffect(() => speak(data.pengantar), [data.pengantar]);
  const sayWord = (en: string) => speak(en, { lang: 'en-GB' });
  const tap = (k: KataData['kata'][number]) => {
    if (!target) {
      setSeen((s) => (s.includes(k.en) ? s : [...s, k.en]));
      // Kata English (lafal British), lalu artinya & kalimat contoh.
      speak(k.en, {
        lang: 'en-GB',
        onEnd: () =>
          speak(k.id, {
            onEnd: () => (k.kalimat ? speak(k.kalimat, { lang: 'en-GB' }) : undefined),
          }),
      });
      return;
    }
    if (k.en === target) {
      const n = quiz + 1;
      setQuiz(n);
      speak(t('play.peraga.wordRight', { word: k.en }), {
        onEnd: () => (n < order.length ? sayWord(order[n]!) : undefined),
      });
    } else {
      setWiggle(k.en);
      setTimeout(() => setWiggle(undefined), 600);
      sayWord(target);
    }
  };

  return (
    <div className="peraga">
      <p className="peraga-hint" aria-live="polite">
        {target
          ? t('play.peraga.listenTap')
          : done
            ? ''
            : t('play.peraga.explore', { n: seen.length, of: data.kata.length })}
      </p>
      {target && (
        <button
          type="button"
          className="kid-btn secondary peraga-replay"
          onClick={() => sayWord(target)}
        >
          {t('play.peraga.listenAgain')}
        </button>
      )}
      <div className="peraga-cards">
        {data.kata.map((k) => (
          <button
            key={k.en}
            type="button"
            className={`peraga-card${seen.includes(k.en) ? ' is-seen' : ''}${done || (quiz > order.indexOf(k.en) && quiz >= 0) ? ' is-picked' : ''}${wiggle === k.en ? ' is-wiggle' : ''}`}
            onClick={() => tap(k)}
            aria-label={`${k.en}, ${k.id}`}
          >
            <PeragaPicture foto={k.foto} gambar={k.gambar} alt={k.id} size={96} />
            <span className="peraga-card-name" lang="en">
              {k.en}
            </span>
            <span className="peraga-card-sub">{k.id}</span>
          </button>
        ))}
      </div>
      {!target && !done && all && (
        <button
          type="button"
          className="kid-btn peraga-next"
          onClick={() => {
            setQuiz(0);
            speak(t('play.peraga.listenTap'), { onEnd: () => sayWord(order[0]!) });
          }}
        >
          {t('play.peraga.tryAsk')}
        </button>
      )}
      {done && <PeragaEnd aha={data.aha} tutup={data.tutup} />}
    </div>
  );
}
