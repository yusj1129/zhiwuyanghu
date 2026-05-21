import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { db, isMockMode } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Post, HelpRequest } from '@/types';
import { requireOnline, withRetry } from '@/lib/appHelpers';

type ModComment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  post_id: string;
  posts: { id: string; content: string } | { id: string; content: string }[] | null;
};

function postSnippet(row: ModComment): string {
  const p = row.posts;
  if (!p) return '（帖子已删或不可见）';
  const o = Array.isArray(p) ? p[0] : p;
  const t = o?.content || '';
  return t.length > 80 ? `${t.slice(0, 80)}…` : t || '（无正文）';
}

export function ModerationPage() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<ModComment[]>([]);
  const [helps, setHelps] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const checkModerator = useCallback(async () => {
    const user = await db.getUser();
    if (!user) {
      navigate('/login', { replace: true, state: { from: '/profile/moderation' } });
      return;
    }
    const ok = await db.getProfileModeratorFlag(user.id);
    setAllowed(ok);
    if (!ok) {
      toast.message('当前账号无审核权限');
      navigate('/profile', { replace: true });
    }
  }, [navigate]);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const list = await db.getPosts();
      setPosts(list.slice(0, 80));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '加载帖子失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const list = await db.listCommentsForModeration(100);
      setComments(list);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '加载评论失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHelps = useCallback(async () => {
    setLoading(true);
    try {
      const list = await db.listHelpRequestsForModerator('pending');
      setHelps(list);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '加载求助失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkModerator();
  }, [checkModerator]);

  useEffect(() => {
    if (allowed !== true) return;
    if (tab === 'posts') void loadPosts();
    if (tab === 'comments') void loadComments();
    if (tab === 'help') void loadHelps();
  }, [allowed, tab, loadPosts, loadComments, loadHelps]);

  const runBusy = async (id: string, fn: () => Promise<void>) => {
    if (!requireOnline()) return;
    setBusyId(id);
    try {
      await withRetry(fn, 1, 400);
    } finally {
      setBusyId(null);
    }
  };

  if (allowed === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#4CAF50]" />
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <div className="min-h-screen bg-background pb-10 animate-fadeIn">
      <header className="h-[56px] bg-card/80 backdrop-blur-md flex items-center px-4 sticky top-0 z-30 border-b border-border">
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors active:scale-95"
        >
          <ArrowLeft size={24} className="text-foreground" />
        </button>
        <h1 className="flex-1 text-center text-[18px] font-bold text-foreground">内容审核</h1>
        <div className="w-10" />
      </header>

      {isMockMode && (
        <p className="mx-4 mt-3 text-[12px] text-amber-800 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-200 rounded-lg px-3 py-2 border border-amber-200/80">
          演示模式：下架操作不会请求数据库。
        </p>
      )}

      <div className="px-4 pt-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-3 rounded-xl bg-muted/60 p-1">
            <TabsTrigger value="posts" className="rounded-lg text-[13px]">
              社区帖子
            </TabsTrigger>
            <TabsTrigger value="comments" className="rounded-lg text-[13px]">
              评论
            </TabsTrigger>
            <TabsTrigger value="help" className="rounded-lg text-[13px]">
              求助
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-4 space-y-3">
            {loading && tab === 'posts' ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
              </div>
            ) : posts.length === 0 ? (
              <p className="text-center text-[14px] text-muted-foreground py-10">暂无帖子</p>
            ) : (
              posts.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-border bg-card p-3 shadow-sm space-y-2"
                >
                  <p className="text-[12px] text-muted-foreground">
                    用户 {p.user_id.slice(0, 8)}… ·{' '}
                    {p.created_at ? new Date(p.created_at).toLocaleString() : ''}
                  </p>
                  <p className="text-[14px] text-foreground line-clamp-4 whitespace-pre-wrap">{p.content}</p>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="rounded-lg"
                    disabled={busyId === p.id}
                    onClick={() =>
                      void runBusy(String(p.id), async () => {
                        await db.moderatorDeletePost(String(p.id));
                        toast.success('帖子已下架');
                        await loadPosts();
                      })
                    }
                  >
                    <Trash2 size={16} className="mr-1" />
                    {busyId === p.id ? '处理中…' : '下架帖子'}
                  </Button>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="comments" className="mt-4 space-y-3">
            {loading && tab === 'comments' ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-center text-[14px] text-muted-foreground py-10">暂无评论</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="rounded-xl border border-border bg-card p-3 shadow-sm space-y-2">
                  <p className="text-[12px] text-muted-foreground">
                    用户 {c.user_id.slice(0, 8)}… · {new Date(c.created_at).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-muted-foreground">所属帖子摘要：{postSnippet(c)}</p>
                  <p className="text-[14px] text-foreground line-clamp-5 whitespace-pre-wrap">{c.content}</p>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="rounded-lg"
                    disabled={busyId === c.id}
                    onClick={() =>
                      void runBusy(c.id, async () => {
                        await db.moderatorDeleteComment(c.id);
                        toast.success('评论已删除');
                        await loadComments();
                      })
                    }
                  >
                    <Trash2 size={16} className="mr-1" />
                    {busyId === c.id ? '处理中…' : '删除评论'}
                  </Button>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="help" className="mt-4 space-y-3">
            {loading && tab === 'help' ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
              </div>
            ) : helps.length === 0 ? (
              <p className="text-center text-[14px] text-muted-foreground py-10">暂无待处理求助</p>
            ) : (
              helps.map((h) => (
                <div key={h.id} className="rounded-xl border border-border bg-card p-3 shadow-sm space-y-2">
                  <p className="text-[12px] text-muted-foreground">
                    用户 {h.user_id.slice(0, 8)}… · {new Date(h.created_at).toLocaleString()}
                  </p>
                  {h.title ? <p className="text-[15px] font-semibold text-foreground">{h.title}</p> : null}
                  <p className="text-[14px] text-foreground whitespace-pre-wrap">{h.body}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-lg bg-[#4CAF50] hover:bg-[#43A047] text-white"
                      disabled={busyId === h.id}
                      onClick={() =>
                        void runBusy(h.id, async () => {
                          await db.moderatorUpdateHelpRequestStatus(h.id, 'reviewed');
                          toast.success('已标为已处理');
                          await loadHelps();
                        })
                      }
                    >
                      <CheckCircle size={16} className="mr-1" />
                      已处理
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                      disabled={busyId === `d-${h.id}`}
                      onClick={() =>
                        void runBusy(`d-${h.id}`, async () => {
                          await db.moderatorDismissHelpRequest(h.id);
                          toast.success('已移除');
                          await loadHelps();
                        })
                      }
                    >
                      <XCircle size={16} className="mr-1" />
                      移除
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
