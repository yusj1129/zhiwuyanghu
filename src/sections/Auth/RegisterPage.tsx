import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, isMockMode, describeAuthError } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from '@/lib/toast';
import { trackEvent } from '@/lib/appHelpers';

const STRONG_PWD = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      toast.error('邮箱格式不正确');
      return;
    }
    if (!STRONG_PWD.test(password)) {
      toast.error('密码至少 8 位，且需同时包含字母与数字');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('两次密码输入不一致');
      return;
    }
    if (isMockMode) {
      toast.message('当前为演示模式，注册不会创建真实账号，已进入应用体验');
      navigate('/', { replace: true });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: em,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: em.split('@')[0],
          },
        },
      });

      if (error) {
        toast.error(describeAuthError(error));
        return;
      }

      //trackEvent('auth_register_ok');

      if (data.session) {
        toast.success('注册成功，已自动登录');
        navigate('/', { replace: true });
        return;
      }

      toast.success('注册成功！若项目开启邮箱验证，请查收邮件后登录。');
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '注册异常';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-md rounded-3xl border-primary/20 dark:border-primary/30 shadow-lg shadow-green-100/50 dark:shadow-black/30">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-[#2E7D32] dark:text-[#81C784]">立即加入</CardTitle>
          <CardDescription className="text-center">密码至少 8 位，需包含字母与数字</CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            {isMockMode && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-3 py-2 text-[12px] leading-relaxed">
                当前为演示模式：点击注册会直接进入体验，不会创建真实账号。
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
                autoComplete="email"
                required
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">确认密码</Label>
              <Input
                id="confirm-password"
                name="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                className="rounded-xl h-11"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full h-12 rounded-2xl bg-[#4CAF50] hover:bg-[#43A047] text-white font-semibold disabled:opacity-60"
              disabled={loading}
            >
              {loading ? '注册中...' : '注册'}
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              已有账号？{' '}
              <Link to="/login" className="text-[#4CAF50] font-medium hover:underline">
                返回登录
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
