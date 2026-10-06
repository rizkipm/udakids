import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { Color, MomoLook } from '@little-coder/engine';
import { loadVoice } from '../audio/speech';
import { useFetch } from '../auth/useApi';
import { useSession } from '../auth/session';
import { ChildJoin } from './ChildJoin';
import { ChildLogin } from './ChildLogin';
import { Goodbye } from './Goodbye';
import { LeaderboardPage } from './Leaderboard';
import { ContestHome, ContestPlay } from './contest/ContestPages';
import { Library } from './Library';
import { PracticeRoute } from './Practice';
import { ProfilePage } from './Profile';
import { TopicPage } from './Topic';
import { LessonPage } from './Lesson';
import { MomoPage } from './MomoPage';
import { OwnMomoLook } from '../components/Momo';
import { Seo } from '../components/Seo';
import { PlayErrorBoundary } from './PlayErrorBoundary';
import { flushPractice, pullPractice } from './sync';
import './play.css';

/** Area anak (/play): wajib masuk dengan sandi gambar (D-016). Tanpa link keluar, iklan, atau chat. */
export function PlayApp() {
  const session = useSession('child');
  const { pathname } = useLocation();
  const childId = session?.user.id;
  const me = useFetch<{ momoColor?: Color; momoLook?: MomoLook | null }>(
    'child',
    childId ? '/auth/me' : null,
  );

  // Daftar kalimat suara Momo (D-035); salinan terakhir dipakai saat offline.
  useEffect(() => {
    void loadVoice();
  }, []);

  useEffect(() => {
    if (!childId) return;
    void pullPractice(childId).then(() => flushPractice(childId));
  }, [childId]);

  if (!session) {
    return (
      <div className="kid-app">
        {/* Area anak tidak dipromosikan ke mesin pencari (pemasaran hanya untuk orang tua, PRD A17). */}
        <Seo title="Area Main Anak" noindex />
        <Routes>
          <Route path="gabung" element={<ChildJoin />} />
          <Route path="daftar" element={<ChildJoin self />} />
          <Route path="*" element={<ChildLogin />} />
        </Routes>
      </div>
    );
  }
  const color = me.data?.momoColor ?? 'ungu';
  const look = me.data?.momoLook ?? null;
  return (
    <OwnMomoLook look={look}>
      <Seo title="Arena Belajar Momo" noindex />
      <div className="kid-app">
        <PlayErrorBoundary resetKey={pathname}>
          <Routes>
            <Route
              path="momo"
              element={<MomoPage momoColor={color} momoLook={look} onSaved={me.reload} />}
            />
            <Route index element={<Library momoColor={color} />} />
            <Route path="latihan/:token" element={<PracticeRoute momoColor={color} />} />
            <Route path="profil" element={<ProfilePage momoColor={color} />} />
            <Route path="peringkat" element={<LeaderboardPage momoColor={color} />} />
            <Route path="lomba" element={<ContestHome momoColor={color} />} />
            <Route path="lomba/:id" element={<ContestPlay momoColor={color} />} />
            <Route path="topik/:token" element={<TopicPage momoColor={color} />} />
            <Route path="belajar/:token" element={<LessonPage momoColor={color} />} />
            <Route path="selesai" element={<Goodbye momoColor={color} />} />
            <Route path="*" element={<Navigate to="/play" replace />} />
          </Routes>
        </PlayErrorBoundary>
      </div>
    </OwnMomoLook>
  );
}
