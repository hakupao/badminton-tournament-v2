# ShuttleArena 部署教程

## 部署架构

```
用户浏览器 → Cloudflare CDN → Cloudflare Pages (Next.js) → Cloudflare D1 (SQLite)
```

- **Cloudflare Pages**: 托管 Next.js 应用（SSR + API Routes，运行在 Edge Runtime）
- **Cloudflare D1**: 托管 SQLite 数据库（边缘节点运行，全球低延迟）
- **@cloudflare/next-on-pages**: 将 Next.js 编译为 Cloudflare Workers 兼容格式

---

## 前置条件

1. **Node.js** >= 20.9
2. **Cloudflare 账号** — 免费版即可（D1 免费额度：5GB 存储 + 5M 行读 / 天）
3. **项目已 clone 到本地**

```bash
git clone https://github.com/hakupao/badminton-tournament-v2.git
cd badminton-tournament-v2
npm install --legacy-peer-deps
```

> `--legacy-peer-deps` 是因为 `@cloudflare/next-on-pages` 要求 `next<=15.5.2`，而项目使用 Next.js 16，存在 peer dependency 冲突。项目根目录已配置 `.npmrc` 自动传递该参数，**无需每次手动添加**。

---

## 第一步：登录 Cloudflare

```bash
npx wrangler login
```

会打开浏览器让你授权 Wrangler CLI。成功后终端显示 `Successfully logged in.`

---

## 第二步：创建 D1 数据库

```bash
npx wrangler d1 create shuttle-arena-db
```

输出类似：

```
✅ Successfully created DB 'shuttle-arena-db' in region APAC

[[d1_databases]]
binding = "DB"
database_name = "shuttle-arena-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**复制 `database_id`** 的值，填入项目根目录的 `wrangler.toml`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "shuttle-arena-db"
database_id = "在这里粘贴你的 database_id"
```

---

## 第三步：初始化数据库表结构

```bash
npx wrangler d1 execute shuttle-arena-db --remote --file=schema.sql
```

> 注意：必须加 `--remote` 才会写入线上 D1 数据库，否则只会写入本地模拟 DB。

这会执行 `schema.sql`，在 D1 中创建所有表（users, tournaments, groups, players, matches 等）。`schema.sql` 仅创建表结构，不包含初始数据。

验证表是否创建成功：

```bash
npx wrangler d1 execute shuttle-arena-db --remote --command="SELECT name FROM sqlite_master WHERE type='table'"
```

应该能看到所有表名。

---

## 第四步：创建管理员账号

D1 数据库初始化后需要创建首个 admin 账号。公开注册接口只能创建运动员账号，不能直接注册为 admin。

### 方法 A：直接插入（推荐）

