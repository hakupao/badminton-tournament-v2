"use client";

import { Suspense, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTournament } from "@/lib/tournament-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PositionBadge, PositionLabel } from "@/components/player/position-label";
import { toast } from "sonner";
import { FileText, Plus, RotateCcw, Save, Trash2, Info, ArrowLeft, Mars, Venus } from "lucide-react";
import Link from "next/link";
import { buildDefaultTemplate, buildTemplatePositions } from "@/lib/constants";

interface Position {
  positionNumber: number;
  gender: "M" | "F";
}

interface TemplateMatch {
  matchType: "MD" | "WD" | "XD";
  homePos1: number;
  homePos2: number;
  awayPos1: number;
  awayPos2: number;
}

const MATCH_TYPE_OPTIONS = [
  { value: "MD", label: "男双", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "WD", label: "女双", color: "bg-pink-50 text-pink-700 border-pink-200" },
  { value: "XD", label: "混双", color: "bg-purple-50 text-purple-700 border-purple-200" },
];

function getMatchTypeColor(type: string) {
  return MATCH_TYPE_OPTIONS.find((o) => o.value === type)?.color || "";
}

function getMatchTypeLabel(type: string) {
  return MATCH_TYPE_OPTIONS.find((o) => o.value === type)?.label || type;
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

function TemplateContent() {
  const { currentId, loading: tournamentLoading } = useTournament();
  const [positions, setPositions] = useState<Position[]>([]);
  const [matches, setMatches] = useState<TemplateMatch[]>([]);
  const [loadedTournamentId, setLoadedTournamentId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tournamentLoading || !currentId) return;

    let cancelled = false;

    async function fetchTemplate() {
      try {
        const [tournRes, tmplRes] = await Promise.all([
          fetch(`/api/tournaments/${currentId}`),
          fetch(`/api/tournaments/${currentId}/template`),
        ]);

        if (!tournRes.ok || !tmplRes.ok) {
          throw new Error("Failed to fetch template");
        }

        const tournData = await tournRes.json() as {
          tournament?: { malesPerGroup?: number; femalesPerGroup?: number };
        };
        const data = await tmplRes.json() as { matches?: TemplateMatch[] };

        if (cancelled) return;

        const males = tournData.tournament?.malesPerGroup || 3;
        const females = tournData.tournament?.femalesPerGroup || 2;
        const derivedPositions = buildTemplatePositions(males, females);
        setPositions(derivedPositions);

        const templateMatches = data.matches ?? [];
        if (templateMatches.length > 0) {
          setMatches(templateMatches.map((m) => ({
            matchType: m.matchType,
            homePos1: m.homePos1,
            homePos2: m.homePos2,
            awayPos1: m.homePos1,
            awayPos2: m.homePos2,
          })));
        } else {
          setMatches(buildMirroredDefaults(males, females));
        }
      } catch {
        if (cancelled) return;

        setPositions([]);
        setMatches([]);
        toast.error("加载模板失败");
      } finally {
        if (!cancelled) {
          setLoadedTournamentId(currentId);
        }
      }
    }

    void fetchTemplate();

    return () => {
      cancelled = true;
    };
  }, [currentId, tournamentLoading]);

  const malePositions = positions.filter((p) => p.gender === "M");
  const femalePositions = positions.filter((p) => p.gender === "F");

  const getValidPositions = (matchType: string) => {
    if (matchType === "MD") return malePositions;
    if (matchType === "WD") return femalePositions;
    return positions; // XD can use any
  };

  const addMatch = () => {
    const defaultM = malePositions[0]?.positionNumber || 1;
    setMatches([...matches, {
      matchType: "MD",
      homePos1: defaultM,
      homePos2: malePositions[1]?.positionNumber || defaultM,
      awayPos1: defaultM,
      awayPos2: malePositions[1]?.positionNumber || defaultM,
    }]);
  };

  const removeMatch = (index: number) => {
    setMatches(matches.filter((_, i) => i !== index));
  };

  const updateMatch = (index: number, field: keyof TemplateMatch, value: string | number) => {
    const updated = [...matches];
    const m = { ...updated[index] };

    if (field === "matchType") {
      m.matchType = value as "MD" | "WD" | "XD";
      // Reset positions when type changes
      if (value === "MD") {
        m.homePos1 = malePositions[0]?.positionNumber || 1;
        m.homePos2 = malePositions[1]?.positionNumber || m.homePos1;
        m.awayPos1 = m.homePos1;
        m.awayPos2 = m.homePos2;
      } else if (value === "WD") {
        m.homePos1 = femalePositions[0]?.positionNumber || 4;
        m.homePos2 = femalePositions[1]?.positionNumber || m.homePos1;
        m.awayPos1 = m.homePos1;
        m.awayPos2 = m.homePos2;
      } else {
        m.homePos1 = malePositions[0]?.positionNumber || 1;
        m.homePos2 = femalePositions[0]?.positionNumber || 4;
        m.awayPos1 = m.homePos1;
        m.awayPos2 = m.homePos2;
      }
    } else {
      (m as Record<string, unknown>)[field] = Number(value);
    }

    updated[index] = syncMirroredMatch(m);
    setMatches(updated);
  };

  const handleSave = async () => {
    if (!currentId) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/tournaments/${currentId}/template`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions, matches: matches.map(syncMirroredMatch) }),
      });
      if (res.ok) {
        toast.success("模板已保存");
      } else {
        const data = await res.json() as { error?: string };
        toast.error(data.error || "保存失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const males = malePositions.length;
    const females = femalePositions.length;
    setPositions(buildTemplatePositions(males, females));
    setMatches(buildMirroredDefaults(males, females));
    toast.info("已重置为默认模板");
  };

  if (tournamentLoading || (currentId !== null && loadedTournamentId !== currentId)) {
    return <div className="text-center py-12 text-gray-400">加载中...</div>;
  }

  if (!currentId) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-2.5">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-1 text-gray-500">
              <ArrowLeft className="w-4 h-4" /> 返回
            </Button>
          </Link>
          <FileText className="w-5 h-5 text-purple-600" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-green-900">比赛模板</h1>
            <p className="text-xs text-gray-400">请先回到管理后台选择一个赛事</p>
          </div>
        </div>
        <Card className="border-dashed border-gray-200">
          <CardContent className="py-10 text-center text-gray-400 text-sm">
            请选择赛事后再配置模板
          </CardContent>
        </Card>
      </div>
    );
  }

  const mdCount = matches.filter((m) => m.matchType === "MD").length;
  const wdCount = matches.filter((m) => m.matchType === "WD").length;
  const xdCount = matches.filter((m) => m.matchType === "XD").length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-1 text-gray-500">
              <ArrowLeft className="w-4 h-4" /> 返回
            </Button>
          </Link>
          <FileText className="w-5 h-5 text-purple-600" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-green-900">比赛模板</h1>
            <p className="text-xs text-gray-400">定义每次小组对抗的比赛场次和人员安排</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-gray-200 text-gray-500"
            onClick={handleReset}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            恢复默认
          </Button>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white shadow-md gap-1"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "保存中..." : "保存模板"}
          </Button>
        </div>
      </div>

      {/* Positions Overview */}
      <Card className="border-green-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-gray-800">位置编制</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {positions.map((pos) => (
              <PositionBadge
                key={pos.positionNumber}
                className={`h-8 px-3 text-sm leading-none ${
                  pos.gender === "M"
                    ? "border-blue-200 text-blue-700 bg-blue-50"
                    : "border-pink-200 text-pink-700 bg-pink-50"
                }`}
                gender={pos.gender}
                positionNumber={pos.positionNumber}
                suffix="号位"
              />
            ))}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1"><Mars className="w-3 h-3 shrink-0" />男选手 × {malePositions.length}</span>
            <span className="inline-flex items-center gap-1"><Venus className="w-3 h-3 shrink-0" />女选手 × {femalePositions.length}</span>
            <span>共 {positions.length} 人/组</span>
          </div>
        </CardContent>
      </Card>

      {/* Match Stats */}
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

      {/* Match List */}
      <Card className="border-green-100 shadow-sm">
        <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base text-gray-800">对阵安排</CardTitle>
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
          {matches.map((match, idx) => {
            const validPositions = getValidPositions(match.matchType);

            return (
              <div
                key={idx}
                className="border border-gray-100 rounded-lg p-4 hover:border-green-200 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-400">#{idx + 1}</span>
                    <Badge className={`${getMatchTypeColor(match.matchType)} border`}>
                      {getMatchTypeLabel(match.matchType)}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-red-500 h-7 w-7 p-0"
                    onClick={() => removeMatch(idx)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Match Type Selector */}
                <div className="mb-3">
                  <Select
                    value={match.matchType}
                    onValueChange={(v) => v && updateMatch(idx, "matchType", v)}
                  >
                    <SelectTrigger className="h-8 text-sm border-gray-200 w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MATCH_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
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
                      onValueChange={(v) => v && updateMatch(idx, "homePos1", v)}
                    >
                      <SelectTrigger className="h-8 flex-1 text-sm border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(match.matchType === "XD" ? positions : validPositions).map((p) => (
                          <SelectItem key={p.positionNumber} value={String(p.positionNumber)}>
                            <PositionLabel
                              gender={p.gender}
                              positionNumber={p.positionNumber}
                              suffix=""
                              className="gap-0.5"
                            />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={String(match.homePos2)}
                      onValueChange={(v) => v && updateMatch(idx, "homePos2", v)}
                    >
                      <SelectTrigger className="h-8 flex-1 text-sm border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(match.matchType === "XD" ? positions : validPositions).map((p) => (
                          <SelectItem key={p.positionNumber} value={String(p.positionNumber)}>
                            <PositionLabel
                              gender={p.gender}
                              positionNumber={p.positionNumber}
                              suffix=""
                              className="gap-0.5"
                            />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500">
                    主客队自动镜像：A组 {match.homePos1} + {match.homePos2} vs B组 {match.homePos1} + {match.homePos2}
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

      {/* Explanation */}
      <Card className="border-amber-100 bg-amber-50/50 shadow-sm">
        <CardContent className="py-4">
          <div className="text-sm text-amber-800 flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <strong>说明：</strong>
              每次两个小组对抗时，将按照此模板进行 {matches.length} 场比赛。位置号对应小组内的选手编号（如 <span className="inline-flex items-center gap-0.5"><Mars className="w-3 h-3 shrink-0 inline" />1号</span> = 男1号位选手）。主队和客队使用相同位置号意味着{"\u201C"}镜像对阵{"\u201D"}——即双方派出相同位置的选手。
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TemplatePage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-400">加载中...</div>}>
      <TemplateContent />
    </Suspense>
  );
}
