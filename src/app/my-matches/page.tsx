"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PositionLabel } from "@/components/player/position-label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { useTournament } from "@/lib/tournament-context";
import { LogIn, UserX, Clock, CheckCircle, Play } from "lucide-react";
import Link from "next/link";
import { ShuttlecockIcon } from "@/components/brand/shuttlecock-icon";

const MATCH_TYPE_LABELS: Record<string, string> = {
  MD: "男双",
  WD: "女双",
  XD: "混双",
};

const MATCH_TYPE_COLORS: Record<string, string> = {
  MD: "bg-blue-50 text-blue-700 border-blue-200",
  WD: "bg-pink-50 text-pink-700 border-pink-200",
  XD: "bg-purple-50 text-purple-700 border-purple-200",
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
  gender: string;
  name: string | null;
}

interface MatchInfo {
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
}

interface TournamentResponse {
  tournament?: {
    name?: string;
  };
  groups?: GroupInfo[];
  players?: PlayerInfo[];
}

interface ScheduleResponse {
  matches?: MatchInfo[];
}

export default function MyMatchesPage() {
  const { user, loading: authLoading } = useAuth();
  const { currentId, loading: tournamentLoading } = useTournament();
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [myPlayer, setMyPlayer] = useState<PlayerInfo | null>(null);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);

  const requestKey = user && currentId ? `${currentId}:${user.id}:${user.playerId ?? "none"}` : null;

  useEffect(() => {
    if (authLoading || tournamentLoading || !user || !currentId || !requestKey) return;

    const currentUser = user;
    let cancelled = false;

    async function loadMatches() {
      try {
        const tournamentId = String(currentId);
        const [tournamentData, scheduleData] = await Promise.all([
          fetch(`/api/tournaments/${tournamentId}`).then((r) => r.json() as Promise<TournamentResponse>),
          fetch(`/api/tournaments/${tournamentId}/schedule`).then((r) => r.json() as Promise<ScheduleResponse>),
        ]);

        if (cancelled) return;

        setGroups(tournamentData.groups || []);
        setPlayers(tournamentData.players || []);
        setMatches(scheduleData.matches || []);

        if (currentUser.playerId) {
          const p = (tournamentData.players || []).find(
            (pl: PlayerInfo) => pl.id === currentUser.playerId
          );
          setMyPlayer(p || null);
        } else {
          setMyPlayer(null);
        }
      } catch {
        if (cancelled) return;

        setGroups([]);
        setPlayers([]);
        setMatches([]);
        setMyPlayer(null);
      } finally {
        if (!cancelled) {
          setLoadedRequestKey(requestKey);
        }
      }
    }

    void loadMatches();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, tournamentLoading, currentId, requestKey]);

  if (authLoading || tournamentLoading || (requestKey !== null && loadedRequestKey !== requestKey)) {
    return <div className="text-center py-12 text-gray-400">加载中...</div>;
  }

  const groupMap = new Map(groups.map((g) => [g.id, g]));
  const playerMap = new Map(players.map((p) => [p.id, p]));

  const myMatches = myPlayer
    ? matches.filter(
        (m) =>
          m.homePlayer1Id === myPlayer.id ||
          m.homePlayer2Id === myPlayer.id ||
          m.awayPlayer1Id === myPlayer.id ||
          m.awayPlayer2Id === myPlayer.id
      )
    : [];

  const pendingMatches = myMatches.filter((m) => m.status === "pending");
  const activeMatches = myMatches.filter((m) => m.status === "in_progress");
  const finishedMatches = myMatches.filter((m) => m.status === "finished");

  const getPartner = (match: MatchInfo): PlayerInfo | undefined => {
    if (!myPlayer) return undefined;
    if (match.homePlayer1Id === myPlayer.id) return playerMap.get(match.homePlayer2Id!) ?? undefined;
    if (match.homePlayer2Id === myPlayer.id) return playerMap.get(match.homePlayer1Id!) ?? undefined;
    if (match.awayPlayer1Id === myPlayer.id) return playerMap.get(match.awayPlayer2Id!) ?? undefined;
    if (match.awayPlayer2Id === myPlayer.id) return playerMap.get(match.awayPlayer1Id!) ?? undefined;
    return undefined;
  };

  const getOpponents = (match: MatchInfo) => {
    if (!myPlayer) return [];
    const isHome =
      match.homePlayer1Id === myPlayer.id || match.homePlayer2Id === myPlayer.id;
    if (isHome) {
      return [
        playerMap.get(match.awayPlayer1Id!),
        playerMap.get(match.awayPlayer2Id!),
      ].filter(Boolean);
    }
    return [
      playerMap.get(match.homePlayer1Id!),
      playerMap.get(match.homePlayer2Id!),
    ].filter(Boolean);
  };

  const getIsHome = (match: MatchInfo) => {
    if (!myPlayer) return true;
    return match.homePlayer1Id === myPlayer.id || match.homePlayer2Id === myPlayer.id;
  };

  const getResult = (match: MatchInfo) => {
    if (match.status !== "finished" || !match.winner) return null;
    const isHome = getIsHome(match);
    if ((isHome && match.winner === "home") || (!isHome && match.winner === "away")) {
      return "win";
    }
    return "loss";
  };

  const formatPlayerName = (p?: PlayerInfo) => {
    if (!p) return "?";
    const group = groupMap.get(p.groupId);
    return p.name || `${group?.icon || ""}${p.positionNumber}号`;
  };

  const renderMatchCard = (match: MatchInfo) => {
    const homeGroup = groupMap.get(match.homeGroupId);
    const awayGroup = groupMap.get(match.awayGroupId);
    const partner = getPartner(match);
    const opponents = getOpponents(match);
    const result = getResult(match);

    return (
      <Link key={match.id} href={`/match/${match.id}`} prefetch={false} className="block">
        <div
          className={`squircle-lg border px-3.5 py-3.5 cursor-pointer transition-all hover:shadow-sm ${
            result === "win"
              ? "border-green-200 bg-green-50/40"
              : result === "loss"
                ? "border-red-200 bg-red-50/40"
                : match.status === "in_progress"
                  ? "border-amber-200 bg-amber-50/40"
                  : "border-gray-100 bg-white"
          }`}
        >
          {/* Row 1: type + meta + status */}
          <div className="flex items-center gap-2">
            <Badge className={`${MATCH_TYPE_COLORS[match.matchType]} border text-[10px] px-1.5 py-0`}>
              {MATCH_TYPE_LABELS[match.matchType]}
            </Badge>
            <span className="text-[11px] text-gray-400">
              第{match.roundNumber}轮 · 场地{match.courtNumber}
            </span>
            <span className="ml-auto text-[11px] font-medium">
              {result === "win" && <span className="text-green-600">胜</span>}
              {result === "loss" && <span className="text-red-500">负</span>}
              {match.status === "in_progress" && <span className="text-amber-600">进行中</span>}
              {match.status === "pending" && <span className="text-gray-400">待开始</span>}
            </span>
          </div>
          {/* Row 2: teams + partner/opponent */}
          <div className="flex items-center mt-2.5 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="text-sm">{homeGroup?.icon}</span>
              <span className="text-[10px] text-gray-300 mx-0.5">vs</span>
              <span className="text-sm">{awayGroup?.icon}</span>
            </span>
            <span className="mx-2 w-px h-3 bg-gray-200" />
            <span>搭档 <span className="font-medium text-gray-700">{formatPlayerName(partner)}</span></span>
            <span className="mx-1.5 text-gray-300">·</span>
            <span>对手 <span className="font-medium text-gray-700">{opponents.map((o) => formatPlayerName(o as PlayerInfo | undefined)).join("+")}</span></span>
          </div>
        </div>
      </Link>
    );
  };

  // Not logged in
  if (!user) {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <ShuttlecockIcon className="w-4.5 h-4.5 text-green-700" />
          <h1 className="text-lg font-bold text-green-900">我的比赛</h1>
        </div>
        <Card className="border-amber-100 bg-amber-50/50 shadow-sm">
          <CardContent className="py-8 text-center">
            <LogIn className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-sm text-gray-700 font-medium">请先登录查看个人赛程</p>
            <Link href="/login">
              <button className="mt-3 px-5 py-1.5 bg-green-600 text-white squircle-sm hover:bg-green-700 text-sm font-medium">
                去登录
              </button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentId) {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <ShuttlecockIcon className="w-4.5 h-4.5 text-green-700" />
          <h1 className="text-lg font-bold text-green-900">我的比赛</h1>
        </div>
        <Card className="border-gray-200 bg-gray-50/60 shadow-sm">
          <CardContent className="py-8 text-center">
            <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">暂无可查看的赛事</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!myPlayer) {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <ShuttlecockIcon className="w-4.5 h-4.5 text-green-700" />
          <h1 className="text-lg font-bold text-green-900">我的比赛</h1>
        </div>
        <Card className="border-amber-100 bg-amber-50/50 shadow-sm">
          <CardContent className="py-6 text-center">
            <UserX className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-sm text-gray-700 font-medium">账号尚未绑定选手</p>
            <p className="text-xs text-gray-500 mt-1">请联系管理员绑定参赛位置</p>
          </CardContent>
        </Card>

        {matches.length > 0 && (
          <Link href="/schedule">
            <button className="px-4 py-1.5 bg-green-600 text-white squircle-sm hover:bg-green-700 text-sm font-medium">
              查看完整赛程
            </button>
          </Link>
        )}
      </div>
    );
  }

  // Player found - show personal view
  const myGroup = groupMap.get(myPlayer.groupId);
  const wins = finishedMatches.filter((m) => getResult(m) === "win").length;
  const losses = finishedMatches.filter((m) => getResult(m) === "loss").length;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Player Header */}
      <Card className="border-green-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-teal-500 px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{myGroup?.icon || ""}</div>
              <div>
                <h1 className="text-lg font-bold">
                  {myPlayer.name || `${myGroup?.icon}${myPlayer.positionNumber}号位`}
                </h1>
                <div className="flex items-center gap-1.5 text-white/75 text-xs">
                  <span>{myGroup?.name}</span>
                  <span>·</span>
                  <PositionLabel
                    gender={myPlayer.gender === "M" ? "M" : "F"}
                    positionNumber={myPlayer.positionNumber}
                    suffix="号位"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-5 text-center">
              <div>
                <div className="text-xl font-bold">{myMatches.length}</div>
                <div className="text-[10px] text-white/60">场次</div>
              </div>
              <div>
                <div className="text-xl font-bold text-green-200">{wins}</div>
                <div className="text-[10px] text-white/60">胜</div>
              </div>
              <div>
                <div className="text-xl font-bold text-red-200">{losses}</div>
                <div className="text-[10px] text-white/60">负</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Match Tabs */}
      <Tabs defaultValue={activeMatches.length > 0 ? "active" : "upcoming"} className="w-full">
        <TabsList className="w-full grid grid-cols-3 bg-green-50/80">
          <TabsTrigger
            value="upcoming"
            className="data-[state=active]:bg-green-600 data-[state=active]:text-white gap-1"
          >
            <Clock className="w-3.5 h-3.5" />
            待开始 ({pendingMatches.length})
          </TabsTrigger>
          <TabsTrigger
            value="active"
            className="data-[state=active]:bg-amber-500 data-[state=active]:text-white gap-1"
          >
            <Play className="w-3.5 h-3.5" />
            进行中 ({activeMatches.length})
          </TabsTrigger>
          <TabsTrigger
            value="finished"
            className="data-[state=active]:bg-gray-600 data-[state=active]:text-white gap-1"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            已完成 ({finishedMatches.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          {pendingMatches.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-2.5">
            {pendingMatches
              .sort((a, b) => a.roundNumber - b.roundNumber)
              .map(renderMatchCard)}
            </div>
          ) : (
            <Card className="border-gray-100">
              <CardContent className="py-8 text-center text-gray-400">
                没有待开始的比赛
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          {activeMatches.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-2.5">
            {activeMatches.map(renderMatchCard)}
            </div>
          ) : (
            <Card className="border-gray-100">
              <CardContent className="py-8 text-center text-gray-400">
                没有进行中的比赛
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="finished" className="mt-4">
          {finishedMatches.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-2.5">
            {finishedMatches
              .sort((a, b) => b.roundNumber - a.roundNumber)
              .map(renderMatchCard)}
            </div>
          ) : (
            <Card className="border-gray-100">
              <CardContent className="py-8 text-center text-gray-400">
                还没有已完成的比赛
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
