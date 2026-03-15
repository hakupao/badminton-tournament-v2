"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import { useTournament } from "@/lib/tournament-context";
import {
  CalendarDays,
  RefreshCw,
  ArrowLeft,
  LayoutGrid,
  List,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";

const MATCH_TYPE_LABELS: Record<string, string> = {
  MD: "男双",
  WD: "女双",
  XD: "混双",
};

const MATCH_TYPE_COLORS: Record<string, string> = {
  MD: "bg-blue-50 border-blue-200",
  WD: "bg-pink-50 border-pink-200",
  XD: "bg-purple-50 border-purple-200",
};

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "待开始", color: "text-gray-500", icon: Clock },
  in_progress: { label: "进行中", color: "text-amber-600", icon: AlertCircle },
  finished: { label: "已完成", color: "text-green-600", icon: CheckCircle },
};

interface GroupInfo {
  id: number;
  icon: string;
  name: string;
}

interface PlayerInfo {
  id: number;
  groupId: number;
  positionNumber: number;
  name: string | null;
}

interface GameScore {
  gameNumber: number;
  homeScore: number;
  awayScore: number;
  winner: string | null;
}

interface ScheduleMatch {
  id: number;
  roundNumber: number;
  courtNumber: number;
  matchType: string;
  status: string;
  winner: string | null;
  homeGroupId: number;
  awayGroupId: number;
  homePlayer1Id: number | null;
  homePlayer2Id: number | null;
  awayPlayer1Id: number | null;
  awayPlayer2Id: number | null;
  games?: GameScore[];
}

