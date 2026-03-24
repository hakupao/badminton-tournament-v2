"use client";

import { Suspense, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, LayoutGrid, List, Star } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useTournament } from "@/lib/tournament-context";

const MATCH_TYPE_LABELS: Record<string, string> = {
  MD: "男双",
  WD: "女双",
  XD: "混双",
};

const MATCH_TYPE_COLORS: Record<string, string> = {
  MD: "bg-blue-50/80 border-blue-200/80",
  WD: "bg-pink-50/80 border-pink-200/80",
  XD: "bg-purple-50/80 border-purple-200/80",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "待开始", color: "text-gray-500" },
  in_progress: { label: "进行中", color: "text-amber-600" },
  finished: { label: "已完成", color: "text-green-600" },
};

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

interface GroupInfo {
  id: number;
  icon: string;
  name: string;
}

interface PlayerInfo {
  id: number;
  groupId: number;
  positionNumber: number;
  gender: string;
  name: string | null;
  boundUsername: string | null;
}

interface ScheduleResponse {
  matches?: ScheduleMatch[];
}

interface TournamentDetailsResponse {
  groups?: GroupInfo[];
  players?: PlayerInfo[];
}

async function fetchJson<T>(input: RequestInfo | URL): Promise<T> {
  const response = await fetch(input);
  if (!response.ok) {
    throw new Error("Failed to fetch data");
  }
  return response.json() as Promise<T>;
}

function formatPlayer(player: PlayerInfo | undefined, groupMap: Map<number, GroupInfo>) {
  if (!player) return "?";
  const group = groupMap.get(player.groupId);
  const codename = `${group?.icon || ""}${player.positionNumber}号`;
  // If bound to a user, show "codename(username)"
  const displayName = player.boundUsername || player.name;
  if (displayName) return `${codename}(${displayName})`;
  return codename;
}

