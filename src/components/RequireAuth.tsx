import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type Props = { children: React.ReactNode };

/**
 * 未登录访问需登录页面时跳转登录，并保留来源路径便于登录后返回。
 */
export function RequireAuth({ children }: Props) {
  const location = useLocation();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    const timeoutId = window.setTimeout(() => {
      if (mounted) {
        setSession(null);
      }
    }, 10000);

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      window.clearTimeout(timeoutId);
      setSession(s);
    }).catch(() => {
      if (!mounted) return;
      window.clearTimeout(timeoutId);
      setSession(null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#4CAF50]/20 border-t-[#4CAF50]" />
      </div>
    );
  }

  if (!session?.user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
