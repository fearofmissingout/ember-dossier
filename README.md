# 余烬档案 / Ember Dossier

异步协作末日肉鸽经营游戏 demo。当前版本是 UI-first playable loop：可以在浏览器里查看共享基地、幸存者、选择编队和地点、携带物资、选择风险策略，并完成一轮远征结算。

## 本地测试

安装依赖：

```powershell
npm install
```

运行测试：

```powershell
npm test
```

构建生产版本：

```powershell
npm run build
```

启动本地开发服务器：

```powershell
npm run dev
```

然后打开终端输出的本地地址，通常是：

```text
http://localhost:5173
```

## Demo 使用方式

1. 打开“基地总览”查看资源、设施警报和动态。
2. 打开“远征准备”。
3. 选择 3-5 名幸存者。
4. 选择地点、携带物资和风险策略。
5. 点击“派遣远征”。
6. 在“战报动态”查看结算，基地资源和幸存者状态会更新。

Demo 状态会优先同步到 Supabase 的 `demo_snapshots` 表；如果没有配置 Supabase，或者数据库暂时不可用，会退回浏览器 `localStorage`。点击左侧“重置 demo”可以恢复初始状态，并在数据库可用时同步重置后的共享状态。

## Supabase

当前 demo 可以不接 Supabase 运行。Supabase 文件已经准备好：

- `supabase/schema.sql`
- `supabase/seed.sql`
- `scripts/init-supabase.mjs`

第一版 playable demo 使用 `demo_snapshots` 保存整份共享状态。规范化表仍然保留，用于后续把房间、幸存者、远征、战报拆成正式多人数据模型。

复制环境变量模板：

```powershell
Copy-Item .env.example .env.local
```

`.env.local` 不会提交到 Git。填入：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_DB_URL=postgresql://postgres:your-db-password@db.your-project.supabase.co:5432/postgres
```

初始化数据库：

```powershell
npm run supabase:init
```

如果你暂时没有 pooler 连接串，可以走 Dashboard：

1. 打开 Supabase 项目的 SQL Editor。
2. 在本地复制合并后的 SQL：

```powershell
npm run --silent supabase:sql | clip
```

3. 粘贴到 SQL Editor 并执行。
4. 回到本地验证表是否可读：

```powershell
npm run supabase:check
```

5. 刷新本地页面，顶部状态应从“数据库未连接”变成“数据库已同步”或“数据库已初始化”。

如果不想用剪贴板命令，也可以按顺序手动复制并执行 `supabase/schema.sql` 和 `supabase/seed.sql`。

如果要使用 Supabase 官方 CLI，本机没有全局 `supabase` 时可以用 `npx`：

```powershell
npx supabase login
npx supabase link --project-ref <project-ref>
```

`supabase init` 已经执行过，CLI 配置在 `supabase/config.toml`。`link` 只会绑定远端项目，不会自动执行 `schema.sql` 和 `seed.sql`；数据库初始化仍然使用上面的 `npm run supabase:init`，或者进入 Supabase Dashboard 的 SQL Editor 手动执行。

注意：Supabase 的 direct database host 可能只提供 IPv6。如果本机或当前环境无法直连 `db.<project-ref>.supabase.co:5432`，请在 Supabase Dashboard 里复制 **Connection pooler** 的连接串，放到 `SUPABASE_DB_URL`。也可以直接进入 Supabase Dashboard 的 SQL Editor，按顺序执行 `schema.sql` 和 `seed.sql`。

前端真正接入账号、房间、共享基地时需要：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

不要把 database password、connection string、service role key 提交到仓库。

## Cloudflare Pages 部署

有两种部署方式。

### 方式一：Cloudflare Pages Git 集成

在 Cloudflare Dashboard 创建 Pages 项目，连接 GitHub 仓库：

```text
fearofmissingout/ember-dossier
```

构建设置：

```text
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Root directory: /
```

仓库里的 `wrangler.toml` 也固定声明了 `pages_build_output_dir = "dist"`。Pages 项目不要在这个文件里添加 Workers 用的 `[assets]` 配置；如果以后调整构建输出目录，需要同时更新 Cloudflare Dashboard、`wrangler.toml` 和本地迭代检查。

环境变量：

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

当前版本已经会在 Supabase 可用时读写 `demo_snapshots` 共享状态。

### 方式二：GitHub Actions 发布到 Cloudflare Pages

仓库已经包含 `.github/workflows/deploy-cloudflare-pages.yml`。GitHub Actions 需要这些 repository secrets：

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

`SUPABASE_DB_URL` 也可以作为 GitHub secret 保存，供未来迁移脚本使用；它不应该传给 Cloudflare Pages 前端运行环境。

如果走 GitHub Actions，Cloudflare API Token 需要能编辑 Cloudflare Pages，且目标项目名是：

```text
ember-dossier
```

## 安全提醒

公开仓库不要提交：

- `.env.local`
- Supabase database password
- Supabase service role key
- Postgres connection string

这些已经被 `.gitignore` 排除。
