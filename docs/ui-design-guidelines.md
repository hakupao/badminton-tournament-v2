# UI 界面设计规范

本文档总结了三次界面优化的核心原则和具体规范，适用于本项目所有页面（管理后台 + 公共页面）。

---

## 一、核心原则

### 1. 内容决定宽度，而非统一拉宽

不要为了"统一感"把所有页面强行拉到相同宽度。内容少的页面用窄容器，内容多的页面才用宽容器。

| 内容类型 | 推荐宽度 | 示例 |
|----------|---------|------|
| 空状态 / 提示页 | `max-w-lg` (32rem) | 无赛事、未登录、未绑定选手 |
| 表单 / 账号设置 | `max-w-xl` ~ `max-w-2xl` | 账号页、赛事设置 |
| 卡片列表 / 个人视图 | `max-w-3xl` ~ `max-w-4xl` | 我的比赛、用户管理 |
| 数据表格 / 矩阵 | 全宽（继承 layout 的 `max-w-7xl`） | 赛程矩阵、排名表格 |

### 2. 去掉多余的文字

- 不要用整句话解释用户已经能看懂的事情
- 空状态只需一句话，不需要第二行解释
- 按钮文案用动词短语，不需要完整句子

**反面示例：**
```
管理员需要先在后台配置并生成赛程
支持修改用户名和密码，管理员与运动员账号都可以使用。
你可以浏览所有比赛，绑定选手后将在这里看到你的专属视图
```

**正面示例：**
```
赛程尚未生成
请先登录
请联系管理员绑定参赛位置
```

### 3. 尺寸克制，不要"显大"

标题、图标、间距都应该与内容量匹配，避免空洞的大字大图。

---

## 二、具体尺寸规范

### 标题

| 场景 | 类名 | 说明 |
|------|------|------|
| 页面主标题 | `text-lg font-bold` | 18px，适用于所有子页面 |
| 首页大标题 | `text-xl font-bold` ~ `text-2xl` | 仅首页 Hero 区域 |
| 区块标题 | `text-sm font-semibold` ~ `text-base font-semibold` | 卡片内、表单区块 |

### 图标

| 场景 | 类名 |
|------|------|
| 页面标题旁 | `w-4.5 h-4.5` |
| 空状态居中 | `w-8 h-8` |
| 按钮/Badge 内 | `w-3 h-3` ~ `w-3.5 h-3.5` |

### 间距

| 场景 | 类名 |
|------|------|
| 页面内区块间距 | `space-y-4` ~ `space-y-5` |
| 空状态内部 padding | `py-10` |
| 卡片内容 padding | `py-3 px-4` ~ `px-5 py-4` |
| 组件间小间隙 | `gap-1.5` ~ `gap-2` |

---

## 三、移动端适配规范

### 布局策略

- 使用 `flex-col` + `sm:flex-row` 实现窄屏换行、宽屏单行
- 多元素行（标题 + Badge + 按钮）拆分成独立的行，用 `pl-10 sm:pl-0` 对齐

### 防溢出

- 标题文字加 `whitespace-nowrap`
- 图标和按钮加 `shrink-0`
- 长文本加 `truncate` 或 `min-w-0`
- Badge/按钮组加 `flex-wrap`

### 响应式显隐

- 表格中次要列用 `hidden md:table-cell` 或 `hidden lg:table-cell`
- 矩阵视图用 `md:hidden` / `hidden md:block` 切换移动端和桌面端

---

## 四、组件样式速查

### 空状态卡片

```tsx
<div className="space-y-4 max-w-lg mx-auto">
  <div className="flex items-center gap-2">
    <Icon className="w-4.5 h-4.5 text-green-700" />
    <h1 className="text-lg font-bold text-green-900">页面标题</h1>
  </div>
  <Card className="border-dashed border-border/50">
    <CardContent className="py-10 text-center">
      <Icon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">提示文字</p>
    </CardContent>
  </Card>
</div>
```

### 页面标题栏（管理后台）

```tsx
<div className="flex flex-col gap-2 py-1 sm:flex-row sm:items-center sm:gap-3">
  {/* 第一行：返回按钮 + 图标 + 标题 */}
  <div className="flex items-center gap-2 min-w-0">
    <Link href={backHref} className="shrink-0">
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
        <ArrowLeft className="w-4 h-4" />
      </Button>
    </Link>
    <Icon className="shrink-0 w-4.5 h-4.5 text-gray-500" />
    <h1 className="text-lg font-bold text-gray-800 whitespace-nowrap">标题</h1>
  </div>
  {/* 第二行：Badge 组 */}
  <div className="flex flex-wrap items-center gap-1.5 pl-10 sm:pl-0">
    <Badge>...</Badge>
  </div>
  {/* 第三行：操作按钮 */}
  <div className="flex flex-wrap items-center gap-2 pl-10 sm:pl-0 sm:ml-auto">
    <Button>...</Button>
  </div>
</div>
```

### 渐变 Hero 卡片（紧凑版）

```tsx
<Card className="border-green-100 shadow-sm overflow-hidden">
  <div className="bg-gradient-to-r from-green-500 to-teal-500 px-5 py-4 text-white">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="text-3xl">{icon}</div>
        <div>
          <h1 className="text-lg font-bold">{title}</h1>
          <div className="text-white/75 text-xs">{subtitle}</div>
        </div>
      </div>
      <div className="flex items-center gap-5 text-center">
        {/* 统计数字 */}
      </div>
    </div>
  </div>
</Card>
```

---

## 五、已应用页面清单

### 管理后台

- `/admin` — 仪表盘（赛事卡片两行布局）
- `/admin/settings` — 赛事设置
- `/admin/scoring` — 计分管理
- `/admin/users` — 用户管理
- `/admin/rules` — 规则配置
- `/admin/teams` — 队伍管理

以上页面通过 `admin-page-narrow` / `admin-page-medium` / `admin-page-shell` 控制宽度，通过共享组件 `AdminPageHeader` 统一标题栏样式。

### 公共页面

- `/schedule` — 赛程（表格全宽，空状态窄）
- `/standings` — 排名（表格全宽，空状态窄，去掉冗余 CardHeader）
- `/my-matches` — 我的比赛（主视图 `max-w-3xl`，空状态 `max-w-lg`）
- `/account` — 我的账号（`max-w-xl`，精简 Hero 文案）
- `/` — 首页（精简空赛事提示）
