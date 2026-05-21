import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  ChevronRight,
  Heart,
  FileText,
  Bell,
  BookOpen,
  MessageSquare,
  Info,
  Settings,
  Moon,
  Sun,
  Camera,
  X,
  LogOut,
  User as UserIcon,
  ShieldCheck,
} from 'lucide-react';
import { supabase, isMockMode, db } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requireOnline, trackEvent, withRetry } from '@/lib/appHelpers';

const PROFILE_FETCH_TIMEOUT_MS = 12000;

// 功能列表项
function MenuItem({ 
  icon: Icon, 
  label, 
  onClick,
  showArrow = true,
  className = ""
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  onClick?: () => void;
  showArrow?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-4 min-h-[52px] bg-card transition-colors duration-200 active:bg-accent hover:bg-muted/80 dark:hover:bg-muted/50 rounded-none ${className}`}
    >
      <div className="flex items-center gap-3">
        <Icon size={22} className="text-[#4CAF50]" />
        <span className="text-[16px] text-foreground dark:text-foreground">{label}</span>
      </div>
      {showArrow && <ChevronRight size={20} className="text-muted-foreground dark:text-muted-foreground" />}
    </button>
  );
}

/** 编辑资料：头像走 Supabase Storage `avatars` 桶，路径 `userId/timestamp.ext` */
function EditProfileModal({
  user,
  onClose,
  onUpdate,
}: {
  user: User;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [bio, setBio] = useState(user?.user_metadata?.bio || '');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(user?.user_metadata?.avatar_url || null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('请输入昵称');
      return;
    }
    if (!requireOnline()) return;
    setLoading(true);
    try {
      let avatarUrl = user.user_metadata?.avatar_url as string | undefined;

      if (selectedFile && !isMockMode) {
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        avatarUrl = await withRetry(() => db.uploadFile('avatars', filePath, selectedFile));
      }

      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          bio: bio.trim(),
          avatar_url: avatarUrl,
        },
      });
      if (error) throw error;

      await supabase.from('profiles').upsert({
        id: user.id,
        full_name: fullName.trim(),
        bio: bio.trim() || null,
        avatar_url: avatarUrl ?? null,
      });

      trackEvent('profile_update');
      toast.success('个人资料已更新');
      onUpdate();
      onClose();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '更新失败';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6"
      onClick={onClose}
    >
      <div 
        className="w-full bg-card rounded-[16px] overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-[18px] font-medium text-foreground">编辑资料</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-muted">
            <X size={24} className="text-muted-foreground" />
          </button>
        </div>
        
        <form onSubmit={handleUpdate} className="p-4 space-y-4">
          <div className="flex flex-col items-center mb-4">
            <div className="relative">
              <div className="w-[80px] h-[80px] rounded-full bg-background flex items-center justify-center text-muted-foreground overflow-hidden">
                {previewUrl ? (
                  <img src={previewUrl} alt="头像" className="w-full h-full object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon size={40} />
                )}
              </div>
              <label
                htmlFor="profile-avatar-file"
                className="absolute bottom-0 right-0 w-8 h-8 bg-[#4CAF50] rounded-full flex items-center justify-center text-white border-2 border-white cursor-pointer hover:bg-[#43A047] transition-colors"
              >
                <Camera size={16} />
                <input
                  id="profile-avatar-file"
                  name="avatar"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="full_name">昵称</Label>
            <Input
              id="full_name"
              name="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="请输入昵称"
              autoComplete="name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bio">个人签名</Label>
            <textarea
              id="bio"
              name="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="写点什么介绍自己..."
              className="w-full h-[80px] bg-background rounded-lg p-3 text-[15px] text-foreground placeholder:text-muted-foreground outline-none resize-none focus:ring-2 focus:ring-[#4CAF50]"
              autoComplete="off"
            />
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full h-12 rounded-xl bg-[#4CAF50] hover:bg-[#43A047] disabled:opacity-60" disabled={loading}>
              {loading ? '保存中...' : '保存'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SettingsModal({ user, onClose }: { user: User | null; onClose: () => void }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [bindEmail, setBindEmail] = useState(user?.email || '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user?.email) setBindEmail(user.email);
  }, [user?.email]);

  useEffect(() => {
    setThemeReady(true);
  }, []);

  const isDarkMode = themeReady && resolvedTheme === 'dark';

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-[50px] h-[28px] rounded-full transition-colors duration-200 ${
        checked ? 'bg-[#4CAF50]' : 'bg-muted'
      }`}
    >
      <div
        className={`w-[24px] h-[24px] bg-card rounded-full shadow-md transition-transform duration-200 ${
          checked ? 'translate-x-[24px]' : 'translate-x-[2px]'
        }`}
      />
    </button>
  );

  const persistNotifications = async (v: boolean) => {
    setNotifications(v);
    if (isMockMode || !user) return;
    try {
      await supabase.from('profiles').upsert({ id: user.id, notifications_enabled: v });
      trackEvent('profile_notifications', { enabled: v });
    } catch {
      toast.error('同步通知偏好失败（请确认已执行 migrations 中的 profiles.notifications_enabled）');
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error('新密码至少 8 位');
      return;
    }
    if (isMockMode) {
      toast.error('演示模式无法修改密码');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('密码已更新');
      setNewPassword('');
      trackEvent('profile_password_change');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '修改失败';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleBindEmail = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bindEmail.trim())) {
      toast.error('邮箱格式不正确');
      return;
    }
    if (isMockMode) {
      toast.error('演示模式无法绑定邮箱');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: bindEmail.trim() });
      if (error) throw error;
      toast.success('已提交邮箱变更，请按邮件提示确认');
      trackEvent('profile_email_update');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '绑定失败';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const clearCache = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      const keep = new Set(['sb-', 'supabase.auth']);
      const keepKeys = new Set(['plant-app-theme']);
      Object.keys(localStorage).forEach((k) => {
        if (keepKeys.has(k)) return;
        if (![...keep].some((p) => k.startsWith(p))) {
          localStorage.removeItem(k);
        }
      });
      toast.success('缓存已清理（已保留登录态）');
      trackEvent('profile_clear_cache');
    } catch {
      toast.error('清理失败');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4 py-6" onClick={onClose}>
      <div
        className="w-full max-w-md bg-card dark:bg-card rounded-2xl overflow-hidden animate-scaleIn max-h-[90vh] overflow-y-auto shadow-xl border border-transparent dark:border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border dark:border-border sticky top-0 bg-card dark:bg-card z-10">
          <h3 className="text-[18px] font-medium text-foreground dark:text-foreground">设置</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-muted dark:hover:bg-muted">
            <X size={24} className="text-muted-foreground dark:text-muted-foreground" />
          </button>
        </div>

        <div className="py-2 px-4 space-y-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              {isDarkMode ? <Moon size={22} className="text-[#81C784]" /> : <Sun size={22} className="text-[#4CAF50]" />}
              <span className="text-[16px] text-foreground dark:text-foreground">深色模式</span>
            </div>
            <Toggle
              checked={isDarkMode}
              onChange={(on) => {
                setTheme(on ? 'dark' : 'light');
                trackEvent('profile_theme_toggle', { theme: on ? 'dark' : 'light' });
              }}
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Bell size={22} className="text-[#4CAF50]" />
              <span className="text-[16px] text-foreground dark:text-foreground">接收通知</span>
            </div>
            <Toggle checked={notifications} onChange={(v) => void persistNotifications(v)} />
          </div>

          <div className="border border-border dark:border-border rounded-xl p-3 space-y-2">
            <Label htmlFor="settings-bind-email" className="text-[13px] dark:text-foreground">
              绑定 / 更换邮箱
            </Label>
            <Input
              id="settings-bind-email"
              name="bind_email"
              value={bindEmail}
              onChange={(e) => setBindEmail(e.target.value)}
              className="rounded-xl h-10"
              type="email"
              autoComplete="email"
            />
            <Button type="button" variant="outline" size="sm" className="w-full rounded-xl" disabled={busy} onClick={() => void handleBindEmail()}>
              保存邮箱
            </Button>
          </div>

          <div className="border border-border dark:border-border rounded-xl p-3 space-y-2">
            <Label htmlFor="settings-new-password" className="text-[13px] dark:text-foreground">
              修改密码
            </Label>
            <Input
              id="settings-new-password"
              name="new_password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="新密码（≥8位）"
              className="rounded-xl h-10"
              autoComplete="new-password"
            />
            <Button type="button" className="w-full rounded-xl bg-[#4CAF50]" disabled={busy} onClick={() => void handleChangePassword()}>
              更新密码
            </Button>
          </div>

          <button
            type="button"
            className="w-full flex items-center justify-between px-2 py-4 rounded-xl hover:bg-background dark:hover:bg-muted/40 transition-colors"
            onClick={() => void clearCache()}
          >
            <span className="text-[16px] text-foreground">清除缓存</span>
            <span className="text-[14px] text-muted-foreground">本地数据</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6" onClick={onClose}>
      <div className="w-full max-w-sm bg-card rounded-2xl p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-[18px] font-bold text-foreground mb-2">绿植养护助手</h3>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">
          记录浇水、识别植物、查阅养护百科。版本 {import.meta.env.VITE_APP_VERSION || '0.0.0'}
        </p>
        <p className="text-[13px] text-muted-foreground">联系：可在 README 中补充官方邮箱或客服入口</p>
        <Button type="button" className="w-full mt-6 rounded-xl bg-[#4CAF50] text-white hover:bg-[#43A047]" onClick={onClose}>
          知道了
        </Button>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const navigate = useNavigate();

  const getProfile = async () => {
    setLoadError('');
    if (isMockMode) {
      setUser({
        id: '00000000-0000-0000-0000-000000000001',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'demo@example.com',
        email_confirmed_at: new Date().toISOString(),
        phone: '',
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {
          full_name: '绿植爱好者 (Demo)',
          bio: '这是一个演示账号，您可以在 .env.local 中配置 Supabase 以使用真实功能。',
          avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
        },
        identities: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        factors: null,
      } as unknown as User);
      setIsModerator(true);
      setLoading(false);
      return;
    }

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        window.setTimeout(() => reject(new Error('个人信息请求超时，请检查网络后重试')), PROFILE_FETCH_TIMEOUT_MS)
      );
      const result = await Promise.race([
        supabase.auth.getUser(),
        timeoutPromise,
      ]);
      const currentUser = (result as { data: { user: User | null } }).data.user;
      if (currentUser) {
        setUser(currentUser);
        const mod = await db.getProfileModeratorFlag(currentUser.id);
        setIsModerator(mod);
      } else {
        setLoadError('当前未登录，请先登录后查看个人中心');
        setIsModerator(false);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '加载个人信息失败';
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getProfile();
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error('退出登录失败');
      } else {
        trackEvent('auth_logout');
        toast.success('已安全退出');
        navigate('/login', { replace: true });
      }
    } catch {
      toast.error('退出异常');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4CAF50]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10 animate-fadeIn transition-colors duration-200">
      {/* 顶部个人信息区域 */}
      <header className="relative bg-card px-4 pt-12 pb-8 rounded-b-[24px] shadow-[0_4px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.25)] overflow-hidden border-b border-border">
        <div className="absolute top-[-40px] right-[-20px] w-40 h-40 bg-[#E8F5E9] dark:bg-primary/20 rounded-full blur-3xl opacity-60 dark:opacity-30"></div>
        <div className="absolute bottom-[-20px] left-[-20px] w-32 h-32 bg-[#F1F8E9] dark:bg-primary/15 rounded-full blur-2xl opacity-60 dark:opacity-25"></div>
        
        <div className="relative flex flex-col items-center">
          <div className="relative mb-4 group">
            <div className="w-[88px] h-[88px] rounded-full border-4 border-[#E8F5E9] dark:border-primary/30 overflow-hidden shadow-lg transition-transform duration-300 group-hover:scale-105">
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="头像"
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-background flex items-center justify-center text-muted-foreground">
                  <UserIcon size={40} />
                </div>
              )}
            </div>
            <button 
              onClick={() => setShowEditModal(true)}
              className="absolute bottom-0 right-0 w-8 h-8 bg-[#4CAF50] rounded-full flex items-center justify-center text-white border-2 border-white shadow-md transition-transform duration-200 active:scale-90"
            >
              <Camera size={16} />
            </button>
          </div>
          
          <h2 className="text-[22px] font-bold text-foreground dark:text-foreground mb-1">
            {user?.user_metadata?.full_name || user?.email?.split('@')[0] || '绿植爱好者'}
          </h2>
          <p className="text-[14px] text-muted-foreground dark:text-muted-foreground max-w-[80%] text-center line-clamp-2">
            {user?.user_metadata?.bio || '记录植物生长的点点滴滴...'}
          </p>
          
          <div className="flex items-center gap-12 mt-8">
            <div className="flex flex-col items-center">
              <span className="text-[20px] font-bold text-foreground dark:text-foreground">0</span>
              <span className="text-[12px] text-muted-foreground dark:text-muted-foreground">我的植物</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[20px] font-bold text-foreground dark:text-foreground">0</span>
              <span className="text-[12px] text-muted-foreground dark:text-muted-foreground">养护天数</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[20px] font-bold text-foreground dark:text-foreground">0</span>
              <span className="text-[12px] text-muted-foreground dark:text-muted-foreground">社区动态</span>
            </div>
          </div>
        </div>
      </header>

      {/* 菜单列表 */}
      <div className="mt-4 px-4 space-y-3">
        {loadError && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
            {loadError}
          </div>
        )}
        <div className="bg-card dark:bg-card rounded-[16px] overflow-hidden shadow-sm dark:shadow-md dark:border dark:border-border">
          <MenuItem icon={Heart} label="我的收藏" onClick={() => navigate('/profile/favorites')} />
          <MenuItem icon={FileText} label="养护报告" onClick={() => navigate('/care-reminders')} />
          <MenuItem icon={Bell} label="消息通知" onClick={() => navigate('/community')} />
        </div>

        {isModerator && (
          <div className="bg-card dark:bg-card rounded-[16px] overflow-hidden shadow-sm dark:shadow-md dark:border dark:border-amber-200/60">
            <MenuItem
              icon={ShieldCheck}
              label="内容审核"
              onClick={() => navigate('/profile/moderation')}
              className="border-l-4 border-l-amber-500"
            />
          </div>
        )}

        <div className="bg-card dark:bg-card rounded-[16px] overflow-hidden shadow-sm dark:shadow-md dark:border dark:border-border">
          <MenuItem icon={BookOpen} label="养护指南" onClick={() => navigate('/guides')} />
          <MenuItem icon={MessageSquare} label="我的动态" onClick={() => navigate('/community')} />
        </div>

        <div className="bg-card dark:bg-card rounded-[16px] overflow-hidden shadow-sm dark:shadow-md dark:border dark:border-border">
          <MenuItem icon={Settings} label="设置" onClick={() => setShowSettings(true)} />
          <MenuItem icon={Info} label="关于我们" onClick={() => setShowAbout(true)} />
        </div>

        <div className="mt-6">
          <Button 
            variant="outline" 
            className="w-full h-12 rounded-xl text-red-500 border-red-100 hover:bg-destructive/10 hover:text-red-600 active:scale-[0.98] transition-all"
            onClick={handleLogout}
          >
            <LogOut size={18} className="mr-2" />
            退出登录
          </Button>
        </div>
      </div>

      {/* 弹窗组件 */}
      {showEditModal && user && !isMockMode && (
        <EditProfileModal user={user} onClose={() => setShowEditModal(false)} onUpdate={getProfile} />
      )}
      {showEditModal && isMockMode && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
          <div className="bg-card rounded-2xl p-6 max-w-sm">
            <p className="text-[15px] text-foreground">演示模式下请配置 Supabase 后编辑真实资料。</p>
            <Button className="w-full mt-4 rounded-xl bg-[#4CAF50]" onClick={() => setShowEditModal(false)}>
              关闭
            </Button>
          </div>
        </div>
      )}
      {showSettings && <SettingsModal user={user} onClose={() => setShowSettings(false)} />}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </div>
  );
}
