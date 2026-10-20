# PromptLab 数据库设计

## 1. 状态与边界

P2-02 通过 `supabase/migrations/` 中的版本化 SQL 建立本地可验证的业务数据库结构。本阶段不部署远程 Migration，也不实现 Prompt CRUD 界面。

关系如下：

```text
auth.users 1 ── * prompts 1 ── * prompt_versions 1 ── * experiments
```

三个业务表都显式保存 `user_id`。复合外键把子记录的所有者与父记录所有者绑定，避免只依赖应用代码维护跨表归属。

## 2. `public.prompts`

保存可编辑元数据，正文只存在于版本表。

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `id` | `uuid` | 主键，默认生成 |
| `user_id` | `uuid` | 非空，引用 `auth.users(id)`，用户删除时级联 |
| `title` | `text` | 非空、非纯空白、1–120 字符 |
| `description` | `text` | 非空，默认空字符串；空或非纯空白，最多 1000 字符 |
| `category` | `text` | `coding`、`product`、`content`、`image`、`research`、`other` |
| `created_at` | `timestamptz` | 非空，默认 `now()` |
| `updated_at` | `timestamptz` | 非空，由触发器更新 |

`(id, user_id)` 唯一约束供子表复合外键引用；`(user_id, updated_at desc)` 支持用户资产列表。

Prompt 不允许客户端直接 `INSERT`，必须调用 `create_prompt_with_initial_version`，确保每个新 Prompt 与 v1 在同一事务中创建。允许所有者修改 `title`、`description`、`category`，不因此创建正文版本。删除 Prompt 会级联删除版本和实验。

## 3. `public.prompt_versions`

保存不可变正文快照。

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `id` | `uuid` | 主键，默认生成 |
| `prompt_id` | `uuid` | 非空，与 `user_id` 一起引用 Prompt |
| `user_id` | `uuid` | 非空，必须等于父 Prompt 所有者 |
| `version_number` | `integer` | 非空，正整数 |
| `content` | `text` | 非空、非纯空白、1–50000 字符 |
| `change_note` | `text` | 可空；非空时不能仅含空白，最多 500 字符 |
| `created_at` | `timestamptz` | 非空，默认 `now()` |

`(prompt_id, version_number)` 唯一。应用角色只有读取权限，没有直接插入、更新或删除权限。新增版本通过 `append_prompt_version` 完成：函数锁定所属 Prompt 行，再分配下一版本号；唯一约束提供并发冲突的最终保护。历史版本只会在删除父 Prompt 时由外键级联清理。

## 4. `public.experiments`

实验准确引用一个正式版本，并保存当次输入与输出快照。

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `id` | `uuid` | 主键，默认生成 |
| `user_id` | `uuid` | 非空，必须等于关联版本所有者 |
| `prompt_version_id` | `uuid` | 非空，与 `user_id` 一起引用版本，父版本删除时级联 |
| `status` | `text` | `completed` 或 `failed` |
| `input_variables` | `jsonb` | 非空 JSON 对象，序列化后最多 50000 字符 |
| `model_name` | `text` | 非空、非纯空白、1–120 字符 |
| `rendered_prompt` | `text` | 非空、非纯空白、1–100000 字符 |
| `output_text` | `text` | completed 时必填；非空白，最多 200000 字符 |
| `failure_reason` | `text` | failed 时必填；非空白，最多 4000 字符 |
| `rating` | `smallint` | 可空；非空时为 1–5，failed 时必须为空 |
| `notes` | `text` | 可空；非空时不能仅含空白，最多 4000 字符 |
| `created_at` / `updated_at` | `timestamptz` | 非空；更新时间由触发器维护 |

实验创建后，`user_id`、版本引用、状态、输入、模型、渲染正文、输出和失败原因不可修改。所有者仅可受控修改 `rating` 与 `notes`，也可单独删除实验。

## 5. RLS 与权限

所有业务表启用 RLS，并采用默认拒绝：

- 匿名角色没有业务表权限，也不能执行写入函数。
- 已认证用户只能读取自己 `user_id` 的 Prompt、版本和实验。
- Prompt 元数据更新和删除、实验创建/评价更新/删除均同时受列权限与 RLS 控制。
- Prompt 与版本直接插入被撤销，避免绕过原子创建与版本分配函数。
- 版本直接更新、直接删除被撤销，维护历史不可变性。

RLS 不是服务端鉴权的替代。P2-03 的服务端写入仍须验证会话、使用 Zod 解析输入，并检查业务对象归属。

## 6. 数据库函数

### `create_prompt_with_initial_version`

从 `auth.uid()` 获取所有者，不接收可伪造的 `user_id`。Prompt 与 v1 在一次数据库函数调用及同一事务内插入；任一约束失败会整体回滚。

### `append_prompt_version`

从 `auth.uid()` 获取调用者，锁定其拥有的 Prompt，再计算并写入下一个版本号。跨用户调用返回权限错误。

两者因需要写入客户端无直接权限的表而使用 `SECURITY DEFINER`，同时固定空 `search_path`、完全限定对象名、检查 `auth.uid()` 与所有权，并撤销 `PUBLIC` 和 `anon` 的执行权限，仅授予 `authenticated`。

### `list_prompts`

P2-03 新增的只读列表函数以 `SECURITY INVOKER` 运行，不提升调用者权限，RLS 会继续限制结果为当前用户数据。函数在一次查询中通过 lateral join 取得每个 Prompt 的最新正式版本，支持名称、描述和最新正文搜索、固定分类过滤、`updated_at desc, id desc` 稳定排序、分页和总数返回。

函数限制查询长度、分类、页码和每页数量；`PUBLIC` 与 `anon` 没有执行权限，仅 `authenticated` 可调用。`prompts_user_updated_id_idx` 支持所有者范围内的稳定分页排序。

## 7. Migration 与测试约定

- 所有正式结构变更必须新增版本化 SQL Migration，不覆盖已应用文件。
- 每个业务表的约束、索引、RLS、Policy 和授权应随相关结构一并评审。
- pgTAP 测试放在 `supabase/tests/database/`，至少覆盖匿名、用户 A、用户 B、允许路径、拒绝报错、RLS 零行路径，以及列表函数的最新正文搜索与稳定分页。
- 本地可使用 `npm run db:start`、`npm run db:lint`、`npm run db:test` 与 `npm run db:types`。
- 未经明确许可，不执行远程 `db push`，也不对包含重要数据的环境执行破坏性重置。
