# ShuttleArena 部署指南

这份文档面向当前仓库的实际部署方式，重点说明：

- 如何把正式站部署到 Cloudflare Pages
- 如何初始化 Cloudflare D1
- 如何配置 `JWT_SECRET` 和 `DB` 绑定
- GitHub 自动部署和 demo 自动发布分别怎么工作

## 部署架构

```text
Browser
  -> Cloudflare CDN
  -> Cloudflare Pages / Edge Runtime
  -> Cloudflare D1
```

当前项目特点：

- 页面和 API 都按 Edge Runtime 运行。
- 应用运行时数据库依赖 Cloudflare D1 绑定 `DB`。
- Cloudflare 构建链路使用 `@cloudflare/next-on-pages`。
- 本地 `npm run dev` 也会尽量模拟 Cloudflare 的 D1 运行方式。

## 前置条件

- Node.js 20+
- npm
- 一个 Cloudflare 账号
- 已安装项目依赖

安装依赖：

```bash
git clone https://github.com/hakupao/badminton-tournament-v2.git
cd badminton-tournament-v2
npm install
```

> 仓库根目录已经配置 `.npmrc`，会自动传递 `legacy-peer-deps=true`，所以这里直接 `npm install` 即可。

## 先理解两条部署链路

正式站有两种常用方式：

1. 命令行部署
   适合第一次快速创建 Pages 项目，或者手动发布。
2. Cloudflare Git 自动部署
   适合长期使用。每次 push 到指定分支后由 Cloudflare 自动构建并发布正式站。

另外，这个仓库还有一条独立链路：

- demo 自动发布
  通过 GitHub Actions 触发，会重置 demo 数据库后再把 demo 站发布出去。

正式站和 demo 站不是同一个 Pages 项目，也不是同一个 D1 数据库。

## 正式站部署

### 第一步：登录 Cloudflare

```bash
npx wrangler login
```

授权成功后，Wrangler 就可以访问你的 Cloudflare 账号。

### 第二步：创建正式站 D1 数据库

项目脚本默认使用数据库名 `shuttle-arena-db`，建议直接按这个名字创建：

```bash
npx wrangler d1 create shuttle-arena-db
```

输出里会包含：

```toml
[[d1_databases]]
binding = "DB"
database_name = "shuttle-arena-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

把这个 `database_id` 写入项目根目录的 [`wrangler.toml`](../wrangler.toml)：

```toml
[[d1_databases]]
binding = "DB"
database_name = "shuttle-arena-db"
database_id = "在这里替换成你的 database_id"
```

### 第三步：初始化正式站数据库表结构

```bash
npm run d1:init
```

这个脚本等价于：

```bash
npx wrangler d1 execute shuttle-arena-db --remote --file=schema.sql
```

可用下面的命令确认建表成功：

```bash
npx wrangler d1 execute shuttle-arena-db --remote --command="SELECT name FROM sqlite_master WHERE type='table'"
```

### 第四步：首次部署 Pages 项目

如果你还没有正式站 Pages 项目，最简单的方式是先跑一次命令行部署：

```bash
npm run deploy
```

它会依次执行：

1. `npm run build:cf`
2. `wrangler pages deploy .vercel/output/static`

首次运行时如果 Cloudflare 侧还没有同名项目，Wrangler 会协助创建。

### 第五步：在 Dashboard 中补齐运行时配置

命令行首次部署后，再到 Cloudflare Dashboard 中补齐运行时配置。

#### 1. 配置环境变量

进入：

- `Workers & Pages`
- 选择你的 Pages 项目
- `Settings`
- `Environment variables`

添加：

| 变量名 | 是否必需 | 说明 |
| --- | --- | --- |
| `JWT_SECRET` | 必需 | JWT 签名密钥，生产环境必须自定义 |

生成随机密钥示例：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

建议同时勾选：

- Production
- Preview

#### 2. 配置 D1 绑定

进入：

- `Workers & Pages`
- 选择你的 Pages 项目
- `Settings`
- `Functions`
- `D1 database bindings`

添加绑定：

- Variable name: `DB`
- D1 database: `shuttle-arena-db`

### 第六步：重新部署一次

在环境变量和 D1 绑定配置完成后，再执行一次部署：

```bash
npm run deploy
```

这样运行时才会拿到正确的 `JWT_SECRET` 和 `DB`。

### 第七步：创建首个管理员账号

系统公开注册只能创建运动员账号，首个 admin 需要手动创建或提权。

#### 方式 A：直接插入 admin 账号

先生成密码哈希：

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('你的密码', 10).then(console.log)"
```

再写入数据库：

```bash
npx wrangler d1 execute shuttle-arena-db --remote --command="INSERT INTO users (username, password_hash, role) VALUES ('admin', '这里替换成bcrypt哈希', 'admin')"
```

#### 方式 B：先注册，再提权

1. 部署完成后访问 `/login`
2. 注册一个普通账号
3. 再执行：

```bash
npx wrangler d1 execute shuttle-arena-db --remote --command="UPDATE users SET role = 'admin' WHERE username = '你的用户名'"
```

## Cloudflare Git 自动部署正式站

如果你希望正式站在 push 后自动更新，可以使用 Cloudflare Pages 的 Git 集成。

### 配置步骤

1. 打开 Cloudflare Dashboard
2. 进入 `Workers & Pages`
3. 选择 `Create` -> `Pages` -> `Connect to Git`
4. 连接 GitHub 并选择这个仓库
5. 构建配置填写：

| 项目 | 值 |
| --- | --- |
| Framework preset | `None` |
| Build command | `npm run build:cf` |
| Build output directory | `.vercel/output/static` |
| Root directory | `/` |

