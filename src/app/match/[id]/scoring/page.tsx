"use client";

export const runtime = 'edge';

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CheckCircle, Send } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface ScoreEventItem {
  gameNumber: number;
  eventOrder: number;
  scoringSide: "home" | "away";
  homeScore: number;
  awayScore: number;
  timestamp: string;
}

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

  // Score event tracking (point-by-point log)
  const scoreEventLogRef = useRef<ScoreEventItem[]>([]);

  // Determine scoring rules
  const targetScore = match?.targetScore || 21;
  const bestOf = match?.bestOf || 1;
  const gamesToWin = Math.ceil(bestOf / 2);

  useEffect(() => {
    fetch(`/api/matches/${matchId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data: any) => {
        setMatch(data);

        // If match is finished and has existing scores, pre-fill them
        if (data.status === "finished" && data.games && data.games.length > 0) {
          // Pre-fill admin mode
          const numGames = data.bestOf > 1 ? data.bestOf : 1;
          const prefilled = Array.from({ length: numGames }, (_, i) => {
            const existing = data.games.find((g) => g.gameNumber === i + 1);
            return existing
              ? { homeScore: String(existing.homeScore), awayScore: String(existing.awayScore) }
              : { homeScore: "", awayScore: "" };
          });
          setAdminGames(prefilled);

          // Pre-fill athlete mode
          const athleteGames: GameScore[] = data.games.map((g) => ({
            homeScore: g.homeScore,
            awayScore: g.awayScore,
            winner: g.winner as "home" | "away" | null,
          }));
          setGames(athleteGames);
          setMatchFinished(true);
          setCurrentGame(data.games.length - 1);
        } else {
          // Fresh match
          setGames([{ homeScore: 0, awayScore: 0, winner: null }]);
          const numGames = data.bestOf > 1 ? data.bestOf : 1;
          setAdminGames(
            Array.from({ length: numGames }, () => ({ homeScore: "", awayScore: "" }))
          );
        }

        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [matchId]);

  // === Athlete mode functions ===
  const addPoint = useCallback((side: "home" | "away") => {
    if (matchFinished) return;

    setGames((prev) => {
      const updated = [...prev];
      const game = { ...updated[currentGame] };

      if (side === "home") game.homeScore++;
      else game.awayScore++;

      // Record score event
      const gameEvents = scoreEventLogRef.current.filter(
        (e) => e.gameNumber === currentGame + 1
      );
      scoreEventLogRef.current.push({
        gameNumber: currentGame + 1,
        eventOrder: gameEvents.length + 1,
        scoringSide: side,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        timestamp: new Date().toISOString(),
      });

      // Check if game is won
      if (game.homeScore >= targetScore || game.awayScore >= targetScore) {
        const lead = Math.abs(game.homeScore - game.awayScore);
        const maxScore = Math.max(game.homeScore, game.awayScore);

        let gameWon = false;
        if (targetScore === 21) {
          if (lead >= 2 || maxScore >= 30) gameWon = true;
        } else if (targetScore === 15) {
          if (lead >= 2 || maxScore >= 20) gameWon = true;
        } else {
          if (maxScore >= targetScore) gameWon = true;
        }

        if (gameWon) {
          game.winner = game.homeScore > game.awayScore ? "home" : "away";

          const homeGamesWon = updated.filter((g) => g.winner === "home").length + (game.winner === "home" ? 1 : 0);
          const awayGamesWon = updated.filter((g) => g.winner === "away").length + (game.winner === "away" ? 1 : 0);

          updated[currentGame] = game;

          if (homeGamesWon >= gamesToWin || awayGamesWon >= gamesToWin) {
            setMatchFinished(true);
          } else if (currentGame + 1 < bestOf) {
            updated.push({ homeScore: 0, awayScore: 0, winner: null });
            setTimeout(() => setCurrentGame(currentGame + 1), 500);
          }

          return updated;
        }
      }

      updated[currentGame] = game;
      return updated;
    });
  }, [currentGame, matchFinished, targetScore, bestOf, gamesToWin]);

  const undoPoint = useCallback((side: "home" | "away") => {
    if (matchFinished) return;

    setGames((prev) => {
      const updated = [...prev];
      const game = { ...updated[currentGame] };
      if (side === "home" && game.homeScore > 0) game.homeScore--;
      if (side === "away" && game.awayScore > 0) game.awayScore--;
      updated[currentGame] = game;
      return updated;
    });
  }, [currentGame, matchFinished]);

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

      // Deduplicate score events (React strict mode can cause double-fire)
      let cleanedEvents = scoreEventLogRef.current;
      if (cleanedEvents.length > 0) {
        cleanedEvents = cleanedEvents.filter((evt, i) =>
          i === 0 || evt.homeScore !== cleanedEvents[i - 1].homeScore || evt.awayScore !== cleanedEvents[i - 1].awayScore
        );
        // Re-number eventOrder after dedup
        cleanedEvents = cleanedEvents.map((evt, i) => ({ ...evt, eventOrder: i + 1 }));
      }

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
        const err: any = await res.json();
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
                    type="number"
                    min={0}
                    placeholder="主队得分"
                    value={game.homeScore}
                    onChange={(e) => updateAdminGame(i, "homeScore", e.target.value)}
                    className="text-center font-bold text-lg"
                  />
                </div>
                <span className="text-gray-400 font-bold text-xl mt-5">:</span>
                <div className="flex-1">
                  <div className="text-xs text-center text-gray-400 mb-1">{match.awayGroup.icon} {match.awayGroup.name}</div>
                  <Input
                    type="number"
                    min={0}
                    placeholder="客队得分"
                    value={game.awayScore}
                    onChange={(e) => updateAdminGame(i, "awayScore", e.target.value)}
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
                      disabled={matchFinished || currentGameData.homeScore === 0}
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
                      disabled={matchFinished || currentGameData.awayScore === 0}
                    >
                      撤销
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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

      {/* Referee Buttons */}
      <Card className="border-gray-100 shadow-sm">
        <CardContent className="pt-4 space-y-3">
          <div className="text-sm font-medium">裁判 & 边裁（可选）</div>
          <div className="grid grid-cols-2 gap-3">
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
                  toast.error("你的账号未绑定选手");
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
                  toast.error("你的账号未绑定选手");
                }
              }}
            >
              {lineJudgeId ? `边裁: ${user?.username || "我"}` : "我是边裁"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      {(isAdmin || matchFinished) && (
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
