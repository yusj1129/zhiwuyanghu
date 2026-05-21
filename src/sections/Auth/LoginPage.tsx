import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase, isMockMode, describeAuthError } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from '@/lib/toast';
import { readRememberedCredential, saveRememberedCredential, trackEvent } from '@/lib/appHelpers';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/';

  useEffect(() => {
    const saved = readRememberedCredential();
    if (saved?.email) {
      setEmail(saved.email);
      setPassword(saved.password || '');
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('请输入邮箱');
      return;
    }
    if (!password) {
      toast.error('请输入密码');
      return;
    }
    if (isMockMode) {
      saveRememberedCredential(email.trim(), password, rememberMe);
      toast.message('当前为演示模式，已跳过鉴权直接进入应用');
      navigate(from, { replace: true });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        toast.error(describeAuthError(error));
        return;
      }

      saveRememberedCredential(email.trim(), password, rememberMe);
      trackEvent('auth_login_ok');
      toast.success('登录成功！');
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '登录异常';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error('请先填写注册邮箱');
      return;
    }
    if (isMockMode) {
      toast.message('演示模式不支持重置邮件，请先配置 Supabase 环境变量');
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      toast.success('重置邮件已发送，请查收邮箱');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '发送失败';
      toast.error(msg);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-md rounded-3xl border-primary/20 dark:border-primary/30 shadow-lg shadow-green-100/50 dark:shadow-black/30">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-[#2E7D32] dark:text-[#81C784]">欢迎回来</CardTitle>
          <CardDescription className="text-center">使用邮箱密码登录</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {isMockMode && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-3 py-2 text-[12px] leading-relaxed">
                当前为演示模式：输入任意邮箱密码可直接进入体验。若需真实注册登录，请在 <code>.env.local</code> 配置
                <code>VITE_SUPABASE_URL</code> 与 <code>VITE_SUPABASE_ANON_KEY</code>。
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">密码</Label>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      void handleForgotPassword();
                    } catch {
                      toast.error('操作异常');
                    }
                  }}
                  className="text-[13px] text-[#4CAF50] hover:underline"
                >
                  忘记密码？
                </button>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="rounded-xl h-11"
              />
            </div>
            <label
              htmlFor="remember-me"
              className="flex items-center gap-2 text-[14px] text-muted-foreground cursor-pointer select-none"
            >
              <input
                id="remember-me"
                name="remember_me"
                type="checkbox"
                autoComplete="off"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-[#C8E6C9] accent-[#4CAF50] w-4 h-4"
              />
              记住密码（本地加密存储）
            </label>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full h-12 rounded-2xl bg-[#4CAF50] hover:bg-[#43A047] text-white font-semibold disabled:opacity-60 active:scale-[0.99] transition-all"
              disabled={loading}
            >
              {loading ? '登录中...' : '登录'}
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              还没有账号？{' '}
              <Link to="/register" className="text-[#4CAF50] font-medium hover:underline">
                立即注册
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
