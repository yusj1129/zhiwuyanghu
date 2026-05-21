import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, BookOpen, Loader2 } from 'lucide-react';
import { db, isMockMode } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import type { Guide } from '@/types';
import { trackEvent } from '@/lib/appHelpers';

/**
 * 我的收藏：根据 favorites 表中的 guide_id 拉取指南列表
 */
export function FavoritesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [guides, setGuides] = useState<Guide[]>([]);

  useEffect(() => {
    trackEvent('page_view', { page: 'favorites' });
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
        setGuides([]);
        toast.message('当前为演示模式：收藏依赖 Supabase favorites 表');
        return;
      }
      const ids = await db.getFavorites(user!.id);
      const list = await db.getGuidesByIds(ids);
      setGuides(list);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '加载失败';
      toast.error(msg);
    } finally {
      setLoading(false);
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
        <h1 className="flex-1 text-center text-[18px] font-bold text-foreground">我的收藏</h1>
        <div className="w-10" />
      </header>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="animate-spin text-[#4CAF50]" size={36} />
            <p className="text-[14px] text-muted-foreground">加载收藏中...</p>
          </div>
        ) : guides.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-8">
            <div className="w-20 h-20 bg-card rounded-3xl flex items-center justify-center mb-4 shadow-sm">
              <Heart size={40} className="text-[#E0E0E0]" />
            </div>
            <p className="text-[16px] font-bold text-foreground">暂无收藏的指南</p>
            <p className="text-[14px] text-muted-foreground mt-2">在养护百科中点击心形即可收藏</p>
            <button
              type="button"
              onClick={() => navigate('/guides')}
              className="mt-8 w-full h-12 rounded-2xl bg-[#4CAF50] text-white font-bold shadow-lg shadow-green-100 hover:bg-[#43A047] active:scale-[0.98] transition-all"
            >
              去逛逛百科
            </button>
          </div>
        ) : (
          guides.map((guide) => (
            <button
              key={guide.id}
              type="button"
              onClick={() => navigate('/guides', { state: { openGuideId: guide.id } })}
              className="w-full text-left bg-card rounded-[20px] overflow-hidden shadow-sm border border-border hover:shadow-md active:scale-[0.99] transition-all"
            >
              <div className="relative h-36">
                <img
                  src={guide.cover_url || (guide as { cover?: string }).cover || ''}
                  alt=""
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 right-3 w-9 h-9 bg-card/90 rounded-full flex items-center justify-center">
                  <Heart size={18} className="text-[#FF5252] fill-[#FF5252]" />
                </div>
              </div>
              <div className="p-4 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-[16px] font-bold text-foreground line-clamp-2">{guide.title}</h3>
                  <p className="text-[12px] text-muted-foreground mt-1 flex items-center gap-1">
                    <BookOpen size={12} />
                    {guide.category}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
