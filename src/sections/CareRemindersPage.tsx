import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Loader2, Droplets, Sparkles, Scissors, RefreshCw } from 'lucide-react';
import { db, isMockMode } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import type { CareReminder } from '@/types';
import { trackEvent } from '@/lib/appHelpers';

type Row = CareReminder & { plants?: { name: string; image_url: string | null } | null };

const typeMeta: Record<
  CareReminder['type'],
  { label: string; icon: typeof Droplets; color: string }
> = {
  water: { label: '浇水', icon: Droplets, color: 'text-sky-500' },
  fertilizer: { label: '施肥', icon: Sparkles, color: 'text-amber-600' },
  prune: { label: '修剪', icon: Scissors, color: 'text-stone-600' },
  repot: { label: '换盆', icon: RefreshCw, color: 'text-emerald-600' },
};

function unitLabel(u: CareReminder['unit']) {
  if (u === 'day') return '天';
  if (u === 'week') return '周';
  return '月';
}

function formatNext(next: string | null) {
  if (!next) return '未设置日期';
  const d = new Date(next);
  if (Number.isNaN(d.getTime())) return next;
  const now = new Date();
  const dayStart = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.ceil((dayStart(d) - dayStart(now)) / (86400 * 1000));
  if (diff < 0) return `已逾期 ${Math.abs(diff)} 天`;
  if (diff === 0) return '今天';
  if (diff === 1) return '明天';
  return `${diff} 天后`;
}

export function CareRemindersPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    trackEvent('page_view', { page: 'care_reminders' });
    void load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const user = await db.getUser();
      if (!user && !isMockMode) {
        navigate('/login', { replace: true });
        return;
      }
      if (isMockMode) {
        setRows([]);
        toast.message('当前为演示模式：提醒依赖 Supabase care_reminders 表');
        return;
      }
      const list = await db.listUserReminders(user!.id);
      setRows(list);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function toggleEnabled(r: Row) {
    if (isMockMode) return;
    try {
      await db.updateReminder(r.id, { enabled: !r.enabled });
      setRows((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x))
      );
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '更新失败');
    }
  }

  return (
    <div className="min-h-screen bg-background pb-10 animate-fadeIn">
      <header className="h-[56px] bg-card/80 backdrop-blur-md flex items-center px-4 sticky top-0 z-30 border-b border-border">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors active:scale-95"
        >
          <ArrowLeft size={24} className="text-foreground" />
        </button>
        <h1 className="flex-1 text-center text-[18px] font-bold text-foreground">养护提醒</h1>
        <div className="w-10" />
      </header>

      <div className="max-w-md mx-auto p-4 space-y-3">
        <p className="text-[13px] text-muted-foreground px-1">
          按「我的植物」中设置的提醒展示；点击卡片可进入植物详情管理。
        </p>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="animate-spin text-[#4CAF50]" size={36} />
            <p className="text-[14px] text-muted-foreground">加载提醒中...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6 bg-card rounded-2xl shadow-sm">
            <div className="w-16 h-16 rounded-full bg-[#E3F2FD] flex items-center justify-center mb-4">
              <Bell size={32} className="text-[#4CAF50]" />
            </div>
            <p className="text-[16px] font-bold text-foreground">暂无养护提醒</p>
            <p className="text-[14px] text-muted-foreground mt-2">
              在植物详情页添加浇水、施肥等提醒后，会显示在这里。
            </p>
            <button
              type="button"
              onClick={() => navigate('/my-plants')}
              className="mt-6 w-full h-12 rounded-2xl bg-[#4CAF50] text-white font-bold shadow-lg shadow-green-100 hover:bg-[#43A047] active:scale-[0.98] transition-all"
            >
              去我的植物
            </button>
          </div>
        ) : (
          rows.map((r) => {
            const meta = typeMeta[r.type] || typeMeta.water;
            const Icon = meta.icon;
            const plantName = r.plants?.name || '植物';
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => navigate(`/my-plants/${r.plant_id}`)}
                className="w-full text-left bg-card rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-4 flex gap-3 active:scale-[0.99] transition-transform border border-border"
              >
                <div className="w-14 h-14 rounded-xl bg-[#F1F8E9] flex items-center justify-center flex-shrink-0">
                  {r.plants?.image_url ? (
                    <img
                      src={r.plants.image_url}
                      alt=""
                      className="w-full h-full rounded-xl object-cover"
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Icon size={26} className={meta.color} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-semibold text-foreground truncate">{plantName}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#E8F5E9] text-[#2E7D32] flex-shrink-0">
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    每 {r.frequency}
                    {unitLabel(r.unit)} · 下次 {formatNext(r.next_reminder)}
                  </p>
                </div>
                <div
                  className="flex flex-col items-end justify-center gap-1 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[11px] text-muted-foreground">启用</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={r.enabled}
                    onClick={() => void toggleEnabled(r)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      r.enabled ? 'bg-[#4CAF50]' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-card shadow transition-transform ${
                        r.enabled ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