6. 环境变量至少配置：

| 变量名 | 值 |
| --- | --- |
| `JWT_SECRET` | 你的随机密钥 |
| `NODE_VERSION` | `20` |

7. 部署完成后，再到 `Settings -> Functions -> D1 database bindings` 中绑定 `DB -> shuttle-arena-db`
8. 重新触发一次部署

之后每次 push 到你配置的分支，Cloudflare 都会自动构建和发布正式站。

## Demo 自动发布

仓库里还有一个独立的 demo 发布工作流：

- 工作流文件：[`../.github/workflows/deploy-demo.yml`](../.github/workflows/deploy-demo.yml)
- 触发条件：push 到 `master` 或手动触发

当前工作流会执行：

1. `npm ci`
2. `npm run d1:init:demo`
3. `npm run d1:seed:demo`
4. `npm run deploy:demo`

也就是说，demo 每次发布前都会先重置为示例数据。

### Demo 所需仓库 secret

至少需要：

- `CLOUDFLARE_API_TOKEN`

这个 token 需要具备对 Pages 和 D1 的编辑权限。

### 本地手动发布 demo

```bash
npm run d1:init:demo
npm run d1:seed:demo
npm run deploy:demo
```

## 本地开发和部署的关系

### 为什么本地开发也走 D1

当前项目的 API route 都按 Edge Runtime 运行，所以本地开发也尽量走 Cloudflare 风格的 D1 绑定，减少“本地能跑、线上不一样”的情况。

开发时：

```bash
npm run dev
```

会自动先执行：

- `npm run d1:init:local`
- `npm run d1:seed:local`

再启动带本地 D1 绑定的 `next dev`。

默认本地管理员账号：

- 用户名：`admin`
- 密码：`admin123`

### 本地 Cloudflare 风格验收

如果你想在推送前尽量按 Cloudflare Pages 的方式验一遍：

```bash
npm run build:cf
npm run preview:cf
```

### 本地不同模式分别连哪个数据库

| 场景 | 使用的数据库 |
| --- | --- |
| `npm run dev` / `npm run dev:fast` | Wrangler 管理的本地 D1 |
| `npm run preview:cf` | Wrangler 提供的本地 Cloudflare Pages 预览环境 |
| Cloudflare Pages Preview / Production | Dashboard 中绑定的真实 D1 |

## 常用命令

### 查看线上 D1 数据

```bash
npx wrangler d1 execute shuttle-arena-db --remote --command="SELECT * FROM users"
npx wrangler d1 execute shuttle-arena-db --remote --command="SELECT * FROM tournaments"
```

### 备份线上 D1

```bash
npx wrangler d1 export shuttle-arena-db --remote --output=backup.sql
```

### 重新初始化本地 D1

```bash
npm run d1:init:local
npm run d1:seed:local
```

## 常见问题

### Q: `npm install` 还需要手动加 `--legacy-peer-deps` 吗？

不需要。仓库里的 `.npmrc` 已经配置好了。

### Q: `@cloudflare/next-on-pages` 和 Next.js 16 兼容吗？

当前仓库就是按这套组合运行的，但这条链路相对脆弱，所以：

- 不要随意删除 `.npmrc`
- 不要随意改掉 `build:cf` 相关脚本
- 如果要调整部署链路，先确认 Cloudflare 构建也能通过

### Q: Cloudflare 构建时报 `@cloudflare/next-on-page` 404？

通常是少写了最后那个 `s`。

正确命令：

```bash
npx @cloudflare/next-on-pages
```

### Q: 初始化数据库时忘记加 `--remote` 怎么办？

重新执行一次正确的远程命令即可：

```bash
npm run d1:init
```

本地和远程 D1 是两套不同数据，不会自动同步。

### Q: 部署后 API 返回 500 怎么排查？

优先检查：

1. `DB` 绑定是否存在，且变量名是否就是 `DB`
2. 线上 D1 是否已经执行过 `schema.sql`
3. `JWT_SECRET` 是否已配置

查看 Pages 实时日志：

```bash
npx wrangler pages deployment tail
```

### Q: `.vercel/` 是什么，能删吗？

可以删。

它是本地执行 `npm run build:cf` / `npm run deploy` 时生成的构建产物目录，不是业务源码，也不应该提交到 Git。

其中最关键的是：

- `.vercel/output/static`

`wrangler pages deploy` 会从这个目录读取构建产物。

### Q: Windows 上本地 `build:cf` 失败怎么办？

这是当前上游兼容性里比较常见的问题。建议：

- 日常开发直接用 `npm run dev`
- 如果要本地跑 Cloudflare 风格预览，优先用 WSL
- GitHub / Cloudflare 的 Linux 构建链路通常不受这个问题影响

## 相关文件

| 文件 | 作用 |
| --- | --- |
| [`../wrangler.toml`](../wrangler.toml) | Cloudflare Pages / D1 配置 |
| [`../schema.sql`](../schema.sql) | D1 建表脚本 |
| [`../scripts/seed-local-d1.sql`](../scripts/seed-local-d1.sql) | 本地 admin 种子 |
| [`../scripts/seed-demo.sql`](../scripts/seed-demo.sql) | demo 示例数据 |
| [`../scripts/deploy-demo.mjs`](../scripts/deploy-demo.mjs) | demo 发布脚本 |
| [`../src/db/index.ts`](../src/db/index.ts) | Edge-safe D1 入口 |
| [`../next.config.ts`](../next.config.ts) | 本地开发时注入 Cloudflare 绑定 |
