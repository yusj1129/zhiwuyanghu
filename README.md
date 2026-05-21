# 植物养护助手 (Plant Care Assistant)

一个专为植物爱好者设计的移动端 Web 应用，提供从植物识别、日常养护到社区交流的一站式服务。

---

## 1. 项目简介

**植物养护助手** 旨在帮助用户更好地照顾他们的绿色伙伴。通过简洁直观的移动端界面，用户可以轻松记录植物的生长过程、获取专业的养护指南、并与其他植物爱好者分享心得。

本项目采用前后端分离架构，前端追求极致的移动端交互体验，后端依托 Supabase 提供强大的实时数据支持。

---

## 2. 功能模块构成

### 🔐 用户系统 (Auth)
- **注册/登录**：基于 Supabase Auth 的邮箱密码认证。
- **个人资料**：支持上传头像、修改昵称、编辑个人简介。
- **账户设置**：深色模式切换、消息通知偏好等。

### 📸 植物识别 (Identify)
- **智能识别**：上传或拍摄植物照片，前端通过 Supabase Edge Function 代理第三方识别 API，返回品种、科属及基础养护建议。
- **识别历史**：保存用户的识别记录，方便随时查阅。

### 🪴 我的植物 (My Plants)
- **植物档案**：为每一株植物建立专属档案，记录名称、购入日期、生长状态。
- **养护提醒**：自定义浇水、施肥、修剪等提醒频率，系统自动计算下次操作日期。
- **成长日志**：以图文形式记录植物的每一个变化瞬间。

### 📚 养护指南 (Guides)
- **百科搜索**：涵盖数百种常见室内外植物的详细养护百科。
- **分类教程**：按光照、水分、温度、病虫害等维度整理的进阶养护技巧。
- **FAQ**：解答新手最常见的养护难题。

### 💬 植物社区 (Community)
- **动态广场**：浏览热门话题，查看其他用户的养护动态。
- **互动交流**：支持点赞、评论、关注，打造温馨的植物社交圈。
- **话题分类**：通过话题标签发现感兴趣的内容。

---

## 3. 技术路线

### 前端 (Frontend)
- **核心框架**：[React 19](https://react.dev/) - 最新的 React 特性支持。
- **构建工具**：[Vite 7](https://vitejs.dev/) - 极速的开发体验。
- **编程语言**：[TypeScript](https://www.typescriptlang.org/) - 类型安全。
- **样式方案**：[Tailwind CSS 3](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) - 响应式、可定制的组件库。
- **路由管理**：[React Router 7](https://reactrouter.com/) - 强大的路由能力。
- **图标系统**：[Lucide React](https://lucide.dev/) - 简洁美观的图标库。

### 后端 (Backend)
- **核心平台**：[Supabase](https://supabase.com/) (The Open Source Firebase Alternative)。
- **数据库**：PostgreSQL - 关系型数据存储。
- **身份认证**：Supabase Auth - 安全可靠的用户认证。
- **文件存储**：Supabase Storage - 用于存储植物照片、用户头像等。
- **实时通信**：Supabase Realtime - 社区动态实时更新。

---

## 4. UI 风格说明

- **移动优先**：针对手机屏幕深度优化，最大宽度限制在 448px (max-w-md)，两侧留白模拟 App 体验。
- **自然配色**：以翠绿色 (#22C55E) 为主色调，辅以温和的灰色和白色，营造清新自然的视觉感受。
- **卡片式布局**：核心信息以圆角卡片承载，层级清晰，便于手指点击操作。
- **动效体验**：使用 `framer-motion` 或 CSS 动画实现流畅的页面切换和交互反馈。
- **响应式设计**：在不同尺寸的移动设备上均有良好的表现，同时兼容桌面端预览。

---

## 5. 开发环境准备

1. **安装依赖**：
   ```bash
   cd app
   npm install
   ```

2. **环境变量配置**：
   复制 `.env.example` 为 `.env.local`，并填写你的 Supabase URL 和 Anon Key。

3. **启动项目**：
   ```bash
   npm run dev
   ```

4. **数据库初始化**：
   使用 Supabase CLI 执行 `app/supabase/migrations` 中的迁移，确保核心表、RLS、社区增强表和 Storage 策略全部创建完成。

5. **识别服务配置（Edge Function `identify-plant`）**：
   - **推荐（DeepSeek）**：在 [DeepSeek 开放平台](https://platform.deepseek.com/api_keys) 申请 API Key，在 Supabase **Edge Functions → Secrets** 添加 **`DEEPSEEK_API_KEY`**。部署函数后，识别会调用 `https://api.deepseek.com/chat/completions`（多模态 JSON）。可选：`DEEPSEEK_MODEL`（默认 `deepseek-v4-flash`）、`IDENTIFY_PROVIDER`（默认 `deepseek`）。
   - **备用**：若 DeepSeek 请求失败且已配置 **`IDENTIFY_API_URL`**，会自动改调该地址（与原先逻辑一致）。仅使用自建上游时，可不设 `DEEPSEEK_API_KEY`，只配 `IDENTIFY_API_URL` 与按需 **`IDENTIFY_API_KEY`**。
   - **识别历史写入**：可选 Secret **`ROLE_KEY`**（service_role，勿写入前端）。
