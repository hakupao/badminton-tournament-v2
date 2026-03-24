"use client";

import { useCallback, useEffect, useState } from "react";
import {
  SlidersHorizontal,
  Users,
  FileText,
  RotateCcw,
  Plus,
  Trash2,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PositionBadge, PositionLabel } from "@/components/player/position-label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminPageHeader } from "@/components/layout/admin-page-header";
import { useTournament } from "@/lib/tournament-context";
import {
  buildDefaultTemplate,
  buildTemplatePositions,
} from "@/lib/constants";
import { parseIntegerInput, sanitizeIntegerInput } from "@/lib/utils";

interface TournamentDetail {
  malesPerGroup: number;
  femalesPerGroup: number;
}

interface TemplateMatch {
  matchType: "MD" | "WD" | "XD";
  homePos1: number;
  homePos2: number;
  awayPos1: number;
  awayPos2: number;
}

interface Position {
  positionNumber: number;
  gender: "M" | "F";
}

interface TournamentResponse {
  tournament?: TournamentDetail | null;
  groups?: Array<{ id: number }>;
}

interface TemplateResponse {
  matches?: TemplateMatch[];
}

interface ScheduleResponse {
  matches?: Array<{ id: number }>;
}

const MATCH_TYPE_OPTIONS = [
  { value: "MD", label: "男双", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "WD", label: "女双", color: "bg-pink-50 text-pink-700 border-pink-200" },
  { value: "XD", label: "混双", color: "bg-purple-50 text-purple-700 border-purple-200" },
] as const;

function getMatchTypeColor(type: string) {
  return MATCH_TYPE_OPTIONS.find((option) => option.value === type)?.color || "";
}

function getMatchTypeLabel(type: string) {
  return MATCH_TYPE_OPTIONS.find((option) => option.value === type)?.label || type;
}

function syncMirroredMatch(match: TemplateMatch): TemplateMatch {
  return {
    ...match,
    awayPos1: match.homePos1,
    awayPos2: match.homePos2,
  };
}

function buildMirroredDefaults(males: number, females: number): TemplateMatch[] {
  return buildDefaultTemplate(males, females).matches.map((match) => ({
    matchType: match.matchType,
    homePos1: match.homePos1,
    homePos2: match.homePos2,
    awayPos1: match.homePos1,
    awayPos2: match.homePos2,
  }));
}

function normalizeTemplateSignature(matches: TemplateMatch[]) {
  return JSON.stringify(matches.map(syncMirroredMatch));
}

