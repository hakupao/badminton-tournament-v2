"use client";

import { Suspense, useEffect, useRef, useState, type CSSProperties } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useTournament } from "@/lib/tournament-context";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Trophy, Users, User, Award, Handshake, MapPin } from "lucide-react";

interface GroupStanding {
  groupId: number;
  groupName: string;
  groupIcon: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  netGames: number;
  pointsFor: number;
  pointsAgainst: number;
  netPoints: number;
}

interface PlayerStat {
  playerId: number;
  playerName: string | null;
  groupName: string;
  groupIcon: string;
  positionNumber: number;
  gender: string;
  wins: number;
  losses: number;
  netGames: number;
  pointsFor: number;
  pointsAgainst: number;
  netPoints: number;
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
  netGames: number;
  pointsFor: number;
  pointsAgainst: number;
  netPoints: number;
}

interface PositionStat {
  groupId: number;
  groupName: string;
  groupIcon: string;
  positionNumber: number;
  gender: string;
  players: { id: number; name: string | null; slotIndex: number }[];
  wins: number;
  losses: number;
  draws: number;
  matchesPlayed: number;
  netGames: number;
  pointsFor: number;
  pointsAgainst: number;
  netPoints: number;
  winRate: number;
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
  positionStats: PositionStat[];
  combinationStats: CombinationStat[];
  refereeLeaderboard: RefereeStat[];
}

type StandingsTab = "group" | "combo" | "player" | "position" | "referee";
const REFEREE_LONG_PRESS_MS = 1000;
const EASTER_PARTICLES = [
  { symbol: "🎉", tx: "-280px", ty: "-160px", rotate: "-52deg", scale: "1.4", delay: "80ms" },
  { symbol: "✦", tx: "-210px", ty: "-220px", rotate: "-30deg", scale: "1.1", delay: "120ms" },
  { symbol: "❀", tx: "-120px", ty: "-250px", rotate: "-18deg", scale: "1.25", delay: "160ms" },
  { symbol: "✿", tx: "-30px", ty: "-270px", rotate: "8deg", scale: "1.2", delay: "200ms" },
  { symbol: "🎊", tx: "80px", ty: "-260px", rotate: "22deg", scale: "1.35", delay: "240ms" },
  { symbol: "✦", tx: "170px", ty: "-220px", rotate: "34deg", scale: "1.1", delay: "280ms" },
  { symbol: "❀", tx: "260px", ty: "-140px", rotate: "48deg", scale: "1.2", delay: "320ms" },
  { symbol: "✿", tx: "280px", ty: "-20px", rotate: "62deg", scale: "1.15", delay: "360ms" },
  { symbol: "🎉", tx: "240px", ty: "100px", rotate: "44deg", scale: "1.35", delay: "400ms" },
  { symbol: "✦", tx: "160px", ty: "180px", rotate: "28deg", scale: "1.05", delay: "440ms" },
  { symbol: "❀", tx: "50px", ty: "220px", rotate: "18deg", scale: "1.15", delay: "480ms" },
  { symbol: "✿", tx: "-56px", ty: "240px", rotate: "-16deg", scale: "1.2", delay: "520ms" },
  { symbol: "🎊", tx: "-160px", ty: "200px", rotate: "-28deg", scale: "1.3", delay: "560ms" },
  { symbol: "✦", tx: "-250px", ty: "120px", rotate: "-44deg", scale: "1.05", delay: "600ms" },
  { symbol: "❀", tx: "-290px", ty: "10px", rotate: "-58deg", scale: "1.2", delay: "640ms" },
  { symbol: "✿", tx: "-240px", ty: "-80px", rotate: "-40deg", scale: "1.15", delay: "680ms" },
];
const EASTER_RIBBONS = [
  { left: "5%", drift: "-60px", rotation: "-18deg", duration: "2200ms", delay: "100ms", color: "#22c55e" },
  { left: "12%", drift: "54px", rotation: "16deg", duration: "2400ms", delay: "250ms", color: "#f59e0b" },
  { left: "20%", drift: "-42px", rotation: "-12deg", duration: "2600ms", delay: "380ms", color: "#0ea5e9" },
  { left: "29%", drift: "64px", rotation: "20deg", duration: "2350ms", delay: "180ms", color: "#ef4444" },
  { left: "38%", drift: "-36px", rotation: "-15deg", duration: "2500ms", delay: "320ms", color: "#a855f7" },
  { left: "47%", drift: "48px", rotation: "12deg", duration: "2700ms", delay: "220ms", color: "#14b8a6" },
  { left: "56%", drift: "-52px", rotation: "-20deg", duration: "2300ms", delay: "440ms", color: "#fb7185" },
  { left: "65%", drift: "44px", rotation: "14deg", duration: "2550ms", delay: "160ms", color: "#84cc16" },
  { left: "74%", drift: "-34px", rotation: "-14deg", duration: "2450ms", delay: "360ms", color: "#f97316" },
  { left: "83%", drift: "58px", rotation: "19deg", duration: "2650ms", delay: "280ms", color: "#38bdf8" },
  { left: "91%", drift: "-46px", rotation: "-17deg", duration: "2200ms", delay: "500ms", color: "#f43f5e" },
];

