# ShuttleArena 羽球竞技场

面向羽毛球团体赛/联赛的管理系统，覆盖多赛事管理、报名与摇号、赛程编排、在线记分、排名统计和运动员账号体系。

在线 Demo: https://shuttle-arena-demo.pages.dev

> Demo 使用独立的 Cloudflare D1 数据库，并会通过 GitHub Actions 定期重置为示例数据。

## 当前能力

- 多赛事管理：支持同时维护多个赛事，并在前台切换当前查看的赛事。
- 公共页面：首页、赛事介绍、赛程、比赛详情、排名与统计均可公开访问。
- 运动员账号：支持注册/登录、查看“我的比赛”、修改用户名和密码。
- 位置绑定：管理员可把注册账号绑定到具体参赛位置，运动员即可看到自己的场次。
- 报名与摇号：先按技术位置分配报名，再按队伍进行摇号落位。
- 轮换与换人：同一位置支持主选手/轮换双槽，未开赛场次可一键换人。
- 赛制配置：可调整每组男女人数、比赛模板、计分模式、比赛时段和场地数。
- 赛程编排：支持赛程模拟、质量评估、正式发布，生成时会考虑连续上场/连续轮空限制。
- 记分体系：支持管理员录分，也支持运动员在手机端实时逐分记分。
- 数据统计：提供队伍、组合、个人、位置维度统计，并支持裁判/边裁记录。

## 典型使用流程

1. 管理员创建赛事，配置比赛日期、时段、场地数、每组人数和计分模式。
2. 设置队伍名称/图标，维护比赛模板，并录入或绑定运动员。
3. 给已注册账号分配技术位置，必要时为位置添加轮换。
4. 在“摇号分组”里执行随机分配，把报名者落到各队各位置。
5. 在“赛程安排”里模拟赛程、查看质量报告，并发布正式赛程。
6. 比赛当天通过后台或手机端录入比分，系统自动更新赛果、统计和排行榜。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 框架 | Next.js 16 + React 19 + App Router |
| 运行时 | Edge Runtime |
| 数据库 | Cloudflare D1（应用运行时）+ better-sqlite3（Node-only 兜底） |
| ORM | Drizzle ORM |
| UI | Tailwind CSS v4 + shadcn/ui + Sonner |
| 认证 | JWT (`jose`) + `bcryptjs` |
| 部署 | Cloudflare Pages + `@cloudflare/next-on-pages` |

## 本地开发

要求：

- Node.js 20+
- npm

安装依赖：

```bash
git clone https://github.com/hakupao/badminton-tournament-v2.git
cd badminton-tournament-v2
npm install
```

> 仓库根目录已经通过 `.npmrc` 配置了 `legacy-peer-deps=true`，不需要手动再加 `--legacy-peer-deps`。

启动开发环境：

```bash
npm run dev
```

这会自动执行：

- `npm run d1:init:local`
- `npm run d1:seed:local`
- `next dev`（带本地 Cloudflare D1 绑定）

默认本地管理员账号：

- 用户名：`admin`
- 密码：`admin123`

访问 http://localhost:3000 即可。

如果你只想快速重启开发服务器，跳过本地 D1 初始化：

```bash
npm run dev:fast
```

如果你想在推送前按 Cloudflare Pages 的方式做一次本地验收：

```bash
npm run build:cf
npm run preview:cf
```

## 环境与数据说明

- 应用运行时默认依赖 Cloudflare D1 绑定 `DB`。
- `npm run dev` / `npm run dev:fast` 使用 Wrangler 的本地 D1 模拟库，数据通常位于 `.wrangler/state/v3/d1/`。
- `src/db/node.ts` 中保留了 `better-sqlite3` 入口，供显式的 Node-only 场景使用；页面和 API 不应该走这个入口。
- `JWT_SECRET` 在生产环境必须配置；本地未配置时会回退到默认开发密钥。
- `shuttle-arena.db` 是 Node 侧兜底数据库文件，不是日常 App Router + Edge 开发的主路径。

## 环境变量 / 绑定

| 名称 | 类型 | 是否必需 | 说明 |
| --- | --- | --- | --- |
| `JWT_SECRET` | 环境变量 | 生产必需 | JWT 签名密钥，本地可省略 |
| `DB` | Cloudflare D1 绑定 | 部署必需 | 应用运行时数据库绑定名，必须叫 `DB` |
| `DEMO_DEPLOY_BRANCH` | 环境变量 | 可选 | `scripts/deploy-demo.mjs` 使用的 demo 发布分支覆盖值 |

