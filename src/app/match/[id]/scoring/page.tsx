"use client";

export const runtime = 'edge';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CheckCircle, Send } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  normalizeScoreTimelineEvents,
  ScoreTimelineCard,
  type ScoreTimelineEvent,
} from "@/components/match/score-timeline-card";
import { sanitizeIntegerInput } from "@/lib/utils";

const MATCH_TYPE_LABELS: Record<string, string> = {
  MD: "男双",
  WD: "女双",
  XD: "混双",
};

interface MatchData {
  id: number;
  tournamentId: number;
  matchType: string;
  roundNumber: number;
  courtNumber: number;
  status: string;
  scoringMode: string;
  targetScore: number;
  bestOf: number;
  homeGroup: { icon: string; name: string };
  awayGroup: { icon: string; name: string };
  homePlayers: Array<{ id: number; name: string | null; position: number; boundUsername?: string | null }>;
  awayPlayers: Array<{ id: number; name: string | null; position: number; boundUsername?: string | null }>;
  allPlayers: Array<{ id: number; name: string | null; groupIcon: string; position: number; boundUsername?: string | null }>;
  games: Array<{ gameNumber: number; homeScore: number; awayScore: number; winner: string | null }>;
  scoreEvents?: ScoreTimelineEvent[];
}

interface GameScore {
  homeScore: number;
  awayScore: number;
  winner: "home" | "away" | null;
}

interface AdminGameInput {
  homeScore: string;
  awayScore: string;
}

interface ScoreApiError {
  error?: string;
}