export default function AdminSchedulePage() {
  const { currentId, currentName } = useTournament();
  const tournamentId = currentId ? String(currentId) : "";
  const [matches, setMatches] = useState<ScheduleMatch[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<"matrix" | "list">("matrix");
  const [expandedRound, setExpandedRound] = useState<number | null>(null);

  useEffect(() => {
    if (!tournamentId) { setLoading(false); return; }
    fetchSchedule();
  }, [tournamentId]);

  const fetchSchedule = () => {
    if (!tournamentId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/tournaments/${tournamentId}/schedule`).then((r) => r.json()),
      fetch(`/api/tournaments/${tournamentId}`).then((r) => r.json()),
    ]).then(([scheduleData, tournamentData]) => {
      setMatches(scheduleData.matches || []);
      setGroups(tournamentData.groups || []);
      setPlayers(tournamentData.players || []);
      setLoading(false);
    });
  };

  const generateSchedule = async () => {
    if (!tournamentId) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/schedule`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`赛程生成成功！共 ${data.totalMatches} 场比赛，${data.totalRounds} 轮`);
        fetchSchedule();
      } else {
        const err = await res.json();
        toast.error(err.error || "生成失败");
      }
    } finally {
      setGenerating(false);
    }
  };

  const groupMap = new Map(groups.map((g) => [g.id, g]));
  const playerMap = new Map(players.map((p) => [p.id, p]));

  const formatPlayer = (pid: number | null) => {
    if (!pid) return "?";
    const p = playerMap.get(pid);
    if (!p) return "?";
    const g = groupMap.get(p.groupId);
    return p.name || `${g?.icon || ""}${p.positionNumber}号`;
  };

  const maxRound = matches.length > 0 ? Math.max(...matches.map((m) => m.roundNumber)) : 0;
  const maxCourt = matches.length > 0 ? Math.max(...matches.map((m) => m.courtNumber)) : 0;

  const totalFinished = matches.filter((m) => m.status === "finished").length;
  const totalPending = matches.filter((m) => m.status === "pending").length;

  if (loading) return <div className="text-center py-12 text-muted-foreground">加载中...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-1 text-gray-500">
              <ArrowLeft className="w-4 h-4" /> 返回
            </Button>
          </Link>
          <CalendarDays className="w-5 h-5 text-amber-600" />
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-800">赛程管理</h1>
            {currentName && <p className="text-xs text-gray-400">{currentName}</p>}
          </div>
        </div>
        <Button
          onClick={generateSchedule}
          disabled={generating || !tournamentId}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
          {generating ? "生成中..." : matches.length > 0 ? "重新生成" : "生成赛程"}
        </Button>
      </div>

      {/* Stats */}
      {matches.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-gray-100">
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold text-gray-800">{matches.length}</div>
              <div className="text-xs text-muted-foreground">总场次</div>
            </CardContent>
          </Card>
          <Card className="border-gray-100">
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold text-gray-800">{maxRound}</div>
              <div className="text-xs text-muted-foreground">总轮次</div>
            </CardContent>
          </Card>
          <Card className="border-green-100">
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold text-green-600">{totalFinished}</div>
              <div className="text-xs text-muted-foreground">已完成</div>
            </CardContent>
          </Card>
          <Card className="border-amber-100">
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold text-amber-600">{totalPending}</div>
              <div className="text-xs text-muted-foreground">待进行</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Schedule View */}
      {matches.length === 0 ? (
        <Card className="border-dashed border-border/50">
          <CardContent className="py-12 text-center">
            <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-muted-foreground">赛程尚未生成</p>
            <p className="text-sm text-muted-foreground mt-2">
              请先确保已配置好人员分组和比赛模板，然后点击「生成赛程」
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* View Toggle */}
          <div className="flex justify-end gap-2">
            <Button
              variant={viewMode === "matrix" ? "default" : "outline"}
              size="sm"
              className={viewMode === "matrix" ? "bg-amber-600 hover:bg-amber-700" : ""}
              onClick={() => setViewMode("matrix")}
            >
              <LayoutGrid className="w-3.5 h-3.5 mr-1" /> 矩阵
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              className={viewMode === "list" ? "bg-amber-600 hover:bg-amber-700" : ""}
              onClick={() => setViewMode("list")}
            >
              <List className="w-3.5 h-3.5 mr-1" /> 列表
            </Button>
          </div>

          {viewMode === "matrix" ? (
            <>
              {/* Mobile: compact mini-matrix */}
              <div className="md:hidden">
                <div className="rounded-lg border border-amber-100 overflow-hidden">
                  {/* Mini matrix header */}
                  <div className="grid bg-amber-50/60 border-b border-amber-100" style={{ gridTemplateColumns: `2.5rem repeat(${maxCourt}, 1fr)` }}>
                    <div className="p-1.5 text-[10px] font-semibold text-amber-700 text-center"></div>
                    {Array.from({ length: maxCourt }, (_, i) => (
                      <div key={i} className="p-1.5 text-[10px] font-semibold text-amber-700 text-center">
                        场地{i + 1}
                      </div>
                    ))}
                  </div>
                  {/* Mini matrix rows */}
                  {Array.from({ length: maxRound }, (_, roundIdx) => {
                    const roundNum = roundIdx + 1;
                    const roundMatches = matches.filter((m) => m.roundNumber === roundNum);
                    const isExpanded = expandedRound === roundNum;
                    const allDone = roundMatches.length > 0 && roundMatches.every((m) => m.status === "finished");

                    return (
                      <div key={roundNum}>
                        <div
                          className={`grid cursor-pointer transition-colors ${
                            isExpanded ? "bg-amber-50" : allDone ? "bg-gray-50/50" : "hover:bg-amber-50/30"
                          } ${roundIdx < maxRound - 1 || isExpanded ? "border-b border-gray-100" : ""}`}
                          style={{ gridTemplateColumns: `2.5rem repeat(${maxCourt}, 1fr)` }}
                          onClick={() => setExpandedRound(isExpanded ? null : roundNum)}
                        >
                          <div className={`p-1.5 text-[11px] font-bold text-center flex items-center justify-center ${allDone ? "text-green-600" : "text-amber-700"}`}>
                            R{roundNum}
                          </div>
                          {Array.from({ length: maxCourt }, (_, courtIdx) => {
                            const match = roundMatches.find((m) => m.courtNumber === courtIdx + 1);
                            if (!match) return (
                              <div key={courtIdx} className="p-1 flex items-center justify-center">
                                <span className="text-gray-200 text-[10px]">—</span>
                              </div>
                            );

                            const isFinished = match.status === "finished";
                            const homeGroup = groupMap.get(match.homeGroupId);
                            const awayGroup = groupMap.get(match.awayGroupId);

                            const bgClass = isFinished
                              ? "bg-gray-100 border-gray-200"
                              : match.matchType === "MD"
                                ? "bg-blue-50 border-blue-200"
                                : match.matchType === "WD"
                                  ? "bg-pink-50 border-pink-200"
                                  : "bg-purple-50 border-purple-200";

                            return (
                              <div key={courtIdx} className="p-1 flex items-center justify-center">
                                <div className={`rounded border px-1 py-0.5 text-center leading-tight ${bgClass} ${isFinished ? "opacity-60" : ""}`}>
                                  <div className="text-xs whitespace-nowrap">
                                    {homeGroup?.icon || "?"}<span className="text-gray-300 mx-0.5 text-[9px]">v</span>{awayGroup?.icon || "?"}
                                  </div>
                                  {isFinished && match.games && match.games.length > 0 ? (
                                    <div className="text-[8px] text-gray-500 font-medium">
                                      {match.games.map((g) => `${g.homeScore}:${g.awayScore}`).join(" ")}
                                    </div>
                                  ) : (
                                    <div className="text-[8px] text-gray-400">
                                      {MATCH_TYPE_LABELS[match.matchType]}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {/* Expanded detail cards */}
                        {isExpanded && (
                          <div className="bg-amber-50/50 border-b border-amber-100 px-2 py-2 space-y-1.5">
                            {roundMatches.map((match) => {
                              const isFinished = match.status === "finished";
                              const colorClass = isFinished
                                ? "bg-white border-gray-200 opacity-70"
                                : (MATCH_TYPE_COLORS[match.matchType] || "bg-white border-gray-100");
                              const statusInfo = STATUS_MAP[match.status] || STATUS_MAP.pending;
                              const homeGroup = groupMap.get(match.homeGroupId);
                              const awayGroup = groupMap.get(match.awayGroupId);

                              return (
                                <Link key={match.id} href={`/match/${match.id}`}>
                                  <div className={`rounded-lg border p-2.5 ${colorClass} hover:opacity-80 transition-opacity cursor-pointer`}>
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1 py-0.5 rounded">场地{match.courtNumber}</span>
                                        <Badge variant="outline" className={`text-[9px] px-1 py-0 ${isFinished ? "text-gray-400 border-gray-300" : ""}`}>
                                          {MATCH_TYPE_LABELS[match.matchType]}
                                        </Badge>
                                      </div>
                                      <span className={`text-[10px] ${statusInfo.color}`}>{statusInfo.label}</span>
                                    </div>
                                    <div className="text-center font-medium text-sm">
                                      <span>{homeGroup?.icon || "?"}</span>
                                      {isFinished && match.games && match.games.length > 0 ? (
                                        <span className="mx-1.5 font-bold text-gray-600 text-xs">
                                          {match.games.map((g) => `${g.homeScore}:${g.awayScore}`).join(" / ")}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400 mx-1.5 text-xs">vs</span>
                                      )}
                                      <span>{awayGroup?.icon || "?"}</span>
                                    </div>
                                    <div className="flex justify-between gap-1 mt-0.5 text-center">
                                      <span className="text-[10px] text-gray-500 flex-1">
                                        {formatPlayer(match.homePlayer1Id)} + {formatPlayer(match.homePlayer2Id)}
                                      </span>
                                      <span className="text-[10px] text-gray-500 flex-1">
                                        {formatPlayer(match.awayPlayer1Id)} + {formatPlayer(match.awayPlayer2Id)}
                                      </span>
                                    </div>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Desktop: full matrix table */}
              <Card className="border-amber-100 shadow-sm overflow-hidden hidden md:block">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-amber-100 bg-amber-50/60">
                          <th className="p-3 text-left font-semibold text-amber-800 sticky left-0 bg-amber-50/60 z-10">
                            轮次
                          </th>
                          {Array.from({ length: maxCourt }, (_, i) => (
                            <th key={i} className="p-3 text-center font-semibold text-amber-800 min-w-[200px]">
                              场地 {i + 1}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: maxRound }, (_, roundIdx) => {
                          const roundNum = roundIdx + 1;
                          const roundMatches = matches.filter((m) => m.roundNumber === roundNum);

                          return (
                            <tr key={roundNum} className="border-b border-gray-100 hover:bg-amber-50/20">
                              <td className="p-3 sticky left-0 bg-white z-10 font-semibold text-amber-700">
                                R{roundNum}
                              </td>
                              {Array.from({ length: maxCourt }, (_, courtIdx) => {
                                const match = roundMatches.find((m) => m.courtNumber === courtIdx + 1);
                                if (!match) {
                                  return (
                                    <td key={courtIdx} className="p-2 text-center text-gray-300">
                                      —
                                    </td>
                                  );
                                }

                                const homeGroup = groupMap.get(match.homeGroupId);
                                const awayGroup = groupMap.get(match.awayGroupId);
                                const statusInfo = STATUS_MAP[match.status] || STATUS_MAP.pending;
                                const isFinished = match.status === "finished";
                                const colorClass = isFinished
                                  ? "bg-gray-50 border-gray-200 opacity-70"
                                  : (MATCH_TYPE_COLORS[match.matchType] || "");

                                return (
                                  <td key={courtIdx} className="p-2">
                                    <Link href={`/match/${match.id}`}>
                                      <div
                                        className={`rounded-lg border p-3 ${colorClass} hover:opacity-80 transition-opacity cursor-pointer`}
                                      >
                                        <div className="flex items-center justify-between mb-1.5">
                                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${isFinished ? "text-gray-400 border-gray-300" : ""}`}>
                                            {MATCH_TYPE_LABELS[match.matchType]}
                                          </Badge>
                                          <span className={`text-[10px] ${statusInfo.color}`}>
                                            {statusInfo.label}
                                          </span>
                                        </div>
                                        <div className="text-center font-medium mb-1">
                                          <span>{homeGroup?.icon || "?"}</span>
                                          {isFinished && match.games && match.games.length > 0 ? (
                                            <span className="mx-2 text-sm font-bold text-gray-600">
                                              {match.games.map((g) => `${g.homeScore}:${g.awayScore}`).join(" / ")}
                                            </span>
                                          ) : (
                                            <span className="text-gray-400 mx-2">vs</span>
                                          )}
                                          <span>{awayGroup?.icon || "?"}</span>
                                        </div>
                                        <div className="flex justify-between gap-1 text-center">
                                          <span className="text-[10px] text-gray-500 flex-1">
                                            {formatPlayer(match.homePlayer1Id)} + {formatPlayer(match.homePlayer2Id)}
                                          </span>
                                          <span className="text-[10px] text-gray-500 flex-1">
                                            {formatPlayer(match.awayPlayer1Id)} + {formatPlayer(match.awayPlayer2Id)}
                                          </span>
                                        </div>
                                      </div>
                                    </Link>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="space-y-4">
              {Array.from({ length: maxRound }, (_, roundIdx) => {
                const roundNum = roundIdx + 1;
                const roundMatches = matches.filter((m) => m.roundNumber === roundNum);

                return (
                  <div key={roundNum}>
                    <h3 className="text-sm font-semibold text-amber-700 mb-2">第 {roundNum} 轮</h3>
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {roundMatches.map((match) => {
                        const homeGroup = groupMap.get(match.homeGroupId);
                        const awayGroup = groupMap.get(match.awayGroupId);
                        const statusInfo = STATUS_MAP[match.status] || STATUS_MAP.pending;
                        const isFinished = match.status === "finished";

                        return (
                          <Link key={match.id} href={`/match/${match.id}`}>
                            <Card className={`${isFinished ? "border-gray-200 opacity-70" : "border-gray-100"} hover:border-amber-300 hover:shadow-md transition-all cursor-pointer`}>
                              <CardContent className="py-3 px-4">
                                <div className="flex items-center justify-between mb-1.5">
                                  <Badge variant="outline" className={`text-xs ${isFinished ? "text-gray-400 border-gray-300" : ""}`}>
                                    {MATCH_TYPE_LABELS[match.matchType]} · 场地{match.courtNumber}
                                  </Badge>
                                  <span className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</span>
                                </div>
                                <div className="text-center font-medium mb-1">
                                  {homeGroup?.icon || "?"} {homeGroup?.name}
                                  {isFinished && match.games && match.games.length > 0 ? (
                                    <span className="mx-2 text-sm font-bold text-gray-600">
                                      {match.games.map((g) => `${g.homeScore}:${g.awayScore}`).join(" / ")}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 mx-1">vs</span>
                                  )}
                                  {awayGroup?.icon || "?"} {awayGroup?.name}
                                </div>
                                <div className="flex justify-between text-center">
                                  <span className="text-[10px] text-gray-500 flex-1">
                                    {formatPlayer(match.homePlayer1Id)} + {formatPlayer(match.homePlayer2Id)}
                                  </span>
                                  <span className="text-[10px] text-gray-500 flex-1">
                                    {formatPlayer(match.awayPlayer1Id)} + {formatPlayer(match.awayPlayer2Id)}
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
