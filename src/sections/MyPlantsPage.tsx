import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Package, Edit2, Camera, Search, Filter, ArrowUpDown, Trash2, Droplets, CheckCircle2, RotateCcw } from 'lucide-react';
import { supabase, isMockMode, db } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Plant } from '@/types';
import {
  FILTER_STORAGE_KEY,
  isValidDateInput,
  requireOnline,
  withRetry,
  trackEvent,
} from '@/lib/appHelpers';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { VarietySpeciesFamilyFields } from '@/components/VarietySpeciesFamilyFields';

// 植物卡片
function PlantGridCard({ 
  plant, 
  onClick, 
  onWater, 
  onEdit, 
  onDelete 
}: { 
  plant: Plant; 
  onClick: () => void;
  onWater: (e: React.MouseEvent) => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const [justWatered, setJustWatered] = useState(false);

  const handleWaterClick = (e: React.MouseEvent) => {
    setJustWatered(true);
    onWater(e);
    setTimeout(() => setJustWatered(false), 3000);
  };

  const getStatusText = () => {
    if (justWatered) return '已浇水';
    switch (plant.status) {
      case 'needsWater': return '需浇水';
      case 'needsFertilizer': return '需施肥';
      case 'needsPruning': return '需修剪';
      default: return '生长良好';
    }
  };

  const getStatusColor = () => {
    if (justWatered) return 'bg-[#4CAF50]';
    switch (plant.status) {
      case 'needsWater': return 'bg-[#FF5252]';
      case 'needsFertilizer': return 'bg-[#FFC107]';
      case 'needsPruning': return 'bg-[#D7CCC8]';
      default: return 'bg-[#4CAF50]';
    }
  };

  const nextWaterDateStr = plant.next_water_date;
  const nextWaterDate = nextWaterDateStr ? new Date(nextWaterDateStr) : new Date();
  const daysUntilWater = Math.ceil((nextWaterDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  
  const frequency = plant.water_frequency || 7;
  const progress = Math.max(0, Math.min(100, ((frequency - daysUntilWater) / frequency) * 100));

  return (
    <div className="bg-card rounded-[16px] shadow-[0_4px_12px_rgba(0,0,0,0.05)] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] group">
      <div className="relative h-[120px] cursor-pointer" onClick={onClick}>
        {plant.image_url ? (
          <img
            src={plant.image_url}
            alt={plant.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-background flex items-center justify-center text-muted-foreground">
            <Package size={32} />
          </div>
        )}
        <div className={`absolute top-2 left-2 px-2 py-1 rounded-lg text-[10px] font-bold text-white shadow-sm transition-colors duration-300 ${getStatusColor()} flex items-center gap-1`}>
          {justWatered && <CheckCircle2 size={10} />}
          {getStatusText()}
        </div>
        
        {/* 操作悬浮层 */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={onEdit}
            className="p-1.5 bg-card/90 backdrop-blur-sm rounded-lg text-muted-foreground hover:text-[#4CAF50] shadow-sm transition-colors"
          >
            <Edit2 size={14} />
          </button>
          <button 
            onClick={onDelete}
            className="p-1.5 bg-card/90 backdrop-blur-sm rounded-lg text-muted-foreground hover:text-[#FF5252] shadow-sm transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="cursor-pointer flex-1 min-w-0" onClick={onClick}>
            <h4 className="text-[16px] font-bold text-foreground truncate">{plant.name}</h4>
            <p className="text-[12px] text-muted-foreground truncate">{plant.species || '未知品种'}</p>
          </div>
          <button 
            onClick={handleWaterClick}
            disabled={justWatered}
            className={`p-2 rounded-xl transition-all active:scale-90 ${
              justWatered ? 'bg-[#E8F5E9] text-[#4CAF50]' : 'bg-background text-[#2196F3] hover:bg-[#E3F2FD]'
            }`}
          >
            <Droplets size={18} />
          </button>
        </div>

        <div className="mt-3">
          <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
            <span>水分状态</span>
            <span>{daysUntilWater <= 0 ? '需浇水' : `${daysUntilWater}天后`}</span>
          </div>
          <div className="h-[6px] bg-background rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                daysUntilWater <= 1 ? 'bg-[#FF5252]' : 'bg-[#4CAF50]'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MyPlantsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // 状态管理：添加/编辑弹窗
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Plant | null>(null);
  
  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    species: '',
    family: '',
    water_frequency: '7',
    next_water_date: new Date().toISOString().slice(0, 10),
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 搜索与筛选（持久化到 localStorage）
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'next_water' | 'name' | 'created'>('next_water');
  const [filterFamily, setFilterFamily] = useState<string>('all');
  /** 浇水周期筛选：all 或具体天数字符串 */
  const [filterWaterDays, setFilterWaterDays] = useState<string>('all');

  // 恢复筛选排序
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FILTER_STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as {
        sortBy?: typeof sortBy;
        filterFamily?: string;
        filterWaterDays?: string;
        searchQuery?: string;
      };
      if (s.sortBy) setSortBy(s.sortBy);
      if (s.filterFamily) setFilterFamily(s.filterFamily);
      if (s.filterWaterDays) setFilterWaterDays(s.filterWaterDays);
      if (typeof s.searchQuery === 'string') setSearchQuery(s.searchQuery);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        FILTER_STORAGE_KEY,
        JSON.stringify({ sortBy, filterFamily, filterWaterDays, searchQuery })
      );
    } catch {
      // ignore
    }
  }, [sortBy, filterFamily, filterWaterDays, searchQuery]);

  useEffect(() => {
    void fetchPlants();
  }, []);

  useEffect(() => {
    const st = location.state as { openAddModal?: boolean; prefillSpecies?: string; prefillFamily?: string } | null;
    if (!st?.openAddModal) return;
    resetForm();
    setEditingPlant(null);
    setFormData((prev) => ({
      ...prev,
      species: st.prefillSpecies?.trim() || '',
      family: st.prefillFamily?.trim() || '',
    }));
    setShowAddModal(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  /** 打开「添加」时清空表单；编辑时在下方 effect 中预填 */
  function openAddModal() {
    try {
      trackEvent('plant_add_open');
    } catch {
      /* empty */
    }
    resetForm();
    setEditingPlant(null);
    setShowAddModal(true);
  }

  function openEditModal(plant: Plant) {
    try {
      trackEvent('plant_edit_open', { plantId: plant.id });
    } catch {
      /* empty */
    }
    setEditingPlant(plant);
    setShowAddModal(true);
  }

  // 编辑弹窗打开时预填表单
  useEffect(() => {
    if (!showAddModal || !editingPlant) return;
    setFormData({
      name: editingPlant.name,
      species: editingPlant.species || '',
      family: editingPlant.family || '',
      water_frequency: String(editingPlant.water_frequency || 7),
      next_water_date: editingPlant.next_water_date
        ? editingPlant.next_water_date.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    });
    setSelectedFile(null);
    setPreviewUrl(null);
  }, [showAddModal, editingPlant]);

  async function fetchPlants() {
    try {
      setLoading(true);
      const user = await db.getUser();
      if (!user) {
        if (!isMockMode) {
          toast.error('请先登录');
          navigate('/login', { replace: true, state: { from: '/my-plants' } });
        }
        setPlants([]);
        return;
      }
      const data = await withRetry(() => db.getPlants(user.id));
      setPlants(data);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error('加载列表失败: ' + msg);
    } finally {
      setLoading(false);
    }
  }

  // 过滤与排序后的列表
  const filteredPlants = useMemo(() => {
    let result = plants.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchText =
        p.name.toLowerCase().includes(q) || p.species?.toLowerCase().includes(q);
      const matchFamily = filterFamily === 'all' || p.family === filterFamily;
      const freq = p.water_frequency || 7;
      const matchWater =
        filterWaterDays === 'all' || String(freq) === filterWaterDays;
      return matchText && matchFamily && matchWater;
    });

    result.sort((a, b) => {
      if (sortBy === 'next_water') {
        const dateA = a.next_water_date ? new Date(a.next_water_date).getTime() : Infinity;
        const dateB = b.next_water_date ? new Date(b.next_water_date).getTime() : Infinity;
        return dateA - dateB;
      }
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [plants, searchQuery, sortBy, filterFamily, filterWaterDays]);

  const families = useMemo(() => {
    const set = new Set(plants.map((p) => p.family).filter((f): f is string => Boolean(f)));
    return ['all', ...Array.from(set)];
  }, [plants]);

  const waterDayOptions = useMemo(() => {
    const set = new Set(plants.map((p) => p.water_frequency || 7));
    const nums = Array.from(set).sort((a, b) => a - b);
    return ['all', ...nums.map(String)];
  }, [plants]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      species: '',
      family: '',
      water_frequency: '7',
      next_water_date: new Date().toISOString().slice(0, 10),
    });
    setSelectedFile(null);
    setPreviewUrl(null);
    setEditingPlant(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.species.trim() || !formData.water_frequency) {
      toast.error('请填写必填项：名称、品种、浇水周期');
      return;
    }
    const wf = parseInt(formData.water_frequency, 10);
    if (Number.isNaN(wf) || wf < 1) {
      toast.error('浇水周期需为大于等于 1 的整数');
      return;
    }
    if (!isValidDateInput(formData.next_water_date)) {
      toast.error('下次浇水日期格式不正确');
      return;
    }
    if (!requireOnline()) return;

    setSubmitting(true);
    try {
      const user = await db.getUser();
      if (!user) throw new Error('请先登录');

      let imageUrl = editingPlant?.image_url || null;
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        imageUrl = await withRetry(() => db.uploadFile('plant-images', fileName, selectedFile));
      }

      const plantData: Partial<Plant> = {
        name: formData.name.trim(),
        species: formData.species.trim(),
        family: formData.family.trim() || null,
        water_frequency: wf,
        next_water_date: new Date(formData.next_water_date).toISOString(),
        image_url: imageUrl,
        user_id: user.id,
      };

      if (editingPlant) {
        await withRetry(() => db.updatePlant(editingPlant.id, plantData));
        trackEvent('plant_update_ok', { plantId: editingPlant.id });
        toast.success('更新成功');
      } else {
        const newPlant = await withRetry(() => db.createPlant(plantData));
        await withRetry(() =>
          db.createReminder({
            user_id: user.id,
            plant_id: newPlant.id,
            type: 'water',
            frequency: plantData.water_frequency,
            unit: 'day',
            next_reminder: plantData.next_water_date,
            enabled: true,
          })
        );
        trackEvent('plant_create_ok', { plantId: newPlant.id });
        toast.success('添加成功');
      }

      setShowAddModal(false);
      resetForm();
      void fetchPlants();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error('操作失败: ' + msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWater = async (plant: Plant) => {
    if (!requireOnline()) return;
    try {
      await withRetry(async () => {
        const freq = plant.water_frequency || 7;
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + freq);
        const nextIso = nextDate.toISOString();

        await db.updatePlant(plant.id, {
          last_watered_at: new Date().toISOString(),
          next_water_date: nextIso,
          status: 'healthy',
        });

        const { data: reminders } = await supabase
          .from('care_reminders')
          .select('id')
          .eq('plant_id', plant.id)
          .eq('type', 'water');

        if (reminders && reminders.length > 0) {
          await db.updateReminder(reminders[0].id, { next_reminder: nextIso });
        }

        await db.createLog({
          user_id: plant.user_id,
          plant_id: plant.id,
          content: '完成浇水',
          log_date: new Date().toISOString(),
        });
      });
      trackEvent('plant_water', { plantId: plant.id });
      toast.success('已记录浇水');
      void fetchPlants();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error('操作失败: ' + msg);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) return;
    if (!requireOnline()) return;
    try {
      setSubmitting(true);
      await withRetry(() => db.deletePlantCascade(showDeleteConfirm));
      trackEvent('plant_delete', { plantId: showDeleteConfirm.id });
      toast.success('删除成功');
      setShowDeleteConfirm(null);
      void fetchPlants();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error('删除失败: ' + msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 animate-fadeIn">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between gap-4 max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/')} className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
              <ArrowLeft size={24} className="text-foreground" />
            </button>
            <h1 className="text-[20px] font-bold text-foreground">我的植物</h1>
          </div>
          <button 
            type="button"
            onClick={() => openAddModal()}
            className="flex items-center gap-1.5 px-4 py-2 min-h-[44px] bg-[#4CAF50] hover:bg-[#43A047] disabled:opacity-50 rounded-xl text-white text-[14px] font-medium transition-all active:scale-95 shadow-md shadow-green-100"
          >
            <Plus size={18} />
            添加
          </button>
        </div>

        {/* 搜索与工具栏 */}
        <div className="max-w-md mx-auto mt-4 flex gap-2">
          <div className="relative flex-1">
            <label htmlFor="my-plants-search" className="sr-only">搜索植物</label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              id="my-plants-search"
              name="my_plants_search"
              type="search"
              placeholder="搜索植物..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
              className="w-full h-10 pl-10 pr-4 bg-background rounded-xl text-[14px] outline-none focus:ring-2 focus:ring-[#4CAF50]/20 transition-all"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-10 h-10 bg-background rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted">
                <ArrowUpDown size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-xl">
              <DropdownMenuLabel>排序方式</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setSortBy('next_water'); trackEvent('plants_sort', { sort: 'next_water' }); }}>
                下次浇水
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortBy('name'); trackEvent('plants_sort', { sort: 'name' }); }}>
                名称
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortBy('created'); trackEvent('plants_sort', { sort: 'created' }); }}>
                添加时间
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-10 h-10 bg-background rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted">
                <Filter size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-xl">
              <DropdownMenuLabel>按科属筛选</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {families.map(f => (
                <DropdownMenuItem key={f} onClick={() => { setFilterFamily(f); trackEvent('plants_filter_family', { family: f }); }}>
                  {f === 'all' ? '全部' : f}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>浇水周期（天）</DropdownMenuLabel>
              {waterDayOptions.map((d) => (
                <DropdownMenuItem
                  key={d}
                  onClick={() => {
                    setFilterWaterDays(d);
                    trackEvent('plants_filter_water', { days: d });
                  }}
                >
                  {d === 'all' ? '全部' : `每 ${d} 天`}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="p-4 max-w-md mx-auto">
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card rounded-[16px] h-[200px] animate-pulse" />
            ))}
          </div>
        ) : filteredPlants.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {filteredPlants.map((plant) => (
              <PlantGridCard
                key={plant.id}
                plant={plant}
                onClick={() => navigate(`/my-plants/${plant.id}`)}
                onWater={(e) => {
                  e.stopPropagation();
                  try {
                    void handleWater(plant);
                  } catch {
                    toast.error('浇水操作异常');
                  }
                }}
                onEdit={(e) => {
                  e.stopPropagation();
                  try {
                    openEditModal(plant);
                  } catch {
                    toast.error('无法打开编辑');
                  }
                }}
                onDelete={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(plant);
                }}
              />
            ))}
            <button
              type="button"
              onClick={() => openAddModal()}
              className="bg-card rounded-[16px] border-2 border-dashed border-border h-[216px] flex flex-col items-center justify-center gap-3 transition-all active:scale-[0.98] hover:bg-gray-50 group"
            >
              <div className="w-12 h-12 rounded-full bg-[#E8F5E9] flex items-center justify-center group-hover:bg-[#4CAF50] transition-colors">
                <Plus size={24} className="text-[#4CAF50] group-hover:text-white transition-colors" />
              </div>
              <span className="text-[14px] text-muted-foreground font-medium">添加新植物</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-20 text-center px-6">
            <div className="w-24 h-24 bg-card rounded-3xl flex items-center justify-center mb-6 shadow-sm">
              <Package size={48} className="text-[#E0E0E0]" />
            </div>
            <h3 className="text-[20px] font-bold text-foreground mb-2">
              {searchQuery ? '未找到相关植物' : '还没有植物哦'}
            </h3>
            <p className="text-[14px] text-muted-foreground mb-8 leading-relaxed">
              {searchQuery ? '换个关键词搜搜看吧' : '开启您的植护之旅，让我们帮您记录每一棵小绿芽的成长'}
            </p>
            {!searchQuery && (
              <Button 
                type="button"
                onClick={() => openAddModal()}
                className="w-full h-14 bg-[#4CAF50] hover:bg-[#43A047] rounded-2xl text-white text-[16px] font-bold shadow-lg shadow-green-100 transition-all active:scale-95"
              >
                <Plus size={24} className="mr-2" />
                立即添加
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 添加/编辑植物弹窗 */}
      <Dialog
        open={showAddModal}
        onOpenChange={(open) => {
          if (!open) resetForm();
          setShowAddModal(open);
        }}
      >
        <DialogContent className="sm:max-w-[425px] rounded-3xl p-0 overflow-hidden border-none max-h-[90vh] overflow-y-auto">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-[20px] font-bold text-foreground">
              {editingPlant ? '编辑植物信息' : '添加新成员'}
            </DialogTitle>
            <DialogDescription>
              请填写以下信息，让我们为您提供更精准的养护建议
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-5">
            <div className="flex flex-col items-center justify-center">
              <label
                htmlFor="plant-form-image"
                className="relative w-full h-44 bg-background border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-all overflow-hidden group"
              >
                {previewUrl || editingPlant?.image_url ? (
                  <>
                    <img src={previewUrl || editingPlant?.image_url!} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera size={32} className="text-white" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-card rounded-full flex items-center justify-center shadow-sm mb-2 text-[#4CAF50]">
                      <Camera size={24} />
                    </div>
                    <span className="text-[14px] text-muted-foreground">上传植物靓照</span>
                  </>
                )}
                <input
                  id="plant-form-image"
                  name="plant_image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground font-medium">植物昵称 *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="如：客厅的发财树"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="rounded-xl h-12 border-border focus:border-[#4CAF50] transition-all"
                  required
                />
              </div>
              <VarietySpeciesFamilyFields
                dialogOpen={showAddModal}
                gridClassName="grid grid-cols-2 gap-4"
                species={formData.species}
                family={formData.family}
                onSpeciesChange={(species) => setFormData((prev) => ({ ...prev, species }))}
                onFamilyChange={(fam) => setFormData((prev) => ({ ...prev, family: fam }))}
                speciesId="species"
                speciesName="species"
                familyId="family"
                familyName="family"
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="water_frequency" className="text-foreground font-medium">浇水频率 (天) *</Label>
                  <Input
                    id="water_frequency"
                    name="water_frequency"
                    type="number"
                    min="1"
                    value={formData.water_frequency}
                    onChange={(e) => setFormData({ ...formData, water_frequency: e.target.value })}
                    className="rounded-xl h-12 border-border focus:border-[#4CAF50] transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="next_water_date" className="text-foreground font-medium">下次浇水日期</Label>
                  <Input
                    id="next_water_date"
                    name="next_water_date"
                    type="date"
                    value={formData.next_water_date}
                    onChange={(e) => setFormData({ ...formData, next_water_date: e.target.value })}
                    className="rounded-xl h-12 border-border focus:border-[#4CAF50] transition-all"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2 flex-wrap sm:flex-nowrap">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="flex-1 h-12 min-h-[44px] rounded-xl border-border hover:bg-background active:scale-[0.98] transition-all"
              >
                取消
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (editingPlant) {
                    setFormData({
                      name: editingPlant.name,
                      species: editingPlant.species || '',
                      family: editingPlant.family || '',
                      water_frequency: String(editingPlant.water_frequency || 7),
                      next_water_date: editingPlant.next_water_date
                        ? editingPlant.next_water_date.slice(0, 10)
                        : new Date().toISOString().slice(0, 10),
                    });
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  } else {
                    resetForm();
                    setEditingPlant(null);
                  }
                  toast.message('表单已重置');
                }}
                className="flex-1 h-12 min-h-[44px] rounded-xl border-border gap-1"
              >
                <RotateCcw size={16} />
                重置
              </Button>
              <Button 
                type="submit" 
                className="flex-1 h-12 min-h-[44px] bg-[#4CAF50] hover:bg-[#43A047] text-white rounded-xl shadow-lg shadow-green-100 disabled:opacity-60 active:scale-[0.98] transition-all" 
                disabled={submitting}
              >
                {submitting ? '保存中...' : (editingPlant ? '保存修改' : '确认添加')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-[320px] rounded-3xl p-6 border-none">
          <DialogHeader>
            <DialogTitle className="text-center text-[18px] font-bold text-foreground">确定要删除吗？</DialogTitle>
            <DialogDescription className="text-center pt-2">
              删除后将无法恢复该植物的所有成长记录和日志。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-3 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteConfirm(null)}
              className="flex-1 h-12 rounded-xl border-border"
            >
              取消
            </Button>
            <Button 
              onClick={handleDelete}
              className="flex-1 h-12 bg-[#FF5252] hover:bg-[#FF1744] text-white rounded-xl shadow-lg shadow-red-100"
              disabled={submitting}
            >
              {submitting ? '删除中...' : '确定删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
