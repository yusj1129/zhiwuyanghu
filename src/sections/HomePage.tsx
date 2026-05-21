import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, HelpCircle, BookOpen, Sprout, ChevronRight, X } from 'lucide-react';
import { supabase, isMockMode, db } from '@/lib/supabase';
import type { Guide } from '@/types';

// 功能入口组件
function FeatureEntry({ icon: Icon, label, onClick }: { icon: any; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 p-4 transition-all duration-200 active:scale-105"
    >
      <div className="w-[48px] h-[48px] rounded-full bg-[var(--plant-water)] flex items-center justify-center">
        <Icon size={24} className="text-[#4CAF50]" />
      </div>
      <span className="text-[14px] text-foreground">{label}</span>
    </button>
  );
}

// 我的植物卡片
function PlantCard({ plant, onClick }: { plant: any; onClick: () => void }) {
  const getStatusText = () => {
    switch (plant.status) {
      case 'needsWater':
        return '今日浇水';
      case 'needsFertilizer':
        return '需施肥';
      case 'needsPruning':
        return '需修剪';
      default:
        return '生长良好';
    }
  };

  const getStatusColor = () => {
    switch (plant.status) {
      case 'needsWater':
        return 'bg-[#FF5252]';
      case 'needsFertilizer':
        return 'bg-[#81C784]';
      case 'needsPruning':
        return 'bg-[#D7CCC8]';
      default:
        return 'bg-[#4CAF50]';
    }
  };

  const nextWaterDateStr = plant.nextWaterDate || plant.next_water_date;
  const daysUntilWater = nextWaterDateStr 
    ? Math.ceil((new Date(nextWaterDateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const imageUrl = plant.image || plant.image_url;

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-[120px] bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.25)] dark:border dark:border-border overflow-hidden transition-all duration-200 hover:-translate-y-1 active:scale-95"
    >
      <div className="relative h-[96px]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={plant.name}
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-background flex items-center justify-center text-muted-foreground">
            <Sprout size={32} />
          </div>
        )}
        <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] text-white ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>
      <div className="p-2">
        <h4 className="text-[14px] font-medium text-foreground truncate">{plant.name}</h4>
        <p className="text-[11px] text-muted-foreground mt-1">
          {daysUntilWater <= 0 ? '今天浇水' : `${daysUntilWater}天后浇水`}
        </p>
      </div>
    </button>
  );
}

