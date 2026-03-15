# ShuttleArena 部署教程

## 部署架构

```
用户浏览器 → Cloudflare CDN → Cloudflare Pages (Next.js) → Cloudflare D1 (SQLite)
```

- **Cloudflare Pages**: 托管 Next.js 应用（SSR + API Routes）
- **Cloudflare D1**: 托管 SQLite 数据库（边缘节点运行）
- **@cloudflare/next-on-pages**: 将 Next.js 编译为 Cloudflare Workers 兼容格式

---

## 前置条件

1. **Node.js** >= 18
2. **Cloudflare 账号** — 免费版即可（D1 免费额度：5GB 存储 + 5M 行读 / 天）
3. **项目已 clone 到本地**

```bash
git clone https://github.com/hakupao/badminton-tournament-v2.git
cd badminton-tournament-v2/shuttle-arena
npm install --legacy-peer-deps
```

> `--legacy-peer-deps` 是因为 `@cloudflare/next-on-pages` 对 React 19 有 peer dependency 冲突，不影响运行。

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
Created your new D1 database.

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
npm run d1:init
```

这会执行 `schema.sql`，在 D1 中创建所有表（users, tournaments, groups, players, matches 等）。

验证表是否创建成功：

```bash
npx wrangler d1 execute shuttle-arena-db --command="SELECT name FROM sqlite_master WHERE type='table'"
```

应该能看到所有表名。

---

## 第四步：创建管理员账号

D1 数据库初始化后需要手动创建 admin 账号。

### 方法 A：通过注册页面（推荐）

部署后访问 `/register`，注册第一个账号，然后通过 D1 命令提升为 admin：

```bash
npx wrangler d1 execute shuttle-arena-db --command="UPDATE users SET role = 'admin' WHERE username = '你的用户名'"
```

### 方法 B：直接插入（需要先生成 bcrypt hash）

在本地 Node.js 中生成密码哈希：

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('你的密码', 10).then(h => console.log(h))"
```

然后插入：

```bash
npx wrangler d1 execute shuttle-arena-db --command="INSERT INTO users (username, password_hash, role) VALUES ('admin', '这里粘贴bcrypt哈希', 'admin')"
```

---

## 第五步：配置环境变量

### 方式 A：通过 Cloudflare Dashboard

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages** → 找到你的项目
3. **Settings** → **Environment variables**
4. 添加以下变量：

| 变量名 | 值 | 说明 |
|--------|------|------|
| `USE_D1` | `true` | 启用 D1 数据库（不设则使用本地 SQLite） |
| `JWT_SECRET` | `你的随机密钥` | JWT 签名密钥，生产环境**必须**修改 |
| `NODE_VERSION` | `18` | 确保构建环境使用 Node 18+ |

生成随机密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 方式 B：通过 wrangler 命令

```bash
npx wrangler pages secret put JWT_SECRET
# 终端会提示输入值，输入你的密钥
```

---

## 第六步：部署

### 方式 A：命令行部署

```bash
npm run deploy
```

这会执行：
1. `USE_D1=true npx @cloudflare/next-on-pages` — 编译 Next.js 为 CF Workers 格式
2. `npx wrangler pages deploy .vercel/output/static` — 上传到 Cloudflare Pages

首次运行会创建一个新的 Pages 项目，终端会提示你输入项目名称（默认 `shuttle-arena`）。

部署成功后会输出访问 URL，类似：

```
✨ Deployment complete! Take a peek over at https://shuttle-arena.pages.dev
```

### 方式 B：GitHub 自动部署（推荐长期使用）

1. 登录 Cloudflare Dashboard → **Workers & Pages** → **Create**
2. 选择 **Connect to Git** → 授权 GitHub → 选择 `badminton-tournament-v2` 仓库
3. 配置构建设置：

| 设置项 | 值 |
|--------|------|
| Framework preset | `Next.js` |
| Build command | `npx @cloudflare/next-on-pages` |
| Build output directory | `.vercel/output/static` |
| Root directory | `shuttle-arena` |

4. 在 **Environment variables** 中添加 `USE_D1=true`、`JWT_SECRET`、`NODE_VERSION=18`
5. 在 **D1 Database bindings** 中绑定：Variable name = `DB`，选择 `shuttle-arena-db`
6. 点击 **Save and Deploy**

之后每次 `git push` 到 master 都会自动触发部署。

---

## 第七步：绑定 D1 数据库（Dashboard 部署必须）

如果使用 Dashboard 连接 GitHub 部署，还需要手动绑定 D1：

1. Pages 项目 → **Settings** → **Functions** → **D1 database bindings**
2. 添加绑定：
   - Variable name: `DB`
   - D1 database: 选择 `shuttle-arena-db`
3. 保存后重新部署一次

---

## 验证部署

1. 访问 `https://你的项目.pages.dev`
2. 应该能看到登录页面
3. 注册/登录 admin 账号
4. 创建赛事，验证功能正常

---

## 常见问题

### Q: `@cloudflare/next-on-pages` 不兼容 Next.js 16？

当前项目使用 Next.js 16.1.6。如果 `@cloudflare/next-on-pages` 构建失败，可能需要降级：

```bash
npm install next@15 --legacy-peer-deps
```

Next.js 15 是 `@cloudflare/next-on-pages` 官方支持的最高版本。

### Q: 本地开发如何切换回 SQLite？

不设置 `USE_D1` 环境变量即可，默认使用 better-sqlite3：

```bash
npm run dev
```

### Q: 如何查看 D1 数据库内容？

```bash
npx wrangler d1 execute shuttle-arena-db --command="SELECT * FROM users"
npx wrangler d1 execute shuttle-arena-db --command="SELECT * FROM tournaments"
```

### Q: 如何备份 D1 数据？

```bash
npx wrangler d1 backup create shuttle-arena-db
npx wrangler d1 backup list shuttle-arena-db
npx wrangler d1 backup download shuttle-arena-db <backup-id>
```

### Q: build:cf 命令在 Windows 上 USE_D1=true 不生效？

Windows 不支持 `KEY=VALUE command` 语法。使用 cross-env 或手动设置：

```bash
# PowerShell
$env:USE_D1="true"; npx @cloudflare/next-on-pages

# 或安装 cross-env
npm install -D cross-env
# 然后修改 package.json 的 build:cf 为:
# "build:cf": "cross-env USE_D1=true npx @cloudflare/next-on-pages"
```

### Q: 部署后 API 返回 500？

检查 D1 绑定是否配置正确，以及 `USE_D1=true` 环境变量是否设置。查看 Workers 日志：

```bash
npx wrangler pages deployment tail
```

---

## 项目文件说明

| 文件 | 用途 |
|------|------|
| `wrangler.toml` | Cloudflare Workers/Pages 配置 |
| `schema.sql` | D1 数据库表结构（初始化用） |
| `src/db/index.ts` | 数据库切换层（D1 / better-sqlite3） |
| `src/db/local.ts` | Plan B 本地数据库（独立模块） |
| `src/db/schema.ts` | Drizzle ORM schema 定义 |
| `src/lib/auth.ts` | JWT 认证逻辑 |

---

## 回退到本地模式（Plan B）

如果 Cloudflare 部署遇到无法解决的问题，可以随时回退到纯本地模式：

1. 不设置 `USE_D1` 环境变量
2. `npm run dev` 正常启动
3. 数据存储在项目根目录的 `shuttle-arena.db`（SQLite 文件）
4. 可以用任何支持 Node.js 的平台部署（Vercel、自建服务器等）
