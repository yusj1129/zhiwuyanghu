/** 品种科属展示与本地兜底（Mock / RPC 失败时）；主数据在 Supabase plant_varieties + search_plant_varieties */

export type VarietyTaxonomyEntry = {
  names: string[];
  family: string;
  genus: string;
};

export type VarietyTaxonomyHit = {
  entry: VarietyTaxonomyEntry;
  score: number;
};

function entryKey(e: VarietyTaxonomyEntry): string {
  return `${e.family}|${e.genus}|${e.names[0]}`;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** 科属展示：有属则「科（属）」，否则仅科名 */
export function formatVarietyFamilyField(e: VarietyTaxonomyEntry): string {
  const g = e.genus?.trim();
  if (!g) return e.family;
  const genusLabel = g.endsWith('属') ? g : `${g}属`;
  return `${e.family}（${genusLabel}）`;
}

/** 与 supabase/migrations/20260421120000_plant_varieties.sql 种子保持一致，供 Mock 与 RPC 降级 */
const LOCAL_VARIETY_SEED: VarietyTaxonomyEntry[] = [
  { names: ['龟背竹', '蓬莱蕉', '电信兰'], family: '天南星科', genus: '龟背竹' },
  { names: ['春羽', '春芋'], family: '天南星科', genus: '喜林芋' },
  { names: ['绿萝', '魔鬼藤', '黄金葛'], family: '天南星科', genus: '崖角藤' },
  { names: ['白掌', '白鹤芋', '苞叶芋'], family: '天南星科', genus: '苞叶芋' },
  { names: ['红掌', '花烛', '安祖花'], family: '天南星科', genus: '花烛' },
  { names: ['滴水观音', '海芋', '象耳芋'], family: '天南星科', genus: '海芋' },
  { names: ['合果芋'], family: '天南星科', genus: '合果芋' },
  { names: ['银皇后', '万年青王', '广东万年青'], family: '天南星科', genus: '广东万年青' },
  { names: ['琴叶榕', '提琴叶榕'], family: '桑科', genus: '榕' },
  { names: ['橡皮树', '印度榕', '印度橡胶树'], family: '桑科', genus: '榕' },
  { names: ['爱心榕'], family: '桑科', genus: '榕' },
  { names: ['发财树', '马拉巴栗', '瓜栗'], family: '锦葵科', genus: '瓜栗' },
  { names: ['幸福树', '菜豆树'], family: '紫葳科', genus: '菜豆树' },
  { names: ['虎尾兰', '虎皮兰', '千岁兰'], family: '天门冬科', genus: '虎尾兰' },
  { names: ['文竹', '云片松'], family: '天门冬科', genus: '天门冬' },
  { names: ['武竹', '天门冬'], family: '天门冬科', genus: '天门冬' },
  { names: ['吊兰', '挂兰'], family: '天门冬科', genus: '吊兰' },
  { names: ['芦荟', '库拉索芦荟'], family: '天门冬科', genus: '芦荟' },
  { names: ['龙血树', '巴西木', '香龙血树'], family: '天门冬科', genus: '龙血树' },
  { names: ['万年青'], family: '天门冬科', genus: '万年青' },
  { names: ['一叶兰', '蜘蛛抱蛋'], family: '天门冬科', genus: '蜘蛛抱蛋' },
  { names: ['常春藤', '洋常春藤'], family: '五加科', genus: '常春藤' },
  { names: ['袖珍椰子', '玲珑椰子'], family: '棕榈科', genus: '竹节椰' },
  { names: ['散尾葵', '黄椰子'], family: '棕榈科', genus: '散尾葵' },
  { names: ['棕竹', '观音竹'], family: '棕榈科', genus: '棕竹' },
  { names: ['天堂鸟', '鹤望兰'], family: '鹤望兰科', genus: '鹤望兰' },
  { names: ['青苹果竹芋', '圆叶竹芋'], family: '竹芋科', genus: '肖竹芋' },
  { names: ['孔雀竹芋'], family: '竹芋科', genus: '肖竹芋' },
  { names: ['双线竹芋'], family: '竹芋科', genus: '肖竹芋' },
  { names: ['铜钱草', '香菇草', '金钱草'], family: '伞形科', genus: '天胡荽' },
  { names: ['镜面草'], family: '荨麻科', genus: '冷水花' },
  { names: ['仙人掌', '仙人掌球'], family: '仙人掌科', genus: '仙人掌' },
  { names: ['金琥', '象牙球'], family: '仙人掌科', genus: '金琥' },
  { names: ['蟹爪兰', '蟹爪莲'], family: '仙人掌科', genus: '蟹爪兰' },
  { names: ['蝴蝶兰'], family: '兰科', genus: '蝴蝶兰' },
  { names: ['石斛兰', '石斛'], family: '兰科', genus: '石斛' },
  { names: ['君子兰', '大花君子兰'], family: '石蒜科', genus: '君子兰' },
  { names: ['朱顶红'], family: '石蒜科', genus: '朱顶红' },
  { names: ['茉莉花', '茉莉'], family: '木犀科', genus: '素馨' },
  { names: ['栀子花', '栀子', '黄栀子'], family: '茜草科', genus: '栀子' },
  { names: ['月季', '现代月季', '玫瑰'], family: '蔷薇科', genus: '蔷薇' },
  { names: ['长寿花'], family: '景天科', genus: '伽蓝菜' },
  { names: ['玉树', '燕子掌'], family: '景天科', genus: '青锁龙' },
  { names: ['多肉', '多肉植物'], family: '景天科', genus: '景天' },
  { names: ['铁线蕨'], family: '凤尾蕨科', genus: '铁线蕨' },
  { names: ['鸟巢蕨'], family: '铁角蕨科', genus: '铁角蕨' },
  { names: ['鹿角蕨'], family: '水龙骨科', genus: '鹿角蕨' },
  { names: ['柠檬树', '香水柠檬'], family: '芸香科', genus: '柑橘' },
  { names: ['迷迭香'], family: '唇形科', genus: '迷迭香' },
  { names: ['薄荷'], family: '唇形科', genus: '薄荷' },
  { names: ['薰衣草'], family: '唇形科', genus: '薰衣草' },
];

/** Mock 或未部署 RPC 时在浏览器内匹配（与 plant_varieties 种子对齐） */
export function searchVarietyTaxonomyLocal(raw: string, limit = 8): VarietyTaxonomyHit[] {
  const q = norm(raw);
  if (!q) return [];

  const best = new Map<string, VarietyTaxonomyHit>();

  for (const entry of LOCAL_VARIETY_SEED) {
    let top = 0;
    for (const name of entry.names) {
      const n = norm(name);
      if (!n) continue;
      let s = 0;
      if (n === q) s = 100;
      else if (n.startsWith(q)) s = 88;
      else if (n.includes(q)) s = 72;
      else if (q.length >= 2 && n.length >= 2 && q.includes(n)) s = 62;
      if (s > top) top = s;
    }
    if (top > 0) {
      const k = entryKey(entry);
      const prev = best.get(k);
      if (!prev || top > prev.score) best.set(k, { entry, score: top });
    }
  }

  return Array.from(best.values())
    .sort((a, b) => b.score - a.score || a.entry.names[0].localeCompare(b.entry.names[0], 'zh-CN'))
    .slice(0, limit);
}
