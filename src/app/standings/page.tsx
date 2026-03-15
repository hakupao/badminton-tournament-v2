"use client";

import { Suspense, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTournament } from "@/lib/tournament-context";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Users, User, Award, Handshake } from "lucide-react";

interface GroupStanding {
  groupId: number;
  groupName: string;
  groupIcon: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  netGames: number;
  netPoints: number;
}

interface PlayerStat {
  playerId: number;
  playerName: string | null;
  groupName: string;
  positionNumber: number;
  gender: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  winRate: number;
}

interface CombinationStat {
  player1Id: number;
  player1Name: string | null;
  player1GroupIcon: string;
  player1Position: number;
  player2Id: number;
  player2Name: string | null;
  player2GroupIcon: string;
  player2Position: number;
  wins: number;
  losses: number;
  draws: number;
  matchesPlayed: number;
}

interface RefereeStat {
  playerId: number;
  playerName: string | null;
  refereeCount: number;
  lineJudgeCount: number;
  totalCount: number;
}

interface StatsData {
  groupStandings: GroupStanding[];
  playerStats: PlayerStat[];
  combinationStats: CombinationStat[];
  refereeLeaderboard: RefereeStat[];
}

const RANK_STYLES = ["text-amber-500 font-black", "text-gray-400 font-bold", "text-amber-700 font-bold"];

function RankCell({ index }: { index: number }) {
  if (index < 3) {
    return (
      <span className={`text-lg ${RANK_STYLES[index]}`}>
        {index + 1}
      </span>
    );
  }
  return <span className="text-gray-500 font-medium">{index + 1}</span>;
}

function formatComboName(name: string | null, icon: string, pos: number) {
  return name || `${icon}${pos}号`;
}

