import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, HelpCircle, MessageCircle, BookOpen, Camera, Lightbulb, Send } from 'lucide-react';
import { trackEvent, requireOnline, withRetry } from '@/lib/appHelpers';
import { db, isMockMode, supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function HelpRequestPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    trackEvent('page_view', { page: 'help_request' });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
      toast.error('请填写问题描述');
      return;
    }
    if (!requireOnline()) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error('请先登录后再提交');
      navigate('/login', { state: { from: '/help' } });
      return;
    }

    setSubmitting(true);
    try {
      if (isMockMode) {
        toast.success('演示模式：未写入数据库');
        setTitle('');
        setBody('');
        return;
      }
      await withRetry(() => db.submitHelpRequest(user.id, title, body), 1, 500);
      trackEvent('help_request_submit');
      toast.success('已提交，管理员会在「内容审核」中处理');
      setTitle('');
      setBody('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-10 animate-fadeIn">
      <header className="h-[56px] bg-card/80 backdrop-blur-md flex items-center px-4 sticky top-0 z-30 border-b border-border">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors active:scale-95"
        >
          <ArrowLeft size={24} className="text-foreground" />
        </button>
        <h1 className="flex-1 text-center text-[18px] font-bold text-foreground">问题求助</h1>
        <div className="w-10" />
      </header>

      <div className="max-w-md mx-auto p-4 space-y-5">
        <div className="bg-card rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-border text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#E8F5E9] flex items-center justify-center mb-4">
            <HelpCircle size={36} className="text-[#4CAF50]" />
          </div>
          <p className="text-[15px] text-foreground leading-relaxed">
            黄叶、烂根、虫害……可在此提交文字求助（管理员在后台审核）；也可去社区发动态并附图，更容易得到建议。
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="bg-card rounded-2xl p-4 shadow-sm border border-border space-y-4">
          <div className="space-y-2">
            <Label htmlFor="help-title">标题（可选）</Label>
            <Input
              id="help-title"
              name="help_title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：绿萝叶尖发黄"
              className="rounded-xl"
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="help-body">问题描述</Label>
            <Textarea
              id="help-body"
              name="help_body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="请尽量说明品种、环境、最近浇水施肥与出现时间…"
              className="rounded-xl min-h-[120px]"
              maxLength={4000}
              required
            />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#4CAF50] hover:bg-[#43A047] text-white h-11"
          >
            <Send size={18} className="mr-2" />
            {submitting ? '提交中…' : '提交给管理员'}
          </Button>
        </form>

        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border space-y-3">
          <p className="text-[14px] font-semibold text-foreground flex items-center gap-2">
            <Lightbulb size={18} className="text-amber-500" />
            发帖小技巧
          </p>
          <ul className="text-[13px] text-muted-foreground space-y-2 pl-1">
            <li className="flex gap-2">
              <Camera size={16} className="text-muted-foreground flex-shrink-0 mt-0.5" />
              <span>尽量拍摄清晰叶片正反面、盆土干湿状态。</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#4CAF50] font-bold flex-shrink-0">·</span>
              <span>说明品种名、摆放位置（阳台/室内）、最近浇水施肥时间。</span>
            </li>
          </ul>
        </div>

        <button
          type="button"
          onClick={() => navigate('/community', { state: { openComposer: true } })}
          className="w-full h-14 rounded-2xl bg-[#4CAF50] text-white font-bold shadow-lg shadow-green-100 flex items-center justify-center gap-2 hover:bg-[#43A047] active:scale-[0.98] transition-all"
        >
          <MessageCircle size={22} />
          去社区发帖求助
        </button>

        <button
          type="button"
          onClick={() => navigate('/guides')}
          className="w-full h-12 rounded-2xl border-2 border-border text-foreground font-medium flex items-center justify-center gap-2 active:scale-[0.99] transition-transform bg-card"
        >
          <BookOpen size={20} className="text-[#4CAF50]" />
          先查养护百科
        </button>

        <button
          type="button"
          onClick={() => navigate('/variety-library')}
          className="w-full h-12 rounded-2xl text-[#4CAF50] text-[14px] font-medium"
        >
          不确定品种？去品种库查一查
        </button>
      </div>
    </div>
  );
}
