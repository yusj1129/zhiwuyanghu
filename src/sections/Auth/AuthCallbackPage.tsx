import { useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { isMockMode, supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (isMockMode) {
      navigate('/', { replace: true });
      return;
    }

    const error = searchParams.get('error_description') || searchParams.get('error');
    if (error) {
      toast.error(decodeURIComponent(error));
      navigate('/login', { replace: true });
      return;
    }

    const next = searchParams.get('next') || '/';

    const settleAuth = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        toast.error(sessionError.message);
        navigate('/login', { replace: true });
        return;
      }

      if (!data.session?.user) {
        // OAuth/邮箱回跳有时会稍晚到达，给一次短暂重试窗口
        setTimeout(async () => {
          const { data: secondTry } = await supabase.auth.getSession();
          if (secondTry.session?.user) {
            navigate(next, { replace: true });
          } else {
            toast.error('登录会话未建立，请重试');
            navigate('/login', { replace: true });
          }
        }, 400);
        return;
      }

      toast.success('登录成功');
      navigate(next, { replace: true });
    };

    void settleAuth();
  }, [navigate, searchParams]);

  if (isMockMode) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#4CAF50]/20 border-t-[#4CAF50]" />
    </div>
  );
}
