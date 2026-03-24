# ShuttleArena 羽球竞技场

混合双打羽毛球团体联赛管理系统。支持多赛事管理、摇号分组、赛程生成、实时计分。

**在线 Demo**: https://shuttle-arena-demo.pages.dev

> 演示环境使用独立数据库，数据为示例内容，可能会定期重置。

---

## 功能

- **赛事管理** — 创建比赛、配置小组数/人数、自定义队伍名称
- **摇号分组** — 随机分配参赛者到各队位置
- **人员管理** — 绑定注册账号到队伍位置
- **赛程生成** — 自动排期，支持多场地并行
- **实时计分** — 逐局计分，自动计算胜负
- **排名统计** — 积分榜、个人参赛统计
- **用户系统** — admin / athlete 双角色，JWT 鉴权

---

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Next.js 16 (App Router, Edge Runtime) |
| 数据库 | Cloudflare D1（Cloudflare/本地 Edge 调试）/ better-sqlite3（Node 侧兜底） |
| ORM | Drizzle ORM |
| UI | Tailwind CSS v4 + shadcn/ui |
| 部署 | Cloudflare Pages + @cloudflare/next-on-pages |
| 认证 | JWT (jose) + bcryptjs |

---

## 本地开发

```bash
git clone https://github.com/hakupao/badminton-tournament-v2.git
cd badminton-tournament-v2
npm install --legacy-peer-deps
```

初始化本地 D1 数据库并创建 admin 账号：

```bash
npm run d1:init:local
npm run d1:seed:local
```

启动开发服务器：

```bash
npm run dev
```

`npm run dev` 会先自动执行本地 D1 的建表和 admin 种子，然后以 Cloudflare 本地绑定模式启动。

访问 http://localhost:3000，使用 `admin` / `admin123` 登录。

Windows 和 macOS 上的 `npm run dev` 都会连接各自机器上的本地 D1。

如需在推送前按 Cloudflare 运行时做一次本地验收：

```bash
npm run build:cf
npm run preview:cf
```

> 注意：`@cloudflare/next-on-pages` 在原生 Windows 上的本地 `build:cf` 存在上游兼容性问题。如果你要在 Windows 机器上做 Cloudflare 风格预览，请优先使用 WSL；普通本地联调直接用 `npm run dev` 即可，不影响 GitHub -> Cloudflare 的 Linux 构建链路。

---

## 部署到 Cloudflare Pages

完整部署教程见 [docs/deploy-guide.md](docs/deploy-guide.md)。

**快速流程：**

```bash
# 1. 登录 Cloudflare
npx wrangler login

# 2. 创建 D1 数据库，将 database_id 填入 wrangler.toml
npx wrangler d1 create shuttle-arena-db

# 3. 初始化数据库表
npx wrangler d1 execute shuttle-arena-db --remote --file=schema.sql

# 4. 部署
npm run deploy
```

部署后在 Cloudflare Dashboard 配置：
- Environment variables: `JWT_SECRET=<随机密钥>`
- D1 binding: Variable `DB` → `shuttle-arena-db`

GitHub 推送后的 Cloudflare 自动构建运行在 Linux 环境，运行时会直接使用绑定到 `DB` 的线上 D1。

---

## 项目结构

```
src/
├── app/
│   ├── api/          # API Routes (Edge Runtime)
│   │   ├── auth/     # 登录、注册、登出
│   │   ├── tournaments/  # 赛事 CRUD、小组、赛程、摇号
│   │   ├── matches/  # 比赛详情
│   │   └── users/    # 用户管理
│   ├── admin/        # 管理后台页面
│   ├── match/        # 比赛详情、计分页
│   └── ...           # 公开页面（首页、排名、赛程）
├── components/       # UI 组件
├── db/
│   ├── index.ts      # 数据库切换层（D1 / SQLite）
│   ├── schema.ts     # Drizzle ORM 表定义
│   └── seed.ts       # 本地开发种子数据
└── lib/
    ├── auth.ts       # JWT 鉴权
    └── constants.ts  # 默认队伍、比赛模板
```

---

## npm scripts

| 命令 | 说明 |
|------|------|
| `npm run dev` | 本地开发（自动初始化本地 D1，并以 Cloudflare 本地绑定启动） |
| `npm run dev:fast` | 本地开发（跳过初始化，直接启动本地 D1 绑定） |
| `npm run build` | 本地生产构建（Webpack） |
| `npm run build:cf` | 编译为 Cloudflare Workers 格式 |
| `npm run deploy` | 构建 + 部署到 Cloudflare Pages |
| `npm run deploy:demo` | 构建并手动发布到公开 Demo（`shuttle-arena-demo`） |
| `npm run d1:init` | 初始化线上 D1 数据库表结构（`--remote`） |
| `npm run d1:init:demo` | 初始化 Demo 的 D1 数据库表结构（`--remote`） |
| `npm run d1:seed:demo` | 重置并写入 Demo 示例数据 |
| `npm run d1:init:local` | 初始化本地模拟 D1 |

---

## 本地数据库说明

- 页面/API 的本地开发默认连接 `.wrangler/state/v3/d1/` 里的本地 D1 数据库
- `npm run d1:init:local` 负责建表，`npm run d1:seed:local` 负责确保 `admin/admin123` 存在
- `shuttle-arena.db` 仍保留给非 Edge 的 Node 场景兜底，但日常联调请以本地 D1 为准

---

## 本地产物说明

- `.vercel/` 是本地执行 `npm run build:cf` 或 `npm run deploy` 时自动生成的构建产物目录
- 它不是业务源码，不需要手动维护，也不需要提交到 GitHub
- 如果你删除了 `.vercel/`，下次重新构建时会自动生成
- GitHub -> Cloudflare Pages 自动部署时，Cloudflare 会在 CI 里自行生成对应产物

---

## Demo 环境维护

公开 Demo 当前是一个独立的 Cloudflare Pages 项目：`shuttle-arena-demo`，并使用独立的 D1 数据库：`shuttle-arena-demo-db`。

如果你只是更新了页面、接口逻辑或样式，发布 Demo：

```bash
npm run deploy:demo
```

如果你想把 Demo 数据恢复成一套干净的示例数据：

```bash
npm run d1:seed:demo
```

如果你改了数据库结构，再先执行一次 Demo 的 schema 初始化：

```bash
npm run d1:init:demo
npm run d1:seed:demo
npm run deploy:demo
```

> 注意：当前 Demo 是“手动直传部署”，不是 Git 自动部署项目。所以你 `git push` 后，正式站会自动更新，Demo 不会自动更新，需要你手动执行上面的命令。