在本地 Node.js 中生成密码哈希：

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('你的密码', 10).then(h => console.log(h))"
```

然后插入：

```bash
npx wrangler d1 execute shuttle-arena-db --remote --command="INSERT INTO users (username, password_hash, role) VALUES ('admin', '这里粘贴bcrypt哈希', 'admin')"
```

### 方法 B：注册后提升权限

部署完成后访问 `/login`，切换到「注册」标签页注册第一个账号，然后通过 D1 命令提升为 admin：

```bash
npx wrangler d1 execute shuttle-arena-db --remote --command="UPDATE users SET role = 'admin' WHERE username = '你的用户名'"
```

---

## 第五步：配置环境变量

### 通过 Cloudflare Dashboard

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages** → 找到你的项目
3. **Settings** → **Environment variables**
4. 添加以下变量（同时勾选 Production 和 Preview）：

| 变量名 | 值 | 说明 |
|--------|------|------|
| `USE_D1` | `true` | 生产环境启用 D1；Cloudflare Pages 部署必须设置 |
| `JWT_SECRET` | `你的随机密钥` | JWT 签名密钥，生产环境**必须**修改 |

> 如果你走的是“本机命令行首次部署”，Pages 项目要等第六步首次 `npm run deploy` 后才会在 Dashboard 中出现。也就是说，第一次命令行部署主要是为了创建项目；随后再回来补环境变量和 D1 绑定，并重新部署一次。

生成随机密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 第六步：部署

### 方式 A：本机命令行部署（快速）

```bash
npm run deploy
```

这会执行：
1. `USE_D1=true npx @cloudflare/next-on-pages` — 使用 Webpack 模式编译 Next.js 为 CF Workers 格式
2. `npx wrangler pages deploy .vercel/output/static` — 上传到 Cloudflare Pages

首次运行会提示输入 Pages 项目名称（建议使用 `shuttle-arena`）。

这里会生成一个本地 `.vercel/` 目录，其中最重要的是 `.vercel/output/static`：

- `.vercel/` **不是业务源码**，而是本地构建/部署时生成的工作目录
- `npm run build:cf` 会自动生成它，**不需要手动创建**
- `npm run deploy` 之所以能工作，是因为第二步 `wrangler pages deploy` 读取的正是 `.vercel/output/static`
- 如果你删除了 `.vercel/`，下次重新执行 `npm run build:cf` 或 `npm run deploy` 时会自动再生成
- 因此它应该被 `.gitignore` 忽略，**不需要提交到 GitHub**

部署成功后会输出访问 URL：

```
✨ Deployment complete! Take a peek over at https://shuttle-arena.pages.dev
```

> 无需先在 Dashboard 创建 Pages 项目，命令行部署会自动创建。

### 方式 B：GitHub 自动部署（推荐长期使用）

每次 `git push` 到 master 时自动触发部署。详见下方「[GitHub 自动部署](#github-自动部署)」章节。

---

## 第七步：绑定 D1 数据库

无论哪种部署方式，都需要在 Dashboard 配置 D1 绑定（命令行首次部署后也需要做）：

1. Pages 项目 → **Settings** → **Functions** → **D1 database bindings**
2. 添加绑定：
   - Variable name: `DB`
   - D1 database: 选择 `shuttle-arena-db`
3. 保存后重新部署一次（执行 `npm run deploy` 或触发 GitHub 重新部署）

---

## GitHub 自动部署

### 前置要求

- 代码已推送到 GitHub 仓库
- 已完成第一步至第五步（D1 数据库创建、初始化、env 变量配置）

### 配置步骤

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. 授权 GitHub → 选择 `badminton-tournament-v2` 仓库
4. 配置构建设置：

| 设置项 | 值 |
|--------|------|
| Framework preset | `None`（不选 Next.js，使用自定义命令） |
| Build command | `npx @cloudflare/next-on-pages` |
| Build output directory | `.vercel/output/static` |
| Root directory | `/` |

> **重要**：Build command 不能写 `npm run build:cf`（里面有 `USE_D1=true` 前缀在 CI 环境有兼容问题），直接写 `npx @cloudflare/next-on-pages` 即可——`USE_D1` 已通过 Environment variables 设置。

5. 在 **Environment variables** 中添加（Production + Preview 都要勾选）：
   - `USE_D1` = `true`
   - `JWT_SECRET` = 你的随机密钥
   - `NODE_VERSION` = `20`

6. 点击 **Save and Deploy**

7. 部署完成后，进入 **Settings** → **Functions** → **D1 database bindings** 绑定 `DB` → `shuttle-arena-db`，然后手动触发一次重新部署

之后每次 `git push` 到 `master` 分支都会自动触发部署。

---

## 验证部署

1. 访问 `https://你的项目.pages.dev/login`
2. 用之前创建的 admin 账号登录
3. 进入管理后台，创建一个比赛，验证小组和人员管理功能

---

## 常见问题

### Q: `@cloudflare/next-on-pages` 不兼容 Next.js 16？

项目已配置 `.npmrc` 和 `--legacy-peer-deps`，构建时会自动处理 peer dep 冲突，无需手动干预。

### Q: 初始化数据库时忘记加 `--remote`？

```bash
# 本地执行（写入本地模拟 DB，不影响线上）
npm run d1:init:local

# 线上执行（写入真实 D1）
npx wrangler d1 execute shuttle-arena-db --remote --file=schema.sql
```