function ScheduleContent() {
  const { user } = useAuth();
  const { currentId, loading: tournamentLoading } = useTournament();
  const [matches, setMatches] = useState<ScheduleMatch[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [loadedTournamentId, setLoadedTournamentId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"matrix" | "list">("matrix");
  const [expandedRound, setExpandedRound] = useState<number | null>(null);

  const myPlayerId = user?.playerId;

  const isMyMatch = (match: ScheduleMatch) => {
    if (!myPlayerId) return false;
    return (
      match.homePlayer1Id === myPlayerId ||
      match.homePlayer2Id === myPlayerId ||
      match.awayPlayer1Id === myPlayerId ||
      match.awayPlayer2Id === myPlayerId
    );
  };

  useEffect(() => {
    if (tournamentLoading || !currentId) return;

    let cancelled = false;

    async function loadSchedule() {
      try {
        const [scheduleData, tournamentData] = await Promise.all([
          fetchJson<ScheduleResponse>(`/api/tournaments/${currentId}/schedule`),
          fetchJson<TournamentDetailsResponse>(`/api/tournaments/${currentId}`),
        ]);

        if (cancelled) return;

        const matchList: ScheduleMatch[] = scheduleData.matches || [];
        setMatches(matchList);
        setGroups(tournamentData.groups || []);
        setPlayers(tournamentData.players || []);

        const firstUnfinishedRound = matchList.length > 0
          ? matchList
              .map((m) => m.roundNumber)
              .sort((a, b) => a - b)
              .find((round) =>
                matchList
                  .filter((m) => m.roundNumber === round)
                  .some((m) => m.status !== "finished")
              ) ?? null
          : null;
        setExpandedRound(firstUnfinishedRound);
      } catch {
        if (cancelled) return;

        setMatches([]);
        setGroups([]);
        setPlayers([]);
        setExpandedRound(null);
      } finally {
        if (!cancelled) {
          setLoadedTournamentId(currentId);
        }
      }
    }

    void loadSchedule();

    return () => {
      cancelled = true;
    };
  }, [currentId, tournamentLoading]);

  if (tournamentLoading || (currentId !== null && loadedTournamentId !== currentId)) {
    return <div className="text-center py-12 text-muted-foreground">加载中...</div>;
  }

  if (!currentId) {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4.5 h-4.5 text-green-700" />
          <h1 className="text-lg font-bold text-green-900">赛程</h1>
        </div>
        <Card className="border-dashed border-border/50">
          <CardContent className="py-10 text-center">
            <CalendarDays className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">暂无可查看的赛事</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4.5 h-4.5 text-green-700" />
          <h1 className="text-lg font-bold text-green-900">赛程</h1>
        </div>
        <Card className="border-dashed border-border/50">
          <CardContent className="py-10 text-center">
            <CalendarDays className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">赛程尚未生成</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const groupMap = new Map(groups.map((g) => [g.id, g]));
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const maxRound = Math.max(...matches.map((m) => m.roundNumber));
  const maxCourt = Math.max(...matches.map((m) => m.courtNumber));

  const renderPlayerPair = (p1Id: number | null, p2Id: number | null) => {
    const p1 = p1Id ? playerMap.get(p1Id) : undefined;
    const p2 = p2Id ? playerMap.get(p2Id) : undefined;
    if (!p1 && !p2) return null;
    return (
      <span className="text-[10px] text-gray-500 leading-tight">
        {formatPlayer(p1, groupMap)} + {formatPlayer(p2, groupMap)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4.5 h-4.5 text-green-700" />
          <h1 className="text-lg font-bold text-green-900">赛程</h1>
        </div>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "matrix" | "list")}>
          <TabsList className="bg-green-50/80">
            <TabsTrigger value="matrix" className="data-[state=active]:bg-green-600 data-[state=active]:text-white gap-1">
              <LayoutGrid className="w-3.5 h-3.5" />
              矩阵
            </TabsTrigger>
            <TabsTrigger value="list" className="data-[state=active]:bg-green-600 data-[state=active]:text-white gap-1">
              <List className="w-3.5 h-3.5" />
              列表
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {myPlayerId && (
        <div className="flex items-center gap-1.5 text-xs text-yellow-700 bg-yellow-50/80 border border-yellow-200 squircle-sm px-2.5 py-1">
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-500 shrink-0" />
          <span>黄色高亮 = 你的比赛</span>
        </div>
      )}

      {viewMode === "matrix" ? (
        <>
          {/* Mobile: compact mini-matrix */}
          <div className="md:hidden">
            <div className="squircle-lg border border-green-100 overflow-hidden">
              {/* Mini matrix header */}
              <div className="grid bg-green-50/60 border-b border-green-100" style={{ gridTemplateColumns: `2.5rem repeat(${maxCourt}, 1fr)` }}>
                <div className="p-1.5 text-[10px] font-semibold text-green-700 text-center"></div>
                {Array.from({ length: maxCourt }, (_, i) => (
                  <div key={i} className="p-1.5 text-[10px] font-semibold text-green-700 text-center">
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
                        isExpanded ? "bg-green-50" : allDone ? "bg-gray-50/50" : "hover:bg-green-50/30"
                      } ${roundIdx < maxRound - 1 || isExpanded ? "border-b border-gray-100" : ""}`}
                      style={{ gridTemplateColumns: `2.5rem repeat(${maxCourt}, 1fr)` }}
                      onClick={() => setExpandedRound(isExpanded ? null : roundNum)}
                    >
                      <div className={`p-1.5 text-[11px] font-bold text-center flex items-center justify-center ${allDone ? "text-green-600" : "text-green-700"}`}>
                        第{roundNum}轮
                      </div>
                      {Array.from({ length: maxCourt }, (_, courtIdx) => {
                        const match = roundMatches.find((m) => m.courtNumber === courtIdx + 1);
                        if (!match) return (
                          <div key={courtIdx} className="p-1 flex items-center justify-center">
                            <span className="text-gray-200 text-[10px]">—</span>
                          </div>
                        );

                        const isFinished = match.status === "finished";
                        const isMine = isMyMatch(match);
                        const homeGroup = groupMap.get(match.homeGroupId);
                        const awayGroup = groupMap.get(match.awayGroupId);

                        const bgClass = isFinished
                          ? "bg-gray-100 border-gray-200"
                          : isMine
                            ? "bg-yellow-100 border-yellow-300 ring-1 ring-yellow-300"
                            : match.matchType === "MD"
                              ? "bg-blue-50 border-blue-200"
                              : match.matchType === "WD"
                                ? "bg-pink-50 border-pink-200"
                                : "bg-purple-50 border-purple-200";

                        return (
                          <div key={courtIdx} className="p-1 flex items-center justify-center">
                            <div className={`squircle-xs border px-1 py-0.5 text-center leading-tight ${bgClass} ${isFinished ? "opacity-60" : ""}`}>
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
                              {isMine && !isFinished && (
                                <Star className="w-2 h-2 text-yellow-500 fill-yellow-400 inline-block" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Expanded detail cards */}
                    {isExpanded && (
                      <div className="bg-green-50/50 border-b border-green-100 px-2 py-2 space-y-1.5">
                        {roundMatches.map((match) => {
                          const isFinished = match.status === "finished";
                          const isMine = isMyMatch(match);
                          const colorClass = isFinished
                            ? "bg-white border-gray-200 opacity-70"
                            : isMine
                              ? "bg-yellow-50 border-yellow-300 ring-1 ring-yellow-200"
                              : (MATCH_TYPE_COLORS[match.matchType] || "bg-white border-gray-100");
                          const statusInfo = STATUS_LABELS[match.status] || STATUS_LABELS.pending;
                          const homeGroup = groupMap.get(match.homeGroupId);
                          const awayGroup = groupMap.get(match.awayGroupId);

                          return (
                            <Link key={match.id} href={`/match/${match.id}`} prefetch={false}>
                              <div className={`squircle-lg border p-2.5 ${colorClass} hover:opacity-80 transition-opacity cursor-pointer relative`}>
                                {isMine && !isFinished && (
                                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-400 absolute top-1.5 right-1.5" />
                                )}
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-1 py-0.5 squircle-xs">场地{match.courtNumber}</span>
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
                                <div className="flex justify-between gap-1 mt-0.5">
                                  <div className="text-center flex-1">
                                    {renderPlayerPair(match.homePlayer1Id, match.homePlayer2Id)}
                                  </div>
                                  <div className="text-center flex-1">
                                    {renderPlayerPair(match.awayPlayer1Id, match.awayPlayer2Id)}
                                  </div>
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
          <Card className="border-green-100/80 shadow-sm overflow-hidden hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-green-100 bg-green-50/60">
                      <th className="p-3 text-left font-semibold text-green-800 sticky left-0 bg-green-50/60 z-10">轮次</th>
                      {Array.from({ length: maxCourt }, (_, i) => (
                        <th key={i} className="p-3 text-center font-semibold text-green-800 min-w-[200px]">
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
                        <tr key={roundNum} className="border-b border-gray-100/80 hover:bg-green-50/20">
                          <td className="p-3 sticky left-0 bg-white z-10 font-semibold text-green-700">第{roundNum}轮</td>
                          {Array.from({ length: maxCourt }, (_, courtIdx) => {
                            const match = roundMatches.find((m) => m.courtNumber === courtIdx + 1);
                            if (!match) return <td key={courtIdx} className="p-2 text-center text-gray-300">—</td>;

                            const isFinished = match.status === "finished";
                            const isMine = isMyMatch(match);
                            const colorClass = isFinished
                              ? "bg-gray-50 border-gray-200 opacity-70"
                              : isMine
                                ? "bg-yellow-50/80 border-yellow-300 ring-2 ring-yellow-200"
                                : (MATCH_TYPE_COLORS[match.matchType] || "");
                            const statusInfo = STATUS_LABELS[match.status] || STATUS_LABELS.pending;
                            const homeGroup = groupMap.get(match.homeGroupId);
                            const awayGroup = groupMap.get(match.awayGroupId);

                            return (
                              <td key={courtIdx} className="p-2">
                                <Link href={`/match/${match.id}`} prefetch={false}>
                                  <div className={`squircle-lg border p-3 ${colorClass} hover:opacity-80 transition-opacity cursor-pointer relative`}>
                                    {isMine && !isFinished && (
                                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-400 absolute top-1.5 right-1.5" />
                                    )}
                                    <div className="flex items-center justify-between mb-1.5">
                                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${isFinished ? "text-gray-400 border-gray-300" : ""}`}>
                                        {MATCH_TYPE_LABELS[match.matchType]}
                                      </Badge>
                                      <span className={`text-[10px] ${statusInfo.color}`}>{statusInfo.label}</span>
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
                                    <div className="flex justify-between gap-1">
                                      <div className="text-center flex-1">
                                        {renderPlayerPair(match.homePlayer1Id, match.homePlayer2Id)}
                                      </div>
                                      <div className="text-center flex-1">
                                        {renderPlayerPair(match.awayPlayer1Id, match.awayPlayer2Id)}
                                      </div>
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
        <div className="space-y-3">
          {Array.from({ length: maxRound }, (_, roundIdx) => {
            const roundNum = roundIdx + 1;
            const roundMatches = matches.filter((m) => m.roundNumber === roundNum);

            return (
              <div key={roundNum}>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">第 {roundNum} 轮</h3>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {roundMatches.map((match) => {
                    const homeGroup = groupMap.get(match.homeGroupId);
                    const awayGroup = groupMap.get(match.awayGroupId);
                    const isFinished = match.status === "finished";
                    const isMine = isMyMatch(match);
                    return (
                      <Link key={match.id} href={`/match/${match.id}`} prefetch={false}>
                        <Card className={`${isFinished ? "border-gray-200 opacity-70" : isMine ? "border-yellow-300 ring-2 ring-yellow-200 bg-yellow-50/50" : "border-gray-100"} hover:border-green-300 hover:shadow-md transition-all cursor-pointer`}>
                          <CardContent className="py-3 px-4">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1">
                                {isMine && !isFinished && <Star className="w-3 h-3 text-yellow-500 fill-yellow-400" />}
                                <Badge variant="outline" className={`text-xs ${isFinished ? "text-gray-400 border-gray-300" : ""}`}>
                                  {MATCH_TYPE_LABELS[match.matchType]} · 场地{match.courtNumber}
                                </Badge>
                              </div>
                              <span className={`text-xs ${STATUS_LABELS[match.status]?.color}`}>
                                {STATUS_LABELS[match.status]?.label}
                              </span>
                            </div>
                            <div className="text-center font-medium mb-1">
                              {homeGroup?.icon || "?"}
                              {isFinished && match.games && match.games.length > 0 ? (
                                <span className="mx-2 text-sm font-bold text-gray-600">
                                  {match.games.map((g) => `${g.homeScore}:${g.awayScore}`).join(" / ")}
                                </span>
                              ) : (
                                <span className="text-gray-400 mx-1">vs</span>
                              )}
                              {awayGroup?.icon || "?"}
                            </div>
                            <div className="flex justify-between text-center">
                              <div className="flex-1">
                                {renderPlayerPair(match.homePlayer1Id, match.homePlayer2Id)}
                              </div>
                              <div className="flex-1">
                                {renderPlayerPair(match.awayPlayer1Id, match.awayPlayer2Id)}
                              </div>
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
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-muted-foreground">加载中...</div>}>
      <ScheduleContent />
    </Suspense>
  );
}
