import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isMockMode, supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';

const STRONG_PWD = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isMockMode) {
      setReady(true);
      return;
    }

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      // detectSessionInUrl=true 时，重置链接中的 token 会自动换成 session
      if (!data.session?.user) {
        toast.error('重置链接无效或已过期，请重新申请');
      }
      setReady(true);
    };

    void init();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!STRONG_PWD.test(password)) {
      toast.error('密码至少 8 位，且需同时包含字母与数字');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('两次密码输入不一致');
      return;
    }
    if (isMockMode) {
      toast.message('演示模式不支持真实改密');
      navigate('/login', { replace: true });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('密码已重置，请使用新密码登录');
      await supabase.auth.signOut();
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '重置失败';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#4CAF50]/20 border-t-[#4CAF50]" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-md rounded-3xl border-primary/20 dark:border-primary/30 shadow-lg shadow-green-100/50 dark:shadow-black/30">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-[#2E7D32] dark:text-[#81C784]">重置密码</CardTitle>
          <CardDescription className="text-center">设置一个新的登录密码</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">新密码</Label>
              <Input
                id="new-password"
                name="new_password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">确认新密码</Label>
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
              disabled={submitting}
            >
              {submitting ? '提交中...' : '更新密码'}
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              想起密码了？{' '}
              <Link to="/login" className="text-[#4CAF50] font-medium hover:underline">
                返回登录
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
