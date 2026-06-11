import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { BottomNav } from '@/components/BottomNav';
import { HomePage } from '@/sections/HomePage';
import { MyPlantsPage } from '@/sections/MyPlantsPage';
import { PlantDetailPage } from '@/sections/PlantDetailPage';
import { GuidesPage } from '@/sections/GuidesPage';
import { CommunityPage } from '@/sections/CommunityPage';
import { ProfilePage } from '@/sections/ProfilePage';
import { LoginPage } from '@/sections/Auth/LoginPage';
import { RegisterPage } from '@/sections/Auth/RegisterPage';
import { AuthCallbackPage } from '@/sections/Auth/AuthCallbackPage';
import { ResetPasswordPage } from '@/sections/Auth/ResetPasswordPage';
import { RequireAuth } from '@/components/RequireAuth';
import { FavoritesPage } from '@/sections/FavoritesPage';
import { CareRemindersPage } from '@/sections/CareRemindersPage';
import { VarietyLibraryPage } from '@/sections/VarietyLibraryPage';
import { HelpRequestPage } from '@/sections/HelpRequestPage';
import { ModerationPage } from '@/sections/ModerationPage';
import { isMockMode } from '@/lib/supabase';
import type { TabType } from '@/types';
import type { Session } from '@supabase/supabase-js';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const location = useLocation();

  useEffect(() => {
    const syncProfile = async (user: Session['user']) => {
      // 根据 auth.user 的 user_metadata 填充 profiles；即使字段为空也使用默认值保证可用。
      const fullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        '绿植爱好者';

      const avatarUrl =
        user.user_metadata?.avatar_url ||
        user.user_metadata?.avatarUrl ||
        null;

      const bio = user.user_metadata?.bio ?? null;

      const { error } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          full_name: fullName,
          avatar_url: avatarUrl,
          bio,
        },
        { onConflict: 'id' }
      );

      if (error) {
        // 不阻断 UI：profiles 属于“后续扩展基础设施”，先保证登录态可用。
        console.error(`[Supabase] profile sync failed: ${error.message || JSON.stringify(error)}`);
      }
    };

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) await syncProfile(session.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (event === 'SIGNED_IN' && session?.user) {
        await syncProfile(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 获取当前活动的tab
  const getActiveTab = (): TabType => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path === '/my-plants' || path.startsWith('/my-plants/')) return 'plants';
    if (path === '/community') return 'community';
    if (path === '/profile') return 'profile';
    return 'home';
  };

  // 判断是否显示底部导航栏
  const showBottomNav = ['/', '/my-plants', '/community', '/profile'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-background text-foreground max-w-md mx-auto relative shadow-xl transition-colors duration-200">
      <main className={showBottomNav ? 'pb-[56px]' : ''}>
        <Routes>
          {/* 公开路由 */}
          <Route path="/login" element={!session ? <LoginPage /> : <Navigate to="/" />} />
          <Route path="/register" element={!session ? <RegisterPage /> : <Navigate to="/" />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

          {/* 受保护路由 */}
          <Route path="/" element={<HomePage />} />
          <Route
            path="/my-plants"
            element={
              <RequireAuth>
                <MyPlantsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/my-plants/:id"
            element={
              <RequireAuth>
                <PlantDetailPage />
              </RequireAuth>
            }
          />
          <Route path="/guides" element={<GuidesPage />} />
          <Route path="/variety-library" element={<VarietyLibraryPage />} />
          <Route path="/help" element={<HelpRequestPage />} />
          <Route
            path="/care-reminders"
            element={
              <RequireAuth>
                <CareRemindersPage />
              </RequireAuth>
            }
          />
          <Route path="/community" element={<CommunityPage />} />
          <Route
            path="/profile"
            element={
              isMockMode ? (
                <ProfilePage />
              ) : (
                <RequireAuth>
                  <ProfilePage />
                </RequireAuth>
              )
            }
          />
          <Route
            path="/profile/favorites"
            element={
              <RequireAuth>
                <FavoritesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/profile/moderation"
            element={
              <RequireAuth>
                <ModerationPage />
              </RequireAuth>
            }
          />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      {/* 底部导航栏 */}
      {showBottomNav && (
        <BottomNav
          activeTab={getActiveTab()}
        />
      )}
    </div>
  );
}

export default App;