async function fetchJson<T>(input: RequestInfo | URL): Promise<T> {
  const response = await fetch(input);
  if (!response.ok) {
    throw new Error("Failed to fetch data");
  }
  return response.json() as Promise<T>;
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

function formatPlayerName(player: PlayerStat) {
  return player.playerName || `${player.groupIcon}${player.positionNumber}号`;
}

function formatSignedStat(value: number) {
  return `${value > 0 ? "+" : ""}${value}`;
}

function StandingsContent() {
  const { currentId, loading: tournamentLoading } = useTournament();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loadedTournamentId, setLoadedTournamentId] = useState<number | null>(null);
  const [showRefereeTab, setShowRefereeTab] = useState(false);
  const [activeTab, setActiveTab] = useState<StandingsTab>("group");
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<"open" | "close">("open");
  const [effectBurstId, setEffectBurstId] = useState(0);
  const [pressing, setPressing] = useState(false);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);

  const clearLongPressTimer = () => {
    if (typeof window !== "undefined" && longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const clearFeedbackTimer = () => {
    if (typeof window !== "undefined" && feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  };

  useEffect(() => () => {
    clearLongPressTimer();
    clearFeedbackTimer();
  }, []);

  const triggerHiddenTabFeedback = (next: boolean) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(next ? [20, 30, 15, 25, 10] : [12, 20, 10]);
    }

    if (pageRef.current && typeof pageRef.current.animate === "function") {
      pageRef.current.animate(
        [
          { transform: "translate3d(0, 0, 0) rotate(0deg)", offset: 0 },
          { transform: "translate3d(-6px, 3px, 0) rotate(-0.3deg)", offset: 0.15 },
          { transform: "translate3d(6px, -2px, 0) rotate(0.25deg)", offset: 0.3 },
          { transform: "translate3d(-4px, 2px, 0) rotate(-0.15deg)", offset: 0.5 },
          { transform: "translate3d(3px, -1px, 0) rotate(0.1deg)", offset: 0.7 },
          { transform: "translate3d(-1px, 0, 0) rotate(-0.03deg)", offset: 0.85 },
          { transform: "translate3d(0, 0, 0) rotate(0deg)", offset: 1 },
        ],
        {
          duration: next ? 600 : 450,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        }
      );
    }

    setFeedbackText(next ? "彩蛋已开启" : "裁判页已收起");
    setFeedbackTone(next ? "open" : "close");
    setEffectBurstId((current) => current + 1);
    setFeedbackVisible(true);
    clearFeedbackTimer();
    if (typeof window !== "undefined") {
      feedbackTimerRef.current = window.setTimeout(() => {
        setFeedbackVisible(false);
        feedbackTimerRef.current = null;
      }, 3200);
    }

    if (next) {
      toast.success("彩蛋已开启", {
        description: "已进入裁判页，再长按标题可收起",
      });
    } else {
      toast("裁判页已收起", {
        description: "已回到普通排名",
      });
    }
  };

  const handleTitlePressStart = () => {
    if (typeof window === "undefined") return;

    clearLongPressTimer();
    setPressing(true);
    longPressTimerRef.current = window.setTimeout(() => {
      setPressing(false);
      setShowRefereeTab((current) => {
        const next = !current;
        setActiveTab(next ? "referee" : "group");
        triggerHiddenTabFeedback(next);
        return next;
      });
      longPressTimerRef.current = null;
    }, REFEREE_LONG_PRESS_MS);
  };

  const handleTitlePressEnd = () => {
    clearLongPressTimer();
    setPressing(false);
  };

  useEffect(() => {
    if (tournamentLoading || !currentId) return;

    let cancelled = false;

    async function loadStats() {
      try {
        const data = await fetchJson<StatsData>(
          `/api/tournaments/${currentId}/stats${showRefereeTab ? "?includeReferee=1" : ""}`
        );
        if (cancelled) return;
        setStats(data);
      } catch {
        if (cancelled) return;
        setStats(null);
      } finally {
        if (!cancelled) {
          setLoadedTournamentId(currentId);
        }
      }
    }

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, [currentId, showRefereeTab, tournamentLoading]);

  if (tournamentLoading || (currentId !== null && loadedTournamentId !== currentId)) {
    return <div className="text-center py-12 text-muted-foreground">加载中...</div>;
  }

  if (!currentId) {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <Trophy className="w-4.5 h-4.5 text-green-700" />
          <h1 className="text-lg font-bold text-green-900">排名 & 统计</h1>
        </div>
        <Card className="border-dashed border-border/50">
          <CardContent className="py-10 text-center">
            <Trophy className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">暂无可查看的赛事</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <Trophy className="w-4.5 h-4.5 text-green-700" />
          <h1 className="text-lg font-bold text-green-900">排名 & 统计</h1>
        </div>
        <Card className="border-dashed border-border/50">
          <CardContent className="py-10 text-center">
            <Trophy className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">暂无数据</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div ref={pageRef} className="space-y-6">
      <div className="relative flex items-center gap-2.5 overflow-visible">
        <div className="relative">
          <Trophy className="w-5 h-5 text-green-700" />
          {pressing && (
            <svg className="easter-progress-ring absolute -inset-1.5" viewBox="0 0 32 32">
              <circle
                cx="16" cy="16" r="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="text-emerald-400"
                style={{
                  strokeDasharray: "88",
                  strokeDashoffset: "88",
                  animation: `easter-progress ${REFEREE_LONG_PRESS_MS}ms linear forwards`,
                }}
              />
            </svg>
          )}
        </div>
        <h1
          className={`text-2xl font-bold select-none transition-colors duration-300 ${pressing ? "text-emerald-600" : "text-green-900"}`}
          onMouseDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            handleTitlePressStart();
          }}
          onMouseUp={handleTitlePressEnd}
          onMouseLeave={handleTitlePressEnd}
          onTouchStart={handleTitlePressStart}
          onTouchEnd={handleTitlePressEnd}
          onTouchCancel={handleTitlePressEnd}
          onContextMenu={(event) => event.preventDefault()}
        >
          排名 & 统计
        </h1>
        {pressing && (
          <span className="text-xs text-emerald-500/80 animate-pulse ml-1 select-none">
            长按中...
          </span>
        )}
      </div>

      {feedbackVisible && (
        <div key={effectBurstId} className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
          {/* Soft backdrop glow */}
          <div className="easter-backdrop fixed inset-0" />
          {/* Floating banner */}
          <div
            className={`easter-banner fixed left-1/2 top-16 squircle-panel border px-5 py-2.5 text-sm font-semibold shadow-2xl backdrop-blur-sm ${
              feedbackTone === "open"
                ? "border-emerald-200/60 bg-emerald-50/90 text-emerald-700"
                : "border-amber-200/60 bg-amber-50/90 text-amber-700"
            }`}
          >
            <span className="easter-banner-icon inline-block mr-1.5">
              {feedbackTone === "open" ? "✨" : "📦"}
            </span>
            {feedbackText}
          </div>
          {/* Central flash */}
          <div className="easter-flash fixed left-1/2 top-[28%]" />
          {/* Particles & ribbons */}
          <div className="fixed inset-0">
            <div className="absolute left-1/2 top-[28%]">
              {EASTER_PARTICLES.map((particle, index) => (
                <span
                  key={`${particle.symbol}-${index}-${effectBurstId}`}
                  className="easter-particle absolute left-0 top-0 text-2xl sm:text-3xl"
                  style={{
                    "--tx": particle.tx,
                    "--ty": particle.ty,
                    "--rot": particle.rotate,
                    "--scale": particle.scale,
                    animationDelay: particle.delay,
                  } as CSSProperties}
                >
                  {particle.symbol}
                </span>
              ))}
            </div>
            {EASTER_RIBBONS.map((ribbon, index) => (
              <span
                key={`${ribbon.left}-${effectBurstId}-${index}`}
                className="easter-ribbon"
                style={{
                  "--left": ribbon.left,
                  "--drift": ribbon.drift,
                  "--rotation": ribbon.rotation,
                  "--duration": ribbon.duration,
                  "--delay": ribbon.delay,
                  "--ribbon-color": ribbon.color,
                } as CSSProperties}
              />
            ))}
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as StandingsTab)} className="w-full">
        {(() => {
          const hasSharedPositions = (stats.positionStats || []).some(p => p.players.length > 1);
          const baseCols = hasSharedPositions ? 4 : 3;
          const totalCols = baseCols + (showRefereeTab ? 1 : 0);
          return (
            <TabsList className={`w-full grid bg-green-50/80 h-10`} style={{ gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))` }}>
              <TabsTrigger value="group" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-xs sm:text-sm gap-1">
                <Users className="w-3.5 h-3.5" />
                团体
              </TabsTrigger>
              <TabsTrigger value="combo" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-xs sm:text-sm gap-1">
                <Handshake className="w-3.5 h-3.5" />
                组合
              </TabsTrigger>
              <TabsTrigger value="player" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-xs sm:text-sm gap-1">
                <User className="w-3.5 h-3.5" />
                个人
              </TabsTrigger>
              {hasSharedPositions && (
                <TabsTrigger value="position" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-xs sm:text-sm gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  位置
                </TabsTrigger>
              )}
              {showRefereeTab && (
                <TabsTrigger value="referee" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-xs sm:text-sm gap-1">
                  <Award className="w-3.5 h-3.5" />
                  裁判
                </TabsTrigger>
              )}
            </TabsList>
          );
        })()}

        {/* Group Standings */}
        <TabsContent value="group" className="mt-4">
          <Card className="border-green-100/80 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-green-100 bg-green-50/60">
                      <th className="p-3 text-left font-semibold text-green-800">#</th>
                      <th className="p-3 text-left font-semibold text-green-800">小组</th>
                      <th className="p-3 text-center font-semibold text-green-700">积分</th>
                      <th className="p-3 text-center font-semibold text-green-800">胜场</th>
                      <th className="p-3 text-center font-semibold text-green-800">平场</th>
                      <th className="p-3 text-center font-semibold text-green-800">负场</th>
                      <th className="p-3 text-center font-semibold text-green-800">净胜场</th>
                      <th className="p-3 text-center font-semibold text-green-800">得分</th>
                      <th className="p-3 text-center font-semibold text-green-800">失分</th>
                      <th className="p-3 text-center font-semibold text-green-800">净胜球</th>
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
                        <td className="p-3 text-center text-green-600 font-medium">{g.wins}</td>
                        <td className="p-3 text-center text-gray-700">{g.draws}</td>
                        <td className="p-3 text-center text-red-500">{g.losses}</td>
                        <td className="p-3 text-center">
                          <span className={g.netGames > 0 ? "text-green-600 font-medium" : g.netGames < 0 ? "text-red-500" : "text-gray-500"}>
                            {formatSignedStat(g.netGames)}
                          </span>
                        </td>
                        <td className="p-3 text-center text-gray-700">{g.pointsFor}</td>
                        <td className="p-3 text-center text-gray-700">{g.pointsAgainst}</td>
                        <td className="p-3 text-center">
                          <span className={g.netPoints > 0 ? "text-green-600 font-medium" : g.netPoints < 0 ? "text-red-500" : "text-gray-500"}>
                            {formatSignedStat(g.netPoints)}
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

        {/* Combination Stats */}
        <TabsContent value="combo" className="mt-4">
          <Card className="border-green-100/80 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead>
                    <tr className="border-b border-green-100 bg-green-50/60">
                      <th className="p-3 text-left font-semibold text-green-800">#</th>
                      <th className="p-3 text-left font-semibold text-green-800">组合</th>
                      <th className="p-3 text-center font-semibold text-green-800">胜场</th>
                      <th className="p-3 text-center font-semibold text-green-800">负场</th>
                      <th className="p-3 text-center font-semibold text-green-800">净胜场</th>
                      <th className="p-3 text-center font-semibold text-green-800">得分</th>
                      <th className="p-3 text-center font-semibold text-green-800">失分</th>
                      <th className="p-3 text-center font-semibold text-green-800">净胜球</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.combinationStats || [])
                      .map((c, idx) => (
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
                          <td className="p-3 text-center text-green-600 font-medium">{c.wins}</td>
                          <td className="p-3 text-center text-red-500">{c.losses}</td>
                          <td className="p-3 text-center">
                            <span className={c.netGames > 0 ? "text-green-600 font-medium" : c.netGames < 0 ? "text-red-500" : "text-gray-500"}>
                              {formatSignedStat(c.netGames)}
                            </span>
                          </td>
                          <td className="p-3 text-center text-gray-700">{c.pointsFor}</td>
                          <td className="p-3 text-center text-gray-700">{c.pointsAgainst}</td>
                          <td className="p-3 text-center">
                            <span className={c.netPoints > 0 ? "text-green-600 font-medium" : c.netPoints < 0 ? "text-red-500" : "text-gray-500"}>
                              {formatSignedStat(c.netPoints)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    {(!stats.combinationStats || stats.combinationStats.length === 0) && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-gray-400">
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

        {/* Player Stats */}
        <TabsContent value="player" className="mt-4">
          <Card className="border-green-100/80 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead>
                    <tr className="border-b border-green-100 bg-green-50/60">
                      <th className="p-3 text-left font-semibold text-green-800">#</th>
                      <th className="p-3 text-left font-semibold text-green-800">选手</th>
                      <th className="p-3 text-center font-semibold text-green-800">胜场</th>
                      <th className="p-3 text-center font-semibold text-green-800">负场</th>
                      <th className="p-3 text-center font-semibold text-green-800">净胜场</th>
                      <th className="p-3 text-center font-semibold text-green-800">得分</th>
                      <th className="p-3 text-center font-semibold text-green-800">失分</th>
                      <th className="p-3 text-center font-semibold text-green-800">净胜球</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.playerStats.map((p, idx) => (
                      <tr key={p.playerId} className="border-b border-gray-100/80 hover:bg-green-50/40 transition-colors">
                        <td className="p-3"><RankCell index={idx} /></td>
                        <td className="p-3">
                          <span className="font-medium text-gray-800">{formatPlayerName(p)}</span>
                          <Badge variant="outline" className={`ml-2 text-[10px] px-1 py-0 ${p.gender === "M" ? "border-blue-300 text-blue-600 bg-blue-50/60" : "border-pink-300 text-pink-600 bg-pink-50/60"}`}>
                            {p.gender === "M" ? "男" : "女"}
                          </Badge>
                        </td>
                        <td className="p-3 text-center text-green-600 font-medium">{p.wins}</td>
                        <td className="p-3 text-center text-red-500">{p.losses}</td>
                        <td className="p-3 text-center">
                          <span className={p.netGames > 0 ? "text-green-600 font-medium" : p.netGames < 0 ? "text-red-500" : "text-gray-500"}>
                            {formatSignedStat(p.netGames)}
                          </span>
                        </td>
                        <td className="p-3 text-center text-gray-700">{p.pointsFor}</td>
                        <td className="p-3 text-center text-gray-700">{p.pointsAgainst}</td>
                        <td className="p-3 text-center">
                          <span className={p.netPoints > 0 ? "text-green-600 font-medium" : p.netPoints < 0 ? "text-red-500" : "text-gray-500"}>
                            {formatSignedStat(p.netPoints)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {stats.playerStats.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-gray-400">
                          暂无个人数据
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Position Stats (merged for shared positions) */}
        <TabsContent value="position" className="mt-4">
          <Card className="border-green-100/80 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead>
                    <tr className="border-b border-green-100 bg-green-50/60">
                      <th className="p-3 text-left font-semibold text-green-800">#</th>
                      <th className="p-3 text-left font-semibold text-green-800">位置</th>
                      <th className="p-3 text-left font-semibold text-green-800">选手</th>
                      <th className="p-3 text-center font-semibold text-green-800">胜场</th>
                      <th className="p-3 text-center font-semibold text-green-800">负场</th>
                      <th className="p-3 text-center font-semibold text-green-800">净胜场</th>
                      <th className="p-3 text-center font-semibold text-green-800">得分</th>
                      <th className="p-3 text-center font-semibold text-green-800">失分</th>
                      <th className="p-3 text-center font-semibold text-green-800">净胜球</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.positionStats || [])
                      .filter(p => p.players.length > 1)
                      .map((p, idx) => (
                        <tr key={`${p.groupId}-${p.positionNumber}`} className="border-b border-gray-100/80 hover:bg-green-50/40 transition-colors">
                          <td className="p-3"><RankCell index={idx} /></td>
                          <td className="p-3">
                            <span className="text-lg mr-1">{p.groupIcon}</span>
                            <span className="font-medium text-gray-800">{p.positionNumber}号位</span>
                            <Badge variant="outline" className={`ml-1.5 text-[10px] px-1 py-0 ${p.gender === "M" ? "border-blue-300 text-blue-600 bg-blue-50/60" : "border-pink-300 text-pink-600 bg-pink-50/60"}`}>
                              {p.gender === "M" ? "男" : "女"}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col gap-0.5">
                              {p.players.map(pl => (
                                <span key={pl.id} className={`text-xs ${pl.slotIndex === 1 ? "text-gray-800" : "text-amber-700"}`}>
                                  {pl.name || (pl.slotIndex === 1 ? "主" : "候补")}
                                  {pl.slotIndex === 2 && <span className="text-[10px] text-amber-500 ml-0.5">(候补)</span>}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-3 text-center text-green-600 font-medium">{p.wins}</td>
                          <td className="p-3 text-center text-red-500">{p.losses}</td>
                          <td className="p-3 text-center">
                            <span className={p.netGames > 0 ? "text-green-600 font-medium" : p.netGames < 0 ? "text-red-500" : "text-gray-500"}>
                              {formatSignedStat(p.netGames)}
                            </span>
                          </td>
                          <td className="p-3 text-center text-gray-700">{p.pointsFor}</td>
                          <td className="p-3 text-center text-gray-700">{p.pointsAgainst}</td>
                          <td className="p-3 text-center">
                            <span className={p.netPoints > 0 ? "text-green-600 font-medium" : p.netPoints < 0 ? "text-red-500" : "text-gray-500"}>
                              {formatSignedStat(p.netPoints)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    {(!stats.positionStats || stats.positionStats.filter(p => p.players.length > 1).length === 0) && (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-gray-400">
                          暂无共享位置数据
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {showRefereeTab && (
          <TabsContent value="referee" className="mt-4">
            <Card className="border-amber-100/80 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
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
        )}
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
