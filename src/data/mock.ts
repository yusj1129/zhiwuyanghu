import type { Plant, Guide, Post, Topic, CareReminder } from '@/types';

/** 社区演示用当前用户（结构与 Supabase 不同，仅作展示） */
export const currentUser = {
  id: '1',
  name: '植物小达人',
  avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
  bio: '喜欢养植的小伙伴',
};

// 我的植物数据（字段为历史演示结构，运行时用 as 断言为 Plant）
export const myPlants = [
  {
    id: '1',
    name: '绿萝',
    scientificName: 'Epipremnum aureum',
    family: '天南星科',
    image: 'https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=400&h=400&fit=crop',
    status: 'healthy',
    difficulty: 'easy',
    nextWaterDate: '2024-01-17',
    waterFrequency: 3,
    lastWatered: '2024-01-14',
    description: '绿萝是常见的室内观叶植物，喜阴湿，耐阴性强',
    careGuide: {
      water: '保持土壤湿润，但不要积水，夏季2-3天浇一次',
      light: '喜散射光，避免强光直射',
      temperature: '适宜温度15-25°C，冬季不低于10°C',
      fertilizer: '生长期每月施一次稀释的液肥',
      pest: '注意防治红蜘蛛和蚜虫'
    },
    logs: [
      {
        id: '1',
        date: '2024-01-14',
        content: '今天给绿萝浇了水，叶片很绿很健康',
        images: ['https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=200&h=200&fit=crop']
      },
      {
        id: '2',
        date: '2024-01-10',
        content: '修剪了一些枯黄的叶子',
      }
    ]
  },
  {
    id: '2',
    name: '吊兰',
    scientificName: 'Chlorophytum comosum',
    family: '百合科',
    image: 'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=400&h=400&fit=crop',
    status: 'needsWater',
    difficulty: 'easy',
    nextWaterDate: '2024-01-15',
    waterFrequency: 2,
    lastWatered: '2024-01-13',
    description: '吊兰叶片细长，下垂生长，是优秀的空气净化植物',
    careGuide: {
      water: '保持土壤微湿，夏季每天浇水',
      light: '喜半阴，散射光最佳',
      temperature: '适宜温度15-25°C',
      fertilizer: '春夏季每两周施一次薄肥',
    },
    logs: []
  },
  {
    id: '3',
    name: '虎皮兰',
    scientificName: 'Sansevieria trifasciata',
    family: '龙舌兰科',
    image: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=400&h=400&fit=crop',
    status: 'healthy',
    difficulty: 'easy',
    nextWaterDate: '2024-01-18',
    waterFrequency: 7,
    lastWatered: '2024-01-11',
    description: '虎皮兰叶片挺拔，耐旱性强，适合新手养护',
    careGuide: {
      water: '耐旱，土壤干透再浇，冬季减少浇水',
      light: '喜光也耐阴，光照充足叶色更好',
      temperature: '适宜温度18-27°C',
      fertilizer: '生长期每月施一次复合肥',
    },
    logs: []
  },
  {
    id: '4',
    name: '多肉植物',
    scientificName: 'Succulent',
    family: '景天科',
    image: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=400&fit=crop',
    status: 'healthy',
    difficulty: 'medium',
    nextWaterDate: '2024-01-20',
    waterFrequency: 10,
    lastWatered: '2024-01-10',
    description: '多肉植物叶片肥厚，储存水分，形态各异',
    careGuide: {
      water: '干透浇透，避免积水，冬季控水',
      light: '喜充足阳光，夏季适当遮阴',
      temperature: '适宜温度15-28°C',
      fertilizer: '生长期每月施一次多肉专用肥',
    },
    logs: [],
  },
] as unknown as Plant[];

// 养护指南数据
export const guides = [
  {
    id: '1',
    title: '新手养绿萝完全指南',
    cover: 'https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=200&h=200&fit=crop',
    category: '室内绿植',
    difficulty: 'beginner',
    publishDate: '2024-01-15',
    content: '绿萝是最适合新手的室内植物之一...',
    isFavorite: true
  },
  {
    id: '2',
    title: '多肉植物浇水技巧',
    cover: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=200&h=200&fit=crop',
    category: '多肉植物',
    difficulty: 'intermediate',
    publishDate: '2024-01-14',
    content: '多肉植物浇水是关键...',
  },
  {
    id: '3',
    title: '室内植物光照需求详解',
    cover: 'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=200&h=200&fit=crop',
    category: '新手入门',
    difficulty: 'beginner',
    publishDate: '2024-01-13',
    content: '光照是植物生长的关键...',
  },
  {
    id: '4',
    title: '常见室内植物病虫害防治',
    cover: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&h=200&fit=crop',
    category: '病虫害防治',
    difficulty: 'advanced',
    publishDate: '2024-01-12',
    content: '病虫害是养植过程中常见的问题...',
  },
  {
    id: '5',
    title: '观叶植物施肥指南',
    cover: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=200&h=200&fit=crop',
    category: '室内绿植',
    difficulty: 'intermediate',
    publishDate: '2024-01-11',
    content: '合理施肥让植物更健康...',
  },
] as unknown as Guide[];

