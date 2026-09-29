import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import type { Color } from '@little-coder/engine';
import { useFetch } from '../auth/useApi';
import { useSession } from '../auth/session';
import { ChildJoin } from './ChildJoin';
import { ChildLogin } from './ChildLogin';
import { Goodbye } from './Goodbye';
import { LeaderboardPage } from './Leaderboard';
import { Library } from './Library';
import { PracticeRoute } from './Practice';
import { ProfilePage } from './Profile';
import { TopicPage } from './Topic';
import { flushPractice, pullPractice } from './sync';
import './play.css';

/** Area anak (/play): wajib masuk dengan sandi gambar (D-016). Tanpa link keluar, iklan, atau chat. */
export function PlayApp() {
  const session = useSession('child');
  const childId = session?.user.id;
  const me = useFetch<{ momoColor?: Color }>('child', childId ? '/auth/me' : null);

  useEffect(() => {
    if (!childId) return;
    void pullPractice(childId).then(() => flushPractice(childId));
  }, [childId]);

  if (!session) {
    return (
      <div className="kid-app">
        <Routes>
          <Route path="gabung" element={<ChildJoin />} />
          <Route path="*" element={<ChildLogin />} />
        </Routes>
      </div>
    );
  }
  const color = me.data?.momoColor ?? 'ungu';
  return (
    <div className="kid-app">
      <Routes>
        <Route index element={<Library momoColor={color} />} />
        <Route path="latihan/:token" element={<PracticeRoute momoColor={color} />} />
        <Route path="profil" element={<ProfilePage momoColor={color} />} />
        <Route path="peringkat" element={<LeaderboardPage momoColor={color} />} />
        <Route path="topik/:token" element={<TopicPage momoColor={color} />} />
        <Route path="selesai" element={<Goodbye momoColor={color} />} />
        <Route path="*" element={<Navigate to="/play" replace />} />
      </Routes>
    </div>
  );
}
