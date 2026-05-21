import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, HelpCircle, ChevronRight, Heart, Share2, MessageCircle, ArrowUp, Search, X, BookOpen, Star, Loader2 } from 'lucide-react';
import { db } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import type { Guide } from '@/types';
import { trackEvent } from '@/lib/appHelpers';

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 搜索结果关键词高亮 */
function highlightText(text: string, q: string) {
  const query = q.trim();
  if (!query) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-[var(--plant-search-highlight)] text-foreground rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

const categories = [
  { id: 'all', name: '全部' },
  { id: 'succulent', name: '多肉植物' },
  { id: 'indoor', name: '室内绿植' },
  { id: 'flower', name: '观赏花卉' },
  { id: 'fruit', name: '果蔬植物' },
  { id: 'beginner', name: '新手入门' },
  { id: 'pest', name: '病虫害防治' },
];

const difficultyMap: Record<string, { text: string; bg: string }> = {
  beginner: { text: '新手友好', bg: 'bg-[#81C784]' },
  intermediate: { text: '进阶', bg: 'bg-[#4CAF50]' },
  advanced: { text: '高级', bg: 'bg-[#D7CCC8]' }
};

// 指南列表页
export function GuidesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [showFAQ, setShowFAQ] = useState(false);
  const [guidesList, setGuidesList] = useState<Guide[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    void fetchData();
  }, []);

  /** 从「我的收藏」等入口带 openGuideId 直达详情 */
  useEffect(() => {
    const openId = (location.state as { openGuideId?: string } | null)?.openGuideId;
    if (!openId || guidesList.length === 0) return;
    const g = guidesList.find((x) => x.id === openId);
    if (g) {
      setSelectedGuide(g);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, guidesList, location.pathname, navigate]);

  async function fetchData() {
    try {
      setLoading(true);
      const user = await db.getUser();
      const [guidesData, favData] = await Promise.all([
        db.getGuides(),
        user ? db.getFavorites(user.id) : Promise.resolve([])
      ]);
      setGuidesList(guidesData as Guide[]);
      setFavorites(favData);
    } catch (error: any) {
      toast.error('加载失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredGuides = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return guidesList.filter((g) => {
      const plain = (g.content || '').replace(/<[^>]+>/g, ' ').toLowerCase();
      const matchesSearch =
        !q ||
        g.title.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        plain.includes(q);
      const matchesCategory =
        activeCategory === 'all' || g.category === categories.find((c) => c.id === activeCategory)?.name;
      return matchesSearch && matchesCategory;
    });
  }, [guidesList, searchQuery, activeCategory]);

  const toggleFavorite = async (e: React.MouseEvent, guideId: string) => {
    e.stopPropagation();
    const user = await db.getUser();
    if (!user) {
      toast.error('请先登录后收藏');
      navigate('/login');
      return;
    }

    const isFav = favorites.includes(guideId);
    try {
      await db.toggleFavorite(user.id, guideId, isFav);
      setFavorites((prev) => (isFav ? prev.filter((id) => id !== guideId) : [...prev, guideId]));
      trackEvent('guide_favorite', { guideId, action: isFav ? 'remove' : 'add' });
      toast.success(isFav ? '已取消收藏' : '收藏成功');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '操作失败';
      toast.error(msg);
    }
  };

  if (selectedGuide) {
    return (
      <GuideDetailPage 
        guide={selectedGuide} 
        isFavorite={favorites.includes(selectedGuide.id)}
        onToggleFavorite={(e) => toggleFavorite(e, selectedGuide.id)}
        onBack={() => setSelectedGuide(null)} 
      />
    );
  }

  if (showFAQ) {
    return <FAQPage onBack={() => setShowFAQ(false)} />;
  }

  return (
    <div className="min-h-screen bg-background pb-24 animate-fadeIn">
      <header className="h-[56px] bg-card/80 backdrop-blur-md flex items-center px-4 sticky top-0 z-30 border-b border-border">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft size={24} className="text-foreground" />
        </button>
        <h1 className="flex-1 text-center text-[18px] font-bold text-foreground">养护百科</h1>
        <button onClick={() => navigate('/profile/favorites')} className="p-2 -mr-2 text-muted-foreground hover:text-[#4CAF50]">
          <Star size={22} />
        </button>
      </header>

      {/* 搜索栏 */}
      <div className="px-4 py-4 bg-card border-b border-border">
        <div className="relative group">
          <label htmlFor="guides-search" className="sr-only">搜索养护教程和植物名称</label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-[#4CAF50] transition-colors" size={18} />
          <input
            id="guides-search"
            name="guides_search"
            type="search"
            placeholder="搜索养护教程、植物名称..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
            className="w-full h-11 pl-10 pr-10 bg-background rounded-xl text-[14px] text-foreground outline-none focus:ring-2 focus:ring-[#4CAF50]/20 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full"
            >
              <X size={14} className="text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* 分类滚动条 */}
      <div className="sticky top-[56px] bg-card/90 backdrop-blur-md z-20 py-3 border-b border-border">
        <div className="flex gap-2 px-4 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-5 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-[#4CAF50] text-white shadow-lg shadow-green-100'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* FAQ 入口 */}
        <button
          onClick={() => setShowFAQ(true)}
          className="w-full group bg-gradient-to-r from-[#E3F2FD] to-[#E8F5E9] dark:from-primary/20 dark:to-primary/10 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md dark:border dark:border-border transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center shadow-sm">
              <HelpCircle size={24} className="text-[#4CAF50] group-hover:rotate-12 transition-transform" />
            </div>
            <div className="text-left">
              <p className="text-[16px] font-bold text-foreground">养护疑难杂症？</p>
              <p className="text-[12px] text-muted-foreground">查看常见问题及专家解答</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-[#4CAF50]" />
        </button>

        {/* 列表 */}
        <div className="space-y-4 pt-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-[#4CAF50]" size={32} />
              <p className="text-[14px] text-muted-foreground">百科知识加载中...</p>
            </div>
          ) : filteredGuides.length > 0 ? (
            filteredGuides.map((guide) => (
              <div
                key={guide.id}
                onClick={() => {
                  trackEvent('guide_open_card', { guideId: guide.id });
                  setSelectedGuide(guide);
                }}
                className="bg-card rounded-[20px] overflow-hidden shadow-sm hover:shadow-md transition-all active:scale-[0.99] border border-border flex flex-col group cursor-pointer"
              >
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={guide.cover_url || (guide as any).cover}
                    alt={guide.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                  />
                  <button 
                    onClick={(e) => toggleFavorite(e, guide.id)}
                    className="absolute top-3 right-3 w-10 h-10 bg-card/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-md transition-all active:scale-90"
                  >
                    <Heart 
                      size={20} 
                      className={favorites.includes(guide.id) ? 'text-[#FF5252] fill-[#FF5252]' : 'text-muted-foreground'} 
                    />
                  </button>
                  <div className="absolute bottom-3 left-3 flex gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold text-white shadow-sm ${difficultyMap[guide.difficulty]?.bg || 'bg-[#4CAF50]'}`}>
                      {difficultyMap[guide.difficulty]?.text || '指南'}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <button
                    type="button"
                    onClick={() => setSelectedGuide(guide)}
                    className="w-full text-left"
                  >
                    <h4 className="text-[17px] font-bold text-foreground mb-2 line-clamp-2">
                      {highlightText(guide.title, searchQuery)}
                    </h4>
                  </button>
                  <div className="flex items-center justify-between text-[12px] text-muted-foreground gap-2">
                    <span className="flex items-center gap-1 min-w-0">
                      <BookOpen size={14} className="flex-shrink-0" />
                      <span className="truncate">{highlightText(guide.category, searchQuery)}</span>
                    </span>
                    <span className="flex-shrink-0">{new Date(guide.created_at).toLocaleDateString()}</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 h-10 rounded-xl border-[#4CAF50] text-[#4CAF50] hover:bg-primary/10 font-semibold active:scale-[0.99] transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      trackEvent('guide_read_full', { guideId: guide.id });
                      setSelectedGuide(guide);
                    }}
                  >
                    阅读全文
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 flex flex-col items-center text-center px-10">
              <div className="w-20 h-20 bg-card rounded-3xl flex items-center justify-center mb-4 shadow-sm">
                <Search size={32} className="text-[#E0E0E0]" />
              </div>
              <p className="text-[16px] font-bold text-foreground">未找到相关指南</p>
              <p className="text-[14px] text-muted-foreground mt-2">换个关键词或者换个分类试试吧</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 指南详情页
function GuideDetailPage({ 
  guide, 
  isFavorite, 
  onToggleFavorite, 
  onBack 
}: { 
  guide: Guide; 
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const [showBackToTop, setShowBackToTop] = useState(false);

  const handleShareGuide = async () => {
    const shareUrl = `${window.location.origin}/guides`;
    const shareData = {
      title: `${guide.title} - 植物养护百科`,
      text: `推荐你查看这篇养护指南：${guide.title}`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        trackEvent('guide_share', { guideId: guide.id, method: 'web_share' });
        toast.success('已打开分享面板');
        return;
      }

      await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
      trackEvent('guide_share', { guideId: guide.id, method: 'clipboard' });
      toast.success('分享链接已复制');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.toLowerCase().includes('abort')) return;
      toast.error('分享失败，请稍后重试');
    }
  };

  const handleConsult = () => {
    trackEvent('guide_consult_click', {
      guideId: guide.id,
      guideTitle: guide.title,
      category: guide.category,
    });
    navigate('/help', {
      state: {
        from: 'guide_detail',
        guideId: guide.id,
        guideTitle: guide.title,
        guideCategory: guide.category,
      },
    });
  };

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-card pb-24 animate-fadeIn">
      {/* 顶部导航 */}
      <header className="h-[56px] bg-card/90 backdrop-blur-md flex items-center px-4 sticky top-0 z-40 border-b border-border">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft size={24} className="text-foreground" />
        </button>
        <h1 className="flex-1 text-center text-[16px] font-bold text-foreground truncate px-4">{guide.title}</h1>
        <button 
          onClick={onToggleFavorite}
          className="p-2 -mr-2 transition-all active:scale-90"
        >
          <Heart 
            size={24} 
            className={isFavorite ? 'text-[#FF5252] fill-[#FF5252]' : 'text-foreground'} 
          />
        </button>
      </header>

      {/* 封面图 */}
      <div className="w-full h-[280px] relative overflow-hidden">
        <img
          src={guide.cover_url || (guide as any).cover}
          alt={guide.title}
          className="w-full h-full object-cover"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-6 left-6 right-6 text-white">
          <div className="flex gap-2 mb-3">
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold shadow-sm ${difficultyMap[guide.difficulty]?.bg || 'bg-[#4CAF50]'}`}>
              {difficultyMap[guide.difficulty]?.text || '指南'}
            </span>
            <span className="px-2 py-0.5 rounded bg-card/20 backdrop-blur-sm text-[11px] font-bold">
              {guide.category}
            </span>
          </div>
          <h2 className="text-[24px] font-bold leading-tight">{guide.title}</h2>
        </div>
      </div>

      {/* 内容主体 */}
      <div className="px-6 py-8 prose prose-green max-w-none">
        <div className="text-[16px] text-foreground leading-[1.8] space-y-8">
          {guide.content ? (
            <div dangerouslySetInnerHTML={{ __html: guide.content }} />
          ) : (
            <>
              <section className="bg-background p-6 rounded-[24px] border border-border">
                <h3 className="text-[18px] font-bold text-foreground mb-4 flex items-center gap-2 mt-0">
                  <div className="w-1.5 h-6 bg-[#4CAF50] rounded-full" />
                  光照需求
                </h3>
                <p className="mb-0">
                  作为典型的{guide.category}，它对光照非常敏感。建议放置在南向或东向窗台，保证每日 4-6 小时的散射光。
                  夏季午后必须遮阴，否则叶片边缘会出现焦边、干枯现象。
                </p>
              </section>

              <section className="p-6">
                <h3 className="text-[18px] font-bold text-foreground mb-4 flex items-center gap-2 mt-0">
                  <div className="w-1.5 h-6 bg-[#4CAF50] rounded-full" />
                  浇水要领
                </h3>
                <p>
                  遵循“见干见湿”原则。在生长旺季（4-9月），保持土壤微潮但不积水。进入秋季后逐渐减少水量。
                </p>
                <div className="mt-4 p-5 bg-[#E8F5E9] rounded-2xl flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-[#4CAF50] shadow-sm flex-shrink-0">
                    <Star size={20} />
                  </div>
                  <p className="text-[14px] text-[#2E7D32] m-0">
                    <strong>专家支招：</strong>如果您无法判断干湿度，可以用牙签插入土中 3 厘米，带出的土颜色发白且干燥即表示需要补水。
                  </p>
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      {/* 底部悬浮操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-card/90 backdrop-blur-md border-t border-border p-4 flex gap-4 z-40">
        <Button
          type="button"
          variant="outline"
          onClick={handleShareGuide}
          className="flex-1 h-12 rounded-xl border-border gap-2 hover:bg-muted/70"
        >
          <Share2 size={18} /> 分享百科
        </Button>
        <Button
          type="button"
          onClick={handleConsult}
          className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-2 shadow-none"
        >
          <MessageCircle size={18} /> 专家咨询
        </Button>
      </div>

      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 right-6 w-12 h-12 rounded-full bg-card text-[#4CAF50] flex items-center justify-center shadow-xl border border-border transition-all animate-bounce"
        >
          <ArrowUp size={24} />
        </button>
      )}
    </div>
  );
}

// 常见问题页
function FAQPage({ onBack }: { onBack: () => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const faqCategories = ['全部', '浇水', '光照', '施肥', '病虫害', '换盆'];
  const [activeCategory, setActiveCategory] = useState('全部');

  const faqs = [
    { id: '1', category: '浇水', question: '如何判断植物是否需要浇水？', answer: '可以用手指插入土壤2-3厘米，如果感觉干燥就需要浇水。也可以观察植物叶片，如果叶片稍微萎蔫，说明需要浇水了。' },
    { id: '2', category: '浇水', question: '浇水过多怎么办？', answer: '立即停止浇水，将植物移到通风处，让土壤尽快干燥。如果情况严重，需要换盆更换干燥的土壤，并检查根系是否腐烂。' },
    { id: '3', category: '光照', question: '什么是散射光？', answer: '散射光是指经过窗帘、窗户或其他物体过滤后的柔和光线，不会直接照射到植物上。室内明亮的窗边通常就是散射光环境。' },
    { id: '4', category: '施肥', question: '什么时候需要施肥？', answer: '一般在植物生长期（春夏季节）施肥，冬季植物休眠时停止施肥。新换盆的植物一个月内不需要施肥。' },
    { id: '5', category: '病虫害', question: '叶片上有小虫子怎么办？', answer: '可以用肥皂水喷洒叶片，或者使用专用的植物杀虫剂。同时要保持通风，避免环境过于潮湿。' },
    { id: '6', category: '换盆', question: '什么时候需要换盆？', answer: '当植物根系从盆底长出，或者土壤干得太快、浇水后水很快流出，说明根系已经长满，需要换更大的盆了。' }
  ];

  const filteredFaqs = activeCategory === '全部' ? faqs : faqs.filter(f => f.category === activeCategory);

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="h-[56px] bg-card flex items-center px-4 sticky top-0 z-10 border-b border-border">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft size={24} className="text-foreground" />
        </button>
        <h1 className="flex-1 text-center text-[18px] font-bold text-foreground">常见养护问题</h1>
        <div className="w-8" />
      </header>

      <div className="py-4 bg-card sticky top-[56px] z-10 border-b border-border">
        <div className="flex gap-2 px-4 overflow-x-auto scrollbar-hide">
          {faqCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all ${
                activeCategory === cat ? 'bg-[#4CAF50] text-white shadow-md' : 'bg-background text-muted-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {filteredFaqs.map((faq) => (
          <div key={faq.id} className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm">
            <button
              onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
              className="w-full flex items-center justify-between p-5 text-left"
            >
              <span className="text-[15px] font-bold text-foreground flex-1 pr-4">{faq.question}</span>
              <ChevronRight size={20} className={`text-muted-foreground transition-transform duration-300 ${expandedId === faq.id ? 'rotate-90' : ''}`} />
            </button>
            <div className={`px-5 bg-[#F9F9F9] transition-all duration-300 overflow-hidden ${expandedId === faq.id ? 'max-h-[300px] py-5 border-t border-border' : 'max-h-0'}`}>
              <p className="text-[14px] text-muted-foreground leading-relaxed m-0">{faq.answer}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