export default function ScoringPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const matchId = params.id as string;
  const isAdmin = user?.role === "admin";

  const [match, setMatch] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);

  // Athlete mode state
  const [games, setGames] = useState<GameScore[]>([{ homeScore: 0, awayScore: 0, winner: null }]);
  const [currentGame, setCurrentGame] = useState(0);
  const [matchFinished, setMatchFinished] = useState(false);

  // Admin mode state
  const [adminGames, setAdminGames] = useState<AdminGameInput[]>([{ homeScore: "", awayScore: "" }]);

  const [refereeId, setRefereeId] = useState<string>("");
  const [lineJudgeId, setLineJudgeId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [scoreEvents, setScoreEvents] = useState<ScoreTimelineEvent[]>([]);

  // Determine scoring rules
  const targetScore = match?.targetScore || 21;
  const bestOf = match?.bestOf || 1;
  const gamesToWin = Math.ceil(bestOf / 2);

  const isGameWon = (homeScore: number, awayScore: number) => {
    if (homeScore < targetScore && awayScore < targetScore) return false;

    const lead = Math.abs(homeScore - awayScore);
    const maxScore = Math.max(homeScore, awayScore);

    if (targetScore === 21) {
      return lead >= 2 || maxScore >= 30;
    }

    if (targetScore === 15) {
      return lead >= 2 || maxScore >= 20;
    }

    return maxScore >= targetScore;
  };

  useEffect(() => {
    fetch(`/api/matches/${matchId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json() as Promise<MatchData>;
      })
      .then((data) => {
        setMatch(data);
        setScoreEvents(normalizeScoreTimelineEvents(data.scoreEvents || []));

        const numGames = data.bestOf > 1 ? data.bestOf : 1;
        const prefilled = Array.from({ length: numGames }, (_, i) => {
          const existing = data.games.find((g) => g.gameNumber === i + 1);
          return existing
            ? { homeScore: String(existing.homeScore), awayScore: String(existing.awayScore) }
            : { homeScore: "", awayScore: "" };
        });
        setAdminGames(prefilled);

        if (data.games && data.games.length > 0) {
          const athleteGames: GameScore[] = data.games.map((g) => ({
            homeScore: g.homeScore,
            awayScore: g.awayScore,
            winner: g.winner as "home" | "away" | null,
          }));
          setGames(athleteGames);
          setMatchFinished(data.status === "finished");
          setCurrentGame(Math.max(data.games.length - 1, 0));
        } else {
          setGames([{ homeScore: 0, awayScore: 0, winner: null }]);
          setMatchFinished(false);
          setCurrentGame(0);
        }

        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [matchId]);

  // === Athlete mode functions ===
  const addPoint = (side: "home" | "away") => {
    if (matchFinished) return;
    const game = games[currentGame];
    if (!game || game.winner) return;

    const nextGame = { ...game };
    if (side === "home") nextGame.homeScore++;
    else nextGame.awayScore++;

    const updatedGames = [...games];
    updatedGames[currentGame] = nextGame;

    const updatedEvents = normalizeScoreTimelineEvents([
      ...scoreEvents,
      {
        gameNumber: currentGame + 1,
        eventOrder: scoreEvents.filter((evt) => evt.gameNumber === currentGame + 1).length + 1,
        scoringSide: side,
        homeScore: nextGame.homeScore,
        awayScore: nextGame.awayScore,
        timestamp: new Date().toISOString(),
      },
    ]);

    if (isGameWon(nextGame.homeScore, nextGame.awayScore)) {
      nextGame.winner = nextGame.homeScore > nextGame.awayScore ? "home" : "away";
      updatedGames[currentGame] = nextGame;

      const homeGamesWon = updatedGames.filter((g) => g.winner === "home").length;
      const awayGamesWon = updatedGames.filter((g) => g.winner === "away").length;

      if (homeGamesWon >= gamesToWin || awayGamesWon >= gamesToWin) {
        setMatchFinished(true);
      } else if (currentGame + 1 < bestOf && updatedGames.length === currentGame + 1) {
        updatedGames.push({ homeScore: 0, awayScore: 0, winner: null });
        setTimeout(() => setCurrentGame(currentGame + 1), 350);
      }
    }

    setGames(updatedGames);
    setScoreEvents(updatedEvents);
  };

  const undoPoint = (side: "home" | "away") => {
    let lastEventIndex = -1;
    for (let i = scoreEvents.length - 1; i >= 0; i--) {
      if (scoreEvents[i].gameNumber === currentGame + 1) {
        lastEventIndex = i;
        break;
      }
    }

    if (lastEventIndex === -1) return;

    const lastEvent = scoreEvents[lastEventIndex];
    if (lastEvent.scoringSide !== side) return;

    const game = games[currentGame];
    if (!game) return;

    const updatedGames = [...games];
    updatedGames[currentGame] = {
      ...game,
      homeScore: Math.max(0, game.homeScore - (side === "home" ? 1 : 0)),
      awayScore: Math.max(0, game.awayScore - (side === "away" ? 1 : 0)),
      winner: null,
    };

    setGames(updatedGames);
    setScoreEvents(
      normalizeScoreTimelineEvents(scoreEvents.filter((_, index) => index !== lastEventIndex))
    );
    setMatchFinished(false);
  };

  // === Admin mode functions ===
  const updateAdminGame = (index: number, field: "homeScore" | "awayScore", value: string) => {
    setAdminGames((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // === Submit ===
  const submitScore = async () => {
    if (!match) return;
    setSubmitting(true);

    try {
      let gamesToSubmit: Array<{ homeScore: number; awayScore: number }>;

      if (isAdmin) {
        // Admin mode: validate direct input
        const validGames = adminGames.filter(
          (g) => g.homeScore !== "" && g.awayScore !== ""
        );

        if (validGames.length === 0) {
          toast.error("请至少填写一局比分");
          setSubmitting(false);
          return;
        }

        for (const g of validGames) {
          const h = parseInt(g.homeScore, 10);
          const a = parseInt(g.awayScore, 10);
          if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
            toast.error("比分必须为非负整数");
            setSubmitting(false);
            return;
          }
          if (h === a) {
            toast.error("比分不能相同（需要决出胜负）");
            setSubmitting(false);
            return;
          }
        }

        gamesToSubmit = validGames.map((g) => ({
          homeScore: parseInt(g.homeScore, 10),
          awayScore: parseInt(g.awayScore, 10),
        }));
      } else {
        // Athlete mode: use +1 scored games
        gamesToSubmit = games
          .filter((g) => g.winner !== null)
          .map((g) => ({
            homeScore: g.homeScore,
            awayScore: g.awayScore,
          }));

        if (gamesToSubmit.length === 0) {
          toast.error("比赛尚未结束");
          setSubmitting(false);
          return;
        }
      }

      const cleanedEvents = normalizeScoreTimelineEvents(scoreEvents);

      const res = await fetch(`/api/tournaments/${match.tournamentId}/matches/${match.id}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          games: gamesToSubmit,
          refereePlayerId: refereeId ? Number(refereeId) : undefined,
          lineJudgePlayerId: lineJudgeId ? Number(lineJudgeId) : undefined,
          scoreEventLog: !isAdmin ? cleanedEvents : undefined,
        }),
      });

      if (res.ok) {
        toast.success("比分已保存！");
        router.push(`/match/${match.id}`);
      } else {
        const err = await res.json() as ScoreApiError;
        toast.error(err.error || "保存失败");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">加载中...</div>;
  if (!match) return <div className="text-center py-12 text-muted-foreground">比赛不存在</div>;

  const currentGameData = games[currentGame];
  const isEditingFinished = match.status === "finished";
  const canSubmit = isAdmin || (!isEditingFinished && matchFinished);
  const currentGameEvents = scoreEvents.filter((evt) => evt.gameNumber === currentGame + 1);
  const lastScoringSide = currentGameEvents[currentGameEvents.length - 1]?.scoringSide;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Match Info */}
      <div className="text-center">
        <Badge variant="outline" className="mb-2">
          R{match.roundNumber} · 场地{match.courtNumber} · {MATCH_TYPE_LABELS[match.matchType]}
        </Badge>
        {isAdmin && (
          <Badge className="ml-2 bg-amber-100 text-amber-700 text-xs">管理员模式</Badge>
        )}
        {isEditingFinished && (
          <Badge className="ml-2 bg-rose-100 text-rose-700 text-xs">编辑已完成比赛</Badge>
        )}
        <div className="flex items-center justify-center gap-4 text-lg font-medium mt-2">
          <span>{match.homeGroup.icon} {match.homeGroup.name}</span>
          <span className="text-muted-foreground">vs</span>
          <span>{match.awayGroup.icon} {match.awayGroup.name}</span>
        </div>
      </div>

      {/* Referee Buttons */}
      <Card className="border-gray-100 shadow-sm">
        <CardContent className="pt-4 space-y-3">
          <div className="text-sm font-medium">裁判 & 边裁（可选）</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              variant={refereeId ? "default" : "outline"}
              className={refereeId
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : "border-indigo-200 text-indigo-600 hover:bg-indigo-50"}
              onClick={() => {
                if (refereeId) {
                  setRefereeId("");
                } else if (user?.playerId) {
                  setRefereeId(String(user.playerId));
                } else {
                  toast.error("登录并绑定选手后才可登记裁判身份");
                }
              }}
            >
              {refereeId ? `主裁: ${user?.username || "我"}` : "我是主裁"}
            </Button>
            <Button
              variant={lineJudgeId ? "default" : "outline"}
              className={lineJudgeId
                ? "bg-teal-600 hover:bg-teal-700 text-white"
                : "border-teal-200 text-teal-600 hover:bg-teal-50"}
              onClick={() => {
                if (lineJudgeId) {
                  setLineJudgeId("");
                } else if (user?.playerId) {
                  setLineJudgeId(String(user.playerId));
                } else {
                  toast.error("登录并绑定选手后才可登记裁判身份");
                }
              }}
            >
              {lineJudgeId ? `边裁: ${user?.username || "我"}` : "我是边裁"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Admin Mode: Direct Score Input */}
      {isAdmin ? (
        <Card className="border-amber-100 shadow-lg">
          <CardContent className="pt-5 space-y-4">
            <div className="text-sm font-medium text-gray-700">
              {isEditingFinished ? "编辑比分" : "直接输入比分"}
            </div>
            {adminGames.map((game, i) => (
              <div key={i} className="flex items-center gap-3">
                {adminGames.length > 1 && (
                  <span className="text-xs text-muted-foreground w-14 shrink-0">第{i + 1}局</span>
                )}
                <div className="flex-1">
                  <div className="text-xs text-center text-gray-400 mb-1">{match.homeGroup.icon} {match.homeGroup.name}</div>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="主队得分"
                    value={game.homeScore}
                    onChange={(e) => updateAdminGame(i, "homeScore", sanitizeIntegerInput(e.target.value))}
                    className="text-center font-bold text-lg"
                  />
                </div>
                <span className="text-gray-400 font-bold text-xl mt-5">:</span>
                <div className="flex-1">
                  <div className="text-xs text-center text-gray-400 mb-1">{match.awayGroup.icon} {match.awayGroup.name}</div>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="客队得分"
                    value={game.awayScore}
                    onChange={(e) => updateAdminGame(i, "awayScore", sanitizeIntegerInput(e.target.value))}
                    className="text-center font-bold text-lg"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Athlete Mode: Game tabs (for best of 3) */}
          {bestOf > 1 && (
            <div className="flex justify-center gap-2">
              {games.map((g, i) => (
                <Badge
                  key={i}
                  variant={i === currentGame ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => !g.winner && setCurrentGame(i)}
                >
                  第{i + 1}局
                  {g.winner && ` ${g.homeScore}:${g.awayScore}`}
                </Badge>
              ))}
            </div>
          )}

          {/* Athlete Mode: +1 Scoring Interface */}
          <Card className="border-green-100 shadow-lg overflow-hidden">
            <CardContent className="p-0">
              <div className="grid grid-cols-2 divide-x divide-gray-100">
                {/* Home Score */}
                <div className="p-6 text-center bg-gradient-to-b from-green-50/50 to-white">
                  <div className="text-sm text-gray-600 font-medium mb-2">{match.homeGroup.icon} {match.homeGroup.name}</div>
                  <div className="text-6xl font-bold text-green-600 my-6 tabular-nums">
                    {currentGameData.homeScore}
                  </div>
                  <div className="space-y-2">
                    <Button
                      size="lg"
                      className="w-full h-16 text-2xl bg-green-600 hover:bg-green-700 active:scale-95 transition-transform shadow-md"
                      onClick={() => addPoint("home")}
                      disabled={matchFinished || currentGameData.winner !== null}
                    >
                      +1
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-gray-400 hover:text-gray-600"
                      onClick={() => undoPoint("home")}
                      disabled={currentGameData.homeScore === 0 || lastScoringSide !== "home"}
                    >
                      撤销
                    </Button>
                  </div>
                </div>

                {/* Away Score */}
                <div className="p-6 text-center bg-gradient-to-b from-teal-50/50 to-white">
                  <div className="text-sm text-gray-600 font-medium mb-2">{match.awayGroup.icon} {match.awayGroup.name}</div>
                  <div className="text-6xl font-bold text-teal-600 my-6 tabular-nums">
                    {currentGameData.awayScore}
                  </div>
                  <div className="space-y-2">
                    <Button
                      size="lg"
                      className="w-full h-16 text-2xl bg-teal-600 hover:bg-teal-700 active:scale-95 transition-transform shadow-md"
                      onClick={() => addPoint("away")}
                      disabled={matchFinished || currentGameData.winner !== null}
                    >
                      +1
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-gray-400 hover:text-gray-600"
                      onClick={() => undoPoint("away")}
                      disabled={currentGameData.awayScore === 0 || lastScoringSide !== "away"}
                    >
                      撤销
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <ScoreTimelineCard
            homeGroup={match.homeGroup}
            awayGroup={match.awayGroup}
            events={scoreEvents}
            live
            emptyMessage="开始记分后，这里会实时显示得分路径。"
          />

          {/* Match Result */}
          {matchFinished && (
            <Card className="border-green-200 bg-green-50 shadow-md">
              <CardContent className="py-4 text-center">
                <div className="text-lg font-bold text-green-700 mb-2 flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  比赛结束！
                </div>
                <div className="text-sm text-gray-600">
                  {games.filter((g) => g.winner !== null).map((g, i) => (
                    <span key={i}>
                      {i > 0 && " / "}
                      {g.homeScore}:{g.awayScore}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!isAdmin && isEditingFinished && (
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="py-4 text-center text-sm text-gray-500">
            这场比赛的比分已经提交。匿名用户和普通用户都不能修改已提交结果，只有管理员可以编辑。
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      {canSubmit && (
        <Button
          className={`w-full ${isEditingFinished ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
          size="lg"
          onClick={submitScore}
          disabled={submitting}
        >
          <Send className="w-4 h-4 mr-1" />
          {submitting ? "提交中..." : isEditingFinished ? "更新比分" : "提交比分"}
        </Button>
      )}
    </div>
  );
}
