/* 植物养护 App：表扩展 + RLS（在 Supabase SQL Editor 或 CLI 中执行）
   若表或策略已存在，请按需删减重复段落。 */

-- 1) profiles 扩展：通知开关（可选）
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notifications_enabled boolean DEFAULT true;

-- 2) care_reminders：提醒提前天数（0=当天，1=提前一天）
ALTER TABLE public.care_reminders
  ADD COLUMN IF NOT EXISTS remind_advance_days integer NOT NULL DEFAULT 0;

-- 3) 识别历史
CREATE TABLE IF NOT EXISTS public.identify_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  result jsonb NOT NULL,
  image_preview_url text
);

ALTER TABLE public.identify_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "identify_records_own_select" ON public.identify_records;
CREATE POLICY "identify_records_own_select"
  ON public.identify_records FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "identify_records_own_insert" ON public.identify_records;
CREATE POLICY "identify_records_own_insert"
  ON public.identify_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "identify_records_own_delete" ON public.identify_records;
CREATE POLICY "identify_records_own_delete"
  ON public.identify_records FOR DELETE
  USING (auth.uid() = user_id);

-- 3b) 指南收藏（与 src/lib/supabase.ts：user_id + guide_id 一致）
CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  guide_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT favorites_user_guide_unique UNIQUE (user_id, guide_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites_select_own" ON public.favorites;
CREATE POLICY "favorites_select_own" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "favorites_insert_own" ON public.favorites;
CREATE POLICY "favorites_insert_own" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "favorites_delete_own" ON public.favorites;
CREATE POLICY "favorites_delete_own" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- 4) 核心业务表 RLS（按 user_id 隔离）
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_reminders ENABLE ROW LEVEL SECURITY;

-- plants
DROP POLICY IF EXISTS "plants_select_own" ON public.plants;
CREATE POLICY "plants_select_own" ON public.plants FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "plants_insert_own" ON public.plants;
CREATE POLICY "plants_insert_own" ON public.plants FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "plants_update_own" ON public.plants;
CREATE POLICY "plants_update_own" ON public.plants FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "plants_delete_own" ON public.plants;
CREATE POLICY "plants_delete_own" ON public.plants FOR DELETE USING (auth.uid() = user_id);

-- plant_logs
DROP POLICY IF EXISTS "plant_logs_select_own" ON public.plant_logs;
CREATE POLICY "plant_logs_select_own" ON public.plant_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "plant_logs_insert_own" ON public.plant_logs;
CREATE POLICY "plant_logs_insert_own" ON public.plant_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "plant_logs_update_own" ON public.plant_logs;
CREATE POLICY "plant_logs_update_own" ON public.plant_logs FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "plant_logs_delete_own" ON public.plant_logs;
CREATE POLICY "plant_logs_delete_own" ON public.plant_logs FOR DELETE USING (auth.uid() = user_id);

-- care_reminders
DROP POLICY IF EXISTS "care_reminders_select_own" ON public.care_reminders;
CREATE POLICY "care_reminders_select_own" ON public.care_reminders FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "care_reminders_insert_own" ON public.care_reminders;
CREATE POLICY "care_reminders_insert_own" ON public.care_reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "care_reminders_update_own" ON public.care_reminders;
CREATE POLICY "care_reminders_update_own" ON public.care_reminders FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "care_reminders_delete_own" ON public.care_reminders;
CREATE POLICY "care_reminders_delete_own" ON public.care_reminders FOR DELETE USING (auth.uid() = user_id);

-- profiles：用户只能读写自己的资料
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

/* 5) Storage：在 Dashboard → Storage → Policies 中为 bucket plant-images、avatars 配置：
   认证用户可上传到路径前缀 auth.uid() 对应目录；
   认证用户可删除自己前缀下的对象；或使用 storage.objects 策略（见 Supabase 文档）。 */
