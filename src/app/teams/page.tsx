"use client";

import { Suspense, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useTournament } from "@/lib/tournament-context";
import { Users } from "lucide-react";

interface Player {
  id: number;
  groupId: number;
  positionNumber: number;
  slotIndex: number;
  gender: string;
  name: string | null;
}

interface Group {
  id: number;
  name: string;
  icon: string;
  sortOrder: number;
}

interface TournamentData {
  groups: Group[];
  players: Player[];
}

/* ─── colour palette for card accent strips ─── */
const CARD_ACCENTS = [
  "from-emerald-400 to-teal-500",
  "from-sky-400 to-blue-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
  "from-violet-400 to-purple-500",
  "from-lime-400 to-green-500",
  "from-cyan-400 to-teal-500",
  "from-fuchsia-400 to-pink-500",
];

function PlayerChip({
  player,
  groupIcon,
  accent,
}: {
  player: Player;
  groupIcon: string;
  accent: "blue" | "pink";
}) {
  const isSub = player.slotIndex === 2;
  const displayName = player.name || `${groupIcon}${player.positionNumber}号`;

  return (
    <div
      className={`
        group/chip relative flex items-center gap-2 px-3 py-1.5 rounded-xl
        transition-all duration-200
        ${isSub
          ? "bg-amber-50/80 border border-amber-200/60 hover:border-amber-300"
          : accent === "blue"
            ? "bg-blue-50/60 border border-blue-100/80 hover:border-blue-300"
            : "bg-pink-50/60 border border-pink-100/80 hover:border-pink-300"
        }
      `}
    >
      {/* position number badge */}
      <span
        className={`
          flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold
          ${isSub
            ? "bg-amber-200/80 text-amber-800"
            : accent === "blue"
              ? "bg-blue-200/70 text-blue-800"
              : "bg-pink-200/70 text-pink-800"
          }
        `}
      >
        {player.positionNumber}
      </span>
      <span
        className={`text-sm font-medium leading-tight ${
          isSub ? "text-amber-800" : "text-gray-800"
        }`}
      >
        {displayName}
      </span>
      {isSub && (
        <Badge
          variant="outline"
          className="text-[9px] px-1 py-0 border-amber-300 text-amber-600 bg-amber-100/80 font-semibold"
        >
          轮换
        </Badge>
      )}
    </div>
  );
}

function TeamCard({
  group,
  players,
  index,
}: {
  group: Group;
  players: Player[];
  index: number;
}) {
  const males = players.filter((p) => p.gender === "M");
  const females = players.filter((p) => p.gender === "F");
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];

  return (
    <div
      className="team-card-enter relative flex flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* gradient accent top strip */}
      <div className={`h-1.5 bg-gradient-to-r ${accent}`} />

      {/* header: icon + name */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
        <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200/60 shadow-inner">
          <span className="text-3xl leading-none select-none">{group.icon}</span>
        </div>
        <div className="flex flex-col min-w-0">
          <h3 className="text-lg font-bold text-gray-900 truncate">{group.name}</h3>
          <span className="text-xs text-gray-400 font-medium">
            {players.length} 名成员
          </span>
        </div>
      </div>

      {/* divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

      {/* player sections */}
      <div className="flex flex-col gap-3 px-5 py-4">
        {players.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-3">暂无成员信息</p>
        ) : (
          <>
            {males.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span className="text-[11px] font-semibold text-blue-600/90 uppercase tracking-wider">
                    男子
                  </span>
                  <span className="text-[10px] text-gray-400">({males.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {males.map((player) => (
                    <PlayerChip
                      key={player.id}
                      player={player}
                      groupIcon={group.icon}
                      accent="blue"
                    />
                  ))}
                </div>
              </div>
            )}
            {females.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                  <span className="text-[11px] font-semibold text-pink-600/90 uppercase tracking-wider">
                    女子
                  </span>
                  <span className="text-[10px] text-gray-400">({females.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {females.map((player) => (
                    <PlayerChip
                      key={player.id}
                      player={player}
                      groupIcon={group.icon}
                      accent="pink"
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TeamsContent() {
  const { currentId, loading: tournamentLoading } = useTournament();
  const [data, setData] = useState<TournamentData | null>(null);
  const [loadedTournamentId, setLoadedTournamentId] = useState<number | null>(null);

  useEffect(() => {
    if (tournamentLoading || !currentId) {
      return;
    }

    const controller = new AbortController();

    fetch(`/api/tournaments/${currentId}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) {
          throw new Error("Failed to load tournament teams");
        }

        return r.json() as Promise<TournamentData>;
      })
      .then((d) => {
        setData(d);
        setLoadedTournamentId(currentId);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setData(null);
        setLoadedTournamentId(currentId);
      });

    return () => controller.abort();
  }, [currentId, tournamentLoading]);

  const loading = tournamentLoading || (currentId !== null && loadedTournamentId !== currentId);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2.5">
          <Users className="w-5 h-5 text-green-700" />
          <h1 className="text-2xl font-bold text-green-900">队伍阵容</h1>
        </div>
        {/* skeleton cards */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-gray-100/80 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!currentId || !data?.groups?.length) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <Users className="w-5 h-5 text-green-700" />
          <h1 className="text-2xl font-bold text-green-900">队伍阵容</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
          <Users className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-sm text-muted-foreground">暂无队伍信息</p>
        </div>
      </div>
    );
  }

  const sortedGroups = [...data.groups].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <Users className="w-5 h-5 text-green-700" />
        <h1 className="text-2xl font-bold text-green-900">队伍阵容</h1>
        <Badge
          variant="outline"
          className="text-xs text-gray-400 border-gray-200 font-medium"
        >
          {sortedGroups.length} 支队伍
        </Badge>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {sortedGroups.map((group, index) => {
          const groupPlayers = (data.players || [])
            .filter((p) => p.groupId === group.id)
            .sort(
              (a, b) =>
                a.positionNumber - b.positionNumber || a.slotIndex - b.slotIndex
            );

          return (
            <TeamCard
              key={group.id}
              group={group}
              players={groupPlayers}
              index={index}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function TeamsPage() {
  return (
    <Suspense
      fallback={<div className="text-center py-12 text-muted-foreground">加载中...</div>}
    >
      <TeamsContent />
    </Suspense>
  );
}
