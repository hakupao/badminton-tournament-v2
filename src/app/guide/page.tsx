"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  CalendarDays,
  Trophy,
  ChevronRight,
  PenLine,
  BarChart3,
  BookOpen,
  LayoutList,
  Grid3X3,
  UserCheck,
  MessageCircleQuestion,
  Lightbulb,
  MapPin,
  Clock,
  Users,
  Medal,
  Gift,
  Heart,
  Star,
  Swords,
  Info,
} from "lucide-react";
import { ShuttlecockIcon } from "@/components/brand/shuttlecock-icon";

/* ─── Shared sub-components ─── */

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <h2 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
      <Icon className="w-5 h-5 text-green-600" />
      {title}
    </h2>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-400 text-white font-bold text-sm flex items-center justify-center shadow-sm">
      {n}
    </div>
  );
}

function QAItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2">
        <span className="text-green-600 font-bold text-sm mt-0.5">Q</span>
        <span className="text-sm font-medium text-gray-800">{q}</span>
      </div>
      <div className="flex items-start gap-2">
        <span className="text-blue-500 font-bold text-sm mt-0.5">A</span>
        <span className="text-xs text-gray-500 leading-relaxed">{a}</span>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, iconColor = "text-green-500" }: {
  icon: React.ElementType;
  label: string;
  value: string;
  iconColor?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColor}`} />
      <div>
        <div className="text-xs text-gray-400">{label}</div>
        <div className="text-sm font-medium text-gray-700">{value}</div>
      </div>
    </div>
  );
}

function PrizeCard({ rank, title, desc, gradient, emoji }: {
  rank: string;
  title: string;
  desc: string;
  gradient: string;
  emoji: string;
}) {
  return (
    <div className={`rounded-xl p-4 ${gradient} relative overflow-hidden`}>
      <div className="absolute top-2 right-3 text-3xl opacity-30">{emoji}</div>
      <div className="relative z-10">
        <div className="text-xs font-bold text-white/80 mb-0.5">{rank}</div>
        <div className="text-base font-bold text-white mb-1">{title}</div>
        <div className="text-xs text-white/70 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */

export default function GuidePage() {
  return (
    <div className="space-y-10 pb-8">
      {/* Header */}
      <div>
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-green-600 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </Link>
        <div className="flex items-center gap-3 mb-3">
          <Info className="w-7 h-7 text-green-600" />
          <h1 className="text-2xl font-bold text-gray-800">赛事介绍</h1>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed">
          了解本次比赛的赛制规则、奖品设置和赞助信息，以及如何使用 ShuttleArena 系统。
        </p>
      </div>

      {/* ════════════════════════════════════════════ */}
      {/* Section 1: 比赛说明 */}
      {/* ════════════════════════════════════════════ */}
      <section>
        <SectionTitle icon={ShuttlecockIcon} title="比赛说明" />
        <p className="text-xs text-gray-400 mb-4">本次羽毛球团体循环赛的基本信息</p>

        {/* Overview card */}
        <Card className="border-green-100 bg-gradient-to-br from-green-50/60 to-white mb-4">
          <CardContent className="py-5 px-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow icon={CalendarDays} label="比赛日期" value="待定（以实际通知为准）" />
            <InfoRow icon={Clock} label="比赛时间" value="09:00 — 19:00" />
            <InfoRow icon={MapPin} label="比赛场地" value="待定（以实际通知为准）" iconColor="text-red-400" />
            <InfoRow icon={Users} label="参赛规模" value="每队 5 人（3 男 2 女），多队循环" iconColor="text-blue-500" />
          </CardContent>
        </Card>

        {/* Format details */}
        <Card className="border-gray-100">
          <CardContent className="py-4 px-5 space-y-4">
            <div>
              <div className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <Swords className="w-4 h-4 text-green-500" />
                赛制说明
              </div>
              <div className="space-y-2 text-xs text-gray-500 leading-relaxed ml-6">
                <p>
                  采用<span className="font-semibold text-gray-700">团体循环赛</span>赛制，所有队伍两两对阵，不设淘汰。
                  每支队伍由 <span className="font-semibold text-gray-700">3 名男选手</span>和 <span className="font-semibold text-gray-700">2 名女选手</span>组成。
                </p>
                <p>
                  每轮对阵包含 <span className="font-semibold text-gray-700">5 场双打</span>比赛：
                </p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {[
                    { label: "男双", count: 2, color: "bg-blue-50 text-blue-700 border-blue-200" },
                    { label: "女双", count: 1, color: "bg-pink-50 text-pink-700 border-pink-200" },
                    { label: "混双", count: 2, color: "bg-purple-50 text-purple-700 border-purple-200" },
                  ].map((item) => (
                    <span key={item.label} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${item.color}`}>
                      {item.label} ×{item.count}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            <div>
              <div className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                计分规则
              </div>
              <div className="space-y-1.5 text-xs text-gray-500 leading-relaxed ml-6">
                <p>每场比赛采用 <span className="font-semibold text-gray-700">一局 21 分制</span>（可根据实际设置调整）。</p>
                <p>团体对阵中，每场双打的胜者为该队赢得 1 分。最终以团体总积分排名。</p>
                <p>积分相同时，依次比较：<span className="font-semibold text-gray-700">净胜场 → 净胜分</span>。</p>
              </div>
            </div>

            <hr className="border-gray-100" />

            <div>
              <div className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-green-500" />
                分组与抽签
              </div>
              <div className="space-y-1.5 text-xs text-gray-500 leading-relaxed ml-6">
                <p>赛前通过<span className="font-semibold text-gray-700">随机抽签</span>决定各选手所在的队伍。</p>
                <p>抽签前，每位选手只有代号编号（如「男 1」「女 2」），抽签后方公布真实姓名和队伍归属。</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ════════════════════════════════════════════ */}
      {/* Section 2: 奖品设置 */}
      {/* ════════════════════════════════════════════ */}
      <section>
        <SectionTitle icon={Trophy} title="奖品设置" />
        <p className="text-xs text-gray-400 mb-4">为优秀团队和个人准备的奖励</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <PrizeCard
            rank="冠军"
            title="待公布"
            desc="团体积分第一名"
            gradient="bg-gradient-to-br from-amber-500 to-yellow-400"
            emoji="🏆"
          />
          <PrizeCard
            rank="亚军"
            title="待公布"
            desc="团体积分第二名"
            gradient="bg-gradient-to-br from-gray-400 to-gray-300"
            emoji="🥈"
          />
          <PrizeCard
            rank="季军"
            title="待公布"
            desc="团体积分第三名"
            gradient="bg-gradient-to-br from-amber-700 to-amber-600"
            emoji="🥉"
          />
        </div>

        <Card className="border-gray-100">
          <CardContent className="py-4 px-5">
            <div className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Medal className="w-4 h-4 text-purple-500" />
              个人单项奖
            </div>
            <div className="space-y-2.5 ml-6">
              {[
                { title: "最佳男选手", desc: "男选手中个人胜率最高者", icon: "🏸" },
                { title: "最佳女选手", desc: "女选手中个人胜率最高者", icon: "🏸" },
                { title: "最佳搭档", desc: "所有双打组合中胜率最高的一对", icon: "🤝" },
              ].map((award) => (
                <div key={award.title} className="flex items-start gap-2.5">
                  <span className="text-base mt-0.5">{award.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-700">{award.title}</div>
                    <div className="text-xs text-gray-400">{award.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-3 border-dashed border-green-200 bg-gradient-to-br from-green-50/50 to-white">
          <CardContent className="py-3 px-5">
            <div className="flex items-start gap-2">
              <Gift className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-gray-500 leading-relaxed">
                <span className="font-medium text-green-700">参与奖：</span>
                所有参赛选手均可获得参与纪念奖品。重在参与，享受比赛！
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ════════════════════════════════════════════ */}
      {/* Section 3: 赞助商 */}
      {/* ════════════════════════════════════════════ */}
      <section>
        <SectionTitle icon={Heart} title="赞助支持" />
        <p className="text-xs text-gray-400 mb-4">感谢以下赞助商的大力支持</p>

        <Card className="border-gray-100">
          <CardContent className="py-6 px-5">
            <div className="text-center text-sm text-gray-400 py-4">
              <Heart className="w-8 h-8 text-gray-200 mx-auto mb-3" />
              <p className="font-medium text-gray-500 mb-1">赞助商信息即将公布</p>
              <p className="text-xs text-gray-400">
                如果您有意赞助本次赛事，欢迎联系赛事组织者
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ════════════════════════════════════════════ */}
      {/* Section 4: 使用说明（原有内容） */}
      {/* ════════════════════════════════════════════ */}
      <section>
        <SectionTitle icon={BookOpen} title="系统使用说明" />
        <p className="text-xs text-gray-400 mb-4">作为运动员如何使用 ShuttleArena 系统</p>

        <div className="space-y-6">
          {/* Step 1 — Schedule */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <StepNumber n={1} />
              <div>
                <div className="font-bold text-gray-800">赛程页面</div>
                <div className="text-xs text-gray-400">查看所有比赛的时间和对阵安排</div>
              </div>
            </div>
            <Card className="ml-11 border-gray-100">
              <CardContent className="py-3 px-4 space-y-2.5">
                <div className="flex items-start gap-2.5 text-sm">
                  <Grid3X3 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600 text-xs leading-relaxed">
                    <span className="font-medium text-gray-700">矩阵视图</span> — 按场地×轮次的表格，快速定位你的比赛在哪个场地
                  </span>
                </div>
                <div className="flex items-start gap-2.5 text-sm">
                  <LayoutList className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600 text-xs leading-relaxed">
                    <span className="font-medium text-gray-700">列表视图</span> — 展开每场比赛的详细信息，包括队伍、选手和比分
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card className="ml-11 border-green-100 bg-gradient-to-br from-green-50/50 to-white">
              <CardContent className="py-2.5 px-4">
                <div className="text-xs text-gray-500 leading-relaxed">
                  <span className="font-medium text-green-700">提示：</span>登录后，你参与的比赛会以黄色高亮显示，方便快速找到
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="ml-4 border-l-2 border-dashed border-green-200 h-4" />

          {/* Step 2 — Standings */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <StepNumber n={2} />
              <div>
                <div className="font-bold text-gray-800">排名 & 统计页面</div>
                <div className="text-xs text-gray-400">查看积分排名和各维度数据</div>
              </div>
            </div>
            <Card className="ml-11 border-gray-100">
              <CardContent className="py-3 px-4 space-y-2.5">
                <div className="flex items-start gap-2.5 text-sm">
                  <Trophy className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600 text-xs leading-relaxed">
                    <span className="font-medium text-gray-700">团体排名</span> — 各队伍的积分、胜场和净胜分
                  </span>
                </div>
                <div className="flex items-start gap-2.5 text-sm">
                  <BarChart3 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600 text-xs leading-relaxed">
                    <span className="font-medium text-gray-700">组合统计</span> — 每对搭档的胜率和得分数据
                  </span>
                </div>
                <div className="flex items-start gap-2.5 text-sm">
                  <BarChart3 className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600 text-xs leading-relaxed">
                    <span className="font-medium text-gray-700">个人统计</span> — 你的个人胜率、参赛次数等数据
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="ml-4 border-l-2 border-dashed border-green-200 h-4" />

          {/* Step 3 — My Matches */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <StepNumber n={3} />
              <div>
                <div className="font-bold text-gray-800">我的比赛</div>
                <div className="text-xs text-gray-400">快速查看与你相关的比赛</div>
              </div>
            </div>
            <Card className="ml-11 border-gray-100">
              <CardContent className="py-3 px-4 space-y-2.5">
                <div className="flex items-start gap-2.5 text-sm">
                  <UserCheck className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600 text-xs leading-relaxed">
                    注册账号并由管理员绑定后，你可以在这里只看自己的比赛，按状态分类显示（待开始 / 进行中 / 已结束）
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="ml-4 border-l-2 border-dashed border-green-200 h-4" />

          {/* Step 4 — Scoring */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <StepNumber n={4} />
              <div>
                <div className="font-bold text-gray-800">在线记分</div>
                <div className="text-xs text-gray-400">在比赛进行中实时记录比分</div>
              </div>
            </div>
            <Card className="ml-11 border-gray-100">
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-2.5 text-sm">
                  <PenLine className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600 text-xs leading-relaxed">
                    在赛程中点击你的比赛，进入记分页面。每得一分点击 <span className="font-medium text-blue-600">+1</span>，支持撤销。比分实时同步，所有人都能看到
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════ */}
      {/* Section 5: 小贴士 */}
      {/* ════════════════════════════════════════════ */}
      <section>
        <SectionTitle icon={Lightbulb} title="小贴士" />
        <div className="space-y-2.5 mt-3">
          {[
            "无需注册即可查看赛程和排名，把网址分享给队友就能一起看",
            "注册账号并绑定后，可以在「我的比赛」中快速找到自己的场次",
            "赛程页面支持「矩阵」和「列表」两种视图，可按喜好切换",
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm">
              <ChevronRight className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <span className="text-gray-600 text-xs leading-relaxed">{tip}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════ */}
      {/* Section 6: 常见问题 */}
      {/* ════════════════════════════════════════════ */}
      <section>
        <SectionTitle icon={MessageCircleQuestion} title="常见问题" />
        <div className="space-y-5 mt-4">
          <QAItem
            q="不注册也能用吗？"
            a="可以。查看赛程和排名不需要登录。但如果你想使用「我的比赛」功能，需要注册一个账号并让管理员帮你绑定。"
          />
          <hr className="border-gray-100" />
          <QAItem
            q="我注册了账号，但看不到「我的比赛」？"
            a="你需要让赛事管理员在后台将你的账号绑定到对应的运动员位置上。绑定完成后就能看到了。"
          />
          <hr className="border-gray-100" />
          <QAItem
            q="比赛记分是管理员录入还是我自己来？"
            a="都可以。管理员可以统一录入比分，运动员也可以自己在比赛时通过手机点击 +1 实时记分，看你们赛事的安排。"
          />
          <hr className="border-gray-100" />
          <QAItem
            q="我的比分录错了怎么办？"
            a="记分过程中可以随时点击撤销。如果比赛已结束且提交了，可以联系管理员修改。"
          />
          <hr className="border-gray-100" />
          <QAItem
            q="怎么知道我下一场比赛什么时候打？"
            a="在赛程页面登录后，你的比赛会以黄色高亮显示。也可以在「我的比赛」页面查看待开始的场次。"
          />
          <hr className="border-gray-100" />
          <QAItem
            q="可以在电脑上用吗？"
            a="可以。本系统支持手机和电脑浏览器访问，在电脑上显示效果也很好。"
          />
        </div>
      </section>

      {/* CTA */}
      <div className="text-center pt-2">
        <Link href="/">
          <Button className="bg-green-600 hover:bg-green-700 text-white font-bold h-11 px-8 gap-2 shadow-md">
            <ShuttlecockIcon className="w-4 h-4" />
            开始使用
          </Button>
        </Link>
      </div>
    </div>
  );
}
