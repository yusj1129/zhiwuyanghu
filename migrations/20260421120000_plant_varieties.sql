/* 品种科属参考表 + 搜索 RPC（数据可在 Table Editor 维护；Mock 模式不走此表） */

CREATE TABLE IF NOT EXISTS public.plant_varieties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  names text[] NOT NULL,
  family text NOT NULL,
  genus text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plant_varieties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plant_varieties_select_all" ON public.plant_varieties;
CREATE POLICY "plant_varieties_select_all"
  ON public.plant_varieties FOR SELECT
  USING (true);

COMMENT ON TABLE public.plant_varieties IS '中文别名 → 科、属；由 RPC search_plant_varieties 检索';

-- 幂等：仅在尚无数据时写入种子（避免重复执行迁移时重复插入）
INSERT INTO public.plant_varieties (names, family, genus)
SELECT v.names, v.family, v.genus
FROM (
  VALUES
    (ARRAY['龟背竹','蓬莱蕉','电信兰']::text[], '天南星科', '龟背竹'),
    (ARRAY['春羽','春芋']::text[], '天南星科', '喜林芋'),
    (ARRAY['绿萝','魔鬼藤','黄金葛']::text[], '天南星科', '崖角藤'),
    (ARRAY['白掌','白鹤芋','苞叶芋']::text[], '天南星科', '苞叶芋'),
    (ARRAY['红掌','花烛','安祖花']::text[], '天南星科', '花烛'),
    (ARRAY['滴水观音','海芋','象耳芋']::text[], '天南星科', '海芋'),
    (ARRAY['合果芋']::text[], '天南星科', '合果芋'),
    (ARRAY['银皇后','万年青王','广东万年青']::text[], '天南星科', '广东万年青'),
    (ARRAY['琴叶榕','提琴叶榕']::text[], '桑科', '榕'),
    (ARRAY['橡皮树','印度榕','印度橡胶树']::text[], '桑科', '榕'),
    (ARRAY['爱心榕']::text[], '桑科', '榕'),
    (ARRAY['发财树','马拉巴栗','瓜栗']::text[], '锦葵科', '瓜栗'),
    (ARRAY['幸福树','菜豆树']::text[], '紫葳科', '菜豆树'),
    (ARRAY['虎尾兰','虎皮兰','千岁兰']::text[], '天门冬科', '虎尾兰'),
    (ARRAY['文竹','云片松']::text[], '天门冬科', '天门冬'),
    (ARRAY['武竹','天门冬']::text[], '天门冬科', '天门冬'),
    (ARRAY['吊兰','挂兰']::text[], '天门冬科', '吊兰'),
    (ARRAY['芦荟','库拉索芦荟']::text[], '天门冬科', '芦荟'),
    (ARRAY['龙血树','巴西木','香龙血树']::text[], '天门冬科', '龙血树'),
    (ARRAY['万年青']::text[], '天门冬科', '万年青'),
    (ARRAY['一叶兰','蜘蛛抱蛋']::text[], '天门冬科', '蜘蛛抱蛋'),
    (ARRAY['常春藤','洋常春藤']::text[], '五加科', '常春藤'),
    (ARRAY['袖珍椰子','玲珑椰子']::text[], '棕榈科', '竹节椰'),
    (ARRAY['散尾葵','黄椰子']::text[], '棕榈科', '散尾葵'),
    (ARRAY['棕竹','观音竹']::text[], '棕榈科', '棕竹'),
    (ARRAY['天堂鸟','鹤望兰']::text[], '鹤望兰科', '鹤望兰'),
    (ARRAY['青苹果竹芋','圆叶竹芋']::text[], '竹芋科', '肖竹芋'),
    (ARRAY['孔雀竹芋']::text[], '竹芋科', '肖竹芋'),
    (ARRAY['双线竹芋']::text[], '竹芋科', '肖竹芋'),
    (ARRAY['铜钱草','香菇草','金钱草']::text[], '伞形科', '天胡荽'),
    (ARRAY['镜面草']::text[], '荨麻科', '冷水花'),
    (ARRAY['仙人掌','仙人掌球']::text[], '仙人掌科', '仙人掌'),
    (ARRAY['金琥','象牙球']::text[], '仙人掌科', '金琥'),
    (ARRAY['蟹爪兰','蟹爪莲']::text[], '仙人掌科', '蟹爪兰'),
    (ARRAY['蝴蝶兰']::text[], '兰科', '蝴蝶兰'),
    (ARRAY['石斛兰','石斛']::text[], '兰科', '石斛'),
    (ARRAY['君子兰','大花君子兰']::text[], '石蒜科', '君子兰'),
    (ARRAY['朱顶红']::text[], '石蒜科', '朱顶红'),
    (ARRAY['茉莉花','茉莉']::text[], '木犀科', '素馨'),
    (ARRAY['栀子花','栀子','黄栀子']::text[], '茜草科', '栀子'),
    (ARRAY['月季','现代月季','玫瑰']::text[], '蔷薇科', '蔷薇'),
    (ARRAY['长寿花']::text[], '景天科', '伽蓝菜'),
    (ARRAY['玉树','燕子掌']::text[], '景天科', '青锁龙'),
    (ARRAY['多肉','多肉植物']::text[], '景天科', '景天'),
    (ARRAY['铁线蕨']::text[], '凤尾蕨科', '铁线蕨'),
    (ARRAY['鸟巢蕨']::text[], '铁角蕨科', '铁角蕨'),
    (ARRAY['鹿角蕨']::text[], '水龙骨科', '鹿角蕨'),
    (ARRAY['柠檬树','香水柠檬']::text[], '芸香科', '柑橘'),
    (ARRAY['迷迭香']::text[], '唇形科', '迷迭香'),
    (ARRAY['薄荷']::text[], '唇形科', '薄荷'),
    (ARRAY['薰衣草']::text[], '唇形科', '薰衣草')
) AS v(names, family, genus)
WHERE NOT EXISTS (SELECT 1 FROM public.plant_varieties LIMIT 1);

