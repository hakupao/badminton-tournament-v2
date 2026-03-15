"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PenLine, Trophy, Eye, Edit3, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const MATCH_TYPE_LABELS: Record<string, string> = {
  MD: "男双",
  WD: "女双",
  XD: "混双",
};

interface ScoreEventItem {
  gameNumber: number;
  eventOrder: number;
  scoringSide: "home" | "away";
  homeScore: number;
  awayScore: number;
  timestamp: string;
}

interface MatchDetail {
  id: number;
  roundNumber: number;
  courtNumber: number;
  matchType: string;
  status: string;
  winner: string | null;
  homeGroup: { id: number; icon: string; name: string };
  awayGroup: { id: number; icon: string; name: string };
  homePlayers: Array<{ id: number; name: string | null; position: number; boundUsername?: string | null }>;
  awayPlayers: Array<{ id: number; name: string | null; position: number; boundUsername?: string | null }>;
  games: Array<{ gameNumber: number; homeScore: number; awayScore: number; winner: string | null }>;
  referees: Array<{ playerName: string | null; role: string; groupIcon: string; position: number }>;
  scoreEvents?: ScoreEventItem[];
}

function formatPlayerName(player: { name: string | null; position: number; boundUsername?: string | null }, groupIcon: string) {
  const codename = `${groupIcon}${player.position}号`;
  const displayName = player.boundUsername || player.name;
  if (displayName) return `${codename}(${displayName})`;
  return codename;
}

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const matchId = params.id as string;
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    fetch(`/api/matches/${matchId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setMatch(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [matchId]);

  if (loading) return <div className="text-center py-12 text-muted-foreground">加载中...</div>;
  if (!match) return <div className="text-center py-12 text-muted-foreground">比赛不存在</div>;

  const isFinished = match.status === "finished";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" className="gap-1 text-gray-500 -mb-3" onClick={() => router.back()}>
        <ArrowLeft className="w-4 h-4" /> 返回
      </Button>

      {/* Match Header */}
      <Card className="border-green-100 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-teal-500 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline" className="border-white/40 text-white bg-white/10">
              第 {match.roundNumber} 轮 · 场地 {match.courtNumber}
            </Badge>
            <Badge className={isFinished ? "bg-white text-green-700" : match.status === "in_progress" ? "bg-amber-400 text-amber-900" : "bg-white/20 text-white"}>
              {isFinished ? "已完成" : match.status === "in_progress" ? "进行中" : "待开始"}
            </Badge>
          </div>

          <div className="flex items-center justify-center gap-6">
            {/* Home */}
            <div className="text-center flex-1">
              <div className="text-4xl mb-2">{match.homeGroup.icon}</div>
              <div className="font-bold">{match.homeGroup.name}</div>
              <div className="text-sm text-white/70 mt-1">
                {match.homePlayers.map((p) => formatPlayerName(p, match.homeGroup.icon)).join(" + ")}
              </div>
            </div>

            {/* Score */}
            <div className="text-center">
              <Badge variant="outline" className="mb-2 border-white/40 text-white bg-white/10">
                {MATCH_TYPE_LABELS[match.matchType] || match.matchType}
              </Badge>
              {isFinished && match.games.length > 0 ? (
                <div className="space-y-1">
                  {match.games.map((g) => (
                    <div key={g.gameNumber} className="text-2xl font-bold">
                      <span className={match.winner === "home" ? "text-yellow-300" : ""}>{g.homeScore}</span>
                      <span className="text-white/50 mx-2">:</span>
                      <span className={match.winner === "away" ? "text-yellow-300" : ""}>{g.awayScore}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-3xl font-bold text-white/50">vs</div>
              )}
            </div>

            {/* Away */}
            <div className="text-center flex-1">
              <div className="text-4xl mb-2">{match.awayGroup.icon}</div>
              <div className="font-bold">{match.awayGroup.name}</div>
              <div className="text-sm text-white/70 mt-1">
                {match.awayPlayers.map((p) => formatPlayerName(p, match.awayGroup.icon)).join(" + ")}
              </div>
            </div>
          </div>

          {isFinished && match.winner && (
            <div className="text-center mt-4">
              <Badge className="bg-yellow-400 text-yellow-900 font-bold gap-1">
                <Trophy className="w-3.5 h-3.5" />
                {match.winner === "home" ? match.homeGroup.name : match.awayGroup.name} 获胜
              </Badge>
            </div>
          )}
        </div>
      </Card>

      {/* Referees */}
      {match.referees && match.referees.length > 0 && (
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-gray-800 flex items-center gap-2">
              <Eye className="w-4 h-4 text-gray-500" />
              裁判 & 边裁
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {match.referees.map((ref, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {ref.role === "referee" ? "裁判" : "边裁"}
                  </Badge>
                  <span>{ref.groupIcon} {ref.playerName || `${ref.position}号位`}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Score Timeline - BWF standard score sheet format */}
      {match.scoreEvents && match.scoreEvents.length > 0 && (
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-gray-800 flex items-center gap-2">
              <PenLine className="w-4 h-4 text-blue-500" />
              得分路径
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const gameNumbers = [...new Set(match.scoreEvents!.map((e) => e.gameNumber))].sort();
              return gameNumbers.map((gn) => {
                const rawEvents = match.scoreEvents!.filter((e) => e.gameNumber === gn).sort((a, b) => a.eventOrder - b.eventOrder);
                // Deduplicate consecutive events with same scores (caused by React strict mode double-fire)
                const events = rawEvents.filter((evt, i) =>
                  i === 0 || evt.homeScore !== rawEvents[i - 1].homeScore || evt.awayScore !== rawEvents[i - 1].awayScore
                );
                // Find service change points (where scoring side switches)
                const getServiceBreaks = () => {
                  const breaks = new Set<number>();
                  for (let i = 1; i < events.length; i++) {
                    if (events[i].scoringSide !== events[i - 1].scoringSide) {
                      breaks.add(i);
                    }
                  }
                  return breaks;
                };
                const serviceBreaks = getServiceBreaks();

                return (
                  <div key={gn} className="mb-4 last:mb-0">
                    {gameNumbers.length > 1 && (
                      <div className="text-xs font-semibold text-gray-500 mb-2">第 {gn} 局</div>
                    )}
                    <table className="w-full max-w-xs mx-auto border-collapse">
                      <thead>
                        <tr>
                          <th className="w-1/2 text-center text-xs font-bold py-1.5 border-b-2 border-green-400 text-green-700">
                            {match.homeGroup.icon} {match.homeGroup.name}
                          </th>
                          <th className="w-1/2 text-center text-xs font-bold py-1.5 border-b-2 border-teal-400 text-teal-700">
                            {match.awayGroup.icon} {match.awayGroup.name}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {events.map((evt, i) => (
                          <tr
                            key={i}
                            className={serviceBreaks.has(i) ? "border-t border-gray-200" : ""}
                            title={new Date(evt.timestamp).toLocaleTimeString("zh-CN")}
                          >
                            <td className={`text-center py-0.5 font-mono text-sm ${
                              evt.scoringSide === "home" ? "font-bold text-green-700" : "text-transparent select-none"
                            }`}>
                              {evt.scoringSide === "home" ? evt.homeScore : ""}
                            </td>
                            <td className={`text-center py-0.5 font-mono text-sm ${
                              evt.scoringSide === "away" ? "font-bold text-teal-700" : "text-transparent select-none"
                            }`}>
                              {evt.scoringSide === "away" ? evt.awayScore : ""}
                            </td>
                          </tr>
                        ))}
                        {/* Final score row */}
                        {events.length > 0 && (
                          <tr className="border-t-2 border-gray-300">
                            <td className="text-center py-1.5 font-mono text-base font-extrabold text-green-700">
                              {events[events.length - 1].homeScore}
                            </td>
                            <td className="text-center py-1.5 font-mono text-base font-extrabold text-teal-700">
                              {events[events.length - 1].awayScore}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              });
            })()}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {(!isFinished || isAdmin) && (
        <div className="flex gap-3">
          <Link href={`/match/${match.id}/scoring`} className="flex-1">
            <Button className={`w-full gap-2 ${isFinished ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"}`} size="lg">
              {isFinished ? <Edit3 className="w-4 h-4" /> : <PenLine className="w-4 h-4" />}
              {isFinished ? "编辑比分" : "进入记分"}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