// 养护指南列表项
function GuideItem({ guide, onClick }: { guide: Guide; onClick: () => void }) {
  const difficultyMap = {
    beginner: { text: '新手友好', bg: 'bg-[#81C784]' },
    intermediate: { text: '进阶', bg: 'bg-[#4CAF50]' },
    advanced: { text: '高级', bg: 'bg-[#D7CCC8]' }
  };

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3 bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.25)] dark:border dark:border-border transition-all duration-200 active:scale-[0.98]"
    >
      <img
        src={guide.cover_url || (guide as Guide & { cover?: string }).cover || ''}
        alt={guide.title}
        className="w-[60px] h-[60px] rounded-lg object-cover flex-shrink-0"
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
      />
      <div className="flex-1 text-left">
        <h4 className="text-[15px] font-medium text-foreground line-clamp-1">{guide.title}</h4>
        <div className="flex items-center gap-2 mt-2">
          <span className={`px-2 py-0.5 rounded text-[11px] text-white ${difficultyMap[guide.difficulty].bg}`}>
            {difficultyMap[guide.difficulty].text}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {(guide as Guide & { publishDate?: string }).publishDate ||
              (guide.created_at ? new Date(guide.created_at).toLocaleDateString() : '')}
          </span>
        </div>
      </div>
    </button>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [plants, setPlants] = useState<any[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const guidesData = await db.getGuides();
      setGuides((guidesData || []).slice(0, 3));

      if (isMockMode) {
        setPlants([]);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // 获取用户信息
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUserProfile(profile);

        // 获取植物列表
        const { data: plantsData } = await supabase
          .from('plants')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(5);
        setPlants(plantsData || []);
      } else {
        setPlants([]);
      }
    } catch (error: any) {
      console.error(`Error fetching home data: ${error?.message || JSON.stringify(error)}`);
    } finally {
      setLoading(false);
    }
  }

  const userAvatar = userProfile?.avatar_url || "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop";

  return (
    <div className="min-h-screen bg-background pb-[72px] transition-colors duration-200">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm px-4 py-2 flex items-center gap-3 border-b border-border">
        <h1 className="text-[18px] font-semibold text-foreground flex-shrink-0">植物养护助手</h1>
        
        {/* 搜索栏 */}
        <div className={`flex-1 flex items-center h-[36px] rounded-lg px-3 transition-all duration-200 ${
          isSearchFocused ? 'bg-card border-2 border-[#4CAF50]' : 'bg-muted'
        }`}>
          <label htmlFor="search-input" className="sr-only">搜索植物品种或养护问题</label>
          <Search size={18} className="text-muted-foreground flex-shrink-0" />
          <input
            id="search-input"
            name="search-input"
            type="text"
            placeholder="搜索植物品种/养护问题"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground outline-none ml-2"
            autoComplete="off"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="flex-shrink-0">
              <X size={16} className="text-muted-foreground" />
            </button>
          )}
        </div>
        
        {/* 用户头像 */}
        <button 
          onClick={() => navigate('/profile')}
          className="flex-shrink-0 w-[36px] h-[36px] rounded-full overflow-hidden border-2 border-border"
        >
          <img
            src={userAvatar}
            alt="用户头像"
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
          />
        </button>
      </header>

      <div className="px-4 py-4 space-y-5">
        {/* 功能入口区 */}
        <section className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] border border-transparent dark:border-border p-4">
          <div className="grid grid-cols-4 gap-2">
            <FeatureEntry icon={Sprout} label="我的植物" onClick={() => navigate('/my-plants')} />
            <FeatureEntry icon={Bell} label="养护提醒" onClick={() => navigate('/care-reminders')} />
            <FeatureEntry icon={HelpCircle} label="问题求助" onClick={() => navigate('/help')} />
            <FeatureEntry icon={BookOpen} label="品种库" onClick={() => navigate('/variety-library')} />
          </div>
        </section>

        {/* 我的植物 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[18px] font-medium text-foreground">我的植物</h2>
            <button 
              onClick={() => navigate('/my-plants')}
              className="flex items-center text-[14px] text-[#4CAF50]"
            >
              查看全部
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="flex-shrink-0 w-[120px] h-[140px] bg-card rounded-[10px] animate-pulse" />
              ))
            ) : plants.length > 0 ? (
              plants.map((plant) => (
                <PlantCard
                  key={plant.id}
                  plant={plant}
                  onClick={() => navigate(`/my-plants/${plant.id}`)}
                />
              ))
            ) : (
              <div className="w-full py-8 flex flex-col items-center justify-center bg-card rounded-xl border-2 border-dashed border-border">
                <p className="text-[14px] text-muted-foreground mb-2">还没有植物哦</p>
                <button 
                  onClick={() => navigate('/my-plants')}
                  className="text-[14px] text-[#4CAF50] font-medium"
                >
                  去添加
                </button>
              </div>
            )}
          </div>
        </section>

        {/* 养护指南 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[18px] font-medium text-foreground">养护指南</h2>
            <button 
              onClick={() => navigate('/guides')}
              className="flex items-center text-[14px] text-[#4CAF50]"
            >
              查看更多
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="space-y-3">
            {guides.map((guide) => (
              <GuideItem
                key={guide.id}
                guide={guide}
                onClick={() => navigate('/guides')}
              />
            ))}
            {!loading && guides.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-4 text-[13px] text-muted-foreground text-center">
                暂无养护指南，请先在 Supabase `guides` 表中添加内容。
              </div>
            )}
          </div>
        </section>

        <button
          onClick={() => navigate('/variety-library')}
          className="w-full h-[60px] bg-[#4CAF50] rounded-[10px] flex items-center justify-between px-5 transition-all duration-200 active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <BookOpen size={24} className="text-white" />
            <span className="text-[16px] font-medium text-white">浏览品种库</span>
          </div>
          <ChevronRight size={24} className="text-white" />
        </button>
      </div>
    </div>
  );
}
