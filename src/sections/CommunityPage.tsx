import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Heart, MessageCircle, Bookmark, Share2, Send, X, Trash2 } from 'lucide-react';
import { supabase, isMockMode, db } from '@/lib/supabase';
import { currentUser as mockUser } from '@/data/mock';
import type { Post } from '@/types';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const MAX_COMMENT_LENGTH = 500;
const COMMUNITY_FETCH_TIMEOUT_MS = 12000;

function withTimeout<T>(promiseLike: PromiseLike<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    Promise.resolve(promiseLike)
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

function getCommentOwnerId(comment: any): string {
  return String(comment.user_id ?? comment.author?.id ?? '');
}

// 帖子卡片
function PostCard({
  post,
  onClick,
  onOpenComments,
  isBookmarked,
  onToggleBookmark,
}: {
  post: any;
  onClick: () => void;
  onOpenComments: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (postId: string) => void;
}) {
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likes, setLikes] = useState(post.likes_count || post.likes || 0);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMockMode) {
      setIsLiked(!isLiked);
      setLikes(isLiked ? likes - 1 : likes + 1);
      return;
    }

    try {
      const user = await db.getUser();
      if (!user) {
        toast.error('请先登录');
        return;
      }

      if (isLiked) {
        await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id);
        setLikes(likes - 1);
      } else {
        await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id });
        setLikes(likes + 1);
      }
      setIsLiked(!isLiked);
    } catch (error: any) {
      toast.error('操作失败: ' + error.message);
    }
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleBookmark(String(post.id));
  };

  const images = post.images || [];
  const authorName = post.profiles?.full_name || post.author?.name || '未知用户';
  const authorAvatar = post.profiles?.avatar_url || post.author?.avatar || 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop';
  const topicName = post.topics?.name || post.topic || '';
  const createdAt = post.created_at || post.createdAt;

  const getImageGridClass = () => {
    const count = images.length;
    if (count === 1) return 'grid-cols-1';
    if (count <= 3) return 'grid-cols-2';
    return 'grid-cols-3';
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '刚刚';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return '刚刚';
    if (hours < 24) return `${hours}小时前`;
    return `${Math.floor(hours / 24)}天前`;
  };

  return (
    <div 
      onClick={onClick}
      className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-4 transition-all duration-200 active:scale-[0.98]"
    >
      {/* 用户信息 */}
      <div className="flex items-center gap-3 mb-3">
        <img
          src={authorAvatar}
          alt={authorName}
          className="w-[40px] h-[40px] rounded-full object-cover"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
        <div className="flex-1">
          <p className="text-[14px] font-medium text-foreground">{authorName}</p>
          <p className="text-[12px] text-muted-foreground">{formatTime(createdAt)}</p>
        </div>
        {topicName && (
          <span className="px-2 py-1 rounded-full bg-[#E3F2FD] text-[#4CAF50] text-[12px]">
            {topicName}
          </span>
        )}
      </div>

      {/* 内容 */}
      <p className="text-[15px] text-foreground leading-relaxed mb-3 line-clamp-3">
        {post.content}
      </p>

      {/* 图片 */}
      {images.length > 0 && (
        <div className={`grid ${getImageGridClass()} gap-1 mb-3`}>
          {images.map((img: string, idx: number) => (
            <img
              key={idx}
              src={img}
              alt="帖子图片"
              className={`rounded-lg object-cover ${
                images.length === 1 ? 'w-full h-[200px]' : 'w-full h-[100px]'
              }`}
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
            />
          ))}
        </div>
      )}

      {/* 互动按钮 */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <button
          onClick={handleLike}
          className="flex items-center gap-1.5 transition-transform duration-200 active:scale-110"
        >
          <Heart
            size={18}
            className={isLiked ? 'text-[#4CAF50] fill-[#4CAF50]' : 'text-muted-foreground'}
          />
          <span className={`text-[13px] ${isLiked ? 'text-[#4CAF50]' : 'text-muted-foreground'}`}>
            {likes}
          </span>
        </button>
        <button
          type="button"
          title="查看评论并回复"
          aria-label="查看评论并回复"
          onClick={(e) => {
            e.stopPropagation();
            onOpenComments();
          }}
          className="flex items-center gap-1.5"
        >
          <MessageCircle size={18} className="text-muted-foreground" />
          <span className="text-[13px] text-muted-foreground">{post.comments_count || post.comments?.length || 0}</span>
        </button>
        <button onClick={handleBookmark} className="flex items-center gap-1.5">
          <Bookmark 
            size={18} 
            className={isBookmarked ? 'text-[#4CAF50] fill-[#4CAF50]' : 'text-muted-foreground'} 
          />
        </button>
      </div>
    </div>
  );
}

