"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle,
  AlertCircle,
  Clock,
  LayoutGrid,
  List,
  Play,
  Save,
  Send,
  Settings2,
  Info,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduleMatrix } from "@/components/tournament/schedule-matrix";
import { QualityReport } from "@/components/tournament/quality-report";
import { AdminPageHeader } from "@/components/layout/admin-page-header";
import { useTournament } from "@/lib/tournament-context";
import {
  DEFAULT_MAX_CONSECUTIVE_PLAYING_LIMIT,
  DEFAULT_MAX_CONSECUTIVE_RESTING_LIMIT,
} from "@/lib/constants";
import { parseIntegerInput, sanitizeIntegerInput } from "@/lib/utils";

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

const STATUS_MAP = {
  pending: { label: "待开始", color: "text-gray-500", icon: Clock },
  in_progress: { label: "进行中", color: "text-amber-600", icon: AlertCircle },
  finished: { label: "已完成", color: "text-green-600", icon: CheckCircle },
} as const;

const SCORING_OPTIONS = [
  { value: "single_21", label: "一局 21 分" },
  { value: "single_30", label: "一局 30 分" },
  { value: "best_of_3_15", label: "三局两胜 15 分" },
  { value: "best_of_3_21", label: "三局两胜 21 分" },
];

interface Tournament {
  id: number;
  name: string;
  status: string;
  courtsCount: number;
  roundDurationMinutes: number;
  scoringMode: string;
  startTime: string;
  endTime: string;
  malesPerGroup: number;
  femalesPerGroup: number;
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

interface DraftScheduleMatch {
  roundNumber: number;
  courtNumber: number;
  homeGroupIndex: number;
  awayGroupIndex: number;
  matchType: string;
  homePos1: number;
  homePos2: number;
  awayPos1: number;
  awayPos2: number;
  templateIndex: number;
}

interface SimulationResult {
  totalMatches: number;
  totalRounds: number;
  estimatedDurationMinutes: number;
  availableMinutes: number;
  isOverTime: boolean;
  schedule: DraftScheduleMatch[];
  playerStats: Array<{
    groupIndex: number;
    position: number;
    gender: string;
    totalMatches: number;
    totalRounds: number;
    maxConsecutivePlaying: number;
    maxConsecutiveResting: number;
    maxRestMinutes?: number;
  }>;
  warnings: string[];
  groups: Array<{ icon: string; name: string }>;
}

interface SimulationMeta {
  courtsCount: number;
  roundDurationMinutes: number;
  maxConsecutivePlayingLimit: number;
  maxConsecutiveRestingLimit: number;
}

interface TournamentResponse {
  tournament?: Tournament | null;
  groups?: GroupInfo[];
  players?: PlayerInfo[];
}

interface ScheduleResponse {
  matches?: ScheduleMatch[];
}

interface FormState {
  courtsCount: string;
  roundDurationMinutes: string;
  scoringMode: string;
  maxConsecutivePlayingLimit: string;
  maxConsecutiveRestingLimit: string;
}

function formatDuration(minutes: number) {
  return `${Math.floor(minutes / 60)}h${minutes % 60}m`;
}

export default function AdminSchedulePage() {
  const { currentId } = useTournament();
  const tournamentId = currentId ? String(currentId) : "";
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [matches, setMatches] = useState<ScheduleMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [simulationMeta, setSimulationMeta] = useState<SimulationMeta | null>(null);
  const [simulationDirty, setSimulationDirty] = useState(false);
  const [boardTab, setBoardTab] = useState<"draft" | "official">("official");
  const [draftTab, setDraftTab] = useState<"overview" | "schedule" | "quality">("overview");
  const [officialViewMode, setOfficialViewMode] = useState<"matrix" | "list">("matrix");
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>({
    courtsCount: "3",
    roundDurationMinutes: "20",
    scoringMode: "single_21",
    maxConsecutivePlayingLimit: String(DEFAULT_MAX_CONSECUTIVE_PLAYING_LIMIT),
    maxConsecutiveRestingLimit: String(DEFAULT_MAX_CONSECUTIVE_RESTING_LIMIT),
  });

  const parsedCourtsCount = parseIntegerInput(form.courtsCount, 3, { min: 1, max: 10 });
  const parsedRoundDurationMinutes = parseIntegerInput(form.roundDurationMinutes, 20, {
    min: 5,
    max: 60,
  });
  const parsedMaxConsecutivePlayingLimit = parseIntegerInput(
    form.maxConsecutivePlayingLimit,
    DEFAULT_MAX_CONSECUTIVE_PLAYING_LIMIT,
    { min: 1, max: 10 }
  );
  const parsedMaxConsecutiveRestingLimit = parseIntegerInput(
    form.maxConsecutiveRestingLimit,
    DEFAULT_MAX_CONSECUTIVE_RESTING_LIMIT,
    { min: 1, max: 10 }
  );

  const fetchData = useCallback(async () => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [scheduleRes, tournamentRes] = await Promise.all([
        fetch(`/api/tournaments/${tournamentId}/schedule`),
        fetch(`/api/tournaments/${tournamentId}`),
      ]);
      const scheduleData = await scheduleRes.json() as ScheduleResponse;
      const tournamentData = await tournamentRes.json() as TournamentResponse;
      const nextTournament = tournamentData.tournament || null;

      setMatches(scheduleData.matches || []);
      setGroups(tournamentData.groups || []);
      setPlayers(tournamentData.players || []);
      setTournament(nextTournament);

      if (nextTournament) {
        setForm((prev) => ({
          ...prev,
          courtsCount: String(nextTournament.courtsCount),
          roundDurationMinutes: String(nextTournament.roundDurationMinutes),
          scoringMode: nextTournament.scoringMode,
        }));
      }

      setBoardTab((scheduleData.matches || []).length > 0 ? "official" : "draft");
    } catch {
      toast.error("加载赛程安排失败");
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    setSimulation(null);
    setSimulationMeta(null);
    setSimulationDirty(false);
    setExpandedRound(null);
  }, [tournamentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const groupMap = new Map(groups.map((group) => [group.id, group]));
  const playerMap = new Map(players.map((player) => [player.id, player]));

  const formatPlayer = (playerId: number | null) => {
    if (!playerId) return "?";
    const player = playerMap.get(playerId);
    if (!player) return "?";
    const group = groupMap.get(player.groupId);
    return player.name || `${group?.icon || ""}${player.positionNumber}号`;
  };

  const updateForm = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (simulation) {
      setSimulationDirty(true);
    }
  };

  const saveScheduleSettings = async () => {
    if (!tournamentId) return false;

    setSaving(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courtsCount: parsedCourtsCount,
          roundDurationMinutes: parsedRoundDurationMinutes,
          scoringMode: form.scoringMode,
        }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        toast.error(data.error || "保存排程参数失败");
        return false;
      }

      const data = await res.json() as { tournament?: Tournament };
      if (data.tournament) {
        setTournament(data.tournament);
      }

      toast.success("排程参数已保存");
      return true;
    } catch {
      toast.error("网络错误");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const runSimulation = async () => {
    if (!tournamentId) return;

    const saved = await saveScheduleSettings();
    if (!saved) return;

    setSimulating(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxConsecutivePlayingLimit: parsedMaxConsecutivePlayingLimit,
          maxConsecutiveRestingLimit: parsedMaxConsecutiveRestingLimit,
        }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        toast.error(data.error || "运行模拟失败");
        return;
      }

      const data = await res.json() as SimulationResult;
      setSimulation(data);
      setSimulationMeta({
        courtsCount: parsedCourtsCount,
        roundDurationMinutes: parsedRoundDurationMinutes,
        maxConsecutivePlayingLimit: parsedMaxConsecutivePlayingLimit,
        maxConsecutiveRestingLimit: parsedMaxConsecutiveRestingLimit,
      });
      setSimulationDirty(false);
      setBoardTab("draft");
      setDraftTab("overview");
      toast.success("模拟稿已生成，可以检查后发布为正式赛程");
    } catch {
      toast.error("网络错误");
    } finally {
      setSimulating(false);
    }
  };

  const publishSimulation = async () => {
    if (!tournamentId || !simulation || simulationDirty) return;

    const confirmMessage = matches.length > 0
      ? "重新发布正式赛程会覆盖当前正式赛程，并删除已有比分、裁判记录、得分时间线。确定继续吗？"
      : "确定要将当前模拟稿发布为正式赛程吗？";

    if (!confirm(confirmMessage)) return;

    setPublishing(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledMatches: simulation.schedule,
        }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        toast.error(data.error || "发布正式赛程失败");
        return;
      }

      toast.success("模拟稿已发布为正式赛程");
      await fetchData();
      setBoardTab("official");
    } catch {
      toast.error("网络错误");
    } finally {
      setPublishing(false);
    }
  };

  const maxRound = matches.length > 0 ? Math.max(...matches.map((match) => match.roundNumber)) : 0;
  const maxCourt = matches.length > 0 ? Math.max(...matches.map((match) => match.courtNumber)) : 0;
  const totalFinished = matches.filter((match) => match.status === "finished").length;
  const totalPending = matches.filter((match) => match.status === "pending").length;

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">加载中...</div>;
  }

  if (!tournamentId || !tournament) {
    return (
      <div className="admin-page-shell">
        <AdminPageHeader
          title="赛程安排"
          description="排程参数、模拟稿与正式赛程"
          icon={CalendarDays}
          iconClassName="w-5 h-5 text-amber-600"
        />
        <Card className="border-dashed border-gray-200">
          <CardContent className="py-12 text-center text-gray-500">
            请先回到管理后台选择一个赛事
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-page-shell">
      <AdminPageHeader
        title="赛程安排"
        description="管理排程参数、模拟稿与正式赛程。单场详情归属本页，比分编辑仍从详情页进入比分录入二级页。"
        icon={CalendarDays}
        iconClassName="w-5 h-5 text-amber-600"
        actions={(
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={saveScheduleSettings}
              disabled={saving}
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              {saving ? "保存中..." : "保存排程参数"}
            </Button>
            <Button
              size="sm"
              onClick={runSimulation}
              disabled={simulating}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Play className="w-3.5 h-3.5 mr-1" />
              {simulating ? "模拟中..." : "运行模拟"}
            </Button>
          </div>
        )}
      />

      <div className="admin-page-grid">
        <div className="admin-page-sidebar">
          <Card className="border-amber-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-800 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-amber-500" />
                排程参数
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-600 font-medium">场地数</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.courtsCount}
                  onChange={(e) => updateForm("courtsCount", sanitizeIntegerInput(e.target.value))}
                  className="border-amber-200"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-600 font-medium">每轮时间（分钟）</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.roundDurationMinutes}
                  onChange={(e) => updateForm("roundDurationMinutes", sanitizeIntegerInput(e.target.value))}
                  className="border-amber-200"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-600 font-medium">计分方式</Label>
                <Select
                  value={form.scoringMode}
                  onValueChange={(value) => value && updateForm("scoringMode", value)}
                >
                  <SelectTrigger className="border-amber-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCORING_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-gray-600 font-medium">连续上场上限</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.maxConsecutivePlayingLimit}
                    onChange={(e) => updateForm("maxConsecutivePlayingLimit", sanitizeIntegerInput(e.target.value))}
                    className="border-amber-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-600 font-medium">连续轮空上限</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.maxConsecutiveRestingLimit}
                    onChange={(e) => updateForm("maxConsecutiveRestingLimit", sanitizeIntegerInput(e.target.value))}
                    className="border-amber-200"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900">
                比赛时段来自“赛事设置”：当前窗口 {tournament.startTime || "09:00"} - {tournament.endTime || "19:00"}。
              </div>
            </CardContent>
          </Card>

          <Card className="border-indigo-100 bg-indigo-50/60 shadow-sm">
            <CardContent className="py-4 text-sm text-indigo-900 flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                连续上场/轮空上限只作用于当前模拟稿的质量评估；正式赛程发布后，会严格落刚才那份模拟稿，不会再次随机生成。
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-100 bg-red-50/70 shadow-sm">
            <CardContent className="py-4 text-sm text-red-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                重新发布正式赛程会覆盖当前正式赛程，并删除已有比分、裁判记录、得分时间线。
                如果你修改了左侧参数，必须重新运行模拟后才能发布。
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs
          value={boardTab}
          onValueChange={(value) => setBoardTab(value as "draft" | "official")}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-2 bg-amber-50 border border-amber-100">
            <TabsTrigger value="draft" className="data-[state=active]:bg-white data-[state=active]:text-amber-700">
              模拟稿
            </TabsTrigger>
            <TabsTrigger value="official" className="data-[state=active]:bg-white data-[state=active]:text-amber-700">
              正式赛程
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draft" className="space-y-4">
            {!simulation ? (
              <Card className="border-dashed border-2 border-amber-200 bg-amber-50/30">
                <CardContent className="py-16 text-center">
                  <CalendarDays className="w-12 h-12 text-amber-300 mx-auto mb-4" />
                  <p className="text-gray-700 text-lg font-bold mb-2">先运行模拟，生成一份可检查的赛程草稿</p>
                  <p className="text-gray-400 text-sm">草稿只在当前页面内存中保存，确认无误后再发布为正式赛程。</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                      模拟稿 {simulation.totalMatches} 场 / {simulation.totalRounds} 轮
                    </Badge>
                    {simulationDirty && (
                      <Badge className="bg-rose-100 text-rose-700">
                        参数已变更，请重新运行模拟
                      </Badge>
                    )}
                  </div>
                  <Button
                    onClick={publishSimulation}
                    disabled={publishing || simulationDirty}
                    className="bg-green-600 hover:bg-green-700 text-white gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {publishing ? "发布中..." : "发布为正式赛程"}
                  </Button>
                </div>

                <Tabs
                  value={draftTab}
                  onValueChange={(value) => setDraftTab(value as "overview" | "schedule" | "quality")}
                  className="space-y-4"
                >
                  <TabsList className="grid w-full grid-cols-3 bg-green-50 border border-green-100">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-green-700">
                      总览
                    </TabsTrigger>
                    <TabsTrigger value="schedule" className="data-[state=active]:bg-white data-[state=active]:text-green-700">
                      赛程矩阵
                    </TabsTrigger>
                    <TabsTrigger value="quality" className="data-[state=active]:bg-white data-[state=active]:text-green-700">
                      质量报告
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50">
                        <CardContent className="pt-4 pb-3 text-center">
                          <div className="text-3xl font-extrabold text-green-600">{simulation.totalMatches}</div>
                          <div className="text-xs text-gray-500 mt-1 font-medium">总比赛场次</div>
                        </CardContent>
                      </Card>
                      <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-cyan-50">
                        <CardContent className="pt-4 pb-3 text-center">
                          <div className="text-3xl font-extrabold text-blue-600">{simulation.totalRounds}</div>
                          <div className="text-xs text-gray-500 mt-1 font-medium">总轮次</div>
                        </CardContent>
                      </Card>
                      <Card className={`border-0 shadow-md ${simulation.isOverTime ? "bg-gradient-to-br from-red-50 to-orange-50" : "bg-gradient-to-br from-amber-50 to-yellow-50"}`}>
                        <CardContent className="pt-4 pb-3 text-center">
                          <div className={`text-3xl font-extrabold ${simulation.isOverTime ? "text-red-500" : "text-amber-600"}`}>
                            {formatDuration(simulation.estimatedDurationMinutes)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 font-medium">预计时长</div>
                        </CardContent>
                      </Card>
                      <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-violet-50">
                        <CardContent className="pt-4 pb-3 text-center">
                          <div className="text-3xl font-extrabold text-purple-600">
                            {formatDuration(simulation.availableMinutes)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 font-medium">可用时间</div>
                        </CardContent>
                      </Card>
                    </div>

                    {simulation.warnings.length > 0 && (
                      <Card className="border-amber-200 bg-amber-50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base text-amber-700 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4" />
                            注意事项
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1 text-sm text-amber-700">
                            {simulation.warnings.map((warning, index) => (
                              <li key={`${warning}-${index}`}>• {warning}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    <Card className={simulation.isOverTime ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
                      <CardContent className="py-4 text-center font-bold">
                        {simulation.isOverTime
                          ? "❌ 当前模拟稿超时，请调整参数后重试"
                          : "✅ 当前模拟稿可以在时间窗口内完成"}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="schedule">
                    <ScheduleMatrix
                      schedule={simulation.schedule}
                      totalRounds={simulation.totalRounds}
                      courtsCount={simulationMeta?.courtsCount || parsedCourtsCount}
                      startTime={tournament.startTime || "09:00"}
                      roundDurationMinutes={simulationMeta?.roundDurationMinutes || parsedRoundDurationMinutes}
                      groups={simulation.groups}
                    />
                  </TabsContent>

                  <TabsContent value="quality">
                    <QualityReport
                      playerStats={simulation.playerStats}
                      groups={simulation.groups}
                      roundDurationMinutes={simulationMeta?.roundDurationMinutes || parsedRoundDurationMinutes}
                      maxConsecutivePlayingLimit={simulationMeta?.maxConsecutivePlayingLimit || parsedMaxConsecutivePlayingLimit}
                      maxConsecutiveRestingLimit={simulationMeta?.maxConsecutiveRestingLimit || parsedMaxConsecutiveRestingLimit}
                    />
                  </TabsContent>
                </Tabs>
              </>
            )}
          </TabsContent>

          <TabsContent value="official" className="space-y-4">
            {matches.length === 0 ? (
              <Card className="border-dashed border-border/50">
                <CardContent className="py-12 text-center">
                  <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-muted-foreground">正式赛程尚未发布</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    先在左侧调整排程参数并运行模拟，确认后再将模拟稿发布为正式赛程。
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
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

                <div className="flex justify-end gap-2">
                  <Button
                    variant={officialViewMode === "matrix" ? "default" : "outline"}
                    size="sm"
                    className={officialViewMode === "matrix" ? "bg-amber-600 hover:bg-amber-700" : ""}
                    onClick={() => setOfficialViewMode("matrix")}
                  >
                    <LayoutGrid className="w-3.5 h-3.5 mr-1" /> 矩阵
                  </Button>
                  <Button
                    variant={officialViewMode === "list" ? "default" : "outline"}
                    size="sm"
                    className={officialViewMode === "list" ? "bg-amber-600 hover:bg-amber-700" : ""}
                    onClick={() => setOfficialViewMode("list")}
                  >
                    <List className="w-3.5 h-3.5 mr-1" /> 列表
                  </Button>
                </div>

                {officialViewMode === "matrix" ? (
                  <>
                    <div className="md:hidden">
                      <div className="rounded-lg border border-amber-100 overflow-hidden">
                        <div
                          className="grid bg-amber-50/60 border-b border-amber-100"
                          style={{ gridTemplateColumns: `2.5rem repeat(${maxCourt}, 1fr)` }}
                        >
                          <div className="p-1.5 text-[10px] font-semibold text-amber-700 text-center" />
                          {Array.from({ length: maxCourt }, (_, index) => (
                            <div
                              key={`court-head-${index + 1}`}
                              className="p-1.5 text-[10px] font-semibold text-amber-700 text-center"
                            >
                              场地{index + 1}
                            </div>
                          ))}
                        </div>

                        {Array.from({ length: maxRound }, (_, roundIndex) => {
                          const roundNumber = roundIndex + 1;
                          const roundMatches = matches.filter((match) => match.roundNumber === roundNumber);
                          const isExpanded = expandedRound === roundNumber;
                          const allDone = roundMatches.length > 0 && roundMatches.every((match) => match.status === "finished");

                          return (
                            <div key={`mobile-round-${roundNumber}`}>
                              <div
                                className={`grid cursor-pointer transition-colors ${
                                  isExpanded ? "bg-amber-50" : allDone ? "bg-gray-50/50" : "hover:bg-amber-50/30"
                                } ${roundIndex < maxRound - 1 || isExpanded ? "border-b border-gray-100" : ""}`}
                                style={{ gridTemplateColumns: `2.5rem repeat(${maxCourt}, 1fr)` }}
                                onClick={() => setExpandedRound(isExpanded ? null : roundNumber)}
                              >
                                <div className={`p-1.5 text-[11px] font-bold text-center flex items-center justify-center ${allDone ? "text-green-600" : "text-amber-700"}`}>
                                  R{roundNumber}
                                </div>
                                {Array.from({ length: maxCourt }, (_, courtIndex) => {
                                  const match = roundMatches.find((item) => item.courtNumber === courtIndex + 1);
                                  if (!match) {
                                    return (
                                      <div key={`mobile-empty-${roundNumber}-${courtIndex}`} className="p-1 flex items-center justify-center">
                                        <span className="text-gray-200 text-[10px]">—</span>
                                      </div>
                                    );
                                  }

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
                                    <div key={`mobile-match-${match.id}`} className="p-1 flex items-center justify-center">
                                      <div className={`rounded border px-1 py-0.5 text-center leading-tight ${bgClass} ${isFinished ? "opacity-60" : ""}`}>
                                        <div className="text-xs whitespace-nowrap">
                                          {homeGroup?.icon || "?"}<span className="text-gray-300 mx-0.5 text-[9px]">v</span>{awayGroup?.icon || "?"}
                                        </div>
                                        {isFinished && match.games && match.games.length > 0 ? (
                                          <div className="text-[8px] text-gray-500 font-medium">
                                            {match.games.map((game) => `${game.homeScore}:${game.awayScore}`).join(" ")}
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

                              {isExpanded && (
                                <div className="bg-amber-50/50 border-b border-amber-100 px-2 py-2 space-y-1.5">
                                  {roundMatches.map((match) => {
                                    const isFinished = match.status === "finished";
                                    const statusInfo = STATUS_MAP[match.status as keyof typeof STATUS_MAP] || STATUS_MAP.pending;
                                    const homeGroup = groupMap.get(match.homeGroupId);
                                    const awayGroup = groupMap.get(match.awayGroupId);
                                    const colorClass = isFinished
                                      ? "bg-white border-gray-200 opacity-70"
                                      : (MATCH_TYPE_COLORS[match.matchType] || "bg-white border-gray-100");

                                    return (
                                      <Link key={match.id} href={`/match/${match.id}`}>
                                        <div className={`rounded-lg border p-2.5 ${colorClass} hover:opacity-80 transition-opacity cursor-pointer`}>
                                          <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-1">
                                              <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1 py-0.5 rounded">
                                                场地{match.courtNumber}
                                              </span>
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
                                                {match.games.map((game) => `${game.homeScore}:${game.awayScore}`).join(" / ")}
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

                    <Card className="border-amber-100 shadow-sm overflow-hidden hidden md:block">
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-amber-100 bg-amber-50/60">
                                <th className="p-3 text-left font-semibold text-amber-800 sticky left-0 bg-amber-50/60 z-10">
                                  轮次
                                </th>
                                {Array.from({ length: maxCourt }, (_, index) => (
                                  <th key={`desktop-court-${index + 1}`} className="p-3 text-center font-semibold text-amber-800 min-w-[200px]">
                                    场地 {index + 1}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from({ length: maxRound }, (_, roundIndex) => {
                                const roundNumber = roundIndex + 1;
                                const roundMatches = matches.filter((match) => match.roundNumber === roundNumber);

                                return (
                                  <tr key={`desktop-round-${roundNumber}`} className="border-b border-gray-100 hover:bg-amber-50/20">
                                    <td className="p-3 sticky left-0 bg-white z-10 font-semibold text-amber-700">
                                      R{roundNumber}
                                    </td>
                                    {Array.from({ length: maxCourt }, (_, courtIndex) => {
                                      const match = roundMatches.find((item) => item.courtNumber === courtIndex + 1);
                                      if (!match) {
                                        return (
                                          <td key={`desktop-empty-${roundNumber}-${courtIndex}`} className="p-2 text-center text-gray-300">
                                            —
                                          </td>
                                        );
                                      }

                                      const homeGroup = groupMap.get(match.homeGroupId);
                                      const awayGroup = groupMap.get(match.awayGroupId);
                                      const statusInfo = STATUS_MAP[match.status as keyof typeof STATUS_MAP] || STATUS_MAP.pending;
                                      const isFinished = match.status === "finished";
                                      const colorClass = isFinished
                                        ? "bg-gray-50 border-gray-200 opacity-70"
                                        : (MATCH_TYPE_COLORS[match.matchType] || "");

                                      return (
                                        <td key={`desktop-match-${match.id}`} className="p-2">
                                          <Link href={`/match/${match.id}`}>
                                            <div className={`rounded-lg border p-3 ${colorClass} hover:opacity-80 transition-opacity cursor-pointer`}>
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
                                                    {match.games.map((game) => `${game.homeScore}:${game.awayScore}`).join(" / ")}
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
        <div className="admin-page-main">
                    {Array.from({ length: maxRound }, (_, roundIndex) => {
                      const roundNumber = roundIndex + 1;
                      const roundMatches = matches.filter((match) => match.roundNumber === roundNumber);

                      return (
                        <div key={`list-round-${roundNumber}`}>
                          <h3 className="text-sm font-semibold text-amber-700 mb-2">第 {roundNumber} 轮</h3>
                          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                            {roundMatches.map((match) => {
                              const homeGroup = groupMap.get(match.homeGroupId);
                              const awayGroup = groupMap.get(match.awayGroupId);
                              const statusInfo = STATUS_MAP[match.status as keyof typeof STATUS_MAP] || STATUS_MAP.pending;
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
                                            {match.games.map((game) => `${game.homeScore}:${game.awayScore}`).join(" / ")}
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
