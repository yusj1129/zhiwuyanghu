import { createClient } from '@supabase/supabase-js';
import type { AuthError, Session } from '@supabase/supabase-js';
import { guides as mockGuides, posts as mockPosts, topics as mockTopics } from '@/data/mock';
import type { Profile, Plant, PlantLog, CareReminder, Guide, Post, Topic, HelpRequest } from '@/types';
import { searchVarietyTaxonomyLocal, type VarietyTaxonomyHit } from '@/lib/varietyTaxonomy';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co') as string;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key') as string;

/**
 * 环境变量验证
 * 如果没有配置真实的 VITE_SUPABASE_URL，则进入 Mock 模式，使用 mock.ts 中的数据。
 */
const isMockModeFlag = supabaseUrl.includes('placeholder') || !import.meta.env.VITE_SUPABASE_URL;

/** 在 createClient 之前执行：避免残缺 JSON 触发 GoTrue 反复 refresh 并报「Refresh Token Not Found」。 */
function scrubBrokenSupabaseAuthPersistence(url: string): void {
  if (typeof window === 'undefined' || isMockModeFlag) return;
  try {
    const hostname = new URL(url).hostname;
    const projectRef = hostname.split('.')[0];
    if (!projectRef) return;
    const key = `sb-${projectRef}-auth-token`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { refresh_token?: string };
    const rt = parsed?.refresh_token;
    if (typeof rt !== 'string' || rt.length < 8) {
      window.localStorage.removeItem(key);
    }
  } catch {
    try {
      const hostname = new URL(url).hostname;
      const projectRef = hostname.split('.')[0];
      if (projectRef) {
        window.localStorage.removeItem(`sb-${projectRef}-auth-token`);
      }
    } catch {
      /* ignore */
    }
  }
}

scrubBrokenSupabaseAuthPersistence(supabaseUrl);

export const isMockMode = isMockModeFlag;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/** 本地持久化的会话已损坏、与当前项目不一致或已在服务端失效时，GoTrue 会报此类错误；应清除本地存储避免反复请求 refresh。 */
function isStaleAuthSessionError(err: AuthError | null | undefined): boolean {
  if (!err) return false;
  const code = String((err as { code?: string }).code ?? '').toLowerCase();
  const msg = (err.message ?? '').toLowerCase();
  if (code === 'refresh_token_not_found') return true;
  if (msg.includes('invalid refresh token')) return true;
  if (msg.includes('refresh token not found')) return true;
  return false;
}

/** 将 Supabase Auth 常见英文错误转为登录页可用的中文说明 */
export function describeAuthError(error: AuthError): string {
  const code = String((error as { code?: string }).code ?? '').toLowerCase();
  const raw = (error.message ?? '').trim();
  const msg = raw.toLowerCase();
  if (msg.includes('already registered') || msg.includes('user already exists')) {
    return '该邮箱已注册，请直接登录';
  }
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
    return '邮箱或密码不正确，请检查后重试';
  }
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
    return '请先在邮箱中完成账号验证，再尝试登录';
  }
  if (msg.includes('user not found') || msg.includes('user does not exist')) {
    return '该邮箱尚未注册，可先注册账号';
  }
  return raw || '登录失败，请稍后重试';
}

/**
 * 从 Storage 公共 URL 解析出 bucket 内相对路径（plant-images / avatars）
 */