### Q: `.vercel/` 文件夹到底有什么用？可以删除吗？

可以把 `.vercel/` 理解为“本地 Cloudflare/Vercel 构建产物目录”，不是你需要手工维护的源码目录。

- 对本机命令行部署来说，它**会被使用**：`npm run build:cf` 会生成 `.vercel/output/static`，随后 `wrangler pages deploy` 从这里读取产物
- 对 GitHub 自动部署来说，它**不需要预先存在**：Cloudflare 会在 CI 构建过程中自动生成对应产物
- 它**可以删除**：删除后不会影响线上服务；只是下次本地执行 `npm run build:cf` / `npm run deploy` 时会重新生成
- 它**不应该提交到 GitHub**：仓库里只保留源码和配置，`.vercel/` 属于可重建的本地产物

一句话记忆：

> `.vercel/` 对“本地构建后的部署命令”是临时必需的，但它不是需要入库的长期文件。

### Q: Cloudflare 构建时报 `@cloudflare/next-on-page` 404？

这通常是 **Build command 少写了最后的 `s`**。

正确写法：

```bash
npx @cloudflare/next-on-pages
```

错误写法：

```bash
npx @cloudflare/next-on-page
```

如果日志里出现类似下面的报错：

```text
npm error 404 '@cloudflare/next-on-page@*' is not in this registry
```

就去 Cloudflare Pages 项目的 **Build configuration** 里，把 Build command 改回 `npx @cloudflare/next-on-pages`，然后重新部署。

### Q: 本地开发如何切换回 SQLite？

不设置 `USE_D1` 环境变量即可，默认使用 better-sqlite3：

```bash
npm run dev
```

### Q: 如何查看 D1 数据库内容？

```bash
npx wrangler d1 execute shuttle-arena-db --remote --command="SELECT * FROM users"
npx wrangler d1 execute shuttle-arena-db --remote --command="SELECT * FROM tournaments"
```

### Q: 如何备份 D1 数据？

```bash
npx wrangler d1 export shuttle-arena-db --remote --output=backup.sql
```

### Q: 部署后 API 返回 500？

检查：
1. D1 绑定是否已配置（变量名必须是 `DB`）
2. `USE_D1=true` 环境变量是否已设置
3. 数据库表是否已初始化

查看 Worker 实时日志：

```bash
npx wrangler pages deployment tail
```

### Q: build:cf 命令在 Windows 上 USE_D1=true 不生效？

Windows 不支持 `KEY=VALUE command` 语法。使用：

```powershell
# PowerShell
$env:USE_D1="true"; npx @cloudflare/next-on-pages
```

或安装 `cross-env` 并修改 `package.json` 的 `build:cf` 脚本：

```json
"build:cf": "cross-env USE_D1=true npx @cloudflare/next-on-pages"
```

---

## 项目文件说明

| 文件 | 用途 |
|------|------|
| `wrangler.toml` | Cloudflare Workers/Pages 配置，含 D1 database_id |
| `.npmrc` | 配置 `legacy-peer-deps=true`，解决 peer dep 冲突 |
| `schema.sql` | D1 数据库表结构（仅建表，无初始数据） |
| `src/db/seed.ts` | 本地开发用种子脚本（创建 admin 账号） |
| `src/db/index.ts` | 数据库切换层（D1 / better-sqlite3 双轨） |
| `src/db/schema.ts` | Drizzle ORM schema 定义 |
| `src/lib/auth.ts` | JWT 认证逻辑 |
| `next.config.ts` | Next.js 配置（含 `typescript.ignoreBuildErrors`，解决 Webpack 模式类型严格问题） |

---

## 本地开发模式

不需要 Cloudflare 账号，直接本地运行：

```bash
npm install --legacy-peer-deps
npm run dev
```

数据存储在项目根目录的 `shuttle-arena.db`（SQLite 文件，自动创建）。

初始化本地数据库：

```bash
npm run d1:init:local   # 创建表结构
npx tsx src/db/seed.ts  # 创建 admin 账号（admin/admin123）
```