// 发布帖子弹窗
function CreatePostModal({ onClose, onCreated, topics }: { onClose: () => void; onCreated: () => void; topics: any[] }) {
  const [content, setContent] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 9) {
      toast.error('最多上传 9 张图片');
      return;
    }
    setImages([...images, ...files]);
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setPreviews([...previews, ...newPreviews]);
  };

  const removeImage = (idx: number) => {
    const newImages = [...images];
    newImages.splice(idx, 1);
    setImages(newImages);
    
    const newPreviews = [...previews];
    URL.revokeObjectURL(newPreviews[idx]);
    newPreviews.splice(idx, 1);
    setPreviews(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error('请输入内容');
      return;
    }

    setSubmitting(true);
    try {
      const user = await db.getUser();
      if (!user) {
        toast.error('请先登录');
        return;
      }

      const uploadedUrls = [];
      for (const file of images) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random()}.${fileExt}`;
        const url = await db.uploadFile('community-images', fileName, file);
        uploadedUrls.push(url);
      }

      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        created_by: user.id,
        content: content,
        topic_id: selectedTopic || null,
        images: uploadedUrls
      });

      if (error) throw error;

      toast.success('发布成功！');
      onCreated();
      onClose();
    } catch (error: any) {
      toast.error('发布失败: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-card z-50 flex flex-col animate-slideUp">
      <header className="h-[48px] border-b border-border flex items-center justify-between px-4">
        <button onClick={onClose} className="text-muted-foreground">取消</button>
        <h3 className="text-[16px] font-medium text-foreground">发布动态</h3>
        <Button 
          onClick={handleSubmit} 
          disabled={submitting || !content.trim()}
          className="bg-[#4CAF50] hover:bg-[#43A047] h-[32px] px-4 rounded-full text-white"
        >
          {submitting ? '发布中...' : '发布'}
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Textarea
          id="community-post-content"
          name="post_content"
          placeholder="分享你的养护心得..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          autoComplete="off"
          className="min-h-[150px] border-none text-[16px] resize-none p-0 focus-visible:ring-0"
        />

        {/* 图片预览 */}
        <div className="grid grid-cols-3 gap-2">
          {previews.map((url, idx) => (
            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden">
              <img src={url} alt="预览" className="w-full h-full object-cover" />
              <button 
                onClick={() => removeImage(idx)}
                className="absolute top-1 right-1 bg-black/50 rounded-full p-1"
              >
                <X size={14} className="text-white" />
              </button>
            </div>
          ))}
          {previews.length < 9 && (
            <label
              htmlFor="community-post-images"
              className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:bg-gray-50"
            >
              <Plus size={24} />
              <input
                id="community-post-images"
                name="post_images"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </label>
          )}
        </div>

        {/* 话题选择 */}
        <div className="pt-4 border-t border-border">
          <p className="text-[14px] text-muted-foreground mb-3">添加话题</p>
          <div className="flex flex-wrap gap-2">
            {topics.map(topic => (
              <button
                key={topic.id}
                onClick={() => setSelectedTopic(selectedTopic === topic.id ? '' : topic.id)}
                className={`px-3 py-1.5 rounded-full text-[13px] border transition-colors ${
                  selectedTopic === topic.id 
                    ? 'bg-[#E8F5E9] border-[#4CAF50] text-[#4CAF50]' 
                    : 'bg-card border-border text-muted-foreground'
                }`}
              >
                # {topic.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CommunityPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'hot' | 'new' | 'follow'>('hot');
  const [activeTopicId, setActiveTopicId] = useState<string>('');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  /** 从列表「评论」入口进入详情时为 true，用于滚动到评论区并聚焦输入框 */
  const [focusCommentsOnOpen, setFocusCommentsOnOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [postsList, setPostsList] = useState<any[]>([]);
  const [topicsList, setTopicsList] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);
  const [bookmarkedPostIds, setBookmarkedPostIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const st = location.state as { openComposer?: boolean } | null;
    if (st?.openComposer) {
      setShowCreateModal(true);
      navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null });
    }
  }, [location, navigate]);

  /** 从分享链接 `/community?post=xxx` 进入时打开对应帖子 */
  useEffect(() => {
    if (loading) return;
    if (selectedPost) return;
    const postId = searchParams.get('post')?.trim();
    if (!postId) return;
    const p = postsList.find((x) => String(x.id) === String(postId));
    if (p) {
      setSelectedPost(p);
      return;
    }
    toast.message('未找到该帖子，可能已删除或链接有误');
    setSearchParams({}, { replace: true });
  }, [loading, searchParams, postsList, selectedPost, setSearchParams]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      setLoadError('');
      if (isMockMode) {
        setCurrentUserId('');
        setLikedPostIds([]);
        setPostsList([]);
        setTopicsList([]);
        setLoadError('当前为演示模式，请配置 Supabase 后查看社区数据。');
        return;
      }
      const currentUser = await db.getUser();
      const uid = currentUser?.id || '';
      setCurrentUserId(uid);

      const [postsRes, topicsRes, likesRes, bookmarkIds]: [any, any, any, string[]] = await withTimeout(
        Promise.all([
          supabase.from('posts').select('*, topics(name)').order('created_at', { ascending: false }),
          supabase.from('topics').select('*').order('post_count', { ascending: false }),
          uid
            ? supabase.from('post_likes').select('post_id').eq('user_id', uid)
            : Promise.resolve({ data: [], error: null }),
          uid ? db.listBookmarkedPostIds(uid) : Promise.resolve([]),
        ]) as Promise<[any, any, any, string[]]>,
        COMMUNITY_FETCH_TIMEOUT_MS,
        '社区数据请求超时，请检查网络或 Supabase 配置'
      );

      if (postsRes.error) throw postsRes.error;
      if (topicsRes.error) throw topicsRes.error;
      if (likesRes.error) throw likesRes.error;

      const postsRows = postsRes.data || [];
      const postUserIds = Array.from(
        new Set(
          postsRows
            .map((post: any) => String(post.user_id || ''))
            .filter(Boolean)
        )
      );
      const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
      if (postUserIds.length > 0) {
        const { data: profileRows, error: profileError } = await withTimeout(
          supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', postUserIds),
          COMMUNITY_FETCH_TIMEOUT_MS,
          '社区用户信息请求超时，请稍后重试'
        );
        if (profileError) throw profileError;
        (profileRows || []).forEach((p: any) => {
          profileMap.set(String(p.id), {
            full_name: p.full_name ?? null,
            avatar_url: p.avatar_url ?? null,
          });
        });
      }

      const likedIds = (likesRes.data || []).map((row: any) => String(row.post_id));
      setLikedPostIds(likedIds);
      setBookmarkedPostIds(bookmarkIds.map(String));

      const bookmarkedSet = new Set(bookmarkIds.map(String));
      const likedSet = new Set(likedIds);
      const patchedPosts = postsRows.map((post: any) => ({
        ...post,
        profiles: profileMap.get(String(post.user_id)) ?? null,
        isLiked: likedSet.has(String(post.id)),
        isFavorited: bookmarkedSet.has(String(post.id)),
      }));

      setPostsList(patchedPosts);
      setTopicsList(topicsRes.data || []);
    } catch (error: any) {
      const msg = error?.message || '请稍后重试';
      setLoadError(msg);
      toast.error('获取社区数据失败: ' + msg);
    } finally {
      setLoading(false);
    }
  }

  const applyBookmarkState = (postId: string, isBookmarked: boolean) => {
    setBookmarkedPostIds((prev) => {
      if (isBookmarked) return Array.from(new Set([...prev, postId]));
      return prev.filter((id) => id !== postId);
    });
    setPostsList((list) =>
      list.map((item) =>
        String(item.id) === postId ? { ...item, isFavorited: isBookmarked } : item
      )
    );
    setSelectedPost((cur) =>
      cur && String(cur.id) === postId ? ({ ...cur, isFavorited: isBookmarked } as Post) : cur
    );
  };

  const handleToggleBookmark = (postId: string) => {
    if (!currentUserId) {
      toast.error('请先登录');
      navigate('/login', { state: { from: '/community' } });
      return;
    }
    const existed = bookmarkedPostIds.includes(postId);
    const nextBookmarked = !existed;
    applyBookmarkState(postId, nextBookmarked);
    void db
      .togglePostBookmark(currentUserId, postId, existed)
      .then(() => toast.success(existed ? '已取消收藏' : '已收藏帖子'))
      .catch((error: any) => {
        applyBookmarkState(postId, existed);
        toast.error('收藏操作失败: ' + (error?.message || '请稍后重试'));
      });
  };

  const displayPosts = useMemo(() => {
    let list = [...postsList];
    const activeTopic = topicsList.find((t) => String(t.id) === activeTopicId);

    if (activeTopic) {
      const activeTopicName = activeTopic.name;
      list = list.filter((post) => {
        const topicName = post.topics?.name || post.topic || '';
        const topicId = String(post.topic_id || post.topicId || '');
        return topicId === activeTopicId || topicName === activeTopicName;
      });
    }

    if (activeTab === 'new') {
      return list.sort((a, b) => {
        const ta = new Date(a.created_at || a.createdAt || 0).getTime();
        const tb = new Date(b.created_at || b.createdAt || 0).getTime();
        return tb - ta;
      });
    }

    if (activeTab === 'follow') {
      const likedSet = new Set(likedPostIds.map(String));
      const bookmarkedSet = new Set(bookmarkedPostIds.map(String));
      return list.filter(
        (post) =>
          likedSet.has(String(post.id)) ||
          bookmarkedSet.has(String(post.id)) ||
          (currentUserId && post.user_id === currentUserId)
      );
    }

    return list.sort(
      (a, b) =>
        (b.likes_count || b.likes || 0) +
          (b.comments_count || b.comments?.length || 0) -
        ((a.likes_count || a.likes || 0) + (a.comments_count || a.comments?.length || 0))
    );
  }, [postsList, topicsList, activeTab, activeTopicId, currentUserId, likedPostIds, bookmarkedPostIds]);

  const handleCommentCountDelta = (postId: string, delta: number) => {
    const bump = (p: any) => {
      const prev =
        typeof p.comments_count === 'number'
          ? p.comments_count
          : Array.isArray(p.comments)
            ? p.comments.length
            : 0;
      return { ...p, comments_count: Math.max(0, prev + delta) };
    };
    setPostsList((list) => list.map((p) => (String(p.id) === postId ? bump(p) : p)));
    setSelectedPost((cur) => (cur && String(cur.id) === postId ? (bump(cur) as Post) : cur));
  };

  const openPost = (post: Post) => {
    setFocusCommentsOnOpen(false);
    setSelectedPost(post);
  };

  const openPostWithComments = (post: Post) => {
    setFocusCommentsOnOpen(true);
    setSelectedPost(post);
  };

  if (selectedPost) {
    return (
      <PostDetailPage 
        post={selectedPost} 
        isBookmarked={bookmarkedPostIds.includes(String(selectedPost.id))}
        onToggleBookmark={handleToggleBookmark}
        onCommentCountDelta={(delta) => handleCommentCountDelta(String(selectedPost.id), delta)}
        focusCommentsOnOpen={focusCommentsOnOpen}
        onFocusCommentsConsumed={() => setFocusCommentsOnOpen(false)}
        onBack={() => {
          setSelectedPost(null);
          setFocusCommentsOnOpen(false);
          if (searchParams.get('post')) {
            setSearchParams({}, { replace: true });
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-[72px] animate-fadeIn">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm px-4 py-2 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-[20px] font-bold text-foreground">社区</h1>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="w-8 h-8 rounded-full bg-[#E8F5E9] flex items-center justify-center transition-transform duration-200 active:scale-90"
          >
            <Plus size={20} className="text-[#4CAF50]" />
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-6 border-b border-border">
          <button
            onClick={() => setActiveTab('hot')}
            className={`pb-2 text-[15px] font-medium transition-colors relative ${
              activeTab === 'hot' ? 'text-[#4CAF50]' : 'text-muted-foreground'
            }`}
          >
            热门
            {activeTab === 'hot' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4CAF50] rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`pb-2 text-[15px] font-medium transition-colors relative ${
              activeTab === 'new' ? 'text-[#4CAF50]' : 'text-muted-foreground'
            }`}
          >
            最新
            {activeTab === 'new' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4CAF50] rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('follow')}
            className={`pb-2 text-[15px] font-medium transition-colors relative ${
              activeTab === 'follow' ? 'text-[#4CAF50]' : 'text-muted-foreground'
            }`}
          >
            关注
            {activeTab === 'follow' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4CAF50] rounded-full" />
            )}
          </button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {loadError && !loading && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
            {loadError}
          </div>
        )}

        {/* 热门话题 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-bold text-foreground">热门话题</h2>
            <button onClick={() => setActiveTopicId('')} className="text-[13px] text-[#4CAF50]">
              全部话题
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {topicsList.map((topic) => (
              <button
                key={topic.id}
                onClick={() =>
                  setActiveTopicId((prev) => (prev === String(topic.id) ? '' : String(topic.id)))
                }
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.05)] border transition-all duration-200 active:scale-95 ${
                  activeTopicId === String(topic.id)
                    ? 'bg-primary/15 border-primary text-primary'
                    : 'bg-card border-border'
                }`}
              >
                <span className="text-[16px]">{topic.icon}</span>
                <span className="text-[14px] font-medium text-foreground">#{topic.name}</span>
                <span className="text-[11px] text-muted-foreground">{topic.post_count || topic.postCount || 0}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 帖子列表 */}
        <div className="space-y-4">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="bg-card rounded-[10px] h-[200px] animate-pulse" />
            ))
          ) : displayPosts.length > 0 ? (
            displayPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onClick={() => openPost(post)}
                onOpenComments={() => openPostWithComments(post)}
                isBookmarked={bookmarkedPostIds.includes(String(post.id))}
                onToggleBookmark={handleToggleBookmark}
              />
            ))
          ) : (
            <div className="py-20 text-center">
              <p className="text-muted-foreground">
                {activeTab === 'follow' || activeTopicId ? '暂无匹配内容，换个筛选试试' : '暂无动态，快去发布第一条吧'}
              </p>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreatePostModal 
          onClose={() => setShowCreateModal(false)} 
          onCreated={fetchData}
          topics={topicsList}
        />
      )}
    </div>
  )
}

