"use client";

import { useState, useCallback } from "react";
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
  Heart,
  Star,
  Swords,
  Info,
  ExternalLink,
  Navigation,
  Copy,
  Check,
  BadgeJapaneseYen,
  Scale,
  Smartphone,
  ClipboardList,
  UserCog,
} from "lucide-react";
import { ShuttlecockIcon } from "@/components/brand/shuttlecock-icon";

/* ─── Constants ─── */

const VENUE_NAME = "横浜市中スポーツセンター";
const VENUE_ADDRESS = "〒231-0801 神奈川県横浜市中区新山下３丁目１５−４";
const VENUE_MAP_URL = "https://maps.app.goo.gl/htG9mnukuM19Rbje7";
const VENUE_EMBED_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3250.763169474074!2d139.65905507622304!3d35.43589634341119!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60185d3b3ddcec75%3A0xa4faa20ce7049b75!2z5qiq5rWc5biC5Lit44K544Od44O844OE44K744Oz44K_44O8!5e0!3m2!1sja!2sjp!4v1774331877827!5m2!1sja!2sjp";

/* ─── Sub-components ─── */

function SectionDivider({
  number,
  title,
  icon: Icon,
}: {
  number: string;
  title: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex items-center justify-center w-7 h-7 squircle-control bg-green-600 text-white text-xs font-bold shadow-sm">
        {number}
      </div>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-green-600" />
        <h2 className="text-base font-bold text-gray-800 tracking-tight">
          {title}
        </h2>
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-green-200 to-transparent" />
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 px-2 py-1 squircle-chip text-[11px] font-medium transition-all duration-200 ${
        copied
          ? "bg-green-100 text-green-700 border border-green-200"
          : "bg-gray-50 text-gray-400 border border-gray-150 hover:bg-gray-100 hover:text-gray-600"
      }`}
      title={`复制${label}`}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3" />
          已复制
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          复制
        </>
      )}
    </button>
  );
}

function StatBlock({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: string;
}) {
  return (
    <div className="flex-1 flex flex-col items-center gap-0.5 px-3 py-2.5">
      <span className="text-base">{icon}</span>
      <span className="text-lg font-bold text-gray-800 leading-none">
        {value}
      </span>
      <span className="text-[11px] text-gray-400 font-medium">{label}</span>
    </div>
  );
}

function StepItem({
  n,
  title,
  subtitle,
  children,
  isLast = false,
}: {
  n: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div className="relative flex gap-4">
      {/* Timeline */}
      <div className="flex flex-col items-center">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-400 text-white font-bold text-sm flex items-center justify-center shadow-sm">
          {n}
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-gradient-to-b from-green-200 to-transparent mt-2" />
        )}
      </div>
      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="font-bold text-gray-800 text-sm">{title}</div>
        <div className="text-xs text-gray-400 mb-2">{subtitle}</div>
        {children}
      </div>
    </div>
  );
}

function QAItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start gap-2 mb-1.5">
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-700 text-[11px] font-bold flex items-center justify-center mt-0.5">
          Q
        </span>
        <span className="text-sm font-medium text-gray-800 leading-snug">
          {q}
        </span>
      </div>
      <div className="flex items-start gap-2 ml-7">
        <span className="text-xs text-gray-500 leading-relaxed">{a}</span>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */

export default function GuidePage() {
  return (
    <div className="pb-10">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-green-600 transition-colors mb-5"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 squircle-card bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center shadow-md">
            <Info className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">
              赛事介绍
            </h1>
            <p className="text-xs text-gray-400">
              赛制 · 规则 · 裁判 · 奖品 · 系统使用说明
            </p>
          </div>
        </div>
      </div>

      {/* ═══ Section 1: 比赛说明 ═══ */}
      <section className="mb-10">
        <SectionDivider number="01" title="比赛说明" icon={ShuttlecockIcon} />

        {/* Desktop: 2-column / Mobile: stacked */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Left: Date/Time/Scale */}
          <Card className="border-green-100/80 shadow-sm">
            <CardContent className="p-0">
              {/* Date highlight strip */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-500 squircle-t-card px-5 py-3">
                <div className="flex items-center gap-2 text-white/80 text-xs font-medium mb-0.5">
                  <CalendarDays className="w-3.5 h-3.5" />
                  比赛日期
                </div>
                <div className="text-white font-bold text-lg tracking-tight">
                  2026 年 3 月 29 日
                  <span className="text-white/70 font-medium text-sm ml-1.5">
                    星期日
                  </span>
                </div>
              </div>
              <div className="px-5 py-4 space-y-3.5">
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-400">比赛时间</div>
                    <div className="text-sm font-semibold text-gray-700">
                      12:00 - 18:30
                    </div>
                    <div className="text-[11px] text-gray-400">
                      11:30 - 12:00 热身
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-400">参赛规模</div>
                    <div className="text-sm font-semibold text-gray-700">
                      6 组 × 5 人（3 男 2 女）
                    </div>
                    <div className="text-[11px] text-gray-400">共 30 人</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShuttlecockIcon className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-400">比赛用球</div>
                    <div className="text-sm font-semibold text-gray-700">
                      YONEX エアロセンサ500
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <BadgeJapaneseYen className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-400">参赛费用</div>
                    <div className="text-sm font-semibold text-gray-700">
                      ¥1,500
                      <span className="text-[11px] font-normal text-gray-400 ml-1">/ 人</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right: Venue + Map */}
          <Card className="border-green-100/80 shadow-sm">
            <CardContent className="p-0">
              {/* Map */}
              <div className="squircle-t-card overflow-hidden">
                <iframe
                  src={VENUE_EMBED_URL}
                  className="w-full h-40 lg:h-44"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="比赛场地地图"
                />
              </div>
              <div className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-700">
                          {VENUE_NAME}
                        </span>
                        <CopyButton text={VENUE_NAME} label="场馆名称" />
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        二楼 第二体育室（电梯 / 楼梯上楼后右手边）
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-400 break-all">
                        {VENUE_ADDRESS}
                      </span>
                      <CopyButton text={VENUE_ADDRESS} label="地址" />
                    </div>
                    <a
                      href={VENUE_MAP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 squircle-control text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors mt-1"
                    >
                      <Navigation className="w-3 h-3" />
                      在地图中打开导航
                      <ExternalLink className="w-3 h-3 opacity-40" />
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stat bar */}
        <Card className="border-gray-100 shadow-sm mb-4">
          <CardContent className="py-0 px-0">
            <div className="flex items-stretch divide-x divide-gray-100">
              <StatBlock value="10" label="每人出场" icon="👤" />
              <StatBlock value="75" label="总比赛数" icon="🏸" />
              <StatBlock value="3" label="比赛场地" icon="🏟️" />
            </div>
          </CardContent>
        </Card>

        {/* Format + Rules — Desktop: 2 cols / Mobile: stacked */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: 赛制 + 分组 */}
          <Card className="border-gray-100 shadow-sm">
            <CardContent className="py-4 px-5 space-y-4">
              <div>
                <div className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Swords className="w-4 h-4 text-green-500" />
                  赛制说明
                </div>
                <div className="space-y-2 text-xs text-gray-500 leading-relaxed">
                  <p>
                    采用
                    <span className="font-semibold text-gray-700">
                      团体循环赛
                    </span>
                    赛制，所有队伍两两对阵，不设淘汰。每支队伍由{" "}
                    <span className="font-semibold text-gray-700">
                      3 名男选手
                    </span>
                    和{" "}
                    <span className="font-semibold text-gray-700">
                      2 名女选手
                    </span>
                    组成。
                  </p>
                  <p>
                    每轮对阵包含{" "}
                    <span className="font-semibold text-gray-700">
                      5 场双打
                    </span>
                    ：
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {[
                      {
                        label: "男双",
                        count: 2,
                        color: "bg-blue-50 text-blue-700 border-blue-200",
                      },
                      {
                        label: "女双",
                        count: 1,
                        color: "bg-pink-50 text-pink-700 border-pink-200",
                      },
                      {
                        label: "混双",
                        count: 2,
                        color: "bg-purple-50 text-purple-700 border-purple-200",
                      },
                    ].map((item) => (
                      <span
                        key={item.label}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 squircle-pill text-[11px] font-medium border ${item.color}`}
                      >
                        {item.label} ×{item.count}
                      </span>
                    ))}
                  </div>

                  <p className="mt-3">具体对阵安排如下：</p>
                  <div className="mt-1.5 space-y-1">
                    {[
                      { type: "男双", color: "bg-blue-100 text-blue-700 border-blue-200", players: "男1 · 男2" },
                      { type: "男双", color: "bg-blue-100 text-blue-700 border-blue-200", players: "男2 · 男3" },
                      { type: "混双", color: "bg-purple-100 text-purple-700 border-purple-200", players: "男1 · 女1" },
                      { type: "混双", color: "bg-purple-100 text-purple-700 border-purple-200", players: "男3 · 女2" },
                      { type: "女双", color: "bg-pink-100 text-pink-700 border-pink-200", players: "女1 · 女2" },
                    ].map((match, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-1.5 py-0.5 squircle-pill text-[10px] font-bold border ${match.color} w-10 justify-center`}>
                          {match.type}
                        </span>
                        <span className="text-xs text-gray-600 font-medium">{match.players}</span>
                      </div>
                    ))}
                  </div>

                  <p className="mt-3">
                    每位选手每轮出场{" "}
                    <span className="font-semibold text-gray-700">2 场</span>
                    ，全队 5 人均有上场机会，确保参与感与公平性。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right: 计分规则 + 分组与抽签 */}
          <Card className="border-gray-100 shadow-sm">
            <CardContent className="py-4 px-5 space-y-4">
              <div>
                <div className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  计分规则
                </div>
                <div className="space-y-3 text-xs text-gray-500 leading-relaxed">
                  <div className="p-3 squircle-lg bg-amber-50/60 border border-amber-100">
                    <div className="text-xs font-semibold text-amber-800 mb-1">
                      单场计分
                    </div>
                    <p className="text-amber-700/80">
                      每场比赛采用{" "}
                      <span className="font-bold text-amber-800">
                        一局 21 分制
                      </span>
                      ，先到 21 分获胜，
                      <span className="font-bold text-amber-800">不追分</span>。
                    </p>
                  </div>

                  <div className="p-3 squircle-lg bg-gray-50 border border-gray-100">
                    <div className="text-xs font-semibold text-gray-700 mb-2">
                      团体积分
                    </div>
                    <p className="text-gray-500 mb-2">
                      大比分（5 局中的胜场数）多的一方为团体赛胜者：
                    </p>
                    <div className="flex gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 squircle-control text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                        胜 → +3 分
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 squircle-control text-xs font-bold bg-red-50 text-red-600 border border-red-200">
                        负 → +0 分
                      </span>
                    </div>
                  </div>

                  <div className="p-3 squircle-lg bg-gray-50 border border-gray-100">
                    <div className="text-xs font-semibold text-gray-700 mb-1">
                      同分排序
                    </div>
                    <p className="text-gray-500">
                      积分相同时依次比较：
                      <span className="font-semibold text-gray-700">
                        净胜场 → 净胜分
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              <div>
                <div className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-500" />
                  分组与抽签
                </div>
                <div className="space-y-1 text-xs text-gray-500 leading-relaxed">
                  <p>
                    赛前通过
                    <span className="font-semibold text-gray-700">
                      随机抽签
                    </span>
                    决定各选手所在的队伍。
                  </p>
                  <p>
                    抽签前，每位选手只有代号编号（如「男 1」「女
                    2」），抽签后方公布真实姓名和队伍归属。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 位置说明 — Full width below */}
        <Card className="border-gray-100 shadow-sm mt-4">
          <CardContent className="py-4 px-5">
            <div className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-green-500" />
              位置说明
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              每支队伍的 5 名选手按位置编号，不同位置决定了在每轮中的搭档和比赛类型：
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="p-3 squircle-lg bg-blue-50/50 border border-blue-100/80">
                <div className="text-[11px] font-semibold text-blue-800 mb-1.5">男选手位置</div>
                <div className="space-y-1.5 text-[11px] text-blue-700/80">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-blue-800 w-7 flex-shrink-0">男1</span>
                    <span>参加 1 场男双（搭档男2）和 1 场混双（搭档女1）。兼顾男双与混双，适合攻守均衡的选手。</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-blue-800 w-7 flex-shrink-0">男2</span>
                    <span>参加 2 场男双（分别搭档男1和男3），是男双的核心位置，出场最多，适合男双经验丰富的选手。</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-blue-800 w-7 flex-shrink-0">男3</span>
                    <span>参加 1 场男双（搭档男2）和 1 场混双（搭档女2）。与男1类似，同时承担男双和混双任务。</span>
                  </div>
                </div>
              </div>
              <div className="p-3 squircle-lg bg-pink-50/50 border border-pink-100/80">
                <div className="text-[11px] font-semibold text-pink-800 mb-1.5">女选手位置</div>
                <div className="space-y-1.5 text-[11px] text-pink-700/80">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-pink-800 w-7 flex-shrink-0">女1</span>
                    <span>参加 1 场混双（搭档男1）和 1 场女双（搭档女2）。在混双中与男1配合，适合后场能力突出的选手。</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-pink-800 w-7 flex-shrink-0">女2</span>
                    <span>参加 1 场混双（搭档男3）和 1 场女双（搭档女1）。在混双中与男3配合，适合前场意识强的选手。</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 裁判与记分 — Full width below */}
        <Card className="border-gray-100 shadow-sm mt-4">
          <CardContent className="py-4 px-5">
            <div className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Scale className="w-4 h-4 text-green-500" />
              裁判与记分
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              每场比赛由选手自行担任裁判并完成记分，具体安排如下：
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
              {/* 裁判安排 */}
              <div className="p-3 squircle-lg bg-indigo-50/50 border border-indigo-100/80">
                <div className="text-[11px] font-semibold text-indigo-800 mb-1.5 flex items-center gap-1.5">
                  <UserCog className="w-3 h-3" />
                  裁判安排
                </div>
                <div className="space-y-1.5 text-[11px] text-indigo-700/80">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-indigo-800 flex-shrink-0">主裁</span>
                    <span>由上一场<span className="font-semibold text-indigo-800">负方</span>选手担任，负责判罚和计分</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-indigo-800 flex-shrink-0">边裁</span>
                    <span>由上一场<span className="font-semibold text-indigo-800">胜方</span>选手担任，协助判断边线球</span>
                  </div>
                </div>
              </div>

              {/* 记分方式 */}
              <div className="p-3 squircle-lg bg-teal-50/50 border border-teal-100/80">
                <div className="text-[11px] font-semibold text-teal-800 mb-1.5 flex items-center gap-1.5">
                  <ClipboardList className="w-3 h-3" />
                  记分方式
                </div>
                <div className="space-y-1.5 text-[11px] text-teal-700/80">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-teal-800 flex-shrink-0">纸质</span>
                    <span>使用纸质记分牌现场记录</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-teal-800 flex-shrink-0">手机</span>
                    <span>使用本系统在线记分，实时同步</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 在线记分流程 */}
            <div className="p-3 squircle-lg bg-gray-50 border border-gray-100">
              <div className="text-[11px] font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <Smartphone className="w-3 h-3 text-green-600" />
                手机在线记分流程
              </div>
              <div className="space-y-2 text-[11px] text-gray-500">
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-green-100 text-green-700 text-[10px] font-bold flex items-center justify-center mt-0.5">1</span>
                  <span>打开对应比赛的记分页面，点击<span className="font-semibold text-gray-700">「我是主裁」</span>或<span className="font-semibold text-gray-700">「我是边裁」</span>登记身份（可选）</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-green-100 text-green-700 text-[10px] font-bold flex items-center justify-center mt-0.5">2</span>
                  <span>比赛中，<span className="font-semibold text-gray-700">点击得分方的 +1 按钮</span>即可记录得分；如有误判，可点击撤销</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-green-100 text-green-700 text-[10px] font-bold flex items-center justify-center mt-0.5">3</span>
                  <span>中途退出后重新进入，系统会提示<span className="font-semibold text-gray-700">恢复之前的比分</span>，无需担心丢失</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-green-100 text-green-700 text-[10px] font-bold flex items-center justify-center mt-0.5">4</span>
                  <span>比赛结束后点击<span className="font-semibold text-gray-700">「提交」</span>，然后将结果告知赛事管理员核对确认即可</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ═══ Section 2: 奖品设置 ═══ */}
      <section className="mb-10">
        <SectionDivider number="02" title="奖品设置" icon={Trophy} />

        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3">
          {[
            {
              rank: "冠军",
              desc: "第 1 名",
              gradient:
                "bg-gradient-to-br from-amber-500 to-yellow-400",
              emoji: "🏆",
              prizes: ["YONEX 全尺寸毛巾", "YONEX 袜子", "YONEX 手胶"],
            },
            {
              rank: "亚军",
              desc: "第 2 名",
              gradient: "bg-gradient-to-br from-gray-400 to-gray-300",
              emoji: "🥈",
              prizes: ["YONEX 全尺寸毛巾", "YONEX 袜子"],
            },
            {
              rank: "季军",
              desc: "第 3 名",
              gradient:
                "bg-gradient-to-br from-amber-700 to-amber-600",
              emoji: "🥉",
              prizes: ["YONEX 全尺寸毛巾", "YONEX 手胶"],
            },
          ].map((prize) => (
            <div
              key={prize.rank}
              className={`squircle-card p-3 sm:p-4 ${prize.gradient} relative overflow-hidden`}
            >
              <div className="absolute top-1 right-2 text-2xl sm:text-3xl opacity-25">
                {prize.emoji}
              </div>
              <div className="relative z-10">
                <div className="text-[11px] font-bold text-white/70">
                  {prize.rank}
                </div>
                <div className="mt-1.5 space-y-0.5">
                  {prize.prizes.map((item) => (
                    <div
                      key={item}
                      className="text-[10px] sm:text-[11px] font-medium text-white/90 leading-snug"
                    >
                      {item}
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-white/50 mt-1.5">
                  {prize.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-2.5 px-4 py-3 squircle-card bg-gray-50 border border-gray-100">
            <span className="text-base mt-0.5">🎖️</span>
            <div>
              <div className="text-sm font-medium text-gray-700">第 4 — 6 名</div>
              <div className="text-xs text-gray-600 mt-0.5">Victor 袜子 + YONEX 手胶</div>
            </div>
          </div>
          <div className="flex items-start gap-2.5 px-4 py-3 squircle-card bg-gray-50 border border-gray-100">
            <span className="text-base mt-0.5">🎁</span>
            <div>
              <div className="text-sm font-medium text-gray-700">参与奖</div>
              <div className="text-xs text-gray-600 mt-0.5">紙おしぼり アロマプレミアム</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Section 3: 赞助支持 ═══ */}
      <section className="mb-10">
        <SectionDivider number="03" title="赞助支持" icon={Heart} />

        {/* Sponsor card — understated community style */}
        <div className="relative squircle-panel overflow-hidden bg-[#fafaf9] border border-gray-100/80">
          {/* SVG defs for squircle clip */}
          <svg className="absolute" width="0" height="0" aria-hidden="true">
            <defs>
              <clipPath id="squircle-clip" clipPathUnits="objectBoundingBox">
                <path d="M 0.5,0 C 0.83,0 1,0.17 1,0.5 C 1,0.83 0.83,1 0.5,1 C 0.17,1 0,0.83 0,0.5 C 0,0.17 0.17,0 0.5,0 Z" />
              </clipPath>
            </defs>
          </svg>

          <div className="px-5 pt-5 pb-4 sm:px-6 sm:pt-6 sm:pb-5">
            {/* Club name — primary identity */}
            <div className="flex items-center gap-2 mb-4">
              <ShuttlecockIcon className="w-3.5 h-3.5 text-green-600/70" />
              <span className="text-[13px] sm:text-sm font-semibold text-gray-700 tracking-tight">
                華為技術 羽毛球俱乐部
              </span>
            </div>

            {/* Person row */}
            <div className="flex items-center gap-3.5">
              {/* Superellipse avatar */}
              <div
                className="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 overflow-hidden bg-gray-200"
                style={{ clipPath: "url(#squircle-clip)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/sponsor-avatar.jpg"
                  alt="小吴会长"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-700 leading-tight">
                  小吴会长
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  赞助全部比赛用球以及奖品
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="px-5 py-2.5 sm:px-6 border-t border-gray-100/60 bg-[#f7f7f5]">
            <p className="text-[10px] text-gray-500 tracking-[0.02em]">
              感谢对羽毛球赛事的大力支持与热爱
            </p>
          </div>
        </div>
      </section>

      {/* ═══ Section 4: 系统使用说明 ═══ */}
      <section className="mb-10">
        <SectionDivider number="04" title="系统使用说明" icon={BookOpen} />

        <Card className="border-gray-100 shadow-sm">
          <CardContent className="py-5 px-5">
            <StepItem n={1} title="赛程页面" subtitle="查看比赛时间和对阵安排">
              <div className="space-y-1.5">
                <div className="flex items-start gap-2 text-xs text-gray-500">
                  <Grid3X3 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <span className="font-medium text-gray-700">矩阵视图</span>{" "}
                    — 按场地×轮次表格，快速定位比赛场地
                  </span>
                </div>
                <div className="flex items-start gap-2 text-xs text-gray-500">
                  <LayoutList className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <span className="font-medium text-gray-700">列表视图</span>{" "}
                    — 展开每场比赛详细信息
                  </span>
                </div>
                <div className="text-[11px] text-green-600 bg-green-50 squircle-sm px-2.5 py-1.5 mt-2">
                  💡 登录后，你参与的比赛会以黄色高亮显示
                </div>
              </div>
            </StepItem>

            <StepItem
              n={2}
              title="排名 & 统计"
              subtitle="查看积分排名和各维度数据"
            >
              <div className="space-y-1.5">
                <div className="flex items-start gap-2 text-xs text-gray-500">
                  <Trophy className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <span className="font-medium text-gray-700">团体排名</span>{" "}
                    — 积分、胜场和净胜分
                  </span>
                </div>
                <div className="flex items-start gap-2 text-xs text-gray-500">
                  <BarChart3 className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <span className="font-medium text-gray-700">
                      组合 & 个人统计
                    </span>{" "}
                    — 搭档胜率和个人数据
                  </span>
                </div>
              </div>
            </StepItem>

            <StepItem
              n={3}
              title="我的比赛"
              subtitle="快速查看与你相关的场次"
            >
              <div className="flex items-start gap-2 text-xs text-gray-500">
                <UserCheck className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>
                  注册账号并由管理员绑定后，按状态分类显示你的比赛
                </span>
              </div>
            </StepItem>

            <StepItem
              n={4}
              title="在线记分"
              subtitle="实时记录比分"
              isLast
            >
              <div className="flex items-start gap-2 text-xs text-gray-500">
                <PenLine className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>
                  点击比赛进入记分页面，每得一分点
                  <span className="font-medium text-blue-600"> +1 </span>
                  ，支持撤销，比分实时同步
                </span>
              </div>
            </StepItem>
          </CardContent>
        </Card>
      </section>

      {/* ═══ Section 5: 小贴士 ═══ */}
      <section className="mb-10">
        <SectionDivider number="05" title="小贴士" icon={Lightbulb} />
        <div className="space-y-2">
          {[
            "无需注册即可查看赛程和排名，把网址分享给队友就能一起看",
            "注册账号并绑定后，可以在「我的比赛」中快速找到自己的场次",
            "赛程页面支持「矩阵」和「列表」两种视图，可按喜好切换",
          ].map((tip, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 px-4 py-2.5 squircle-lg bg-green-50/50 border border-green-100/60"
            >
              <ChevronRight className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
              <span className="text-xs text-gray-600 leading-relaxed">
                {tip}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Section 6: 常见问题 ═══ */}
      <section className="mb-8">
        <SectionDivider
          number="06"
          title="常见问题"
          icon={MessageCircleQuestion}
        />
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="py-4 px-5 divide-y divide-gray-100">
            <QAItem
              q="不注册也能用吗？"
              a="可以。查看赛程和排名不需要登录。但如果你想使用「我的比赛」功能，需要注册一个账号并让管理员帮你绑定。"
            />
            <QAItem
              q="我注册了账号，但看不到「我的比赛」？"
              a="你需要让赛事管理员在后台将你的账号绑定到对应的运动员位置上。绑定完成后就能看到了。"
            />
            <QAItem
              q="比赛记分是管理员录入还是我自己来？"
              a="都可以。管理员可以统一录入比分，运动员也可以自己在比赛时通过手机点击 +1 实时记分。"
            />
            <QAItem
              q="我的比分录错了怎么办？"
              a="记分过程中可以随时点击撤销。如果比赛已结束且提交了，可以联系管理员修改。"
            />
            <QAItem
              q="怎么知道我下一场比赛什么时候打？"
              a="在赛程页面登录后，你的比赛会以黄色高亮显示。也可以在「我的比赛」页面查看待开始的场次。"
            />
            <QAItem
              q="可以在电脑上用吗？"
              a="可以。本系统支持手机和电脑浏览器访问，在电脑上显示效果也很好。"
            />
          </CardContent>
        </Card>
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
