<div align="center">

# 🏸 ShuttleArena 羽球竞技场

**面向羽毛球团体赛 / 联赛的全流程赛事管理系统**

从报名摇号、赛程编排，到现场实时记分、数据统计 — 一站式搞定。

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare_Pages-deployed-F38020?logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![Cloudflare D1](https://img.shields.io/badge/D1-SQLite_at_Edge-F38020?logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/d1/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/github/license/hakupao/badminton-tournament-v2)](./LICENSE)

<br/>

[**🌐 在线体验 Demo**](https://shuttle-arena-demo.pages.dev) &nbsp;·&nbsp; 用户名 `demo` &nbsp;/&nbsp; 密码 `demo123456`

> Demo 使用独立的 Cloudflare D1 数据库，通过 GitHub Actions 定期重置为示例数据。

</div>

---

## 页面预览

| 首页 | 赛程矩阵 |
|:---:|:---:|
| ![首页](docs/screenshots/home.png) | ![赛程](docs/screenshots/schedule.png) |

| 比赛详情 | 排名统计 |
|:---:|:---:|
| ![比赛详情](docs/screenshots/match-detail.png) | ![排名](docs/screenshots/standings.png) |

| 管理后台 | 移动端记分 |
|:---:|:---:|
| ![管理后台](docs/screenshots/admin.png) | <img src="docs/screenshots/mobile-scoring.png" width="300" /> |

---

## 为什么做这个项目

作为一个羽毛球爱好者，我发现组织团体赛时最头疼的不是打球本身，而是赛前的各种编排工作：

- 🎲 **摇号分组** — 怎样把报名者公平地分到各队各位置？
- 📋 **赛程编排** — 如何安排几十场比赛，还要避免同一人连续上场或连续轮空？
- ✏️ **现场记分** — 比赛日现场用纸笔记分，事后还要手动汇总？
- 📊 **数据统计** — 想看个人/组合/位置维度的胜负统计，只能 Excel？

ShuttleArena 就是为了解决这些痛点而生的。它内置了一套**赛程编排引擎**，能自动生成满足约束条件的赛程（连续上场 / 轮空限制、场地分配、时间段排布），并提供质量评估报告。比赛日当天，运动员可以直接在手机上实时逐分记分，数据自动汇总到排行榜。

---

## 核心功能

| 模块 | 说明 |
| --- | --- |
| 🏟 **多赛事管理** | 同时维护多个赛事，前台自由切换 |
| 🎲 **报名与摇号** | 按技术位置报名，按队伍随机摇号落位 |
| 🧩 **赛程编排引擎** | 自动生成赛程，约束求解（连续上场/轮空限制），质量评估 + 模拟预览 |
| ✏️ **实时记分** | 管理员后台录分 + 运动员手机端逐分记分，双入口 |
| 📊 **多维统计** | 队伍、组合、个人、位置维度统计，裁判/边裁记录榜 |
| 👤 **运动员账号** | 注册登录、绑定参赛位置、查看"我的比赛" |
| 🔄 **轮换换人** | 同位置支持主选手/轮换双槽，未开赛场次一键换人 |
| ⚙️ **赛制配置** | 可调男女人数、比赛模板、计分模式（21 分制 / 15 分三局等）、Deuce 规则 |

---

## 技术架构

```
┌─────────────────────────────────────────────────────┐
│                     用户浏览器                        │
│  (React 19 + shadcn/ui + Tailwind CSS v4 + Sonner)  │
└────────────────────────┬────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────┐
│              Cloudflare Pages (Edge Runtime)          │
│                  Next.js 16 App Router                │
│        ┌──────────────┬────────────────────┐         │
│        │  Server       │    API Routes      │         │
│        │  Components   │  /api/auth/...     │         │
│        │               │  /api/tournaments/ │         │
│        │               │  /api/matches/...  │         │
│        └──────┬───────┴────────┬───────────┘         │
│               │   Drizzle ORM  │                      │
│               └───────┬────────┘                      │
└───────────────────────┼──────────────────────────────┘
                        │
            ┌───────────▼───────────┐
            │   Cloudflare D1       │
            │   (SQLite at Edge)    │
            └───────────────────────┘
```

| 层 | 技术 |
| --- | --- |
| **前端框架** | Next.js 16 + React 19 + App Router |
| **运行时** | Cloudflare Workers Edge Runtime |
| **数据库** | Cloudflare D1 (生产) + better-sqlite3 (本地兜底) |
| **ORM** | Drizzle ORM |
| **UI** | Tailwind CSS v4 + shadcn/ui + Sonner (toast) |
| **认证** | JWT (`jose`) + `bcryptjs` |
| **部署** | Cloudflare Pages + `@cloudflare/next-on-pages` |
| **CI/CD** | GitHub Actions (自动部署 demo) |

---

## 适用场景

- 🏢 公司/社区/俱乐部组织的羽毛球团体赛
- 🏆 定期举办的羽毛球联赛（多轮赛事管理）
- 🎯 需要公平摇号分组的业余比赛
- 📱 希望在比赛现场用手机实时记分的场景

---

## 快速开始

**环境要求：** Node.js 20+ / npm

```bash
# 克隆仓库
git clone https://github.com/hakupao/badminton-tournament-v2.git
cd badminton-tournament-v2

# 安装依赖（已配置 legacy-peer-deps，无需额外参数）
npm install

# 启动开发环境（自动初始化本地 D1 + 种子数据）
npm run dev
```

访问 http://localhost:3000，使用默认管理员账号：

| | |
|---|---|
| 用户名 | `admin` |
| 密码 | `admin123` |

> 💡 如果只想快速重启，跳过数据库初始化：`npm run dev:fast`

---

## 典型使用流程

```
创建赛事 → 配置赛制 → 设置队伍 → 录入运动员 → 摇号分组 → 编排赛程 → 比赛日记分 → 查看统计
```

1. **创建赛事** — 配置比赛日期、时段、场地数、每组人数和计分模式
2. **设置队伍** — 维护队伍名称/图标，配置比赛模板
3. **运动员管理** — 绑定注册账号到参赛位置，设置轮换
4. **摇号分组** — 执行随机分配，将报名者落到各队各位置
5. **赛程编排** — 模拟赛程 → 查看质量报告 → 发布正式赛程
6. **比赛日** — 后台或手机端录入比分，系统自动更新赛果和排行榜

---

## 页面一览

<details>
<summary><strong>🌐 公共页面</strong></summary>

| 路由 | 说明 |
| --- | --- |
| `/` | 赛事列表首页，展示进行中和历史赛事 |
| `/guide` | 赛事介绍（场地、奖品、赞助、系统说明） |
| `/schedule` | 赛程矩阵/列表视图，登录后高亮"我的比赛" |
| `/standings` | 队伍、组合、个人、位置统计 + 裁判记录榜 |
| `/match/[id]` | 比赛详情与比分时间线 |
| `/match/[id]/scoring` | 移动端实时记分入口 |
| `/my-matches` | 运动员个人场次总览 |
| `/account` | 个人账号维护 |

</details>

<details>
<summary><strong>🔧 管理后台</strong></summary>

| 路由 | 说明 |
| --- | --- |
| `/admin/settings` | 赛事基础设置 |
| `/admin/rules` | 每组人数、计分模式、比赛模板 |
| `/admin/teams` | 队伍名称和图标 |
| `/admin/players` | 运动员姓名、账号绑定、轮换管理 |
| `/admin/lottery` | 报名位置分配与摇号执行 |
| `/admin/schedule` | 赛程模拟、质量报告、正式发布 |
| `/admin/swap` | 轮换换人 |
| `/admin/scoring` | 后台录分和批量录分 |
| `/admin/users` | 账号创建、删除、重置密码 |

</details>

---

## 部署到 Cloudflare Pages

完整说明见 [docs/deploy-guide.md](./docs/deploy-guide.md)。

```bash
# 1. 登录 Cloudflare 并创建 D1 数据库
npx wrangler login
npx wrangler d1 create shuttle-arena-db

# 2. 把输出的 database_id 写入 wrangler.toml，然后：
npm run d1:init
npm run deploy

# 3. 在 Cloudflare Dashboard 配置环境变量和 D1 绑定：
#    JWT_SECRET=<随机密钥>
#    DB -> shuttle-arena-db
```

---

## 项目结构

```
src/
├── app/
│   ├── api/               # RESTful API (auth, matches, tournaments, users)
│   ├── admin/             # 管理后台页面
│   ├── match/             # 比赛详情、移动端记分
│   └── ...                # 首页、赛程、统计、我的比赛等
├── components/
│   ├── brand/             # 品牌标识组件
│   ├── layout/            # 布局组件
│   ├── match/             # 比赛相关组件
│   ├── tournament/        # 赛事相关组件
│   └── ui/                # shadcn/ui 基础组件
├── db/
│   ├── index.ts           # Edge-safe D1 入口
│   ├── schema.ts          # Drizzle schema（用户、赛事、分组、选手、比赛等）
│   └── seed.ts            # 种子数据辅助
└── lib/
    ├── auth.ts            # JWT 鉴权
    ├── engine.ts          # 赛程编排引擎（约束求解 + 质量评估）
    ├── constants.ts       # 默认模板、比赛类型、限制常量
    └── tournament-context.tsx  # 当前赛事上下文
```

---

## npm scripts

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 本地开发（自动初始化 D1 + 种子数据 + 启动 Next 开发服务器） |
| `npm run dev:fast` | 跳过初始化，直接启动开发服务器 |
| `npm run build:cf` | 构建 Cloudflare Pages 产物 |
| `npm run preview:cf` | 本地预览 Cloudflare Pages 构建产物 |
| `npm run deploy` | 构建并部署到 Cloudflare Pages |
| `npm run deploy:demo` | 构建并发布到 demo 项目 |
| `npm run lint` | ESLint 检查 |

---

## 环境变量

| 名称 | 类型 | 必需 | 说明 |
| --- | --- | --- | --- |
| `JWT_SECRET` | 环境变量 | 生产必需 | JWT 签名密钥，本地可省略 |
| `DB` | D1 绑定 | 部署必需 | 应用运行时数据库绑定名 |
| `DEMO_DEPLOY_BRANCH` | 环境变量 | 可选 | demo 发布分支覆盖值 |

---

## 致谢

- [Next.js](https://nextjs.org/) — React 全栈框架
- [Cloudflare Pages](https://pages.cloudflare.com/) + [D1](https://developers.cloudflare.com/d1/) — Edge 部署与数据库
- [Drizzle ORM](https://orm.drizzle.team/) — 类型安全的 ORM
- [shadcn/ui](https://ui.shadcn.com/) — 优雅的 UI 组件
- [Tailwind CSS](https://tailwindcss.com/) — 原子化 CSS 框架

---

<div align="center">

**如果觉得有用，欢迎 ⭐ Star 支持一下！**

Made with ❤️ by a badminton enthusiast

</div>
