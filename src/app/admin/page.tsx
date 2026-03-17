"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Settings,
  Settings2,
  SlidersHorizontal,
  Users,
  CalendarDays,
  PenLine,
  Plus,
  Trash2,
  Play,
  Square,
  Shuffle,
  UserCog,
  Palette,
} from "lucide-react";
import { useTournament } from "@/lib/tournament-context";

interface Tournament {
  id: number;
  name: string;
  status: string;
  courtsCount: number;
  eventDate: string | null;
}

interface TournamentListResponse {
  tournaments?: Tournament[];
}

interface TournamentCreateResponse {
  tournament: Tournament;
}

interface ErrorResponse {
  error?: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700 border-amber-200",
  active: "bg-green-100 text-green-700 border-green-200",
  finished: "bg-gray-100 text-gray-600 border-gray-200",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "筹备中",
  active: "进行中",
  finished: "已结束",
};

export default function AdminPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { currentId, setCurrentId, refresh: refreshGlobal } = useTournament();

  const fetchTournaments = async () => {
    try {
      const res = await fetch("/api/tournaments");
      const data = await res.json() as TournamentListResponse;
      const list: Tournament[] = data.tournaments || [];
      setTournaments(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const createTournament = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `锦标赛 ${new Date().toLocaleDateString("zh-CN")}`,
          groupCount: 5,
        }),
      });
      if (res.ok) {
        const data = await res.json() as TournamentCreateResponse;
        toast.success("赛事创建成功！");
        setCurrentId(data.tournament.id);
        fetchTournaments();
        refreshGlobal();
      } else {
        const err = await res.json() as ErrorResponse;
        toast.error(err.error || "创建失败");
      }
    } finally {
      setCreating(false);
    }
  };

  const changeTournamentStatus = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/tournaments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`赛事状态已切换为「${STATUS_LABELS[newStatus]}」`);
        fetchTournaments();
        refreshGlobal();
      } else {
        const err = await res.json() as ErrorResponse;
        toast.error(err.error || "状态切换失败");
      }
    } catch {
      toast.error("网络错误");
    }
  };

  const deleteTournament = async (id: number, name: string) => {
    if (!confirm(`确定要删除「${name}」吗？此操作不可恢复。`)) return;

    try {
      const res = await fetch(`/api/tournaments/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("赛事已删除");
        fetchTournaments();
        refreshGlobal();
      } else {
        toast.error("删除失败");
      }
    } catch {
      toast.error("删除失败");
    }
  };

  const selectedId = currentId;
  const selectedTournament = tournaments.find((t) => t.id === selectedId);

  const adminSections = selectedId ? [
    { icon: Settings2, title: "赛事设置", desc: "名称 · 日期 · 时间", href: "/admin/settings", color: "from-emerald-500 to-green-400" },
    { icon: SlidersHorizontal, title: "赛制设置", desc: "分组 · 模板 · 编制", href: "/admin/rules", color: "from-blue-500 to-cyan-400" },
    { icon: Palette, title: "队伍设置", desc: "队名 · 图标 · 代号", href: "/admin/teams", color: "from-violet-500 to-purple-400" },
    { icon: CalendarDays, title: "赛程安排", desc: "排程参数 · 模拟发布", href: "/admin/schedule", color: "from-amber-500 to-orange-400" },
    { icon: Users, title: "运动员设置", desc: "槽位 · 命名 · 绑定", href: "/admin/players", color: "from-sky-500 to-cyan-400" },
    { icon: Shuffle, title: "摇号分组", desc: "报名池 · 位置抽签", href: "/admin/lottery", color: "from-indigo-500 to-blue-400" },
    { icon: PenLine, title: "比分录入", desc: "赛后录分 · 裁判记录", href: "/admin/scoring", color: "from-rose-500 to-pink-400" },
    { icon: UserCog, title: "账号管理", desc: "注册账号 · 密码重置", href: "/admin/users", color: "from-cyan-500 to-teal-400" },
  ] : [];

  return (
    <div className="admin-page-shell">
      <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.4)] ring-1 ring-black/5 backdrop-blur-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white shadow-sm">
                <Settings className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-gray-800 sm:text-3xl">管理后台</h1>
                <p className="text-sm font-medium text-gray-500">赛事入口、生命周期与 8 个赛事功能卡片</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-gray-600">
                当前共 {tournaments.length} 个赛事
              </span>
              {selectedTournament && (
                <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-green-700">
                  当前管理：{selectedTournament.name}
                </span>
              )}
            </div>
          </div>
          <Button
            onClick={createTournament}
            disabled={creating}
            className="h-10 rounded-xl bg-green-600 px-4 text-white shadow-md hover:bg-green-700 gap-1"
          >
            <Plus className="w-4 h-4" />
            {creating ? "创建中..." : "新建赛事"}
          </Button>
        </div>
      </div>

      {/* Tournament List - click to select */}
      {!loading && tournaments.length > 0 && (
        <div className="space-y-4">
          <h2 className="admin-section-heading">
            赛事列表
            <span className="text-sm font-normal text-gray-400">点击选择要管理的赛事</span>
          </h2>
          {tournaments.map((t) => (
            <Card
              key={t.id}
              className={`rounded-2xl bg-white shadow-sm cursor-pointer transition-all ${
                selectedId === t.id
                  ? "border-green-400 ring-2 ring-green-200 bg-green-50/30"
                  : "border-green-100 hover:border-green-300"
              }`}
              onClick={() => setCurrentId(t.id)}
            >
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${selectedId === t.id ? "bg-green-500" : "bg-gray-300"}`} />
                  <div>
                    <div className="font-bold text-gray-800">{t.name}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      <CalendarDays className="w-3 h-3" /> {t.eventDate || "日期待定"} · {t.courtsCount} 片场地
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Status switch buttons */}
                  {t.status === "draft" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-200 text-green-600 hover:bg-green-50 gap-1 text-xs"
                      onClick={(e) => { e.stopPropagation(); changeTournamentStatus(t.id, "active"); }}
                    >
                      <Play className="w-3 h-3" /> 开始
                    </Button>
                  )}
                  {t.status === "active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-gray-300 text-gray-600 hover:bg-gray-50 gap-1 text-xs"
                      onClick={(e) => { e.stopPropagation(); changeTournamentStatus(t.id, "finished"); }}
                    >
                      <Square className="w-3 h-3" /> 结束
                    </Button>
                  )}
                  {t.status === "finished" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-200 text-amber-600 hover:bg-amber-50 gap-1 text-xs"
                      onClick={(e) => { e.stopPropagation(); changeTournamentStatus(t.id, "draft"); }}
                    >
                      重置
                    </Button>
                  )}
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[t.status] || ""}`}>
                    {STATUS_LABELS[t.status] || t.status}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 gap-1"
                    onClick={(e) => { e.stopPropagation(); deleteTournament(t.id, t.name); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Management Cards - bound to selected tournament */}
      {selectedTournament && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="admin-section-heading">管理功能</h2>
            <span className="text-sm text-green-600 font-medium bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200">
              {selectedTournament.name}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminSections.map((section) => {
              const Icon = section.icon;
              return (
                <Link key={section.title} href={section.href}>
                  <Card className="min-h-[172px] overflow-hidden rounded-2xl border-0 shadow-md card-hover cursor-pointer h-full">
                    <div className={`h-1.5 bg-gradient-to-r ${section.color}`} />
                    <CardHeader className="flex h-full flex-col justify-between gap-4">
                      <Icon className="w-7 h-7 text-gray-600" />
                      <CardTitle className="text-lg text-gray-800">{section.title}</CardTitle>
                      <CardDescription className="text-gray-500">{section.desc}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {!loading && tournaments.length === 0 && (
        <Card className="rounded-3xl border-dashed border-2 border-green-200 bg-green-50/30">
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">还没有赛事，点击右上角「新建赛事」开始</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
