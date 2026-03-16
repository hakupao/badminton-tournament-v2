"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTournament } from "@/lib/tournament-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, Plus, RotateCcw, Save, Trash2, Info, ArrowLeft } from "lucide-react";
import Link from "next/link";

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

function TemplateContent() {
  const { currentId } = useTournament();
  const tournamentId = currentId ? String(currentId) : "1";
  const [positions, setPositions] = useState<Position[]>([]);
  const [matches, setMatches] = useState<TemplateMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchTemplate = useCallback(async () => {
    try {
      // Fetch both tournament info (for malesPerGroup/femalesPerGroup) and template
      const [tournRes, tmplRes] = await Promise.all([
        fetch(`/api/tournaments/${tournamentId}`),
        fetch(`/api/tournaments/${tournamentId}/template`),
      ]);
      const tournData: any = await tournRes.json();
      const data: any = await tmplRes.json();

      // Build positions from tournament settings (always in sync)
      const males = tournData.tournament?.malesPerGroup || 3;
      const females = tournData.tournament?.femalesPerGroup || 2;
      const total = males + females;
      const derivedPositions: Position[] = [];
      for (let i = 1; i <= total; i++) {
        derivedPositions.push({
          positionNumber: i,
          gender: i <= males ? "M" : "F",
        });
      }
      setPositions(derivedPositions);

      if (data.matches?.length > 0) {
        setMatches(data.matches.map((m: TemplateMatch) => ({
          matchType: m.matchType,
          homePos1: m.homePos1,
          homePos2: m.homePos2,
          awayPos1: m.awayPos1,
          awayPos2: m.awayPos2,
        })));
      } else {
        // Default 5 matches
        setMatches([
          { matchType: "MD", homePos1: 1, homePos2: 2, awayPos1: 1, awayPos2: 2 },
          { matchType: "MD", homePos1: 2, homePos2: 3, awayPos1: 2, awayPos2: 3 },
          { matchType: "WD", homePos1: males + 1, homePos2: males + 2, awayPos1: males + 1, awayPos2: males + 2 },
          { matchType: "XD", homePos1: 1, homePos2: males + 1, awayPos1: 1, awayPos2: males + 1 },
          { matchType: "XD", homePos1: 3, homePos2: males + females, awayPos1: 3, awayPos2: males + females },
        ]);
      }
    } catch {
      toast.error("加载模板失败");
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  const malePositions = positions.filter((p) => p.gender === "M");
  const femalePositions = positions.filter((p) => p.gender === "F");

  const getValidPositions = (matchType: string) => {
    if (matchType === "MD") return malePositions;
    if (matchType === "WD") return femalePositions;
    return positions; // XD can use any
  };

  const addMatch = () => {
    const defaultM = malePositions[0]?.positionNumber || 1;
    const defaultF = femalePositions[0]?.positionNumber || 4;
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

    updated[index] = m;
    setMatches(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/template`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions, matches }),
      });
      if (res.ok) {
        toast.success("模板已保存");
      } else {
        const data: any = await res.json();
        toast.error(data.error || "保存失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPositions([
      { positionNumber: 1, gender: "M" },
      { positionNumber: 2, gender: "M" },
      { positionNumber: 3, gender: "M" },
      { positionNumber: 4, gender: "F" },
      { positionNumber: 5, gender: "F" },
    ]);
    setMatches([
      { matchType: "MD", homePos1: 1, homePos2: 2, awayPos1: 1, awayPos2: 2 },
      { matchType: "MD", homePos1: 2, homePos2: 3, awayPos1: 2, awayPos2: 3 },
      { matchType: "WD", homePos1: 4, homePos2: 5, awayPos1: 4, awayPos2: 5 },
      { matchType: "XD", homePos1: 1, homePos2: 4, awayPos1: 1, awayPos2: 4 },
      { matchType: "XD", homePos1: 3, homePos2: 5, awayPos1: 3, awayPos2: 5 },
    ]);
    toast.info("已重置为默认模板");
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-400">加载中...</div>;
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
        <div className="flex gap-2">
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
              <Badge
                key={pos.positionNumber}
                variant="outline"
                className={`text-sm px-3 py-1 ${
                  pos.gender === "M"
                    ? "border-blue-200 text-blue-700 bg-blue-50"
                    : "border-pink-200 text-pink-700 bg-pink-50"
                }`}
              >
                {pos.gender === "M" ? "♂" : "♀"} {pos.positionNumber}号位
              </Badge>
            ))}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span>♂ 男选手 × {malePositions.length}</span>
            <span>♀ 女选手 × {femalePositions.length}</span>
            <span>共 {positions.length} 人/组</span>
          </div>
        </CardContent>
      </Card>

      {/* Match Stats */}
      <div className="grid grid-cols-4 gap-3">
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
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
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

                {/* Home vs Away - stacked on mobile, side by side on desktop */}
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                  {/* Home positions */}
                  <div className="w-full sm:flex-1 space-y-1.5">
                    <div className="text-xs text-gray-400 font-medium text-center">主队 (A组)</div>
                    <div className="flex gap-2 justify-center">
                      <Select
                        value={String(match.homePos1)}
                        onValueChange={(v) => v && updateMatch(idx, "homePos1", v)}
                      >
                        <SelectTrigger className="h-8 w-16 sm:w-20 text-sm border-gray-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(match.matchType === "XD" ? positions : validPositions).map((p) => (
                            <SelectItem key={p.positionNumber} value={String(p.positionNumber)}>
                              {p.gender === "M" ? "♂" : "♀"}{p.positionNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={String(match.homePos2)}
                        onValueChange={(v) => v && updateMatch(idx, "homePos2", v)}
                      >
                        <SelectTrigger className="h-8 w-16 sm:w-20 text-sm border-gray-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(match.matchType === "XD" ? positions : validPositions).map((p) => (
                            <SelectItem key={p.positionNumber} value={String(p.positionNumber)}>
                              {p.gender === "M" ? "♂" : "♀"}{p.positionNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* VS */}
                  <div className="text-center text-gray-400 font-bold text-sm shrink-0">VS</div>

                  {/* Away positions */}
                  <div className="w-full sm:flex-1 space-y-1.5">
                    <div className="text-xs text-gray-400 font-medium text-center">客队 (B组)</div>
                    <div className="flex gap-2 justify-center">
                      <Select
                        value={String(match.awayPos1)}
                        onValueChange={(v) => v && updateMatch(idx, "awayPos1", v)}
                      >
                        <SelectTrigger className="h-8 w-16 sm:w-20 text-sm border-gray-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(match.matchType === "XD" ? positions : validPositions).map((p) => (
                            <SelectItem key={p.positionNumber} value={String(p.positionNumber)}>
                              {p.gender === "M" ? "♂" : "♀"}{p.positionNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={String(match.awayPos2)}
                        onValueChange={(v) => v && updateMatch(idx, "awayPos2", v)}
                      >
                        <SelectTrigger className="h-8 w-16 sm:w-20 text-sm border-gray-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(match.matchType === "XD" ? positions : validPositions).map((p) => (
                            <SelectItem key={p.positionNumber} value={String(p.positionNumber)}>
                              {p.gender === "M" ? "♂" : "♀"}{p.positionNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {matches.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              暂无比赛，点击"添加比赛"开始配置
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
              每次两个小组对抗时，将按照此模板进行 {matches.length} 场比赛。位置号对应小组内的选手编号（如 ♂1号 = 男1号位选手）。主队和客队使用相同位置号意味着{"\u201C"}镜像对阵{"\u201D"}——即双方派出相同位置的选手。
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