// 社区帖子数据
export const posts = [
  {
    id: '1',
    author: {
      id: '2',
      name: '绿植爱好者',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'
    },
    content: '今天给绿萝换盆了，希望它茁壮成长！换盆的时候发现根系很健康，新盆选了大一号的，土壤用了营养土加珍珠岩。',
    images: [
      'https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1463320898484-cdee8141c787?w=400&h=400&fit=crop'
    ],
    likes: 12,
    comments: [
      {
        id: '1',
        author: {
          id: '3',
          name: '小花匠',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop'
        },
        content: '我的绿萝也是最近换的盆！',
        likes: 3,
        createdAt: '2024-01-15 10:30'
      }
    ],
    isLiked: false,
    isFavorited: true,
    createdAt: '2024-01-15 09:00',
    topic: '绿萝'
  },
  {
    id: '2',
    author: {
      id: '4',
      name: '多肉控',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop'
    },
    content: '分享我的多肉小花园，每个都是心头好！养护多肉最重要的是控制浇水，干透浇透是关键。',
    images: [
      'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1446071103084-c257b5f70672?w=400&h=400&fit=crop'
    ],
    likes: 28,
    comments: [],
    isLiked: true,
    isFavorited: false,
    createdAt: '2024-01-14 16:30',
    topic: '多肉植物'
  },
  {
    id: '3',
    author: {
      id: '5',
      name: '新手求助',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop'
    },
    content: '求助！我的吊兰叶子发黄是什么原因？最近一周浇了两次水，放在窗台上，有散射光。',
    images: [
      'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=400&h=400&fit=crop'
    ],
    likes: 5,
    comments: [
      {
        id: '2',
        author: {
          id: '6',
          name: '植物医生',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop'
        },
        content: '可能是浇水过多，建议减少浇水频率，检查根部是否腐烂',
        likes: 8,
        createdAt: '2024-01-14 11:00'
      }
    ],
    isLiked: false,
    isFavorited: false,
    createdAt: '2024-01-14 10:00',
    topic: '求助',
  },
] as unknown as Post[];

// 热门话题
export const topics: Topic[] = [
  { id: '1', name: '#绿萝养护', icon: null, post_count: 12000, created_at: '2024-01-01T00:00:00Z' },
  { id: '2', name: '#多肉植物', icon: null, post_count: 8500, created_at: '2024-01-01T00:00:00Z' },
  { id: '3', name: '#新手入门', icon: null, post_count: 5600, created_at: '2024-01-01T00:00:00Z' },
  { id: '4', name: '#病虫害防治', icon: null, post_count: 3200, created_at: '2024-01-01T00:00:00Z' },
  { id: '5', name: '#植物识别', icon: null, post_count: 4100, created_at: '2024-01-01T00:00:00Z' },
];

// 养护提醒
export const careReminders = [
  {
    id: '1',
    plantId: '1',
    plantName: '绿萝',
    type: 'water',
    frequency: 3,
    unit: 'day',
    nextReminder: '2024-01-17',
    enabled: true
  },
  {
    id: '2',
    plantId: '2',
    plantName: '吊兰',
    type: 'water',
    frequency: 2,
    unit: 'day',
    nextReminder: '2024-01-15',
    enabled: true
  },
  {
    id: '3',
    plantId: '1',
    plantName: '绿萝',
    type: 'fertilizer',
    frequency: 1,
    unit: 'month',
    nextReminder: '2024-02-01',
    enabled: true,
  },
] as unknown as CareReminder[];

// 植物品种库
export const plantLibrary = [
  {
    id: 'lib-1',
    name: '龟背竹',
    scientificName: 'Monstera deliciosa',
    family: '天南星科',
    image: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=400&h=400&fit=crop',
    status: 'healthy',
    difficulty: 'medium',
    nextWaterDate: '2024-01-16',
    waterFrequency: 5,
    description: '龟背竹叶形奇特，是网红室内植物',
  },
  {
    id: 'lib-2',
    name: '琴叶榕',
    scientificName: 'Ficus lyrata',
    family: '桑科',
    image: 'https://images.unsplash.com/photo-1545241047-6083a3684587?w=400&h=400&fit=crop',
    status: 'healthy',
    difficulty: 'medium',
    nextWaterDate: '2024-01-17',
    waterFrequency: 7,
    description: '琴叶榕叶片大而美丽，是装饰性很强的室内植物',
  },
  {
    id: 'lib-3',
    name: '仙人掌',
    scientificName: 'Cactaceae',
    family: '仙人掌科',
    image: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=400&fit=crop',
    status: 'healthy',
    difficulty: 'easy',
    nextWaterDate: '2024-01-25',
    waterFrequency: 14,
    description: '仙人掌耐旱性强，适合懒人养护',
  },
] as unknown as Plant[];