// 帖子详情页 (移到底部并适配 Supabase 数据)
function PostDetailPage({
  post,
  onBack,
  isBookmarked,
  onToggleBookmark,
  onCommentCountDelta,
  focusCommentsOnOpen,
  onFocusCommentsConsumed,
}: {
  post: any;
  onBack: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (postId: string) => void;
  onCommentCountDelta?: (delta: number) => void;
  focusCommentsOnOpen?: boolean;
  onFocusCommentsConsumed?: () => void;
}) {
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likes, setLikes] = useState(post.likes_count || post.likes || 0);
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(new Set());
  const [commentLikeDelta, setCommentLikeDelta] = useState<Record<string, number>>({});
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const commentsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetchComments();
  }, [post.id]);

  useEffect(() => {
    setCommentLikeDelta({});
  }, [post.id]);

  useEffect(() => {
    if (isMockMode) {
      setCurrentUserId(String(mockUser.id));
      return;
    }
    void db.getUser().then((u) => setCurrentUserId(u?.id || ''));
  }, []);

  useEffect(() => {
    if (isMockMode) {
      setLikedCommentIds(new Set());
      return;
    }
    if (!currentUserId) {
      setLikedCommentIds(new Set());
      return;
    }
    let alive = true;
    void db
      .listLikedCommentIds(currentUserId, String(post.id))
      .then((ids) => {
        if (!alive) return;
        setLikedCommentIds(new Set(ids));
      })
      .catch((error: any) => {
        console.warn('load comment likes failed:', error?.message || error);
      });
    return () => {
      alive = false;
    };
  }, [post.id, currentUserId]);

  async function fetchComments() {
    if (isMockMode) {
      setComments(post.comments || []);
      return;
    }

    try {
      setCommentsLoading(true);
      const { data, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const commentRows = data || [];
      const commentUserIds = Array.from(
        new Set(
          commentRows
            .map((comment: any) => String(comment.user_id || ''))
            .filter(Boolean)
        )
      );
      const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
      if (commentUserIds.length > 0) {
        const { data: profileRows, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', commentUserIds);
        if (profileError) throw profileError;
        (profileRows || []).forEach((p: any) => {
          profileMap.set(String(p.id), {
            full_name: p.full_name ?? null,
            avatar_url: p.avatar_url ?? null,
          });
        });
      }
      setComments(
        commentRows.map((comment: any) => ({
          ...comment,
          profiles: profileMap.get(String(comment.user_id)) ?? null,
        }))
      );
    } catch (error: any) {
      console.error(`Error fetching comments: ${error?.message || JSON.stringify(error)}`);
      toast.error('加载评论失败：' + (error?.message || '请稍后重试'));
    } finally {
      setCommentsLoading(false);
    }
  }

  const commentComposerId = `community-post-comment-${post.id}`;

  const focusCommentComposer = () => {
    const el = document.getElementById(commentComposerId) as HTMLTextAreaElement | null;
    el?.focus({ preventScroll: true });
  };

  const scrollToCommentsAndFocusComposer = () => {
    commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => focusCommentComposer(), 320);
  };

  /** 从列表点「评论」进入：评论区就绪后滚动并聚焦输入框 */
  useEffect(() => {
    if (!focusCommentsOnOpen) return;
    if (commentsLoading) return;
    const tid = window.setTimeout(() => {
      scrollToCommentsAndFocusComposer();
      onFocusCommentsConsumed?.();
    }, 80);
    return () => window.clearTimeout(tid);
  }, [focusCommentsOnOpen, commentsLoading, post.id]);

  const handleLike = async () => {
    if (isMockMode) {
      setIsLiked(!isLiked);
      setLikes(isLiked ? likes - 1 : likes + 1);
      return;
    }

    try {
      const user = await db.getUser();
      if (!user) {
        toast.error('请先登录');
        return;
      }

      if (isLiked) {
        await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id);
        setLikes(likes - 1);
      } else {
        await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id });
        setLikes(likes + 1);
      }
      setIsLiked(!isLiked);
    } catch (error: any) {
      toast.error('操作失败: ' + error.message);
    }
  };

  const handleSubmitComment = async () => {
    const text = commentText.trim();
    if (!text) {
      toast.error('请输入评论内容');
      return;
    }
    if (text.length > MAX_COMMENT_LENGTH) {
      toast.error(`评论最长 ${MAX_COMMENT_LENGTH} 字`);
      return;
    }
    if (commentSubmitting) return;

    if (isMockMode) {
      const newComment = {
        id: `new-${Date.now()}`,
        user_id: mockUser.id,
        author: {
          id: mockUser.id,
          name: mockUser.name,
          avatar: mockUser.avatar,
        },
        profiles: {
          full_name: mockUser.name,
          avatar_url: mockUser.avatar,
        },
        content: text,
        likes: 0,
        likes_count: 0,
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
      onCommentCountDelta?.(1);
      toast.success('评论成功');
      return;
    }

    try {
      setCommentSubmitting(true);
      const user = await db.getUser();
      if (!user) {
        toast.error('请先登录');
        return;
      }

      const { error } = await supabase.from('post_comments').insert({
        post_id: post.id,
        user_id: user.id,
        created_by: user.id,
        content: text,
      });

      if (error) throw error;

      toast.success('评论成功');
      setCommentText('');
      onCommentCountDelta?.(1);
      await fetchComments();
    } catch (error: any) {
      toast.error('评论失败: ' + error.message);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (comment: any) => {
    const cid = String(comment.id);
    if (!cid || cid.startsWith('temp-')) return;

    if (isMockMode) {
      if (getCommentOwnerId(comment) !== String(mockUser.id)) {
        toast.error('只能删除自己的评论');
        return;
      }
      setComments((prev) => prev.filter((c) => String(c.id) !== cid));
      onCommentCountDelta?.(-1);
      toast.success('已删除评论');
      return;
    }

    try {
      const user = await db.getUser();
      if (!user) {
        toast.error('请先登录');
        return;
      }
      if (String(comment.user_id) !== user.id) {
        toast.error('只能删除自己的评论');
        return;
      }
      const { error } = await supabase.from('post_comments').delete().eq('id', cid).eq('user_id', user.id);
      if (error) throw error;
      setComments((prev) => prev.filter((c) => String(c.id) !== cid));
      onCommentCountDelta?.(-1);
      toast.success('已删除评论');
    } catch (error: any) {
      toast.error('删除失败: ' + error.message);
    }
  };

  const handleSharePost = async () => {
    const shareUrl = `${window.location.origin}/community?post=${encodeURIComponent(String(post.id))}`;
    const shareData = {
      title: '植物社区动态',
      text: post.content?.slice(0, 60) || '来看看这条植物养护动态',
      url: shareUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success('已打开分享面板');
        return;
      }
      await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
      toast.success('分享链接已复制');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      if (msg.includes('abort')) return;
      toast.error('分享失败，请稍后重试');
    }
  };

  const handleToggleBookmark = () => {
    onToggleBookmark(String(post.id));
  };

  const handleScrollToComments = () => {
    scrollToCommentsAndFocusComposer();
  };

  const handleToggleCommentLike = (commentId: string) => {
    if (!currentUserId) {
      toast.error('请先登录');
      return;
    }
    const alreadyLiked = likedCommentIds.has(commentId);
    setLikedCommentIds((prev) => {
      const next = new Set(prev);
      if (alreadyLiked) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      setCommentLikeDelta((delta) => ({
        ...delta,
        [commentId]: (delta[commentId] || 0) + (alreadyLiked ? -1 : 1),
      }));
      return next;
    });
    void db.toggleCommentLike(currentUserId, commentId, alreadyLiked).catch((error: any) => {
      setLikedCommentIds((prev) => {
        const rollback = new Set(prev);
        if (alreadyLiked) {
          rollback.add(commentId);
        } else {
          rollback.delete(commentId);
        }
        return rollback;
      });
      setCommentLikeDelta((delta) => ({
        ...delta,
        [commentId]: (delta[commentId] || 0) + (alreadyLiked ? 1 : -1),
      }));
      toast.error('评论点赞失败: ' + (error?.message || '请稍后重试'));
    });
  };

  const authorName = post.profiles?.full_name || post.author?.name || '未知用户';
  const authorAvatar = post.profiles?.avatar_url || post.author?.avatar || 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop';
  const createdAt = post.created_at || post.createdAt;
  const images = post.images || [];

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '刚刚';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return '刚刚';
    if (hours < 24) return `${hours}小时前`;
    return `${Math.floor(hours / 24)}天前`;
  };

  return (
    <div className="min-h-screen bg-background pb-20 animate-fadeIn">
      {/* 顶部导航 */}
      <header className="h-[48px] bg-card flex items-center px-4 sticky top-0 z-10 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 transition-transform duration-200 active:scale-90">
          <ArrowLeft size={24} className="text-foreground" />
        </button>
        <h1 className="flex-1 text-center text-[18px] font-medium text-foreground">帖子详情</h1>
        <button type="button" onClick={handleSharePost} className="p-2 -mr-2">
          <Share2 size={20} className="text-foreground" />
        </button>
      </header>

      <div className="p-4 space-y-4">
        {/* 帖子内容 */}
        <div className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-4">
          <div className="flex items-center gap-3 mb-3">
            <img
              src={authorAvatar}
              alt={authorName}
              className="w-[40px] h-[40px] rounded-full object-cover"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
            />
            <div>
              <p className="text-[14px] font-medium text-foreground">{authorName}</p>
              <p className="text-[12px] text-muted-foreground">{formatTime(createdAt)}</p>
            </div>
          </div>

          <p className="text-[15px] text-foreground leading-relaxed mb-3 whitespace-pre-wrap">
            {post.content}
          </p>

          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-1 mb-4">
              {images.map((img: string, idx: number) => (
                <img
                  key={idx}
                  src={img}
                  alt="帖子图片"
                  className="w-full h-[150px] rounded-lg object-cover"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <button
              onClick={handleLike}
              className="flex items-center gap-1.5 transition-transform duration-200 active:scale-110"
            >
              <Heart
                size={20}
                className={isLiked ? 'text-[#4CAF50] fill-[#4CAF50]' : 'text-muted-foreground'}
              />
              <span className={`text-[14px] ${isLiked ? 'text-[#4CAF50]' : 'text-muted-foreground'}`}>
                {likes}
              </span>
            </button>
            <button type="button" onClick={handleScrollToComments} className="flex items-center gap-1.5">
              <MessageCircle size={20} className="text-muted-foreground" />
              <span className="text-[14px] text-muted-foreground">{comments.length}</span>
            </button>
            <button type="button" onClick={handleToggleBookmark}>
              <Bookmark 
                size={20} 
                className={isBookmarked ? 'text-[#4CAF50] fill-[#4CAF50]' : 'text-muted-foreground'} 
              />
            </button>
          </div>
        </div>

        {/* 评论区 */}
        <div ref={commentsRef} className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-4">
          <h3 className="text-[16px] font-medium text-foreground mb-4">
            评论 {comments.length}
          </h3>

          {commentsLoading ? (
            <div className="py-10 text-center text-muted-foreground text-[14px]">评论加载中…</div>
          ) : comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => {
                const cName = comment.profiles?.full_name || comment.author?.name || '未知用户';
                const cAvatar = comment.profiles?.avatar_url || comment.author?.avatar || 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop';
                const cDate = comment.created_at || comment.createdAt;
                const canDelete =
                  Boolean(currentUserId) && getCommentOwnerId(comment) === String(currentUserId);

                return (
                  <div key={comment.id} className="flex gap-3">
                    <img
                      src={cAvatar}
                      alt={cName}
                      className="w-[32px] h-[32px] rounded-full object-cover flex-shrink-0"
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-medium text-foreground">{cName}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => void handleDeleteComment(comment)}
                              className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              aria-label="删除评论"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleToggleCommentLike(String(comment.id))}
                            className="flex items-center gap-1"
                          >
                            <Heart
                              size={14}
                              className={likedCommentIds.has(String(comment.id)) ? 'text-[#4CAF50] fill-[#4CAF50]' : 'text-muted-foreground'}
                            />
                            <span className="text-[12px] text-muted-foreground">
                              {(comment.likes_count || comment.likes || 0) + (commentLikeDelta[String(comment.id)] || 0)}
                            </span>
                          </button>
                        </div>
                      </div>
                      <p className="text-[14px] text-foreground mt-1 whitespace-pre-wrap break-words">{comment.content}</p>
                      <p className="text-[11px] text-muted-foreground mt-2">{formatTime(cDate)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground text-[14px]">还没有人评论，快来抢沙发吧</p>
            </div>
          )}
        </div>
      </div>

      {/* 底部输入框 */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-card border-t border-border p-3 flex flex-col gap-2 safe-area-bottom">
        <div className="flex items-end gap-3">
          <div className="flex-1 bg-background rounded-2xl px-3 py-2 border border-border">
            <Textarea
              id={`community-post-comment-${post.id}`}
              name="post_comment"
              placeholder="说点什么吧…（Enter 发送，Shift+Enter 换行）"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSubmitComment();
                }
              }}
              rows={2}
              maxLength={MAX_COMMENT_LENGTH}
              disabled={commentSubmitting || commentsLoading}
              className="min-h-[44px] max-h-[120px] resize-none border-0 bg-transparent p-0 text-[14px] shadow-none focus-visible:ring-0"
            />
            <div className="flex justify-end pt-1">
              <span className="text-[11px] text-muted-foreground">
                {commentText.length}/{MAX_COMMENT_LENGTH}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleSubmitComment()}
            disabled={!commentText.trim() || commentSubmitting || commentsLoading}
            className={`shrink-0 pb-1 transition-colors ${
              commentText.trim() && !commentSubmitting ? 'text-[#4CAF50]' : 'text-muted-foreground'
            }`}
          >
            <Send size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
