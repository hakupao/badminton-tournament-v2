"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useTournament } from "@/lib/tournament-context";
import { CalendarDays, Trophy, LogIn, Info, Users } from "lucide-react";
import { ShuttlecockIcon } from "@/components/brand/shuttlecock-icon";
import { SiteLogo } from "@/components/brand/site-logo";

interface Tournament {
  id: number;
  name: string;
  status: string;
  eventDate: string | null;
  courtsCount: number;
}

interface TournamentsResponse {
  tournaments?: Tournament[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  draft: { label: "筹备中", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400" },
  active: { label: "进行中", color: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500 live-pulse" },
  finished: { label: "已结束", color: "bg-gray-100 text-gray-500 border-gray-200", dot: "bg-gray-400" },
  archived: { label: "已归档", color: "bg-blue-50 text-blue-600 border-blue-200", dot: "bg-blue-400" },
};

export default function HomePage() {
  const { user } = useAuth();
  const { setCurrentId } = useTournament();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tournaments")
      .then((r) => r.json() as Promise<TournamentsResponse>)
      .then((data) => {
        setTournaments(data.tournaments || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const activeTournaments = tournaments.filter((t) => t.status !== "finished" && t.status !== "archived");
  const finishedTournaments = tournaments.filter((t) => t.status === "finished" || t.status === "archived");

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="relative overflow-hidden squircle-panel [--squircle-radius:2.5rem] [--squircle-shape:superellipse(2.1)] bg-gradient-to-br from-green-600 via-emerald-500 to-teal-500 p-8 md:p-12 shadow-2xl shadow-green-200/40">
        {/* Court lines decoration */}
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white" />
          <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-white" />
          <div className="absolute top-[15%] left-[10%] right-[10%] bottom-[15%] border-2 border-white squircle-xs" />
          <div className="absolute top-[30%] left-[25%] right-[25%] bottom-[30%] border border-white squircle-xs" />
          <div className="absolute top-1/2 left-[10%] w-1 h-6 bg-white -translate-y-1/2" />
          <div className="absolute top-1/2 right-[10%] w-1 h-6 bg-white -translate-y-1/2" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <SiteLogo
              size="hero"
              markClassName="bg-white/15 shadow-inner shadow-white/10 ring-white/20"
              iconClassName="text-white"
              titleClassName="text-white"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/schedule">
              <Button size="lg" className="bg-white text-green-700 hover:bg-green-50 font-bold shadow-lg shadow-black/10 h-12 px-6 gap-2">
                <CalendarDays className="w-4 h-4" />
                查看赛程
              </Button>
            </Link>
            <Link href="/teams">
              <Button size="lg" variant="outline" className="border-2 border-white/50 bg-transparent text-white hover:bg-white/15 hover:text-white font-bold h-12 px-6 backdrop-blur-sm gap-2">
                <Users className="w-4 h-4" />
                队伍信息
              </Button>
            </Link>
            <Link href="/standings">
              <Button size="lg" variant="outline" className="border-2 border-white/50 bg-transparent text-white hover:bg-white/15 hover:text-white font-bold h-12 px-6 backdrop-blur-sm gap-2">
                <Trophy className="w-4 h-4" />
                积分排名
              </Button>
            </Link>
            <Link href="/guide">
              <Button size="lg" className="bg-orange-400 text-white hover:bg-orange-500 font-extrabold shadow-lg shadow-black/10 h-12 px-6 gap-2">
                <Info className="w-4 h-4" />
                赛事介绍
              </Button>
            </Link>
            {user && (
              <Link href="/my-matches">
                <Button size="lg" variant="outline" className="border-2 border-white/50 bg-transparent text-white hover:bg-white/15 hover:text-white font-bold h-12 px-6 backdrop-blur-sm gap-2">
                  <ShuttlecockIcon className="w-4 h-4" />
                  我的比赛
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Active Tournaments */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 squircle-pill bg-gradient-to-b from-green-500 to-emerald-400" />
            <h2 className="text-xl font-bold text-gray-800">进行中的赛事</h2>
          </div>
          {!user && (
            <Link href="/login">
              <Button variant="outline" size="sm" className="border-green-200 text-green-600 hover:bg-green-50 font-medium gap-1.5">
                <LogIn className="w-3.5 h-3.5" />
                登录 / 注册
              </Button>
            </Link>
          )}
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i} className="border-gray-100 animate-pulse">
                <CardContent className="py-8">
                  <div className="h-4 bg-gray-100 squircle-xs w-2/3 mb-3" />
                  <div className="h-3 bg-gray-100 squircle-xs w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : activeTournaments.length === 0 ? (
            <Card className="border-dashed border-2 border-green-200 bg-gradient-to-br from-green-50/80 to-emerald-50/40">
            <CardContent className="py-12 text-center">
              <ShuttlecockIcon className="w-10 h-10 text-green-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-4">暂无进行中的赛事</p>
              <Link href="/admin">
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm">
                  进入管理后台
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {activeTournaments.map((t) => {
              const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.draft;
              return (
                <Card key={t.id} className="card-hover border-green-100/60 shadow-sm bg-white overflow-hidden group">
                  <div className="h-1 bg-gradient-to-r from-green-500 to-teal-400 opacity-80 group-hover:opacity-100 transition-opacity" />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-gray-800 font-bold">{t.name}</CardTitle>
                      <Badge variant="outline" className={`${cfg.color} border font-medium`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${cfg.dot}`} />
                        {cfg.label}
                      </Badge>
                    </div>
                    <CardDescription className="text-gray-400 font-medium flex items-center gap-3">
                      <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {t.eventDate || "日期待定"}</span>
                      <span>{t.courtsCount} 片场地</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Link href="/schedule" onClick={() => setCurrentId(t.id)}>
                        <Button size="sm" variant="outline" className="border-green-200 text-green-700 hover:bg-green-50 font-medium h-8 gap-1">
                          <CalendarDays className="w-3.5 h-3.5" />
                          赛程
                        </Button>
                      </Link>
                      <Link href="/standings" onClick={() => setCurrentId(t.id)}>
                        <Button size="sm" variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50 font-medium h-8 gap-1">
                          <Trophy className="w-3.5 h-3.5" />
                          排名
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Historical Tournaments */}
      {finishedTournaments.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 squircle-pill bg-gradient-to-b from-gray-400 to-gray-300" />
            <h2 className="text-xl font-bold text-gray-600">历史赛事</h2>
            <Badge variant="outline" className="text-xs text-gray-400 border-gray-200 font-medium">
              {finishedTournaments.length}
            </Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {finishedTournaments.map((t) => (
              <Card key={t.id} className="border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all group">
                <CardContent className="py-4 px-5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">{t.name}</span>
                    <Badge variant="outline" className={`text-[10px] border ${t.status === "archived" ? "text-blue-500 border-blue-200 bg-blue-50" : "text-gray-400 border-gray-200 bg-gray-100"}`}>
                      {t.status === "archived" ? "已归档" : "已结束"}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-400 mb-3 flex items-center gap-2">
                    <CalendarDays className="w-3 h-3" /> {t.eventDate || "日期待定"} · {t.courtsCount} 片场地
                  </div>
                  <div className="flex gap-2">
                    <Link href="/standings" onClick={() => setCurrentId(t.id)}>
                      <Button size="sm" variant="ghost" className="text-xs text-gray-500 hover:text-blue-600 h-7 px-2 gap-1">
                        <Trophy className="w-3 h-3" />
                        查看排名
                      </Button>
                    </Link>
                    <Link href="/schedule" onClick={() => setCurrentId(t.id)}>
                      <Button size="sm" variant="ghost" className="text-xs text-gray-500 hover:text-green-600 h-7 px-2 gap-1">
                        <CalendarDays className="w-3 h-3" />
                        查看赛程
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
