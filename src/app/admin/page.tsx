"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Settings, FlaskConical, Users, FileText, CalendarDays, PenLine, Plus, Trash2, Play, Square, Shuffle, UserCog } from "lucide-react";
import { useTournament } from "@/lib/tournament-context";

interface Tournament {
  id: number;
  name: string;
  status: string;
  courtsCount: number;
  eventDate: string | null;
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

  const fetchTournaments = () => {
    fetch("/api/tournaments")
      .then((r) => r.json())
      .then((data: any) => {
        const list: Tournament[] = data.tournaments || [];
        setTournaments(list);
        setLoading(false);
      });
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
        const data: any = await res.json();
        toast.success("赛事创建成功！");
        setCurrentId(data.tournament.id);
        fetchTournaments();
        refreshGlobal();
      } else {
        const err: any = await res.json();
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
        const err: any = await res.json();
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
    { icon: FlaskConical, title: "赛事模拟器", desc: "参数调整 · 赛程模拟", href: `/admin/tournament/${selectedId}`, color: "from-green-500 to-emerald-400" },
    { icon: Users, title: "人员管理", desc: "录入 · 分组 · 绑定", href: "/admin/players", color: "from-blue-500 to-cyan-400" },
    { icon: FileText, title: "比赛模板", desc: "位置 · 对阵方式", href: "/admin/template", color: "from-purple-500 to-violet-400" },
    { icon: CalendarDays, title: "赛程管理", desc: "生成 · 编排 · 调整", href: "/admin/schedule", color: "from-amber-500 to-orange-400" },
    { icon: PenLine, title: "比分录入", desc: "赛后录分 · 裁判记录", href: "/admin/scoring", color: "from-rose-500 to-pink-400" },
    { icon: Shuffle, title: "摇号分组", desc: "位置分配 · 随机抽签", href: "/admin/lottery", color: "from-indigo-500 to-blue-400" },
    { icon: UserCog, title: "账号管理", desc: "注册账号 · 密码重置", href: "/admin/users", color: "from-cyan-500 to-teal-400" },
  ] : [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-gray-600" />
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800">管理后台</h1>
            <p className="text-gray-500 font-medium text-sm">赛事管理与模拟器</p>
          </div>
        </div>
        <Button
          onClick={createTournament}
          disabled={creating}
          className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-md gap-1"
        >
          <Plus className="w-4 h-4" />
          {creating ? "创建中..." : "新建赛事"}
        </Button>
      </div>

      {/* Tournament List - click to select */}
      {!loading && tournaments.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-700">赛事列表 <span className="text-sm font-normal text-gray-400">（点击选择要管理的赛事）</span></h2>
          {tournaments.map((t) => (
            <Card
              key={t.id}
              className={`shadow-sm bg-white cursor-pointer transition-all ${
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
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-700">管理功能</h2>
            <span className="text-sm text-green-600 font-medium bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200">
              {selectedTournament.name}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminSections.map((section) => {
              const Icon = section.icon;
              return (
                <Link key={section.title} href={section.href}>
                  <Card className="border-0 shadow-md card-hover cursor-pointer h-full overflow-hidden">
                    <div className={`h-1.5 bg-gradient-to-r ${section.color}`} />
                    <CardHeader>
                      <Icon className="w-7 h-7 text-gray-600 mb-1" />
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
        <Card className="border-dashed border-2 border-green-200 bg-green-50/30">
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">还没有赛事，点击右上角「新建赛事」开始</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
