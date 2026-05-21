import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Droplets,
  FlaskConical,
  Package,
  Trash2,
  Calendar,
  Bell,
  History,
  CheckCircle2,
  Edit2,
  Camera,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { db, isMockMode } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import type { Plant, PlantLog, CareReminder } from '@/types';
import { isValidDateInput, requireOnline, withRetry, trackEvent } from '@/lib/appHelpers';
import { VarietySpeciesFamilyFields } from '@/components/VarietySpeciesFamilyFields';

const WATER_LOG_PAGE = 15;

export function PlantDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddLog, setShowAddLog] = useState(false);
  const [showReminderSettings, setShowReminderSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [logContent, setLogContent] = useState('');
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [logSubmitting, setLogSubmitting] = useState(false);
  const [waterAnimation, setWaterAnimation] = useState(false);

  /** 浇水历史：展开 + 分页 */
  const [waterLogsExpanded, setWaterLogsExpanded] = useState(false);
  const [waterLogs, setWaterLogs] = useState<PlantLog[]>([]);
  const [waterLogFrom, setWaterLogFrom] = useState(0);
  const [waterLogsLoading, setWaterLogsLoading] = useState(false);
  const [waterLogsHasMore, setWaterLogsHasMore] = useState(true);

  const [editForm, setEditForm] = useState({
    name: '',
    species: '',
    family: '',
    water_frequency: '7',
    next_water_date: '',
  });
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [reminderEnabled, setReminderEnabled] = useState(true);
  /** 提前天数：0=浇水日当天提醒，1=提前一天 */
  const [remindAdvanceDays, setRemindAdvanceDays] = useState(0);
  const [reminderSaving, setReminderSaving] = useState(false);

  const notifiedRef = useRef<string | null>(null);

  const fetchPlant = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await withRetry(() => db.getPlantDetail(id));
      if (!data) {
        toast.error('未找到该植物');
        navigate('/my-plants');
        return;
      }
      setPlant(data);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error('加载失败: ' + msg);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    void fetchPlant();
  }, [fetchPlant]);

  // 同步提醒表单
  useEffect(() => {
    if (!plant) return;
    const r = plant.care_reminders?.find((x) => x.type === 'water');
    setReminderEnabled(r?.enabled ?? true);
    setRemindAdvanceDays(r?.remind_advance_days ?? 0);
  }, [plant]);

  // 打开编辑时预填
  useEffect(() => {
    if (!showEditModal || !plant) return;
    setEditForm({
      name: plant.name,
      species: plant.species || '',
      family: plant.family || '',
      water_frequency: String(plant.water_frequency || 7),
      next_water_date: plant.next_water_date ? plant.next_water_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    });
    setEditFile(null);
    setEditPreview(null);
  }, [showEditModal, plant]);

  const loadWaterLogs = useCallback(
    async (reset: boolean) => {
      if (!plant || isMockMode) return;
      const from = reset ? 0 : waterLogFrom;
      setWaterLogsLoading(true);
      try {
        const batch = await withRetry(() => db.getPlantWaterLogs(plant.id, from, WATER_LOG_PAGE));
        if (reset) {
          setWaterLogs(batch);
          setWaterLogFrom(batch.length);
        } else {
          setWaterLogs((prev) => [...prev, ...batch]);
          setWaterLogFrom((prev) => prev + batch.length);
        }
        setWaterLogsHasMore(batch.length >= WATER_LOG_PAGE);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error('加载浇水记录失败: ' + msg);
      } finally {
        setWaterLogsLoading(false);
      }
    },
    [plant, isMockMode, waterLogFrom]
  );

  const handleWater = async () => {
    if (!plant) return;
    if (!requireOnline()) return;
    setActionLoading(true);
    setWaterAnimation(true);
    try {
      await withRetry(async () => {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + (plant.water_frequency || 7));
        const nextIso = nextDate.toISOString();

        await db.updatePlant(plant.id, {
          last_watered_at: new Date().toISOString(),
          next_water_date: nextIso,
          status: 'healthy',
        });

        const waterReminder = plant.care_reminders?.find((r) => r.type === 'water');
        if (waterReminder) {
          await db.updateReminder(waterReminder.id, { next_reminder: nextIso, enabled: true });
        }

        await db.createLog({
          user_id: plant.user_id,
          plant_id: plant.id,
          content: '完成浇水',
          log_date: new Date().toISOString(),
        });
      });
      trackEvent('plant_detail_water', { plantId: plant.id });
      toast.success('浇水成功！');
      setTimeout(() => setWaterAnimation(false), 2200);
      await fetchPlant();
      if (waterLogsExpanded) void loadWaterLogs(true);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error('操作失败: ' + msg);
      setWaterAnimation(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!plant) return;
    if (!requireOnline()) return;
    setActionLoading(true);
    try {
      await withRetry(() => db.deletePlantCascade(plant));
      trackEvent('plant_detail_delete', { plantId: plant.id });
      toast.success('删除成功');
      navigate('/my-plants');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error('删除失败: ' + msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plant) return;
    if (!editForm.name.trim() || !editForm.species.trim()) {
      toast.error('名称与品种为必填');
      return;
    }
    const wf = parseInt(editForm.water_frequency, 10);
    if (Number.isNaN(wf) || wf < 1) {
      toast.error('浇水周期须为 ≥1 的整数');
      return;
    }
    if (!isValidDateInput(editForm.next_water_date)) {
      toast.error('日期不合法');
      return;
    }
    if (!requireOnline()) return;

    setEditSubmitting(true);
    try {
      const user = await db.getUser();
      if (!user) throw new Error('请先登录');

      let imageUrl = plant.image_url;
      if (editFile) {
        const ext = editFile.name.split('.').pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        imageUrl = await withRetry(() => db.uploadFile('plant-images', path, editFile));
      }

      await withRetry(() =>
        db.updatePlant(plant.id, {
          name: editForm.name.trim(),
          species: editForm.species.trim(),
          family: editForm.family.trim() || null,
          water_frequency: wf,
          next_water_date: new Date(editForm.next_water_date).toISOString(),
          image_url: imageUrl,
        })
      );

      const waterR = plant.care_reminders?.find((r) => r.type === 'water');
      if (waterR) {
        await withRetry(() =>
          db.updateReminder(waterR.id, {
            frequency: wf,
            next_reminder: new Date(editForm.next_water_date).toISOString(),
          })
        );
      }

      trackEvent('plant_detail_edit_ok', { plantId: plant.id });
      toast.success('已保存');
      setShowEditModal(false);
      await fetchPlant();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('保存失败: ' + msg);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plant || !logContent.trim()) return;
    if (!requireOnline()) return;

    setLogSubmitting(true);
    try {
      await withRetry(() =>
        db.createLog({
          user_id: plant.user_id,
          plant_id: plant.id,
          log_date: new Date(logDate).toISOString(),
          content: logContent.trim(),
          images: [],
        })
      );
      toast.success('日志已添加');
      setShowAddLog(false);
      setLogContent('');
      await fetchPlant();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('添加失败: ' + msg);
    } finally {
      setLogSubmitting(false);
    }
  };

  const saveReminderSettings = async () => {
    if (!plant) return;
    if (!requireOnline()) return;
    const waterReminder = plant.care_reminders?.find((r) => r.type === 'water');
    if (!waterReminder) {
      toast.error('未找到浇水提醒记录');
      return;
    }
    setReminderSaving(true);
    try {
      await withRetry(() =>
        db.updateReminder(waterReminder.id, {
          enabled: reminderEnabled,
          remind_advance_days: remindAdvanceDays,
        } as Partial<CareReminder>)
      );
      if (reminderEnabled && typeof Notification !== 'undefined' && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      trackEvent('plant_reminder_save', { plantId: plant.id, enabled: reminderEnabled, advance: remindAdvanceDays });
      toast.success('提醒设置已保存');
      setShowReminderSettings(false);
      await fetchPlant();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('保存失败: ' + msg);
    } finally {
      setReminderSaving(false);
    }
  };

  // 浏览器通知：当前标签页内轮询（需用户授权）
  useEffect(() => {
    if (!plant || isMockMode || typeof Notification === 'undefined') return;
    const waterReminder = plant.care_reminders?.find((r) => r.type === 'water');
    if (!waterReminder?.enabled || !plant.next_water_date) return;

    const tick = () => {
      if (Notification.permission !== 'granted') return;
      const next = new Date(plant.next_water_date!).getTime();
      const advance = (waterReminder.remind_advance_days ?? remindAdvanceDays) * 86400000;
      const fireAt = next - advance;
      const now = Date.now();
      const key = `${plant.id}-${fireAt}`;
      if (now >= fireAt && now - fireAt < 60000 && notifiedRef.current !== key) {
        notifiedRef.current = key;
        try {
          new Notification('浇水提醒', { body: `${plant.name} 该浇水啦` });
        } catch {
          /* empty */
        }
      }
    };
    tick();
    const idInt = window.setInterval(tick, 30000);
    return () => window.clearInterval(idInt);
  }, [plant, remindAdvanceDays]);

  useEffect(() => {
    const onOff = () => {
      if (!navigator.onLine) toast.error('网络已断开，部分操作可能失败');
    };
    window.addEventListener('offline', onOff);
    return () => window.removeEventListener('offline', onOff);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#4CAF50]/20 border-t-[#4CAF50]" />
          <p className="text-[14px] text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!plant) return null;

  const logs =
    plant.plant_logs?.sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime()) || [];

  const mockWaterLogs = logs.filter((l) => l.content.includes('浇水'));

  return (
    <div className="min-h-screen bg-background pb-10 animate-fadeIn">
      <header className="h-[56px] bg-card/80 backdrop-blur-md flex items-center px-4 sticky top-0 z-30 border-b border-border">
        <button
          type="button"
          onClick={() => navigate('/my-plants')}
          className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors active:scale-95"
        >
          <ArrowLeft size={24} className="text-foreground" />
        </button>
        <h1 className="flex-1 text-center text-[18px] font-bold text-foreground truncate px-4">{plant.name}</h1>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="p-2 -mr-2 hover:bg-destructive/10 text-[#FF5252] rounded-full transition-colors active:scale-95"
        >
          <Trash2 size={22} />
        </button>
      </header>

      <div className="max-w-md mx-auto space-y-4">
        <div className="relative h-[300px] bg-card overflow-hidden">
          {plant.image_url ? (
            <img
              src={plant.image_url}
              alt={plant.name}
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-background flex items-center justify-center text-muted-foreground">
              <Package size={80} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
            <div className="text-white">
              <h2 className="text-[28px] font-bold">{plant.name}</h2>
              <p className="text-[16px] opacity-90">{plant.species || '未知品种'}</p>
            </div>
            <span
              className={`px-3 py-1.5 rounded-full text-[12px] font-bold shadow-lg ${
                plant.status === 'healthy' ? 'bg-[#4CAF50] text-white' : 'bg-[#FF5252] text-white'
              }`}
            >
              {plant.status === 'healthy' ? '状态良好' : '需要关注'}
            </span>
          </div>
        </div>

        <div className="px-4 -mt-10 relative z-10">
          <div className="bg-card rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6 grid grid-cols-2 gap-6">
            <div className="flex flex-col items-center text-center">
              <span className="text-[12px] text-muted-foreground mb-1">最后浇水</span>
              <span className="text-[16px] font-bold text-foreground">
                {plant.last_watered_at ? new Date(plant.last_watered_at).toLocaleDateString() : '暂无'}
              </span>
            </div>
            <div className="flex flex-col items-center text-center border-l border-border">
              <span className="text-[12px] text-muted-foreground mb-1">下次浇水</span>
              <span
                className={`text-[16px] font-bold ${
                  plant.next_water_date && new Date(plant.next_water_date) < new Date()
                    ? 'text-[#FF5252]'
                    : 'text-[#4CAF50]'
                }`}
              >
                {plant.next_water_date ? new Date(plant.next_water_date).toLocaleDateString() : '待设置'}
              </span>
            </div>
          </div>
        </div>

        <div className="px-4 flex flex-col gap-3">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                try {
                  void handleWater();
                } catch {
                  toast.error('浇水异常');
                }
              }}
              disabled={actionLoading || waterAnimation}
              className={`flex-1 min-h-[56px] rounded-2xl flex items-center justify-center gap-3 font-bold transition-all active:scale-95 shadow-lg disabled:opacity-60 ${
                waterAnimation
                  ? 'bg-[#E8F5E9] text-[#4CAF50] shadow-green-100'
                  : 'bg-[#4CAF50] text-white hover:bg-[#43A047] shadow-green-200'
              }`}
            >
              {waterAnimation ? (
                <>
                  <CheckCircle2 className="animate-bounce" />
                  浇水成功
                </>
              ) : (
                <>
                  <Droplets size={24} />
                  立即浇水
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowReminderSettings(true)}
              className="w-14 min-w-[56px] h-14 bg-card rounded-2xl flex items-center justify-center text-muted-foreground hover:text-[#4CAF50] shadow-md transition-colors active:scale-95"
            >
              <Bell size={24} />
            </button>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowEditModal(true)}
            className="w-full h-12 rounded-2xl border-border hover:bg-background gap-2 active:scale-[0.99] transition-all"
          >
            <Edit2 size={18} />
            编辑植物信息
          </Button>
        </div>

        {/* 浇水历史（可折叠 + 分页） */}
        <div className="px-4">
          <div className="bg-card rounded-[24px] shadow-sm border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setWaterLogsExpanded((v) => {
                  const next = !v;
                  if (next && plant && !isMockMode) {
                    void loadWaterLogs(true);
                  }
                  if (!next) {
                    setWaterLogs([]);
                    setWaterLogFrom(0);
                    setWaterLogsHasMore(true);
                  }
                  return next;
                });
              }}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted active:bg-background transition-colors min-h-[52px]"
            >
              <span className="text-[15px] font-bold text-foreground flex items-center gap-2">
                <History size={18} className="text-[#4CAF50]" />
                查看浇水日志
              </span>
              {waterLogsExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            {waterLogsExpanded && (
              <div className="px-4 pb-4 border-t border-border">
                {isMockMode ? (
                  <div className="pt-3 space-y-3 max-h-[320px] overflow-y-auto">
                    {mockWaterLogs.length === 0 ? (
                      <p className="text-[13px] text-muted-foreground text-center py-6">暂无浇水记录</p>
                    ) : (
                      mockWaterLogs.map((log) => (
                        <div key={log.id} className="text-[13px] text-muted-foreground flex justify-between gap-2">
                          <span className="text-foreground">{log.content}</span>
                          <span className="flex-shrink-0">{new Date(log.log_date).toLocaleString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="pt-3 space-y-3 max-h-[360px] overflow-y-auto">
                    {waterLogs.length === 0 && !waterLogsLoading ? (
                      <p className="text-[13px] text-muted-foreground text-center py-6">暂无浇水记录</p>
                    ) : (
                      waterLogs.map((log) => (
                        <div key={log.id} className="text-[13px] text-muted-foreground flex justify-between gap-2 border-b border-border pb-2">
                          <span className="text-foreground">{log.content}</span>
                          <span className="flex-shrink-0">{new Date(log.log_date).toLocaleString()}</span>
                        </div>
                      ))
                    )}
                    {waterLogsHasMore && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full rounded-xl"
                        disabled={waterLogsLoading}
                        onClick={() => loadWaterLogs(false)}
                      >
                        {waterLogsLoading ? (
                          <>
                            <Loader2 className="animate-spin mr-2" size={16} />
                            加载中...
                          </>
                        ) : (
                          '加载更多'
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-4">
          <div className="bg-card rounded-[24px] shadow-sm overflow-hidden min-h-[320px]">
            <Tabs defaultValue="care" className="w-full">
              <div className="px-6 pt-4">
                <div className="flex bg-background p-1 rounded-xl">
                  <TabsTrigger
                    value="care"
                    className="flex-1 rounded-lg py-2 text-[14px] data-[state=active]:bg-card data-[state=active]:shadow-sm"
                  >
                    养护计划
                  </TabsTrigger>
                  <TabsTrigger
                    value="history"
                    className="flex-1 rounded-lg py-2 text-[14px] data-[state=active]:bg-card data-[state=active]:shadow-sm"
                  >
                    成长日志
                  </TabsTrigger>
                </div>
              </div>

              <TabsContent value="care" className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#E3F2FD] flex items-center justify-center text-[#2196F3]">
                      <Droplets size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[15px] font-bold text-foreground">浇水频率</p>
                      <p className="text-[13px] text-muted-foreground">每 {plant.water_frequency} 天一次</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#FFF3E0] flex items-center justify-center text-[#FF9800]">
                      <Calendar size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[15px] font-bold text-foreground">最佳光照</p>
                      <p className="text-[13px] text-muted-foreground">{plant.care_light || '喜散射光，避免直射'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#F1F8E9] flex items-center justify-center text-[#8BC34A]">
                      <FlaskConical size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[15px] font-bold text-foreground">施肥建议</p>
                      <p className="text-[13px] text-muted-foreground">{plant.care_fertilizer || '生长期每两周一次'}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="text-[14px] font-bold text-foreground mb-2">详细描述</h4>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{plant.description || '暂无详细描述'}</p>
                </div>
              </TabsContent>

              <TabsContent value="history" className="p-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[15px] font-bold text-foreground">最近动态</h4>
                  <button
                    type="button"
                    onClick={() => setShowAddLog(true)}
                    className="flex items-center gap-1 text-[13px] text-[#4CAF50] font-medium min-h-[44px] px-2 rounded-lg hover:bg-primary/10 transition-colors"
                  >
                    <Plus size={16} /> 添加日志
                  </button>
                </div>

                {logs.length > 0 ? (
                  <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
                    {logs.map((log) => (
                      <div key={log.id} className="relative pl-8">
                        <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-card border-2 border-[#4CAF50] flex items-center justify-center z-10">
                          <div className="w-2 h-2 rounded-full bg-[#4CAF50]" />
                        </div>
                        <div className="bg-background rounded-2xl p-4">
                          <p className="text-[12px] text-muted-foreground mb-1 font-medium">
                            {new Date(log.log_date).toLocaleDateString()}
                          </p>
                          <p className="text-[14px] text-foreground leading-relaxed">{log.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center text-center opacity-70">
                    <History size={48} className="text-muted-foreground mb-3" />
                    <p className="text-[14px] text-muted-foreground">还没有成长记录</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[320px] rounded-3xl border-none">
          <DialogHeader>
            <DialogTitle className="text-center text-red-500 font-bold">确定要删除吗？</DialogTitle>
            <DialogDescription className="text-center pt-2">
              这将永久删除“{plant.name}”及其所有日志与提醒记录。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-xl min-h-[44px]">
              取消
            </Button>
            <Button
              onClick={() => {
                try {
                  void handleDelete();
                } catch {
                  toast.error('删除异常');
                }
              }}
              disabled={actionLoading}
              className="flex-1 bg-red-500 hover:bg-red-600 rounded-xl text-white min-h-[44px]"
            >
              {actionLoading ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddLog} onOpenChange={setShowAddLog}>
        <DialogContent
          className="sm:max-w-md rounded-3xl border-none"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>记录成长时刻</DialogTitle>
            <DialogDescription>记录植物的变化或重要的养护动作</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddLog} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="plant-log-date">日期</Label>
              <Input
                id="plant-log-date"
                name="plant_log_date"
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="rounded-xl h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plant-log-content">日志内容</Label>
              <Textarea
                id="plant-log-content"
                name="plant_log_content"
                placeholder="今天长出了新叶子..."
                value={logContent}
                onChange={(e) => setLogContent(e.target.value)}
                autoComplete="off"
                className="rounded-xl min-h-[120px] focus:ring-[#4CAF50]"
                required
              />
            </div>
            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddLog(false)} className="rounded-xl h-12 flex-1">
                取消
              </Button>
              <Button type="submit" disabled={logSubmitting} className="bg-[#4CAF50] hover:bg-[#43A047] text-white rounded-xl h-12 flex-1">
                {logSubmitting ? '保存中...' : '发布动态'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl border-none max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑植物信息</DialogTitle>
            <DialogDescription>修改后将同步更新列表与提醒</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
            <label
              htmlFor="plant-edit-image"
              className="relative w-full h-40 bg-background border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden"
            >
              {editPreview || plant.image_url ? (
                <img src={editPreview || plant.image_url!} alt="" className="w-full h-full object-cover" />
              ) : (
                <Camera className="text-[#4CAF50]" size={32} />
              )}
              <input
                id="plant-edit-image"
                name="plant_edit_image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setEditFile(f);
                    setEditPreview(URL.createObjectURL(f));
                  }
                }}
              />
            </label>
            <div className="space-y-2">
              <Label htmlFor="plant-edit-name">名称 *</Label>
              <Input
                id="plant-edit-name"
                name="plant_edit_name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="rounded-xl h-12"
                required
              />
            </div>
            <VarietySpeciesFamilyFields
              dialogOpen={showEditModal}
              species={editForm.species}
              family={editForm.family}
              onSpeciesChange={(species) => setEditForm((prev) => ({ ...prev, species }))}
              onFamilyChange={(fam) => setEditForm((prev) => ({ ...prev, family: fam }))}
              speciesId="plant-edit-species"
              speciesName="plant_edit_species"
              familyId="plant-edit-family"
              familyName="plant_edit_family"
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="plant-edit-water-frequency">浇水周期(天) *</Label>
                <Input
                  id="plant-edit-water-frequency"
                  name="plant_edit_water_frequency"
                  type="number"
                  min={1}
                  value={editForm.water_frequency}
                  onChange={(e) => setEditForm({ ...editForm, water_frequency: e.target.value })}
                  className="rounded-xl h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plant-edit-next-water">下次浇水</Label>
                <Input
                  id="plant-edit-next-water"
                  name="plant_edit_next_water_date"
                  type="date"
                  value={editForm.next_water_date}
                  onChange={(e) => setEditForm({ ...editForm, next_water_date: e.target.value })}
                  className="rounded-xl h-12"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" className="rounded-xl flex-1" onClick={() => setShowEditModal(false)}>
                取消
              </Button>
              <Button type="submit" className="bg-[#4CAF50] flex-1 rounded-xl" disabled={editSubmitting}>
                {editSubmitting ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showReminderSettings} onOpenChange={setShowReminderSettings}>
        <DialogContent className="rounded-3xl border-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle>浇水提醒</DialogTitle>
            <DialogDescription>设置将写入 care_reminders；开启后可请求浏览器通知权限</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[15px] text-foreground">开启提醒</span>
              <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
            </div>
            <div className="space-y-2">
              <Label>提醒时间</Label>
              <div className="flex flex-col gap-2">
                <label htmlFor="remind-same-day" className="flex items-center gap-2 text-[14px] cursor-pointer">
                  <input
                    id="remind-same-day"
                    type="radio"
                    name="remind_advance_days"
                    value="0"
                    checked={remindAdvanceDays === 0}
                    onChange={() => setRemindAdvanceDays(0)}
                    className="accent-[#4CAF50]"
                  />
                  浇水日当天
                </label>
                <label htmlFor="remind-advance-1" className="flex items-center gap-2 text-[14px] cursor-pointer">
                  <input
                    id="remind-advance-1"
                    type="radio"
                    name="remind_advance_days"
                    value="1"
                    checked={remindAdvanceDays === 1}
                    onChange={() => setRemindAdvanceDays(1)}
                    className="accent-[#4CAF50]"
                  />
                  提前 1 天
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReminderSettings(false)} className="rounded-xl">
              取消
            </Button>
            <Button
              onClick={() => {
                try {
                  void saveReminderSettings();
                } catch {
                  toast.error('保存异常');
                }
              }}
              disabled={reminderSaving}
              className="bg-[#4CAF50] rounded-xl"
            >
              {reminderSaving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
