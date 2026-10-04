import { Component, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Momo } from '../components/Momo';
import { t } from '../i18n';

/**
 * Pengaman area anak: bila satu halaman gagal ditampilkan (mis. soal rusak dari data), anak melihat Momo dan
 * tombol kembali ke Pustaka, bukan layar putih. Direset saat alamat halaman berubah (`resetKey`).
 */
export class PlayErrorBoundary extends Component<
  { resetKey: string; children: ReactNode },
  { failedAt: string | null }
> {
  override state = { failedAt: null as string | null };

  static getDerivedStateFromError() {
    return { failedAt: '' };
  }

  override componentDidCatch(error: unknown) {
    this.setState({ failedAt: this.props.resetKey });
    console.error('[play] halaman gagal ditampilkan', error);
  }

  override componentDidUpdate(prev: { resetKey: string }) {
    if (this.state.failedAt !== null && prev.resetKey !== this.props.resetKey)
      this.setState({ failedAt: null });
  }

  override render() {
    if (this.state.failedAt === null) return this.props.children;
    return (
      <main className="board-empty play-crash" role="alert">
        <Momo own mood="curious" size={120} />
        <h1>{t('play.crash.title')}</h1>
        <p className="kid-note">{t('play.crash.text')}</p>
        <Link to="/play" className="kid-btn">
          {t('play.crash.back')}
        </Link>
      </main>
    );
  }
}
