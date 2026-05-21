import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Loader2, Search } from 'lucide-react';
import { trackEvent } from '@/lib/appHelpers';
import { db } from '@/lib/supabase';
import { formatVarietyFamilyField, type VarietyTaxonomyEntry, type VarietyTaxonomyHit } from '@/lib/varietyTaxonomy';

type LibraryItem = {
  id: string;
  entry: VarietyTaxonomyEntry;
  score?: number;
};

function toLibraryItem(hit: VarietyTaxonomyHit): LibraryItem {
  return {
    id: `${hit.entry.family}|${hit.entry.genus}|${hit.entry.names[0]}`,
    entry: hit.entry,
    score: hit.score,
  };
}

export function VarietyLibraryPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [baseItems, setBaseItems] = useState<LibraryItem[]>([]);
  const [searchItems, setSearchItems] = useState<LibraryItem[]>([]);

  useEffect(() => {
    trackEvent('page_view', { page: 'variety_library' });
    void (async () => {
      setLoading(true);
      const rows = await db.listPlantVarieties(200);
      const mapped: LibraryItem[] = rows.map((r) => ({
        id: r.id,
        entry: {
          names: r.names,
          family: r.family,
          genus: r.genus,
        },
      }));
      setBaseItems(mapped);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchItems([]);
      return;
    }
    const t = window.setTimeout(() => {
      void (async () => {
        setSearching(true);
        const hits = await db.searchPlantVarieties(q, 50);
        setSearchItems(hits.map(toLibraryItem));
        setSearching(false);
      })();
    }, 260);
    return () => window.clearTimeout(t);
  }, [query]);

  const filtered = useMemo(() => (query.trim() ? searchItems : baseItems), [query, searchItems, baseItems]);

  return (
    <div className="min-h-screen bg-background pb-10 animate-fadeIn">
      <header className="h-[56px] bg-card/80 backdrop-blur-md flex items-center px-4 sticky top-0 z-30 border-b border-border gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors active:scale-95 flex-shrink-0"
        >
          <ArrowLeft size={24} className="text-foreground" />
        </button>
        <h1 className="text-[18px] font-bold text-foreground flex-shrink-0">品种库</h1>
        <div className="flex-1 flex items-center h-9 rounded-full bg-muted px-3 min-w-0">
          <label htmlFor="variety-library-search" className="sr-only">搜索品种、别名或科属</label>
          <Search size={16} className="text-muted-foreground flex-shrink-0" />
          <input
            id="variety-library-search"
            name="variety_library_search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索名称、别名、科属"
            autoComplete="off"
            className="flex-1 min-w-0 bg-transparent text-[14px] outline-none ml-2 text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-3">
        <p className="text-[13px] text-muted-foreground px-1">
          数据来自 Supabase 品种库，可在后台持续维护；点击条目可将品种和科属一键带入“我的植物”新增表单。
        </p>
        {(loading || searching) ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="animate-spin text-[#4CAF50]" size={36} />
          </div>
        ) : (
          filtered.map((p) => (
            <div
              key={p.id}
              className="bg-card rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden border border-border p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-[16px] font-bold text-foreground">{p.entry.names[0]}</h2>
                  <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-1">
                    {formatVarietyFamilyField(p.entry)}
                  </p>
                </div>
                {typeof p.score === 'number' && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#E8F5E9] text-[#2E7D32]">
                    匹配度 {p.score}
                  </span>
                )}
              </div>
              {p.entry.names.length > 1 && (
                <p className="text-[12px] text-muted-foreground mt-2 line-clamp-2">
                  别名：{p.entry.names.slice(1).join('、')}
                </p>
              )}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() =>
                    navigate('/my-plants', {
                      state: {
                        openAddModal: true,
                        prefillSpecies: p.entry.names[0],
                        prefillFamily: formatVarietyFamilyField(p.entry),
                      },
                    })
                  }
                  className="text-[13px] font-medium text-[#4CAF50] hover:underline"
                >
                  用该品种添加我的植物
                </button>
              </div>
            </div>
          ))
        )}
        {!loading && !searching && baseItems.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-[13px] bg-card rounded-2xl border border-border">
            暂无品种数据，请先在 Supabase 执行 `20260421120000_plant_varieties.sql` 迁移。
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-[14px]">没有匹配的品种，换个关键词试试</div>
        )}

        <button
          type="button"
          onClick={() => navigate('/guides')}
          className="w-full h-12 rounded-2xl border-2 border-[#4CAF50] text-[#4CAF50] font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
        >
          <BookOpen size={20} />
          更多图文养护指南
        </button>
      </div>
    </div>
  );
}
