"use client";

import { PenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ScoreTimelineEvent {
  gameNumber: number;
  eventOrder: number;
  scoringSide: "home" | "away";
  homeScore: number;
  awayScore: number;
  timestamp: string;
}

interface ScoreTimelineCardProps {
  homeGroup: { icon: string; name: string };
  awayGroup: { icon: string; name: string };
  events: ScoreTimelineEvent[];
  live?: boolean;
  emptyMessage?: string;
}

export function normalizeScoreTimelineEvents(events: ScoreTimelineEvent[]) {
  const sortedEvents = [...events].sort((a, b) => {
    if (a.gameNumber !== b.gameNumber) return a.gameNumber - b.gameNumber;
    if (a.eventOrder !== b.eventOrder) return a.eventOrder - b.eventOrder;
    return a.timestamp.localeCompare(b.timestamp);
  });

  const normalized: ScoreTimelineEvent[] = [];
  const gameOrders = new Map<number, number>();

  for (const evt of sortedEvents) {
    const previous = normalized[normalized.length - 1];

    if (
      previous &&
      previous.gameNumber === evt.gameNumber &&
      previous.scoringSide === evt.scoringSide &&
      previous.homeScore === evt.homeScore &&
      previous.awayScore === evt.awayScore
    ) {
      continue;
    }

    const nextOrder = (gameOrders.get(evt.gameNumber) || 0) + 1;
    gameOrders.set(evt.gameNumber, nextOrder);

    normalized.push({
      ...evt,
      eventOrder: nextOrder,
    });
  }

  return normalized;
}

export function ScoreTimelineCard({
  homeGroup,
  awayGroup,
  events,
  live = false,
  emptyMessage,
}: ScoreTimelineCardProps) {
  const normalizedEvents = normalizeScoreTimelineEvents(events);

  if (normalizedEvents.length === 0 && !emptyMessage) {
    return null;
  }

  const gameNumbers = [...new Set(normalizedEvents.map((evt) => evt.gameNumber))].sort((a, b) => a - b);

  return (
    <Card className="border-gray-100 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-3 text-base text-gray-800">
          <span className="flex items-center gap-2">
            <PenLine className="h-4 w-4 text-blue-500" />
            得分路径
          </span>
          {live && (
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
              实时更新
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {normalizedEvents.length === 0 ? (
          <div className="squircle-card border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            {emptyMessage}
          </div>
        ) : (
          gameNumbers.map((gameNumber) => {
            const gameEvents = normalizedEvents.filter((evt) => evt.gameNumber === gameNumber);
            const serviceBreaks = new Set<number>();

            for (let i = 1; i < gameEvents.length; i++) {
              if (gameEvents[i].scoringSide !== gameEvents[i - 1].scoringSide) {
                serviceBreaks.add(i);
              }
            }

            const lastEvent = gameEvents[gameEvents.length - 1];

            return (
              <div key={gameNumber} className="mb-4 last:mb-0">
                {gameNumbers.length > 1 && (
                  <div className="mb-2 text-xs font-semibold text-gray-500">第 {gameNumber} 局</div>
                )}
                <table className="mx-auto w-full max-w-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="w-1/2 border-b-2 border-green-400 py-1.5 text-center text-xs font-bold text-green-700">
                        {homeGroup.icon} {homeGroup.name}
                      </th>
                      <th className="w-1/2 border-b-2 border-teal-400 py-1.5 text-center text-xs font-bold text-teal-700">
                        {awayGroup.icon} {awayGroup.name}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {gameEvents.map((evt, index) => (
                      <tr
                        key={`${evt.gameNumber}-${evt.eventOrder}-${evt.homeScore}-${evt.awayScore}`}
                        className={serviceBreaks.has(index) ? "border-t border-gray-200" : ""}
                        title={new Date(evt.timestamp).toLocaleTimeString("zh-CN")}
                      >
                        <td
                          className={`py-0.5 text-center font-mono text-sm ${
                            evt.scoringSide === "home" ? "font-bold text-green-700" : "select-none text-transparent"
                          }`}
                        >
                          {evt.scoringSide === "home" ? evt.homeScore : ""}
                        </td>
                        <td
                          className={`py-0.5 text-center font-mono text-sm ${
                            evt.scoringSide === "away" ? "font-bold text-teal-700" : "select-none text-transparent"
                          }`}
                        >
                          {evt.scoringSide === "away" ? evt.awayScore : ""}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-300">
                      <td className="py-1.5 text-center font-mono text-base font-extrabold text-green-700">
                        {lastEvent.homeScore}
                      </td>
                      <td className="py-1.5 text-center font-mono text-base font-extrabold text-teal-700">
                        {lastEvent.awayScore}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
