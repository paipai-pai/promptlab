# PromptLab 技术架构

## 1. 架构目标

PromptLab 采用单体 Next.js 应用与 Supabase 后端服务。架构优先保证私有数据安全、版本不可变、业务边界清晰和后续可维护性，不在 MVP 引入 ORM、全局状态库或额外大型框架。

## 2. 技术基线

- Next.js 16 App Router、React 19
- TypeScript 严格模式
- Tailwind CSS 4、shadcn/ui（Base Nova / Base UI）
- Supabase Auth、PostgreSQL、RLS
- Zod、Vitest + Testing Library
- Playwright（后续阶段）、npm

涉及 Next.js 的实现必须优先读取当前安装版本的 `node_modules/next/dist/docs/`，不能依赖旧版本惯例。

## 3. 代码组织

```text
src/
├─ app/                    # 路由、布局、页面、全局样式
├─ components/
│  ├─ ui/                 # shadcn/ui 原子组件
│  └─ layout/             # 跨功能布局组件
├─ features/
│  └─ <feature>/          # 业务组件、schema、服务、测试
└─ lib/                    # 通用工具和基础设施适配器
```

建议功能模块边界为 `auth`、`prompts`、`prompt-versions`、`experiments`。只有确有共享语义时才把代码提升到公共目录。

## 4. 渲染与业务边界

- 默认使用 Server Components 读取页面数据。
- 交互编辑器、主题切换、复制等能力在最小 Client Component 边界内实现。
- 写操作通过 Server Actions 或 Route Handlers 进入服务端业务层；按交互需求选择，不维护重复接口。
- 页面组件不直接拼接复杂数据库查询。查询、授权上下文和映射逻辑放入对应 feature 的服务端模块。
- 不把 Supabase service role key 放入应用常规请求链路。用户请求使用其会话与 RLS。

## 5. 数据流

### 5.1 读取

1. 浏览器请求 App Router 页面。
2. 服务端 Supabase 客户端从 Cookie 恢复用户会话。
3. 服务端查询 PostgreSQL。
4. RLS 再次限制结果为当前用户可访问行。
5. Server Component 把最小必要数据传给展示或交互组件。

### 5.2 写入

1. 客户端提交表单或动作。
2. 服务端获取并验证当前用户。
3. Zod 解析输入；失败时返回结构化字段错误。
4. 业务层检查对象归属和状态约束。
5. PostgreSQL 事务执行写入，RLS 提供最后一道隔离。
6. 成功后使相关路由数据失效并返回明确结果。

### 5.3 保存新版本

保存正文时只执行追加：调用 `append_prompt_version`，由数据库锁定所属 Prompt 行、确定下一个版本号并插入 `prompt_versions`。应用角色不具备版本表直接写权限，唯一约束处理并发冲突的最终防线，任何路径都不提供历史正文 `UPDATE`。

创建 Prompt 时调用 `create_prompt_with_initial_version`。该函数在同一数据库事务内创建 Prompt 与 v1，避免两个独立请求留下没有初始版本的 Prompt。

## 6. Supabase 客户端策略

- 浏览器客户端：仅在 Client Component 确需调用 Auth 时使用公开项目配置。
- 服务端请求客户端：绑定 Cookie，用于 Server Components、Actions 和 Route Handlers。
- 管理客户端：MVP 默认不建立；未来若确需 service role，必须限定在不可达浏览器的受审计后台任务。

`NEXT_PUBLIC_SUPABASE_URL` 与 publishable key 可用于公开客户端配置；任何高权限密钥都不得使用 `NEXT_PUBLIC_*` 前缀。

## 7. 安全方案

- Supabase Auth 管理会话，服务端操作确认身份和资源归属。
- 所有业务表启用 RLS，默认拒绝，按 `auth.uid()` 最小授权。
- Zod 验证类型、枚举、长度和变量语法。
- 外键、非空、唯一约束和检查约束在数据库层再次保证。
- 版本表追加写，禁止应用层和数据库角色更新历史行。
- 密钥只通过环境变量注入，示例文件不含真实值。
- React 默认转义用户文本；不得使用未清洗的 HTML 注入。

RLS 不是服务端鉴权的替代，两者必须同时存在。

## 8. 测试策略

- 单元测试：变量解析、Zod schema、版本业务规则。
- 组件测试：表单状态、草稿提示、不可用操作说明。
- 数据库测试：migration、约束与 RLS 允许/拒绝场景。
- E2E：后续使用 Playwright 覆盖登录、创建、保存新版本和记录实验。
- 每次交付至少执行 lint、TypeScript、相关测试和生产构建。

## 9. 可观测性与错误处理

- 服务端记录稳定的错误分类与请求上下文，不记录 Prompt 正文、模型输出、Cookie 或密钥。
- 面向用户返回可理解且不泄露内部细节的错误。
- Phase 0 不引入外部监控平台；上线准备阶段再依据部署环境确认。

## 10. 当前限制

- P2-01 已建立 Browser Client、Server Client、Next.js 16 Proxy 会话刷新、邮箱认证页面与服务端受保护布局；当前检出环境未配置真实 Supabase 项目，因此尚未完成真实邮件链路的端到端验证。
- P2-02 已提交三张业务表的版本化 Migration、最小权限、RLS、原子创建/追加版本函数和 pgTAP 权限矩阵。
- P2-03 已接入真实 Prompt 列表、最新版本读取、原子创建、元数据更新和级联删除。列表搜索通过 `SECURITY INVOKER` 查询函数执行，应用请求仍使用会话 SSR Client 与 RLS，不建立管理客户端。
- 当前检出环境的 Migration 已应用到本地 Supabase；远程开发或生产项目仍须由操作者显式部署，应用不会自动推送结构。
- 评分为可空的 1–5 整数；Prompt 删除级联清理版本与实验，实验可单独删除，历史版本不可单独修改或删除。
- Playwright 与部署流程将在后续阶段加入。
