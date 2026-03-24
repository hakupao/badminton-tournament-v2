"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

const MATCH_TYPE_LABELS: Record<string, string> = {
  MD: "男双",
  WD: "女双",
  XD: "混双",
};

const MATCH_TYPE_STYLES: Record<string, string> = {
  MD: "bg-blue-50 border-blue-200 text-blue-700",
  WD: "bg-pink-50 border-pink-200 text-pink-700",
  XD: "bg-purple-50 border-purple-200 text-purple-700",
};

const MATCH_BADGE_STYLES: Record<string, string> = {
  MD: "bg-blue-100 text-blue-600 border-blue-200",
  WD: "bg-pink-100 text-pink-600 border-pink-200",
  XD: "bg-purple-100 text-purple-600 border-purple-200",
};

interface ScheduleMatch {
  roundNumber: number;
  courtNumber: number;
  homeGroupIndex: number;
  awayGroupIndex: number;
  matchType: string;
  homePos1: number;
  homePos2: number;
  awayPos1: number;
  awayPos2: number;
}

interface ScheduleMatrixProps {
  schedule: ScheduleMatch[];
  totalRounds: number;
  courtsCount: number;
  startTime: string;
  roundDurationMinutes: number;
  groups: Array<{ icon: string; name: string }>;
}

function getTimeSlot(startTime: string, roundIndex: number, duration: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const total = h * 60 + m + roundIndex * duration;
  const hh = Math.floor(total / 60).toString().padStart(2, "0");
  const mm = (total % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

export function ScheduleMatrix({
  schedule,
  totalRounds,
  courtsCount,
  startTime,
  roundDurationMinutes,
  groups,
}: ScheduleMatrixProps) {
  return (
    <Card className="border-green-100 shadow-sm bg-white overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-gray-700 flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> 赛程矩阵</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-green-100 bg-green-50/50">
                <th className="p-3 text-left font-semibold text-gray-600 sticky left-0 bg-green-50/90 backdrop-blur-sm min-w-[80px]">
                  轮次
                </th>
                {Array.from({ length: courtsCount }, (_, i) => (
                  <th key={i} className="p-3 text-center font-semibold text-gray-600 min-w-[180px]">
                    场地 {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: totalRounds }, (_, roundIdx) => {
                const roundNum = roundIdx + 1;
                const roundMatches = schedule.filter((m) => m.roundNumber === roundNum);

                return (
                  <tr key={roundNum} className="border-b border-gray-100 hover:bg-green-50/20 transition-colors">
                    <td className="p-3 sticky left-0 bg-white/90 backdrop-blur-sm">
                      <div className="font-bold text-gray-700">第{roundNum}轮</div>
                      <div className="text-xs text-gray-400 font-medium">
                        {getTimeSlot(startTime, roundIdx, roundDurationMinutes)}
                      </div>
                    </td>
                    {Array.from({ length: courtsCount }, (_, courtIdx) => {
                      const match = roundMatches.find((m) => m.courtNumber === courtIdx + 1);
                      if (!match) {
                        return (
                          <td key={courtIdx} className="p-3 text-center">
                            <span className="text-gray-300">—</span>
                          </td>
                        );
                      }

                      const homeGroup = groups[match.homeGroupIndex];
                      const awayGroup = groups[match.awayGroupIndex];
                      const cellStyle = MATCH_TYPE_STYLES[match.matchType] || "";
                      const badgeStyle = MATCH_BADGE_STYLES[match.matchType] || "";

                      return (
                        <td key={courtIdx} className="p-2">
                          <div className={`squircle-card border p-2.5 ${cellStyle} transition-shadow hover:shadow-md`}>
                            <div className="flex items-center justify-center gap-1 text-xs mb-1.5">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 squircle-pill border ${badgeStyle}`}>
                                {MATCH_TYPE_LABELS[match.matchType] || match.matchType}
                              </span>
                            </div>
                            <div className="flex items-center justify-center gap-1 text-xs font-bold">
                              <span>{homeGroup?.icon}</span>
                              <span>{match.homePos1}+{match.homePos2}</span>
                              <span className="text-gray-400 mx-0.5">vs</span>
                              <span>{awayGroup?.icon}</span>
                              <span>{match.awayPos1}+{match.awayPos2}</span>
                            </div>
                          </div>
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
  );
}