export default function AdminRulesPage() {
  const { currentId, loading: tournamentLoading } = useTournament();
  const [loading, setLoading] = useState(true);
  const [loadedTournamentId, setLoadedTournamentId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasFormalSchedule, setHasFormalSchedule] = useState(false);
  const [groupCount, setGroupCount] = useState("5");
  const [malesPerGroup, setMalesPerGroup] = useState("3");
  const [femalesPerGroup, setFemalesPerGroup] = useState("2");
  const [matches, setMatches] = useState<TemplateMatch[]>([]);
  const [initialGroupCount, setInitialGroupCount] = useState(5);
  const [initialMalesPerGroup, setInitialMalesPerGroup] = useState(3);
  const [initialFemalesPerGroup, setInitialFemalesPerGroup] = useState(2);
  const [initialTemplateSignature, setInitialTemplateSignature] = useState(
    normalizeTemplateSignature(buildMirroredDefaults(3, 2))
  );

  const parsedGroupCount = parseIntegerInput(groupCount, 5, { min: 2, max: 20 });
  const parsedMalesPerGroup = parseIntegerInput(malesPerGroup, 3, { min: 1, max: 10 });
  const parsedFemalesPerGroup = parseIntegerInput(femalesPerGroup, 2, { min: 1, max: 10 });
  const positions = buildTemplatePositions(parsedMalesPerGroup, parsedFemalesPerGroup);
  const malePositions = positions.filter((position) => position.gender === "M");
  const femalePositions = positions.filter((position) => position.gender === "F");

  const getDefaultSignatureForShape = () =>
    normalizeTemplateSignature(buildMirroredDefaults(parsedMalesPerGroup, parsedFemalesPerGroup));

  const fetchData = useCallback(async () => {
    if (!currentId) {
      setLoadedTournamentId(null);
      setLoading(false);
      return;
    }

    const selectedTournamentId = currentId;
    setLoading(true);
    try {
      const [tournamentRes, templateRes, scheduleRes] = await Promise.all([
        fetch(`/api/tournaments/${currentId}`),
        fetch(`/api/tournaments/${currentId}/template`),
        fetch(`/api/tournaments/${currentId}/schedule`),
      ]);

      const tournamentData = await tournamentRes.json() as TournamentResponse;
      const templateData = await templateRes.json() as TemplateResponse;
      const scheduleData = await scheduleRes.json() as ScheduleResponse;

      const tournament = tournamentData.tournament;
      const nextGroupCount = tournamentData.groups?.length || 0;
      const nextMalesPerGroup = tournament?.malesPerGroup || 3;
      const nextFemalesPerGroup = tournament?.femalesPerGroup || 2;
      const nextMatches = (templateData.matches || []).length > 0
        ? (templateData.matches || []).map((match) => ({
            matchType: match.matchType,
            homePos1: match.homePos1,
            homePos2: match.homePos2,
            awayPos1: match.homePos1,
            awayPos2: match.homePos2,
          }))
        : buildMirroredDefaults(nextMalesPerGroup, nextFemalesPerGroup);

      setGroupCount(String(nextGroupCount || 5));
      setMalesPerGroup(String(nextMalesPerGroup));
      setFemalesPerGroup(String(nextFemalesPerGroup));
      setMatches(nextMatches);
      setInitialGroupCount(nextGroupCount || 5);
      setInitialMalesPerGroup(nextMalesPerGroup);
      setInitialFemalesPerGroup(nextFemalesPerGroup);
      setInitialTemplateSignature(normalizeTemplateSignature(nextMatches));
      setHasFormalSchedule((scheduleData.matches || []).length > 0);
    } catch {
      toast.error("加载赛制设置失败");
    } finally {
      setLoadedTournamentId(selectedTournamentId);
      setLoading(false);
    }
  }, [currentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetTemplateForShape = (nextMales: number, nextFemales: number) => {
    setMatches(buildMirroredDefaults(nextMales, nextFemales));
  };

  const updateGenderField = (
    field: "malesPerGroup" | "femalesPerGroup",
    rawValue: string
  ) => {
    const sanitized = sanitizeIntegerInput(rawValue);
    const nextMales = parseIntegerInput(
      field === "malesPerGroup" ? sanitized : malesPerGroup,
      3,
      { min: 1, max: 10 }
    );
    const nextFemales = parseIntegerInput(
      field === "femalesPerGroup" ? sanitized : femalesPerGroup,
      2,
      { min: 1, max: 10 }
    );

    if (field === "malesPerGroup") {
      setMalesPerGroup(sanitized);
    } else {
      setFemalesPerGroup(sanitized);
    }

    resetTemplateForShape(nextMales, nextFemales);
  };

  const getValidPositions = (matchType: string): Position[] => {
    if (matchType === "MD") return malePositions;
    if (matchType === "WD") return femalePositions;
    return positions;
  };

  const addMatch = () => {
    const defaultMale = malePositions[0]?.positionNumber || 1;
    const defaultFemale = femalePositions[0]?.positionNumber || defaultMale;
    setMatches((prev) => [
      ...prev,
      syncMirroredMatch({
        matchType: "MD",
        homePos1: defaultMale,
        homePos2: malePositions[1]?.positionNumber || defaultFemale,
        awayPos1: defaultMale,
        awayPos2: malePositions[1]?.positionNumber || defaultFemale,
      }),
    ]);
  };

  const removeMatch = (index: number) => {
    setMatches((prev) => prev.filter((_, matchIndex) => matchIndex !== index));
  };

  const updateMatch = (index: number, field: keyof TemplateMatch, value: string | number) => {
    setMatches((prev) => {
      const next = [...prev];
      const current = { ...next[index] };

      if (field === "matchType") {
        current.matchType = value as "MD" | "WD" | "XD";
        if (value === "MD") {
          current.homePos1 = malePositions[0]?.positionNumber || 1;
          current.homePos2 = malePositions[1]?.positionNumber || current.homePos1;
        } else if (value === "WD") {
          current.homePos1 = femalePositions[0]?.positionNumber || parsedMalesPerGroup + 1;
          current.homePos2 = femalePositions[1]?.positionNumber || current.homePos1;
        } else {
          current.homePos1 = malePositions[0]?.positionNumber || 1;
          current.homePos2 = femalePositions[0]?.positionNumber || current.homePos1;
        }
      } else {
        current[field] = Number(value) as never;
      }

      next[index] = syncMirroredMatch(current);
      return next;
    });
  };

  const handleResetTemplate = () => {
    setMatches(buildMirroredDefaults(parsedMalesPerGroup, parsedFemalesPerGroup));
    toast.info("模板草稿已恢复为当前编制的默认模板");
  };

  const handleSave = async () => {
    if (!currentId) return;

    const groupCountChanged = parsedGroupCount !== initialGroupCount;
    const rosterShapeChanged =
      parsedMalesPerGroup !== initialMalesPerGroup ||
      parsedFemalesPerGroup !== initialFemalesPerGroup;
    const currentTemplateSignature = normalizeTemplateSignature(matches);
    const templateNeedsSave = rosterShapeChanged
      ? currentTemplateSignature !== getDefaultSignatureForShape()
      : currentTemplateSignature !== initialTemplateSignature;

    if (!groupCountChanged && !rosterShapeChanged && !templateNeedsSave) {
      toast.info("当前没有需要保存的改动");
      return;
    }

    const warnings: string[] = [];
    if (groupCountChanged) {
      warnings.push("调整小组数会清空正式赛程，并按新的小组数重建所有队伍槽位。");
    }
    if (rosterShapeChanged) {
      warnings.push("调整每组男女人数会清空正式赛程、参赛者位置分配、账号绑定，并重置模板结构。");
    } else if (templateNeedsSave && hasFormalSchedule) {
      warnings.push("保存比赛模板会清空当前正式赛程以及已录入比分、裁判记录、得分时间线。");
    }

    if (warnings.length > 0 && !confirm(warnings.join("\n\n"))) {
      return;
    }

    setSaving(true);
    try {
      if (groupCountChanged || rosterShapeChanged) {
        const tournamentRes = await fetch(`/api/tournaments/${currentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            groupCount: parsedGroupCount,
            malesPerGroup: parsedMalesPerGroup,
            femalesPerGroup: parsedFemalesPerGroup,
          }),
        });

        if (!tournamentRes.ok) {
          const data = await tournamentRes.json() as { error?: string };
          toast.error(data.error || "保存分组设置失败");
          return;
        }
      }

      if (templateNeedsSave) {
        const templateRes = await fetch(`/api/tournaments/${currentId}/template`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            positions,
            matches: matches.map(syncMirroredMatch),
          }),
        });

        if (!templateRes.ok) {
          const data = await templateRes.json() as { error?: string };
          toast.error(data.error || "保存比赛模板失败");
          return;
        }
      }

      toast.success("赛制设置已保存");
      await fetchData();
    } catch {
      toast.error("网络错误");
    } finally {
      setSaving(false);
    }
  };

  if (tournamentLoading || (currentId !== null && loadedTournamentId !== currentId) || loading) {
    return <div className="text-center py-12 text-gray-400">加载中...</div>;
  }

  if (!currentId) {
    return (
      <div className="admin-page-medium">
        <AdminPageHeader
          title="赛制设置"
          icon={SlidersHorizontal}
          iconClassName="w-4.5 h-4.5 text-blue-600"
        />
        <Card className="border-dashed border-gray-200">
          <CardContent className="py-10 text-center text-gray-400 text-sm">
            请先回到管理后台选择一个赛事
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPlayers = parsedGroupCount * (parsedMalesPerGroup + parsedFemalesPerGroup);
  const mdCount = matches.filter((match) => match.matchType === "MD").length;
  const wdCount = matches.filter((match) => match.matchType === "WD").length;
  const xdCount = matches.filter((match) => match.matchType === "XD").length;

  return (
    <div className="admin-page-medium">
      <AdminPageHeader
        title="赛制设置"
        icon={SlidersHorizontal}
        iconClassName="w-4.5 h-4.5 text-blue-600"
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-200 text-gray-600"
              onClick={handleResetTemplate}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              恢复默认模板
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "保存中..." : "保存赛制设置"}
            </Button>
          </div>
        )}
      />

      <div className="admin-page-grid">
        <div className="admin-page-sidebar">
          <Card className="border-blue-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                分组编制
              </CardTitle>
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0 space-y-2">
                  <Label className="text-gray-600 font-medium">每组男生</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={malesPerGroup}
                    onChange={(e) => updateGenderField("malesPerGroup", e.target.value)}
                    className="border-blue-200"
                  />
                </div>
                <div className="min-w-0 space-y-2">
                  <Label className="text-gray-600 font-medium">每组女生</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={femalesPerGroup}
                    onChange={(e) => updateGenderField("femalesPerGroup", e.target.value)}
                    className="border-blue-200"
                  />
                </div>
              </div>
              <div className="squircle-card bg-gradient-to-r from-blue-50 to-cyan-50 p-3 text-sm border border-blue-100">
                <div className="flex justify-between">
                  <span className="text-gray-500">每组人数</span>
                  <span className="font-bold text-gray-700">{parsedMalesPerGroup + parsedFemalesPerGroup} 人</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-500">总参赛人数</span>
                  <span className="font-extrabold text-blue-600">{totalPlayers} 人</span>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        <div className="admin-page-main">
          <Card className="border-green-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-800">位置编制</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {positions.map((position) => (
                  <PositionBadge
                    key={position.positionNumber}
                    gender={position.gender}
                    positionNumber={position.positionNumber}
                    suffix="号位"
                    className={`h-8 px-3 text-sm ${
                      position.gender === "M"
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-pink-200 bg-pink-50 text-pink-700"
                    }`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="border-gray-100 shadow-sm text-center">
              <CardContent className="py-4">
                <div className="text-2xl font-bold text-gray-800">{matches.length}</div>
                <div className="text-xs text-gray-500">总场次</div>
              </CardContent>
            </Card>
            <Card className="border-blue-100 shadow-sm text-center">
              <CardContent className="py-4">
                <div className="text-2xl font-bold text-blue-600">{mdCount}</div>
                <div className="text-xs text-blue-500">男双</div>
              </CardContent>
            </Card>
            <Card className="border-pink-100 shadow-sm text-center">
              <CardContent className="py-4">
                <div className="text-2xl font-bold text-pink-600">{wdCount}</div>
                <div className="text-xs text-pink-500">女双</div>
              </CardContent>
            </Card>
            <Card className="border-purple-100 shadow-sm text-center">
              <CardContent className="py-4">
                <div className="text-2xl font-bold text-purple-600">{xdCount}</div>
                <div className="text-xs text-purple-500">混双</div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-green-100 shadow-sm">
            <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base text-gray-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-500" />
                比赛模板
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="border-green-200 text-green-700 hover:bg-green-50"
                onClick={addMatch}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                添加比赛
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {matches.map((match, index) => {
                const validPositions = getValidPositions(match.matchType);
                return (
                  <div
                    key={`${match.matchType}-${index}`}
                    className="border border-gray-100 squircle-lg p-4 hover:border-green-200 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-400">#{index + 1}</span>
                        <Badge className={`${getMatchTypeColor(match.matchType)} border`}>
                          {getMatchTypeLabel(match.matchType)}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-red-500 h-7 w-7 p-0"
                        onClick={() => removeMatch(index)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="mb-3">
                      <Select
                        value={match.matchType}
                        onValueChange={(value) => value && updateMatch(index, "matchType", value)}
                      >
                        <SelectTrigger className="h-8 text-sm border-gray-200 w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MATCH_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs text-gray-400 font-medium">出场组合</div>
                      <div className="flex gap-2">
                        <Select
                          value={String(match.homePos1)}
                          onValueChange={(value) => value && updateMatch(index, "homePos1", value)}
                        >
                          <SelectTrigger className="h-8 flex-1 text-sm border-gray-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(match.matchType === "XD" ? positions : validPositions).map((position) => (
                              <SelectItem
                                key={`home-1-${position.positionNumber}`}
                                value={String(position.positionNumber)}
                              >
                                <PositionLabel
                                  gender={position.gender}
                                  positionNumber={position.positionNumber}
                                  suffix=""
                                  className="gap-0.5"
                                />
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={String(match.homePos2)}
                          onValueChange={(value) => value && updateMatch(index, "homePos2", value)}
                        >
                          <SelectTrigger className="h-8 flex-1 text-sm border-gray-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(match.matchType === "XD" ? positions : validPositions).map((position) => (
                              <SelectItem
                                key={`home-2-${position.positionNumber}`}
                                value={String(position.positionNumber)}
                              >
                                <PositionLabel
                                  gender={position.gender}
                                  positionNumber={position.positionNumber}
                                  suffix=""
                                  className="gap-0.5"
                                />
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="squircle-sm bg-gray-50 px-3 py-2 text-xs text-gray-500">
                        客队自动镜像：A组 {match.homePos1} + {match.homePos2} vs B组 {match.homePos1} + {match.homePos2}
                      </div>
                    </div>
                  </div>
                );
              })}

              {matches.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  暂无比赛，点击“添加比赛”开始配置
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