export function storageObjectPathFromPublicUrl(publicUrl: string, bucket: string): string | null {
  try {
    const marker = `/object/public/${bucket}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(publicUrl.slice(idx + marker.length));
  } catch {
    return null;
  }
}

/**
 * 通用的数据库操作辅助函数
 */
export const db = {
  // --- Auth & Profile ---
  async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async getProfile(userId: string): Promise<Profile | null> {
    if (isMockMode) return null;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) return null;
    return data;
  },

  async updateProfile(profile: Partial<Profile>) {
    if (isMockMode) return;
    const { error } = await supabase.from('profiles').upsert(profile);
    if (error) throw error;
  },

  // --- Storage ---
  async uploadFile(bucket: string, path: string, file: File) {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true
    });
    if (error) throw error;
    return supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl;
  },

  async deleteFile(bucket: string, path: string) {
    if (isMockMode) return;
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
  },

  // --- Plants ---
  async getPlants(userId: string): Promise<Plant[]> {
    if (isMockMode) return [];
    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getPlantDetail(plantId: string): Promise<Plant | null> {
    if (isMockMode) return null;
    const { data, error } = await supabase
      .from('plants')
      .select('*, plant_logs(*), care_reminders(*)')
      .eq('id', plantId)
      .single();
    if (error) throw error;
    return data;
  },

  async createPlant(plant: Partial<Plant>) {
    if (isMockMode) return { id: 'mock-id' };
    const payload = {
      ...plant,
      created_by: (plant as any).created_by ?? plant.user_id,
    };
    const { data, error } = await supabase.from('plants').insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async updatePlant(plantId: string, updates: Partial<Plant>) {
    if (isMockMode) return;
    const { error } = await supabase.from('plants').update(updates).eq('id', plantId);
    if (error) throw error;
  },

  async deletePlant(plantId: string) {
    if (isMockMode) return;
    const { error } = await supabase.from('plants').delete().eq('id', plantId);
    if (error) throw error;
  },

  /**
   * 删除植物及其日志、提醒，并尽量删除 Storage 中的主图（需 RLS 允许）
   */
  async deletePlantCascade(plant: Pick<Plant, 'id' | 'user_id' | 'image_url'>) {
    if (isMockMode) return;
    await supabase.from('plant_logs').delete().eq('plant_id', plant.id);
    await supabase.from('care_reminders').delete().eq('plant_id', plant.id);
    if (plant.image_url) {
      const path = storageObjectPathFromPublicUrl(plant.image_url, 'plant-images');
      if (path) {
        const { error: rmErr } = await supabase.storage.from('plant-images').remove([path]);
        if (rmErr) console.warn('[storage] remove plant image:', rmErr.message);
      }
    }
    const { error } = await supabase.from('plants').delete().eq('id', plant.id);
    if (error) throw error;
  },

  // --- Logs & Reminders ---
  async createLog(log: Partial<PlantLog>) {
    if (isMockMode) return;
    const payload = {
      ...log,
      created_by: (log as any).created_by ?? log.user_id,
    };
    const { error } = await supabase.from('plant_logs').insert(payload);
    if (error) throw error;
  },

  async updateReminder(reminderId: string, updates: Partial<CareReminder>) {
    if (isMockMode) return;
    const { error } = await supabase.from('care_reminders').update(updates).eq('id', reminderId);
    if (error) throw error;
  },

  async createReminder(reminder: Partial<CareReminder>) {
    if (isMockMode) return;
    const payload = {
      ...reminder,
      created_by: (reminder as any).created_by ?? reminder.user_id,
    };
    const { error } = await supabase.from('care_reminders').insert(payload);
    if (error) throw error;
  },

  /** 当前用户全部养护提醒（含植物名称/主图，按下次提醒时间升序） */
  async listUserReminders(userId: string): Promise<
    (CareReminder & { plants?: { name: string; image_url: string | null } | null })[]
  > {
    if (isMockMode) return [];
    const { data, error } = await supabase
      .from('care_reminders')
      .select('*, plants(name, image_url)')
      .eq('user_id', userId)
      .order('next_reminder', { ascending: true, nullsFirst: false });
    if (error) throw error;
    return (data || []) as (CareReminder & { plants?: { name: string; image_url: string | null } | null })[];
  },

  /** 分页获取某植物的浇水类日志（按时间倒序） */
  async getPlantWaterLogs(plantId: string, from = 0, pageSize = 20): Promise<PlantLog[]> {
    if (isMockMode) return [];
    const { data, error } = await supabase
      .from('plant_logs')
      .select('*')
      .eq('plant_id', plantId)
      .ilike('content', '%浇水%')
      .order('log_date', { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    return data || [];
  },

  async getGuidesByIds(ids: string[]): Promise<Guide[]> {
    if (ids.length === 0) return [];
    if (isMockMode) {
      return (mockGuides as Guide[]).filter((g) => ids.includes(g.id));
    }
    const { data, error } = await supabase.from('guides').select('*').in('id', ids);
    if (error) throw error;
    return data || [];
  },

  // --- Community & Guides ---
  async getTopics(): Promise<Topic[]> {
    if (isMockMode) return mockTopics as any;
    const { data, error } = await supabase.from('topics').select('*').order('post_count', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getPosts(): Promise<Post[]> {
    if (isMockMode) return mockPosts as any;
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(full_name, avatar_url), topics(name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async listBookmarkedPostIds(userId: string): Promise<string[]> {
    if (isMockMode || !userId) return [];
    const { data, error } = await supabase
      .from('post_bookmarks')
      .select('post_id')
      .eq('user_id', userId);
    if (error) throw error;
    return (data || []).map((row: { post_id: string }) => String(row.post_id));
  },

  async togglePostBookmark(userId: string, postId: string, isBookmarked: boolean) {
    if (isMockMode) return;
    if (isBookmarked) {
      const { error } = await supabase
        .from('post_bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('post_id', postId);
      if (error) throw error;
      return;
    }
    const { error } = await supabase
      .from('post_bookmarks')
      .insert({ user_id: userId, post_id: postId });
    if (error) throw error;
  },

  async listLikedCommentIds(userId: string, postId: string): Promise<string[]> {
    if (isMockMode || !userId || !postId) return [];
    const { data, error } = await supabase
      .from('comment_likes')
      .select('comment_id, post_comments!inner(post_id)')
      .eq('user_id', userId)
      .eq('post_comments.post_id', postId);
    if (error) throw error;
    return (data || []).map((row: { comment_id: string }) => String(row.comment_id));
  },

  async toggleCommentLike(userId: string, commentId: string, isLiked: boolean) {
    if (isMockMode) return;
    if (isLiked) {
      const { error } = await supabase
        .from('comment_likes')
        .delete()
        .eq('user_id', userId)
        .eq('comment_id', commentId);
      if (error) throw error;
      return;
    }
    const { error } = await supabase
      .from('comment_likes')
      .insert({ user_id: userId, comment_id: commentId });
    if (error) throw error;
  },

  async getGuides(): Promise<Guide[]> {
    if (isMockMode) return mockGuides as any;
    const { data, error } = await supabase.from('guides').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async toggleFavorite(userId: string, guideId: string, isCurrentlyFavorite: boolean) {
    if (isMockMode) return;
    if (isCurrentlyFavorite) {
      const { error } = await supabase.from('favorites').delete().eq('user_id', userId).eq('guide_id', guideId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: userId, created_by: userId, guide_id: guideId });
      if (error) throw error;
    }
  },

  async getFavorites(userId: string): Promise<string[]> {
    if (isMockMode) return [];
    const { data, error } = await supabase.from('favorites').select('guide_id').eq('user_id', userId);
    if (error) throw error;
    return data.map(f => f.guide_id);
  },

  /** 读取品种库（Supabase plant_varieties） */
  async listPlantVarieties(limit = 200): Promise<Array<{ id: string; names: string[]; family: string; genus: string }>> {
    if (isMockMode) return [];
    try {
      const { data, error } = await supabase
        .from('plant_varieties')
        .select('id,names,family,genus')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: String(row.id),
        names: Array.isArray(row.names) ? row.names.map(String) : [],
        family: String(row.family || ''),
        genus: String(row.genus || ''),
      }));
    } catch (e: any) {
      console.warn('[db] listPlantVarieties:', JSON.stringify(e, null, 2));
      return [];
    }
  },

  /** 品种 → 科属联想（Supabase RPC；Mock 或失败时走本地种子） */
  async searchPlantVarieties(query: string, limit = 10): Promise<VarietyTaxonomyHit[]> {
    const q = query.trim();
    if (!q) return [];
    if (isMockMode) return searchVarietyTaxonomyLocal(q, limit);
    try {
      const { data, error } = await supabase.rpc('search_plant_varieties', {
        p_q: q,
        p_limit: limit,
      });
      if (error) throw error;
      type RpcRow = { id: string; names: string[]; family: string; genus: string; score: number };
      const rows = (data || []) as RpcRow[];
      return rows.map((r) => ({
        entry: {
          names: r.names || [],
          family: r.family,
          genus: (r.genus ?? '').trim(),
        },
        score: Number(r.score) || 0,
      }));
    } catch (e: any) {
      console.warn('[db] searchPlantVarieties:', JSON.stringify(e, null, 2));
      return searchVarietyTaxonomyLocal(q, limit);
    }
  },

  async getProfileModeratorFlag(userId: string): Promise<boolean> {
    if (isMockMode) return true;
    const { data, error } = await supabase.from('profiles').select('is_moderator').eq('id', userId).maybeSingle();
    if (error) {
      console.warn('[db] getProfileModeratorFlag:', error.message);
      return false;
    }
    return Boolean((data as { is_moderator?: boolean } | null)?.is_moderator);
  },

  async listCommentsForModeration(limit = 80): Promise<
    Array<{
      id: string;
      content: string;
      created_at: string;
      user_id: string;
      post_id: string;
      posts: { id: string; content: string } | { id: string; content: string }[] | null;
    }>
  > {
    if (isMockMode) return [];
    const { data, error } = await supabase
      .from('post_comments')
      .select('id, content, created_at, user_id, post_id, posts(id, content)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      console.warn('[db] listCommentsForModeration:', error.message);
      return [];
    }
    return (data || []) as Array<{
      id: string;
      content: string;
      created_at: string;
      user_id: string;
      post_id: string;
      posts: { id: string; content: string } | { id: string; content: string }[] | null;
    }>;
  },

  async moderatorDeletePost(postId: string) {
    if (isMockMode) return;
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) throw error;
  },

  async moderatorDeleteComment(commentId: string) {
    if (isMockMode) return;
    const { error } = await supabase.from('post_comments').delete().eq('id', commentId);
    if (error) throw error;
  },

  async submitHelpRequest(userId: string, title: string, body: string) {
    if (isMockMode) return;
    const { error } = await supabase.from('help_requests').insert({
      user_id: userId,
      created_by: userId,
      title: title.trim() || null,
      body: body.trim(),
      status: 'pending',
    });
    if (error) throw error;
  },

  async listHelpRequestsForModerator(status: 'pending' | 'all' = 'pending'): Promise<HelpRequest[]> {
    if (isMockMode) return [];
    let q = supabase.from('help_requests').select('id, user_id, title, body, status, created_at').is('deleted_at', null);
    if (status === 'pending') q = q.eq('status', 'pending');
    const { data, error } = await q.order('created_at', { ascending: false }).limit(100);
    if (error) {
      console.warn('[db] listHelpRequestsForModerator:', error.message);
      return [];
    }
    return (data || []) as HelpRequest[];
  },

  async moderatorUpdateHelpRequestStatus(requestId: string, status: 'reviewed' | 'dismissed') {
    if (isMockMode) return;
    const { error } = await supabase.from('help_requests').update({ status }).eq('id', requestId);
    if (error) throw error;
  },

  async moderatorDismissHelpRequest(requestId: string) {
    if (isMockMode) return;
    const { error } = await supabase.from('help_requests').delete().eq('id', requestId);
    if (error) throw error;
  },
};

export async function initSupabase(): Promise<Session | null> {
  console.log('[Supabase] Initializing... Mock Mode:', isMockMode);
  if (isMockMode) return null;

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError && isStaleAuthSessionError(sessionError)) {
    await supabase.auth.signOut({ scope: 'local' });
    return null;
  }

  if (session) {
    const { error: userError } = await supabase.auth.getUser();
    if (userError && isStaleAuthSessionError(userError)) {
      await supabase.auth.signOut({ scope: 'local' });
      return null;
    }
    if (userError) {
      console.warn('[Supabase] getUser during init:', userError.message);
    }
  }

  return session;
}
