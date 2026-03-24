"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEFAULT_MAX_CONSECUTIVE_PLAYING_LIMIT,
  DEFAULT_MAX_CONSECUTIVE_RESTING_LIMIT,
} from "@/lib/constants";
import { FileText, AlertTriangle } from "lucide-react";

interface PlayerStat {
  groupIndex: number;
  position: number;
  gender: string;
  totalMatches: number;
  totalRounds: number;
  maxConsecutivePlaying: number;
  maxConsecutiveResting: number;
  maxRestMinutes?: number;
}

interface QualityReportProps {
  playerStats: PlayerStat[];
  groups: Array<{ icon: string; name: string }>;
  roundDurationMinutes?: number;
  maxConsecutivePlayingLimit?: number;
  maxConsecutiveRestingLimit?: number;
}

export function QualityReport({
  playerStats,
  groups,
  roundDurationMinutes = 20,
  maxConsecutivePlayingLimit = DEFAULT_MAX_CONSECUTIVE_PLAYING_LIMIT,
  maxConsecutiveRestingLimit = DEFAULT_MAX_CONSECUTIVE_RESTING_LIMIT,
}: QualityReportProps) {
  const hasWarnings = playerStats.some(
    (p) =>
      p.maxConsecutivePlaying > maxConsecutivePlayingLimit ||
      p.maxConsecutiveResting > maxConsecutiveRestingLimit
  );

  return (
    <Card className="border-green-100 shadow-sm bg-white overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-gray-700 flex items-center gap-1.5"><FileText className="w-4 h-4" /> 排布质量报告</CardTitle>
          {hasWarnings ? (
            <span className="text-xs font-bold px-2.5 py-1 squircle-pill bg-red-100 text-red-600 border border-red-200">有异常</span>
          ) : (
            <span className="text-xs font-bold px-2.5 py-1 squircle-pill bg-green-100 text-green-600 border border-green-200">质量良好</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-green-100 bg-green-50/50">
                <th className="p-3 text-left font-semibold text-gray-600 whitespace-nowrap">代号</th>
                <th className="p-3 text-center font-semibold text-gray-600 whitespace-nowrap">性别</th>
                <th className="p-3 text-center font-semibold text-gray-600 whitespace-nowrap">总上场</th>
                <th className="p-3 text-center font-semibold text-gray-600 whitespace-nowrap">
                  <span className="sm:hidden">连上</span>
                  <span className="hidden sm:inline">最大连续上场</span>
                </th>
                <th className="p-3 text-center font-semibold text-gray-600 whitespace-nowrap">
                  <span className="sm:hidden">连空</span>
                  <span className="hidden sm:inline">最大连续轮空</span>
                </th>
                <th className="p-3 text-center font-semibold text-gray-600 whitespace-nowrap">
                  最长休息
                </th>
              </tr>
            </thead>
            <tbody>
              {playerStats.map((stat, idx) => {
                const group = groups[stat.groupIndex];
                const isPlayingWarning =
                  stat.maxConsecutivePlaying > maxConsecutivePlayingLimit;
                const isRestingWarning =
                  stat.maxConsecutiveResting > maxConsecutiveRestingLimit;
                const hasAnyWarning = isPlayingWarning || isRestingWarning;
                const restMinutes = stat.maxRestMinutes ?? stat.maxConsecutiveResting * roundDurationMinutes;

                return (
                  <tr
                    key={idx}
                    className={`border-b border-gray-100 transition-colors ${
                      hasAnyWarning ? "bg-red-50/50" : "hover:bg-green-50/30"
                    }`}
                  >
                    <td className="p-3">
                      <span className="font-bold text-gray-700">
                        {group?.icon} {group?.name?.replace("队", "")}-{stat.position}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 squircle-pill ${stat.gender === "M" ? "bg-blue-100 text-blue-600" : "bg-pink-100 text-pink-600"}`}>
                        {stat.gender === "M" ? "男" : "女"}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-gray-700">{stat.totalMatches}</td>
                    <td className="p-3 text-center">
                      <span className={`font-bold ${isPlayingWarning ? "text-red-500" : "text-gray-700"}`}>
                        {stat.maxConsecutivePlaying}
                        {isPlayingWarning && <AlertTriangle className="w-3 h-3 inline ml-1 text-red-500" />}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`font-bold ${isRestingWarning ? "text-amber-500" : "text-gray-700"}`}>
                        {stat.maxConsecutiveResting}
                        {isRestingWarning && <AlertTriangle className="w-3 h-3 inline ml-1 text-red-500" />}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`font-bold ${restMinutes >= 60 ? "text-amber-500" : "text-gray-500"}`}>
                        {restMinutes}分钟
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
