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
  const { currentId } = useTournament();
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [myPlayer, setMyPlayer] = useState<PlayerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tournamentName, setTournamentName] = useState("");

  useEffect(() => {
    if (authLoading || !currentId) return;

    const tournamentId = String(currentId);
    Promise.all([
      fetch(`/api/tournaments/${tournamentId}`).then((r) => r.json() as Promise<TournamentResponse>),
      fetch(`/api/tournaments/${tournamentId}/schedule`).then((r) => r.json() as Promise<ScheduleResponse>),
    ])
      .then(([tournamentData, scheduleData]) => {
        setTournamentName(tournamentData.tournament?.name || "");
        setGroups(tournamentData.groups || []);
        setPlayers(tournamentData.players || []);
        setMatches(scheduleData.matches || []);

        if (user?.playerId) {
          const p = (tournamentData.players || []).find(
            (pl: PlayerInfo) => pl.id === user.playerId
          );
          setMyPlayer(p || null);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user, authLoading, currentId]);

  if (authLoading || loading) {
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
      <Link key={match.id} href={`/match/${match.id}`}>
        <Card
          className={`border shadow-sm cursor-pointer transition-all hover:shadow-md ${
            result === "win"
              ? "border-green-200 bg-green-50/30"
              : result === "loss"
                ? "border-red-200 bg-red-50/30"
                : match.status === "in_progress"
                  ? "border-amber-200 bg-amber-50/30"
                  : "border-gray-100"
          }`}
        >
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge className={`${MATCH_TYPE_COLORS[match.matchType]} border text-xs`}>
                  {MATCH_TYPE_LABELS[match.matchType]}
                </Badge>
                <span className="text-xs text-gray-400">
                  R{match.roundNumber} · 场地{match.courtNumber}
                </span>
              </div>
              {result === "win" && (
                <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">胜</Badge>
              )}
              {result === "loss" && (
                <Badge className="bg-red-100 text-red-600 border-red-200 text-xs">负</Badge>
              )}
              {match.status === "in_progress" && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">进行中</Badge>
              )}
              {match.status === "pending" && (
                <Badge variant="outline" className="text-xs text-gray-400">待开始</Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-gray-500">搭档：</span>
                <span className="font-medium text-gray-800">{formatPlayerName(partner)}</span>
              </div>
              <div className="text-center text-lg">
                {homeGroup?.icon} vs {awayGroup?.icon}
              </div>
              <div className="text-sm text-right">
                <span className="text-gray-500">对手：</span>
                <span className="font-medium text-gray-800">
                  {opponents.map((o) => formatPlayerName(o as PlayerInfo | undefined)).join(" + ")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  // Not logged in
  if (!user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2.5">
          <ShuttlecockIcon className="w-5 h-5 text-green-700" />
          <h1 className="text-2xl font-bold text-green-900">我的比赛</h1>
        </div>
        <Card className="border-amber-100 bg-amber-50/50 shadow-sm">
          <CardContent className="py-8 text-center">
            <LogIn className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">请先登录</p>
            <p className="text-sm text-gray-500 mt-1">登录运动员账号后可查看个人赛程</p>
            <Link href="/login">
              <button className="mt-4 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium">
                去登录
              </button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!myPlayer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2.5">
          <ShuttlecockIcon className="w-5 h-5 text-green-700" />
          <h1 className="text-2xl font-bold text-green-900">我的比赛</h1>
        </div>
        <Card className="border-amber-100 bg-amber-50/50 shadow-sm">
          <CardContent className="py-6 text-center">
            <UserX className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">账号尚未绑定选手</p>
            <p className="text-sm text-gray-500 mt-1">
              请联系管理员将你的账号与参赛位置绑定
            </p>
            {tournamentName && (
              <p className="text-xs text-gray-400 mt-2">当前赛事：{tournamentName}</p>
            )}
          </CardContent>
        </Card>

        {matches.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-700 mb-3">完整赛程参考</h2>
            <p className="text-sm text-gray-500 mb-3">
              你可以浏览所有比赛，绑定选手后将在这里看到你的专属视图
            </p>
            <Link href="/schedule">
              <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium">
                查看完整赛程
              </button>
            </Link>
          </div>
        )}
      </div>
    );
  }

  // Player found - show personal view
  const myGroup = groupMap.get(myPlayer.groupId);
  const wins = finishedMatches.filter((m) => getResult(m) === "win").length;
  const losses = finishedMatches.filter((m) => getResult(m) === "loss").length;

  return (
    <div className="space-y-6">
      {/* Player Header */}
      <Card className="border-green-100 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-teal-500 p-5 text-white">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{myGroup?.icon || ""}</div>
            <div>
              <h1 className="text-xl font-bold">
                {myPlayer.name || `${myGroup?.icon}${myPlayer.positionNumber}号位`}
              </h1>
              <div className="flex items-center gap-2 mt-1 text-white/80 text-sm">
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
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{myMatches.length}</div>
              <div className="text-xs text-white/70">总场次</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-200">{wins}</div>
              <div className="text-xs text-white/70">胜利</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-200">{losses}</div>
              <div className="text-xs text-white/70">失利</div>
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

        <TabsContent value="upcoming" className="mt-4 space-y-2">
          {pendingMatches.length > 0 ? (
            pendingMatches
              .sort((a, b) => a.roundNumber - b.roundNumber)
              .map(renderMatchCard)
          ) : (
            <Card className="border-gray-100">
              <CardContent className="py-8 text-center text-gray-400">
                没有待开始的比赛
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="active" className="mt-4 space-y-2">
          {activeMatches.length > 0 ? (
            activeMatches.map(renderMatchCard)
          ) : (
            <Card className="border-gray-100">
              <CardContent className="py-8 text-center text-gray-400">
                没有进行中的比赛
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="finished" className="mt-4 space-y-2">
          {finishedMatches.length > 0 ? (
            finishedMatches
              .sort((a, b) => b.roundNumber - a.roundNumber)
              .map(renderMatchCard)
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