CREATE OR REPLACE FUNCTION public.search_plant_varieties(p_q text, p_limit int DEFAULT 10)
RETURNS TABLE (
  id uuid,
  names text[],
  family text,
  genus text,
  score int
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH q AS (
    SELECT NULLIF(lower(trim(p_q)), '') AS v
  ),
  lim AS (
    SELECT CASE
      WHEN p_limit IS NULL OR p_limit < 1 THEN 10
      WHEN p_limit > 50 THEN 50
      ELSE p_limit
    END AS n
  ),
  scored AS (
    SELECT
      pv.id,
      pv.names,
      pv.family,
      coalesce(nullif(trim(pv.genus), ''), '') AS genus,
      (
        SELECT max(
          CASE
            WHEN (SELECT v FROM q) IS NULL THEN 0
            WHEN lower(btrim(t.nm)) = (SELECT v FROM q) THEN 100
            WHEN lower(btrim(t.nm)) LIKE (SELECT v FROM q) || '%' THEN 88
            WHEN lower(btrim(t.nm)) LIKE '%' || (SELECT v FROM q) || '%' THEN 72
            WHEN length((SELECT v FROM q)) >= 2 AND length(lower(btrim(t.nm))) >= 2
              AND position(lower(btrim(t.nm)) IN (SELECT v FROM q)) > 0 THEN 62
            ELSE 0
          END
        )
        FROM unnest(pv.names) AS t(nm)
      ) AS sc
    FROM public.plant_varieties pv
  )
  SELECT s.id, s.names, s.family, s.genus, s.sc::int AS score
  FROM scored s
  WHERE s.sc > 0
  ORDER BY s.sc DESC, s.names[1]
  LIMIT (SELECT n FROM lim);
$$;

COMMENT ON FUNCTION public.search_plant_varieties(text, int) IS '按中文别名模糊匹配品种，返回科属与相关度分数';

GRANT SELECT ON public.plant_varieties TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_plant_varieties(text, int) TO anon, authenticated;
