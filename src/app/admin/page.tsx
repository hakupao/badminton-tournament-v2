"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  draft: "bg-amber-50 text-amber-600 border-amber-200",
  active: "bg-green-50 text-green-600 border-green-200",
  finished: "bg-gray-100 text-gray-500 border-gray-200",
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
    { icon: Settings2, title: "赛事设置", href: "/admin/settings", color: "text-emerald-600", accent: "border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50" },
    { icon: SlidersHorizontal, title: "赛制设置", href: "/admin/rules", color: "text-blue-600", accent: "border-blue-200 hover:border-blue-400 hover:bg-blue-50/50" },
    { icon: Palette, title: "队伍设置", href: "/admin/teams", color: "text-violet-600", accent: "border-violet-200 hover:border-violet-400 hover:bg-violet-50/50" },
    { icon: CalendarDays, title: "赛程安排", href: "/admin/schedule", color: "text-amber-600", accent: "border-amber-200 hover:border-amber-400 hover:bg-amber-50/50" },
    { icon: Users, title: "运动员", href: "/admin/players", color: "text-sky-600", accent: "border-sky-200 hover:border-sky-400 hover:bg-sky-50/50" },
    { icon: Shuffle, title: "摇号分组", href: "/admin/lottery", color: "text-indigo-600", accent: "border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/50" },
    { icon: PenLine, title: "比分录入", href: "/admin/scoring", color: "text-rose-600", accent: "border-rose-200 hover:border-rose-400 hover:bg-rose-50/50" },
    { icon: UserCog, title: "账号管理", href: "/admin/users", color: "text-cyan-600", accent: "border-cyan-200 hover:border-cyan-400 hover:bg-cyan-50/50" },
  ] : [];

  return (
    <div className="admin-page-medium">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-gray-500" />
          <h1 className="text-xl font-bold text-gray-800">管理后台</h1>
          <span className="text-xs text-gray-400">{tournaments.length} 个赛事</span>
        </div>
        <Button
          onClick={createTournament}
          disabled={creating}
          size="sm"
          className="bg-green-600 px-3 text-white shadow-sm hover:bg-green-700 gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          {creating ? "创建中..." : "新建赛事"}
        </Button>
      </div>

      {/* Tournament List */}
      {!loading && tournaments.length > 0 && (
        <div className="space-y-2">
          {tournaments.map((t) => (
            <div
              key={t.id}
              className={`rounded-xl border px-4 py-3 cursor-pointer transition-all ${
                selectedId === t.id
                  ? "border-green-400 bg-green-50/60 ring-1 ring-green-200"
                  : "border-gray-200 bg-white hover:border-green-300"
              }`}
              onClick={() => setCurrentId(t.id)}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${selectedId === t.id ? "bg-green-500" : "bg-gray-300"}`} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-gray-800">{t.name}</div>
                    <div className="mt-1 text-xs text-gray-400">{t.eventDate || "日期待定"} · {t.courtsCount} 片场地</div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 overflow-x-auto whitespace-nowrap sm:overflow-visible">
                  <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[t.status] || ""}`}>
                    {STATUS_LABELS[t.status] || t.status}
                  </span>

                  {t.status === "draft" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-3 text-xs text-green-600 hover:bg-green-50"
                      onClick={(e) => { e.stopPropagation(); changeTournamentStatus(t.id, "active"); }}
                    >
                      <Play className="w-3 h-3" />
                      开始
                    </Button>
                  )}
                  {t.status === "active" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-3 text-xs text-gray-600 hover:bg-gray-50"
                      onClick={(e) => { e.stopPropagation(); changeTournamentStatus(t.id, "finished"); }}
                    >
                      <Square className="w-3 h-3" />
                      结束
                    </Button>
                  )}
                  {t.status === "finished" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-3 text-xs text-amber-600 hover:bg-amber-50"
                      onClick={(e) => { e.stopPropagation(); changeTournamentStatus(t.id, "draft"); }}
                    >
                      重置
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-gray-300 hover:bg-red-50 hover:text-red-500"
                    onClick={(e) => { e.stopPropagation(); deleteTournament(t.id, t.name); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Management Cards */}
      {selectedTournament && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {adminSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link key={section.title} href={section.href}>
                <div className={`flex flex-col items-center gap-2.5 rounded-xl border bg-white p-5 transition-all cursor-pointer ${section.accent}`}>
                  <Icon className={`w-6 h-6 ${section.color}`} />
                  <span className="text-sm font-medium text-gray-700">{section.title}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {!loading && tournaments.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-12 text-center">
          <p className="text-gray-400 text-sm">还没有赛事，点击「新建赛事」开始</p>
        </div>
      )}
    </div>
  );
}
