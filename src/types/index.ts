// 用户资料类型 (profiles 表)
export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  /** 是否接收推送/浏览器通知（需在 profiles 表加列，见 migrations） */
  notifications_enabled?: boolean | null;
  /** 内容审核员（profiles.is_moderator，见 migration） */
  is_moderator?: boolean | null;
}

// 植物相关类型 (plants 表)
export interface Plant {
  id: string;
  user_id: string;
  name: string;
  species: string | null;
  family: string | null;
  scientific_name: string | null;
  image_url: string | null;
  status: 'healthy' | 'needsWater' | 'needsFertilizer' | 'needsPruning';
  difficulty: string | null;
  description: string | null;
  water_frequency: number;
  next_water_date: string | null;
  last_watered_at: string | null;
  care_water: string | null;
  care_light: string | null;
  care_temperature: string | null;
  care_fertilizer: string | null;
  care_pest: string | null;
  created_at: string;
  
  // 关联字段 (前端组合)
  plant_logs?: PlantLog[];
  care_reminders?: CareReminder[];
}

// 养护日志 (plant_logs 表)
export interface PlantLog {
  id: string;
  user_id: string;
  plant_id: string;
  log_date: string;
  content: string;
  images: string[];
  created_at: string;
}

// 养护提醒 (care_reminders 表)
export interface CareReminder {
  id: string;
  user_id: string;
  plant_id: string;
  type: 'water' | 'fertilizer' | 'prune' | 'repot';
  frequency: number;
  unit: 'day' | 'week' | 'month';
  next_reminder: string | null;
  enabled: boolean;
  created_at: string;
  /** 浇水提醒提前天数：0=浇水日当天，1=提前一天（需执行 migrations 中的列） */
  remind_advance_days?: number;
}

// 指南类型 (guides 表)
export interface Guide {
  id: string;
  title: string;
  cover_url: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  content: string;
  author_id?: string;
  created_at: string;
  
  // 前端状态
  is_favorite?: boolean;
}

// 收藏记录 (favorites 表 - 假设存在或前端逻辑)
export interface Favorite {
  id: string;
  user_id: string;
  guide_id: string;
  created_at: string;
}

// 社区帖子类型 (posts 表)
export interface Post {
  id: string;
  user_id: string;
  content: string;
  images: string[];
  topic_id: string | null;
  created_at: string;
  
  // 关联字段 (Supabase Join)
  profiles?: Profile;
  topics?: Topic;
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
}

// 话题类型 (topics 表)
export interface Topic {
  id: string;
  name: string;
  icon: string | null;
  post_count: number;
  created_at: string;
}

export type HelpRequestStatus = 'pending' | 'reviewed' | 'dismissed';

/** 问题求助（help_requests 表） */
export interface HelpRequest {
  id: string;
  user_id: string;
  title: string | null;
  body: string;
  status: HelpRequestStatus;
  created_at: string;
}

// 评论类型 (post_comments 表)
export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  
  // 关联字段
  profiles?: Profile;
}

export type TabType = 'home' | 'plants' | 'community' | 'profile';