function StandingsContent() {
  const { currentId } = useTournament();
  const tournamentId = currentId ? String(currentId) : "1";
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tournaments/${tournamentId}/stats`)
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tournamentId]);

  if (loading) return <div className="text-center py-12 text-muted-foreground">加载中...</div>;

  if (!stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">排名 & 统计</h1>
        <Card className="border-dashed border-border/50">
          <CardContent className="py-12 text-center">
            <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-muted-foreground">暂无数据</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <Trophy className="w-5 h-5 text-green-700" />
        <h1 className="text-2xl font-bold text-green-900">排名 & 统计</h1>
      </div>

      <Tabs defaultValue="group" className="w-full">
        <TabsList className="w-full grid grid-cols-4 bg-green-50/80 h-10">
          <TabsTrigger value="group" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-xs sm:text-sm gap-1">
            <Users className="w-3.5 h-3.5" />
            团体
          </TabsTrigger>
          <TabsTrigger value="player" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-xs sm:text-sm gap-1">
            <User className="w-3.5 h-3.5" />
            个人
          </TabsTrigger>
          <TabsTrigger value="combo" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-xs sm:text-sm gap-1">
            <Handshake className="w-3.5 h-3.5" />
            组合
          </TabsTrigger>
          <TabsTrigger value="referee" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-xs sm:text-sm gap-1">
            <Award className="w-3.5 h-3.5" />
            裁判
          </TabsTrigger>
        </TabsList>

        {/* Group Standings */}
        <TabsContent value="group" className="mt-4">
          <Card className="border-green-100/80 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-green-100 bg-green-50/60">
                      <th className="p-3 text-left font-semibold text-green-800">#</th>
                      <th className="p-3 text-left font-semibold text-green-800">小组</th>
                      <th className="p-3 text-center font-semibold text-green-700">积分</th>
                      <th className="p-3 text-center font-semibold text-green-800">胜</th>
                      <th className="p-3 text-center font-semibold text-green-800">平</th>
                      <th className="p-3 text-center font-semibold text-green-800">负</th>
                      <th className="p-3 text-center font-semibold text-green-800 hidden md:table-cell">净胜场</th>
                      <th className="p-3 text-center font-semibold text-green-800 hidden lg:table-cell">净胜分</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.groupStandings.map((g, idx) => (
                      <tr key={g.groupId} className="border-b border-gray-100/80 hover:bg-green-50/40 transition-colors">
                        <td className="p-3"><RankCell index={idx} /></td>
                        <td className="p-3">
                          <span className="text-lg mr-1.5">{g.groupIcon}</span>
                          <span className="font-medium text-gray-800">{g.groupName}</span>
                        </td>
                        <td className="p-3 text-center font-bold text-green-700">{g.points}</td>
                        <td className="p-3 text-center text-gray-700">{g.wins}</td>
                        <td className="p-3 text-center text-gray-700">{g.draws}</td>
                        <td className="p-3 text-center text-gray-700">{g.losses}</td>
                        <td className="p-3 text-center hidden md:table-cell">
                          <span className={g.netGames > 0 ? "text-green-600 font-medium" : g.netGames < 0 ? "text-red-500" : "text-gray-500"}>
                            {g.netGames > 0 ? "+" : ""}{g.netGames}
                          </span>
                        </td>
                        <td className="p-3 text-center hidden lg:table-cell">
                          <span className={g.netPoints > 0 ? "text-green-600 font-medium" : g.netPoints < 0 ? "text-red-500" : "text-gray-500"}>
                            {g.netPoints > 0 ? "+" : ""}{g.netPoints}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Player Stats */}
        <TabsContent value="player" className="mt-4">
          <Card className="border-green-100/80 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-green-100 bg-green-50/60">
                      <th className="p-3 text-left font-semibold text-green-800">选手</th>
                      <th className="p-3 text-center font-semibold text-green-800">胜</th>
                      <th className="p-3 text-center font-semibold text-green-800">负</th>
                      <th className="p-3 text-center font-semibold text-green-700">胜率</th>
                      <th className="p-3 text-center font-semibold text-green-800 hidden md:table-cell">得分</th>
                      <th className="p-3 text-center font-semibold text-green-800 hidden md:table-cell">失分</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.playerStats
                      .sort((a, b) => b.winRate - a.winRate)
                      .map((p) => (
                        <tr key={p.playerId} className="border-b border-gray-100/80 hover:bg-green-50/40 transition-colors">
                          <td className="p-3">
                            <span className="font-medium text-gray-800">
                              {p.playerName || `${p.groupName?.replace("队", "")}-${p.positionNumber}`}
                            </span>
                            <Badge variant="outline" className={`ml-2 text-[10px] px-1 py-0 ${p.gender === "M" ? "border-blue-300 text-blue-600 bg-blue-50/60" : "border-pink-300 text-pink-600 bg-pink-50/60"}`}>
                              {p.gender === "M" ? "男" : "女"}
                            </Badge>
                          </td>
                          <td className="p-3 text-center text-green-600 font-medium">{p.wins}</td>
                          <td className="p-3 text-center text-red-500">{p.losses}</td>
                          <td className="p-3 text-center font-bold text-green-700">
                            {p.wins + p.losses > 0 ? `${Math.round(p.winRate * 100)}%` : "—"}
                          </td>
                          <td className="p-3 text-center hidden md:table-cell text-gray-700">{p.pointsFor}</td>
                          <td className="p-3 text-center hidden md:table-cell text-gray-700">{p.pointsAgainst}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Combination Stats */}
        <TabsContent value="combo" className="mt-4">
          <Card className="border-green-100/80 shadow-sm overflow-hidden">
            <CardHeader className="bg-green-50/40 pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-green-800">
                <Handshake className="w-4 h-4" />
                搭档组合排名
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-green-100 bg-green-50/60">
                      <th className="p-3 text-left font-semibold text-green-800">#</th>
                      <th className="p-3 text-left font-semibold text-green-800">组合</th>
                      <th className="p-3 text-center font-semibold text-green-800">场次</th>
                      <th className="p-3 text-center font-semibold text-green-800">胜</th>
                      <th className="p-3 text-center font-semibold text-green-800">负</th>
                      <th className="p-3 text-center font-semibold text-green-700">胜率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.combinationStats || [])
                      .sort((a, b) => {
                        const aRate = a.matchesPlayed > 0 ? a.wins / a.matchesPlayed : 0;
                        const bRate = b.matchesPlayed > 0 ? b.wins / b.matchesPlayed : 0;
                        return bRate - aRate || b.wins - a.wins;
                      })
                      .map((c, idx) => {
                        const winRate = c.matchesPlayed > 0 ? Math.round((c.wins / c.matchesPlayed) * 100) : 0;
                        return (
                          <tr key={`${c.player1Id}-${c.player2Id}`} className="border-b border-gray-100/80 hover:bg-green-50/40 transition-colors">
                            <td className="p-3"><RankCell index={idx} /></td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-gray-800">
                                  {formatComboName(c.player1Name, c.player1GroupIcon, c.player1Position)}
                                </span>
                                <span className="text-gray-400">+</span>
                                <span className="font-medium text-gray-800">
                                  {formatComboName(c.player2Name, c.player2GroupIcon, c.player2Position)}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-center text-gray-600">{c.matchesPlayed}</td>
                            <td className="p-3 text-center text-green-600 font-medium">{c.wins}</td>
                            <td className="p-3 text-center text-red-500">{c.losses}</td>
                            <td className="p-3 text-center font-bold text-green-700">
                              {c.matchesPlayed > 0 ? `${winRate}%` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    {(!stats.combinationStats || stats.combinationStats.length === 0) && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-400">
                          暂无组合数据
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Referee Leaderboard */}
        <TabsContent value="referee" className="mt-4">
          <Card className="border-amber-100/80 shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-amber-50/60 to-yellow-50/40">
              <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                <Award className="w-4 h-4" />
                裁判志愿排行榜
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-amber-100 bg-amber-50/40">
                      <th className="p-3 text-left font-semibold text-amber-800">#</th>
                      <th className="p-3 text-left font-semibold text-amber-800">选手</th>
                      <th className="p-3 text-center font-semibold text-amber-800">裁判</th>
                      <th className="p-3 text-center font-semibold text-amber-800">边裁</th>
                      <th className="p-3 text-center font-semibold text-amber-700">总计</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.refereeLeaderboard || [])
                      .sort((a, b) => b.totalCount - a.totalCount)
                      .map((r, idx) => (
                        <tr key={r.playerId} className="border-b border-gray-100/80 hover:bg-amber-50/40 transition-colors">
                          <td className="p-3"><RankCell index={idx} /></td>
                          <td className="p-3">
                            <span className="font-medium text-gray-800">{r.playerName || "未知选手"}</span>
                          </td>
                          <td className="p-3 text-center text-gray-700">{r.refereeCount}</td>
                          <td className="p-3 text-center text-gray-700">{r.lineJudgeCount}</td>
                          <td className="p-3 text-center font-bold text-amber-600">{r.totalCount}</td>
                        </tr>
                      ))}
                    {(!stats.refereeLeaderboard || stats.refereeLeaderboard.length === 0) && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-400">
                          暂无裁判记录
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function StandingsPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-muted-foreground">加载中...</div>}>
      <StandingsContent />
    </Suspense>
  );
}
