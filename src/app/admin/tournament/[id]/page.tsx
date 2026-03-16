"use client";

export const runtime = 'edge';

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduleMatrix } from "@/components/tournament/schedule-matrix";
import { QualityReport } from "@/components/tournament/quality-report";
import {
  DEFAULT_MAX_CONSECUTIVE_PLAYING_LIMIT,
  DEFAULT_MAX_CONSECUTIVE_RESTING_LIMIT,
} from "@/lib/constants";
import { FlaskConical, Save, Play, Users, Landmark, BarChart3, CalendarDays, FileText, AlertTriangle, Palette, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useTournament } from "@/lib/tournament-context";
import { parseIntegerInput, sanitizeIntegerInput } from "@/lib/utils";

interface Tournament {
  id: number;
  name: string;
  status: string;
  courtsCount: number;
  roundDurationMinutes: number;
  scoringMode: string;
  eventDate: string | null;
  startTime: string;
  endTime: string;
  malesPerGroup: number;
  femalesPerGroup: number;
}

interface SimulationResult {
  totalMatches: number;
  totalRounds: number;
  estimatedDurationMinutes: number;
  availableMinutes: number;
  isOverTime: boolean;
  schedule: Array<{
    roundNumber: number;
    courtNumber: number;
    homeGroupIndex: number;
    awayGroupIndex: number;
    matchType: string;
    homePos1: number;
    homePos2: number;
    awayPos1: number;
    awayPos2: number;
  }>;
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

interface GroupInfo {
  id: number;
  icon: string;
  name: string;
  sortOrder: number;
}

interface GroupEdit {
  icon: string;
  name: string;
}

interface FormState {
  name: string;
  courtsCount: string;
  roundDurationMinutes: string;
  scoringMode: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  malesPerGroup: string;
  femalesPerGroup: string;
  maxConsecutivePlayingLimit: string;
  maxConsecutiveRestingLimit: string;
}

type NumericFormField =
  | "courtsCount"
  | "roundDurationMinutes"
  | "malesPerGroup"
  | "femalesPerGroup"
  | "maxConsecutivePlayingLimit"
  | "maxConsecutiveRestingLimit";

interface TournamentResponse {
  tournament: Tournament;
  groups: GroupInfo[];
}

const SCORING_OPTIONS = [
  { value: "single_21", label: "一局 21 分" },
  { value: "single_30", label: "一局 30 分" },
  { value: "best_of_3_15", label: "三局两胜 15 分" },
  { value: "best_of_3_21", label: "三局两胜 21 分" },
];

export default function TournamentConfigPage() {
  const params = useParams();
  const { currentId } = useTournament();
  // Use route param if present, otherwise fall back to context
  const id = (params.id as string) || (currentId ? String(currentId) : "");

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [groupCount, setGroupCount] = useState("5");
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [groupEdits, setGroupEdits] = useState<GroupEdit[]>([]);
  const [savingGroups, setSavingGroups] = useState(false);

  const [form, setForm] = useState<FormState>({
    name: "",
    courtsCount: "3",
    roundDurationMinutes: "20",
    scoringMode: "single_21",
    eventDate: "",
    startTime: "09:00",
    endTime: "19:00",
    malesPerGroup: "3",
    femalesPerGroup: "2",
    maxConsecutivePlayingLimit: String(DEFAULT_MAX_CONSECUTIVE_PLAYING_LIMIT),
    maxConsecutiveRestingLimit: String(DEFAULT_MAX_CONSECUTIVE_RESTING_LIMIT),
  });

  const updateNumericField = (field: NumericFormField, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: sanitizeIntegerInput(value),
    }));
  };

  const parseSetting = (
    value: string,
    fallback: number,
    min: number,
    max: number
  ) => parseIntegerInput(value, fallback, { min, max });

  const parsedGroupCount = parseSetting(groupCount, 5, 2, 20);
  const parsedCourtsCount = parseSetting(form.courtsCount, 3, 1, 10);
  const parsedRoundDurationMinutes = parseSetting(form.roundDurationMinutes, 20, 5, 60);
  const parsedMalesPerGroup = parseSetting(form.malesPerGroup, 3, 1, 10);
  const parsedFemalesPerGroup = parseSetting(form.femalesPerGroup, 2, 1, 10);
  const parsedMaxConsecutivePlayingLimit = parseSetting(
    form.maxConsecutivePlayingLimit,
    DEFAULT_MAX_CONSECUTIVE_PLAYING_LIMIT,
    1,
    10
  );
  const parsedMaxConsecutiveRestingLimit = parseSetting(
    form.maxConsecutiveRestingLimit,
    DEFAULT_MAX_CONSECUTIVE_RESTING_LIMIT,
    1,
    10
  );

  const fetchTournament = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${id}`);
    if (res.ok) {
      const data = await res.json() as TournamentResponse;
      setTournament(data.tournament);
      const fetchedGroups = (data.groups || []).sort((a, b) => a.sortOrder - b.sortOrder);
      setGroups(fetchedGroups);
      setGroupCount(String(fetchedGroups.length || 5));
      setGroupEdits(fetchedGroups.map((g: GroupInfo) => ({ icon: g.icon, name: g.name })));
      setForm({
        name: data.tournament.name,
        courtsCount: String(data.tournament.courtsCount),
        roundDurationMinutes: String(data.tournament.roundDurationMinutes),
        scoringMode: data.tournament.scoringMode,
        eventDate: data.tournament.eventDate || "",
        startTime: data.tournament.startTime || "09:00",
        endTime: data.tournament.endTime || "19:00",
        malesPerGroup: String(data.tournament.malesPerGroup),
        femalesPerGroup: String(data.tournament.femalesPerGroup),
        maxConsecutivePlayingLimit: String(DEFAULT_MAX_CONSECUTIVE_PLAYING_LIMIT),
        maxConsecutiveRestingLimit: String(DEFAULT_MAX_CONSECUTIVE_RESTING_LIMIT),
      });
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchTournament();
  }, [fetchTournament]);

  const buildSettingsPayload = () => ({
    name: form.name.trim(),
    courtsCount: parsedCourtsCount,
    roundDurationMinutes: parsedRoundDurationMinutes,
    scoringMode: form.scoringMode,
    eventDate: form.eventDate || null,
    startTime: form.startTime || "09:00",
    endTime: form.endTime || "19:00",
    malesPerGroup: parsedMalesPerGroup,
    femalesPerGroup: parsedFemalesPerGroup,
    groupCount: parsedGroupCount,
  });

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch(`/api/tournaments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSettingsPayload()),
      });
      await fetchTournament();
    } finally {
      setSaving(false);
    }
  };

  const runSimulation = async () => {
    setSimulating(true);
    try {
      await fetch(`/api/tournaments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSettingsPayload()),
      });
      const res = await fetch(`/api/tournaments/${id}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxConsecutivePlayingLimit: parsedMaxConsecutivePlayingLimit,
          maxConsecutiveRestingLimit: parsedMaxConsecutiveRestingLimit,
        }),
      });
      if (res.ok) {
        const data = await res.json() as SimulationResult;
        setSimulation(data);
      }
    } finally {
      setSimulating(false);
    }
  };

  const saveGroups = async () => {
    setSavingGroups(true);
    try {
      const groupUpdates = groups.map((g, i) => ({
        groupId: g.id,
        icon: groupEdits[i]?.icon || g.icon,
        name: groupEdits[i]?.name || g.name,
      }));
      const res = await fetch(`/api/tournaments/${id}/groups`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupUpdates }),
      });
      if (res.ok) {
        toast.success("分组代号已保存！");
        await fetchTournament();
      } else {
        toast.error("保存失败");
      }
    } finally {
      setSavingGroups(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-400">加载中...</div>;
  if (!tournament) return <div className="text-center py-12 text-gray-400">赛事不存在</div>;

  const playersPerGroup = parsedMalesPerGroup + parsedFemalesPerGroup;
  const totalPlayers = parsedGroupCount * playersPerGroup;

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
          <FlaskConical className="w-5 h-5 text-green-600" />
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-800">赛事模拟器</h1>
            <p className="text-xs text-gray-400">调整参数，实时模拟赛程</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={saveSettings} disabled={saving} className="border-green-200 text-green-700 hover:bg-green-50 font-semibold">
            <Save className="w-3.5 h-3.5 mr-1" />{saving ? "保存中..." : "保存"}
          </Button>
          <Button size="sm" onClick={runSimulation} disabled={simulating} className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-md">
            <Play className="w-3.5 h-3.5 mr-1" />{simulating ? "模拟中..." : "运行模拟"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Config Panel */}
        <div className="space-y-4">
          <Card className="border-green-100 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-700">📝 基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-600 font-medium">赛事名称</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border-green-200 focus:ring-green-400" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-600 font-medium">比赛日期</Label>
                <Input
                  type="date"
                  value={form.eventDate}
                  onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                  className="w-full min-w-0 border-green-200 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-gray-600 font-medium">开始时间</Label>
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full min-w-0 border-green-200 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-600 font-medium">结束时间</Label>
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full min-w-0 border-green-200 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-100 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-700 flex items-center gap-1.5"><Users className="w-4 h-4" /> 分组设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-600 font-medium">小组数</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={groupCount}
                  onChange={(e) => setGroupCount(sanitizeIntegerInput(e.target.value))}
                  className="border-blue-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-gray-600 font-medium">每组男生</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.malesPerGroup}
                    onChange={(e) => updateNumericField("malesPerGroup", e.target.value)}
                    className="border-blue-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-600 font-medium">每组女生</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.femalesPerGroup}
                    onChange={(e) => updateNumericField("femalesPerGroup", e.target.value)}
                    className="border-blue-200"
                  />
                </div>
              </div>
              <div className="rounded-xl bg-gradient-to-r from-blue-50 to-green-50 p-3 text-sm border border-blue-100">
                <div className="flex justify-between">
                  <span className="text-gray-500">每组人数</span>
                  <span className="font-bold text-gray-700">{playersPerGroup} 人</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-500">总参赛人数</span>
                  <span className="font-extrabold text-green-600">{totalPlayers} 人</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Group Customization */}
          {groups.length > 0 && (
            <Card className="border-violet-100 shadow-sm bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-gray-700 flex items-center gap-1.5">
                  <Palette className="w-4 h-4" /> 分组代号
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto text-xs border-violet-200 text-violet-600 hover:bg-violet-50"
                    onClick={saveGroups}
                    disabled={savingGroups}
                  >
                    <Save className="w-3 h-3 mr-1" />
                    {savingGroups ? "保存中..." : "保存代号"}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {groups.map((g, i) => (
                  <div key={g.id} className="flex items-center gap-2">
                    <Input
                      value={groupEdits[i]?.icon || ""}
                      onChange={(e) => {
                        const updated = [...groupEdits];
                        updated[i] = { ...updated[i], icon: e.target.value };
                        setGroupEdits(updated);
                      }}
                      className="w-16 text-center text-lg border-violet-200"
                      placeholder="图标"
                    />
                    <Input
                      value={groupEdits[i]?.name || ""}
                      onChange={(e) => {
                        const updated = [...groupEdits];
                        updated[i] = { ...updated[i], name: e.target.value };
                        setGroupEdits(updated);
                      }}
                      className="flex-1 border-violet-200"
                      placeholder="队名"
                    />
                  </div>
                ))}
                <p className="text-xs text-gray-400 mt-1">图标可以是 emoji、文字或符号，队名可以完全自定义</p>
              </CardContent>
            </Card>
          )}

          <Card className="border-amber-100 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-700 flex items-center gap-1.5"><Landmark className="w-4 h-4" /> 比赛设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-600 font-medium">场地数</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.courtsCount}
                  onChange={(e) => updateNumericField("courtsCount", e.target.value)}
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
                  onChange={(e) => updateNumericField("roundDurationMinutes", e.target.value)}
                  className="border-amber-200"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-gray-600 font-medium">连续上场上限</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.maxConsecutivePlayingLimit}
                    onChange={(e) => updateNumericField("maxConsecutivePlayingLimit", e.target.value)}
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
                    onChange={(e) => updateNumericField("maxConsecutiveRestingLimit", e.target.value)}
                    className="border-amber-200"
                  />
                </div>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-xs text-amber-800">
                模拟器会尽量避开超过该上限的排布，并在质量报告中把超限选手标为异常。
              </div>
              <div className="space-y-2">
                <Label className="text-gray-600 font-medium">计分方式</Label>
                <Select value={form.scoringMode} onValueChange={(v: string | null) => { if (v) setForm({ ...form, scoringMode: v }); }}>
                  <SelectTrigger className="border-amber-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCORING_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Simulation Results */}
        <div className="lg:col-span-2 space-y-4">
          {!simulation ? (
            <Card className="border-dashed border-2 border-green-200 bg-green-50/30">
              <CardContent className="py-16 text-center">
                <FlaskConical className="w-12 h-12 text-green-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg mb-2 font-bold">点击「运行模拟」查看赛程预览</p>
                <p className="text-gray-400 text-sm">调整左侧参数后，随时可以重新模拟</p>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full grid grid-cols-3 bg-green-50 border border-green-200">
                <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-green-700 data-[state=active]:shadow-sm font-semibold"><BarChart3 className="w-3.5 h-3.5 mr-1" /> 总览</TabsTrigger>
                <TabsTrigger value="schedule" className="data-[state=active]:bg-white data-[state=active]:text-green-700 data-[state=active]:shadow-sm font-semibold"><CalendarDays className="w-3.5 h-3.5 mr-1" /> 赛程矩阵</TabsTrigger>
                <TabsTrigger value="quality" className="data-[state=active]:bg-white data-[state=active]:text-green-700 data-[state=active]:shadow-sm font-semibold"><FileText className="w-3.5 h-3.5 mr-1" /> 质量报告</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
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
                        {Math.floor(simulation.estimatedDurationMinutes / 60)}h{simulation.estimatedDurationMinutes % 60}m
                      </div>
                      <div className="text-xs text-gray-500 mt-1 font-medium">预计时长</div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-violet-50">
                    <CardContent className="pt-4 pb-3 text-center">
                      <div className="text-3xl font-extrabold text-purple-600">
                        {Math.floor(simulation.availableMinutes / 60)}h{simulation.availableMinutes % 60}m
                      </div>
                      <div className="text-xs text-gray-500 mt-1 font-medium">可用时间</div>
                    </CardContent>
                  </Card>
                </div>

                {simulation.warnings.length > 0 && (
                  <Card className="border-amber-200 bg-amber-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-amber-700 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> 注意事项</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm">
                        {simulation.warnings.map((w, i) => (
                          <li key={i} className="text-amber-700">• {w}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {simulation.isOverTime ? (
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="py-4 text-center">
                      <span className="text-red-600 font-bold">❌ 超时！请减少小组数、增加场地、或缩短单场时间</span>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="py-4 text-center">
                      <span className="text-green-600 font-bold">✅ 时间充裕，可以在规定时间内完成所有比赛</span>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="schedule" className="mt-4">
                <ScheduleMatrix
                  schedule={simulation.schedule}
                  totalRounds={simulation.totalRounds}
                  courtsCount={parsedCourtsCount}
                  startTime={form.startTime}
                  roundDurationMinutes={parsedRoundDurationMinutes}
                  groups={simulation.groups}
                />
              </TabsContent>

              <TabsContent value="quality" className="mt-4">
                <QualityReport
                  playerStats={simulation.playerStats}
                  groups={simulation.groups}
                  roundDurationMinutes={parsedRoundDurationMinutes}
                  maxConsecutivePlayingLimit={parsedMaxConsecutivePlayingLimit}
                  maxConsecutiveRestingLimit={parsedMaxConsecutiveRestingLimit}
                />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
