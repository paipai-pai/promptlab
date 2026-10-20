# PromptLab

PromptLab 是面向 AI 开发者、产品经理和 AI 创作者的 Prompt 资产管理与实验平台。当前工程包含 Supabase 邮箱认证、受 RLS 保护的数据模型，以及真实 Prompt 创建、查询、元数据更新和删除流程。

## 本地开发

要求：Node.js 20.9 或更高版本、npm。认证联调需要一个 Supabase 开发项目；数据库 Migration 和 pgTAP 测试需要 Docker Desktop。

```bash
npm install
copy .env.example .env.local
npm run dev
```

编辑 `.env.local`，填写：

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

项目 URL 与 publishable key 可从 Supabase 项目的 Connect 对话框获取。这两个值可供浏览器使用，但仍不得提交真实 `.env.local`。不要在本项目的 `NEXT_PUBLIC_*` 变量中放置 `service_role` 或 secret key。

启动后访问 `http://localhost:3000`。未登录访问 `/library` 会跳转到 `/login`；未配置 Supabase 时，登录页会明确显示配置提示，认证请求不会被伪装为成功。

## Supabase Auth 设置

在 Supabase Dashboard 中完成以下开发配置：

1. 在 Authentication → Providers 中启用 Email 登录，并按需要开启 Confirm email。
2. 在 Authentication → URL Configuration 中，将 Site URL 设为 `http://localhost:3000`，并把 `http://localhost:3000/auth/confirm` 加入 Redirect URLs。部署环境需要添加各自的精确回调 URL。
3. 如果使用服务端 `token_hash` 确认流程，将 Confirm signup 邮件模板中的确认链接设置为：

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">
  确认邮箱
</a>
```

应用的 `/auth/confirm` 同时支持 Supabase PKCE `code` 回调与上述 `token_hash` 模板。生产环境应配置自有 SMTP；Supabase 默认邮件服务仅适合开发测试且有发送限制。

认证页面：

- `/login`：邮箱密码登录
- `/signup`：邮箱注册与确认邮件提示
- `/auth/confirm`：邮箱认证回调，不是人工访问页面
- `/library`：真实 Prompt 资产库，支持服务端搜索、分类和分页
- `/prompts/new`：原子创建 Prompt 与 v1
- `/prompts/[id]`：读取正式版本、编辑本地正文草稿及保存元数据

## 常用命令

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run check
```

`npm run test:e2e` 仅允许连接 `localhost` 或 `127.0.0.1`，要求本地 Supabase、Auth 和 Mailpit 正常运行，并使用 Chromium 验证认证、权限、Prompt CRUD 和 UI 回归。首次运行会通过普通邮箱注册流程建立两个专用测试身份，凭据保存在 Git 忽略的 `.playwright/` 目录；每轮产生的 Prompt 数据会由对应普通用户在结束时清理。该命令不会使用 `service_role`，也不会连接远程数据库。

本地数据库命令：

```bash
npm run db:start
npm run db:lint
npm run db:test
npm run db:types
npm run db:stop
```

`db:start` 只启动本项目的本地 Supabase 服务并应用 `supabase/migrations/`。`db:types` 从实际本地结构重新生成 `src/lib/supabase/database.types.ts`。本项目不会在常规检查中自动执行远程 `db push` 或破坏性数据库重置。

## 文档

- [产品需求](docs/PRD.md)
- [UI 规范](docs/UI_SPEC.md)
- [技术架构](docs/ARCHITECTURE.md)
- [数据模型](docs/DATABASE.md)
- [开发路线图](docs/ROADMAP.md)

## 当前范围

Phase 2 已完成认证、数据库、真实 Prompt CRUD、RLS/pgTAP 和 Playwright 集成验收。创建操作调用原子函数同时写入 Prompt 与 v1；元数据更新不会创建正文版本；删除依赖数据库级联规则。正文新版本、实验记录和模型 API 仍未实现。远程项目必须先显式应用全部 Migration，应用不会自动执行远程 `db push`。
