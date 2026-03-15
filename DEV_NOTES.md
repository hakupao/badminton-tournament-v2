# ShuttleArena 开发笔记

## 项目概述
羽毛球团体循环赛管理系统，支持赛事创建、自动编排、实时记分、数据统计。

## 技术栈
- **前端**: Next.js 16.1.6 + React 19 + Tailwind CSS 4 + shadcn/ui
- **后端**: Next.js API Routes
- **数据库**: SQLite (better-sqlite3 本地 / Cloudflare D1 生产)
- **ORM**: Drizzle ORM
- **认证**: JWT (jose) + httpOnly cookie
- **状态管理**: SWR + React Context

## 数据库双轨制
- **Plan A (生产)**: Cloudflare D1 — `USE_D1=true` 环境变量触发
- **Plan B (本地)**: better-sqlite3 — 默认模式，零配置
- 切换逻辑在 `src/db/index.ts` 的 `getDb()` 函数
- 所有 API route 使用 `await` 调用 DB（D1 异步，better-sqlite3 同步但 await 无影响）

## 已完成功能

### 核心功能
- [x] 赛事 CRUD + 状态管理 (draft → active → finished)
- [x] 人员管理（分组、位置、性别）
- [x] 用户账号绑定选手代号
- [x] 比赛模板（MD/WD/XD 位置对阵）
- [x] 自动赛程生成（场地分配、时间段）
- [x] 实时记分（+1 模式，逐球记录）
- [x] BWF 标准得分路径显示
- [x] 管理员批量录分
- [x] 摇号分组（位置约束 + Fisher-Yates 随机）
- [x] 积分排名 & 数据统计

### 管理功能
- [x] 账号管理（创建/删除/重置密码）
- [x] 赛事模拟器（预览赛程质量）

### 安全
- [x] JWT 认证 + 角色控制 (admin/athlete)
- [x] requireAdmin() 保护所有管理 API
- [x] CSRF 中间件 (Origin header 校验)
- [x] 任何登录用户可提交比分（裁判机制）

### 性能优化
- [x] SWR 缓存 + 去重
- [x] 赛程 API 按赛事过滤 match_games
- [x] 赛程自动滚动到未完成轮次

## Cloudflare 部署步骤

### 1. 登录 Cloudflare
```bash
npx wrangler login
```

### 2. 创建 D1 数据库
```bash
npx wrangler d1 create shuttle-arena-db
# 输出 database_id，填入 wrangler.toml
```

### 3. 初始化表结构
```bash
npm run d1:init
```

### 4. 创建管理员账号
D1 初始化后需要手动插入 admin 账号（用 bcrypt hash）：
```bash
npx wrangler d1 execute shuttle-arena-db --command="INSERT OR IGNORE INTO users (username, password_hash, role) VALUES ('admin', '\$2a\$10\$YOUR_BCRYPT_HASH', 'admin')"
```
或者通过注册页面创建第一个账号。

### 5. 部署
```bash
npm run deploy
```
或者连接 GitHub 仓库到 Cloudflare Pages Dashboard 自动部署。

### 环境变量（Cloudflare Pages Dashboard 设置）
- `USE_D1` = `true`
- `JWT_SECRET` = 你的密钥（生产环境必须修改！）

## 待完成

### 高优先级
- [ ] Cloudflare D1 部署验证
- [ ] 生产环境 JWT_SECRET 配置
- [ ] admin 账号初始化脚本

### 中优先级
- [ ] 运动员自助绑定代号流程
- [ ] 移动端 UI 优化
- [ ] 比赛中途换人功能

### 低优先级
- [ ] Drizzle migrations（当前用 seed.ts 手动建表）
- [ ] 更细粒度的权限控制
- [ ] WebSocket 实时比分推送

## 已知问题
- Next.js 16 Turbopack 在 Windows 上偶尔 panic（globals.css 相关），生产 build 正常
- React strict mode 导致记分事件重复记录，已在提交和显示层做去重处理
- `@cloudflare/next-on-pages` 对 Next.js 16 的兼容性需验证，可能需要降级到 15

## 关键文件
- `src/db/index.ts` — 数据库切换层（D1 / better-sqlite3）
- `src/db/local.ts` — Plan B 本地数据库
- `src/db/schema.ts` — Drizzle ORM schema
- `src/db/seed.ts` — 本地数据库初始化
- `schema.sql` — D1 初始化 SQL
- `src/lib/auth.ts` — JWT 认证
- `src/lib/engine.ts` — 赛程生成引擎
- `wrangler.toml` — Cloudflare 配置