## npm scripts

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 本地开发，自动初始化本地 D1 并启动 Next 开发服务器 |
| `npm run dev:fast` | 跳过初始化，直接启动本地开发服务器 |
| `npm run lint` | 运行 ESLint |
| `npm run build` | 执行普通 Next.js 构建，用于基础编译检查 |
| `npm run start` | 启动普通 Next.js 产物；不适合作为 Cloudflare D1 运行时验收方式 |
| `npm run build:cf` | 构建 Cloudflare Pages 所需产物到 `.vercel/output/static` |
| `npm run preview:cf` | 用 Wrangler 本地预览 Cloudflare Pages 构建产物 |
| `npm run deploy` | 构建并部署到 Cloudflare Pages |
| `npm run deploy:demo` | 构建并发布到 demo 项目 `shuttle-arena-demo` |
| `npm run d1:init` | 初始化线上 D1 数据库结构 |
| `npm run d1:init:demo` | 初始化 demo 的线上 D1 数据库结构 |
| `npm run d1:init:local` | 初始化本地 D1 数据库结构 |
| `npm run d1:seed:demo` | 重置并写入 demo 示例数据 |
| `npm run d1:seed:local` | 确保本地 `admin/admin123` 账号存在 |

## 主要页面与后台模块

前台页面：

- `/`：赛事列表首页，展示进行中和历史赛事。
- `/guide`：赛事介绍页，可承载场地、奖品、赞助和系统说明。
- `/schedule`：赛程矩阵/列表视图，登录后会高亮“我的比赛”。
- `/standings`：队伍、组合、个人、位置统计；支持裁判记录榜。
- `/match/[id]`：比赛详情与比分时间线。
- `/match/[id]/scoring`：移动端实时记分入口。
- `/my-matches`：运动员个人场次总览。
- `/account`：个人账号维护。

管理后台：

- `/admin/settings`：赛事基础设置。
- `/admin/rules`：每组人数、计分模式和比赛模板。
- `/admin/teams`：队伍名称和图标。
- `/admin/players`：运动员姓名、账号绑定、轮换管理。
- `/admin/lottery`：报名位置分配与摇号执行。
- `/admin/schedule`：赛程模拟、质量报告、正式发布。
- `/admin/swap`：轮换换人。
- `/admin/scoring`：后台录分和批量录分。
- `/admin/users`：账号创建、删除、重置密码。

## 部署到 Cloudflare Pages

完整说明见 [docs/deploy-guide.md](./docs/deploy-guide.md)。

快速流程：

```bash
npx wrangler login
npx wrangler d1 create shuttle-arena-db
```

把输出的 `database_id` 写入 [`wrangler.toml`](./wrangler.toml) 后，执行：

```bash
npm run d1:init
npm run deploy
```

部署后在 Cloudflare Dashboard 中补齐：

- 环境变量：`JWT_SECRET=<随机密钥>`
- D1 绑定：`DB -> shuttle-arena-db`

完成绑定后再重新部署一次。

## Demo 发布

仓库内提供了 demo 自动刷新 workflow：[.github/workflows/deploy-demo.yml](./.github/workflows/deploy-demo.yml)。

当前行为：

- 每次 push 到 `master` 会触发 demo 发布。
- 发布前会执行 `npm run d1:init:demo` 和 `npm run d1:seed:demo`，把 demo 数据重置为示例内容。

需要在 GitHub 仓库中配置的 secret：

- `CLOUDFLARE_API_TOKEN`

如需手动刷新 demo：

```bash
npm run d1:init:demo
npm run d1:seed:demo
npm run deploy:demo
```

## 项目结构

```text
src/
├── app/
│   ├── api/
│   │   ├── account/                  # 账号信息修改
│   │   ├── auth/                     # 登录 / 注册 / 登出 / 当前用户
│   │   ├── matches/                  # 比赛详情、换人
│   │   ├── tournaments/              # 赛事 CRUD、分组、模板、摇号、赛程、统计
│   │   └── users/                    # 后台账号管理
│   ├── admin/                        # 后台页面
│   ├── match/                        # 比赛详情、移动端记分
│   └── ...                           # 首页、赛程、统计、我的比赛、赛事介绍
├── components/                       # UI / 页面组件
├── db/
│   ├── index.ts                      # Edge-safe D1 入口
│   ├── node.ts                       # Node-only SQLite 入口
│   ├── schema.ts                     # Drizzle schema
│   └── seed.ts                       # 本地种子辅助
└── lib/
    ├── auth.ts                       # JWT 鉴权
    ├── constants.ts                  # 默认模板、比赛类型、限制常量
    ├── engine.ts                     # 赛程模拟与质量评估
    └── tournament-context.tsx        # 当前赛事上下文
```

其他重要文件：

- [`schema.sql`](./schema.sql)：D1 初始化脚本
- [`migrations/`](./migrations)：补充迁移脚本
- [`scripts/seed-local-d1.sql`](./scripts/seed-local-d1.sql)：本地 admin 种子
- [`scripts/seed-demo.sql`](./scripts/seed-demo.sql)：demo 示例数据
- [`wrangler.toml`](./wrangler.toml)：Cloudflare Pages / D1 配置

## 备注

- 本项目当前依赖 `@cloudflare/next-on-pages` 与 Next.js 16 的兼容方案，`.npmrc`、`build:cf` 以及相关脚本都属于这套链路的一部分。
- 原生 Windows 上本地执行 `npm run build:cf` 可能仍会受上游兼容性影响；如果需要做 Cloudflare 风格预览，优先使用 WSL。
- `.vercel/` 是本地构建生成的工作目录，不是业务源码，不需要手动维护。
