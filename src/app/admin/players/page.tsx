"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTournament } from "@/lib/tournament-context";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { PositionBadge } from "@/components/player/position-label";
import { AdminPageHeader } from "@/components/layout/admin-page-header";
import { toast } from "sonner";
import { Users, UserCheck, Link2, UserPlus, Trash2 } from "lucide-react";

interface BoundUser {
  id: number;
  username: string;
  role: string;
}

interface Player {
  id: number;
  positionNumber: number;
  slotIndex: number;
  gender: "M" | "F";
  name: string | null;
  boundUser: BoundUser | null;
}

interface GroupWithPlayers {
  id: number;
  name: string;
  icon: string;
  players: Player[];
}

interface RegisteredUser {
  id: number;
  username: string;
  role: string;
  playerId: number | null;
}

interface GroupsResponse {
  groups?: GroupWithPlayers[];
}

interface UsersResponse {
  users?: RegisteredUser[];
}

function PlayersContent() {
  const { currentId, loading: tournamentLoading } = useTournament();
  const tournamentId = currentId ? String(currentId) : "";
  const [groups, setGroups] = useState<GroupWithPlayers[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedTournamentId, setLoadedTournamentId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [nameEdits, setNameEdits] = useState<Record<number, string>>({});
  const [userEdits, setUserEdits] = useState<Record<number, number | null>>({});

  const fetchData = useCallback(async () => {
    if (!tournamentId) {
      setGroups([]);
      setRegisteredUsers([]);
      setLoadedTournamentId(null);
      setLoading(false);
      return;
    }

    const selectedTournamentId = currentId;
    try {
      const [groupsRes, usersRes] = await Promise.all([
        fetch(`/api/tournaments/${tournamentId}/groups`),
        fetch("/api/users"),
      ]);
      const groupsData = await groupsRes.json() as GroupsResponse;
      const usersData = await usersRes.json() as UsersResponse;
      setGroups(groupsData.groups || []);
      setRegisteredUsers((usersData.users || []).filter((u: RegisteredUser) => u.role === "athlete"));
    } catch {
      toast.error("加载失败");
    } finally {
      if (selectedTournamentId !== undefined) {
        setLoadedTournamentId(selectedTournamentId ?? null);
      }
      setLoading(false);
    }
  }, [currentId, tournamentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNameChange = (playerId: number, value: string) => {
    setNameEdits((prev) => ({ ...prev, [playerId]: value }));
  };

  const handleUserChange = (playerId: number, userId: string) => {
    if (userId === "none") {
      setUserEdits((prev) => ({ ...prev, [playerId]: null }));
    } else {
      setUserEdits((prev) => ({ ...prev, [playerId]: Number(userId) }));
    }
  };

  const getDisplayName = (player: Player) => {
    if (nameEdits[player.id] !== undefined) return nameEdits[player.id];
    return player.name || "";
  };

  const getCurrentUserId = (player: Player): string => {
    if (userEdits[player.id] !== undefined) {
      return userEdits[player.id] ? String(userEdits[player.id]) : "";
    }
    return player.boundUser ? String(player.boundUser.id) : "";
  };

  const getCurrentUserLabel = (player: Player): string => {
    const uid = getCurrentUserId(player);
    if (!uid) return "未绑定";
    const user = registeredUsers.find((u) => String(u.id) === uid);
    return user ? user.username : "未绑定";
  };

  // Find which user IDs are already bound
  const getBoundUserIds = (): Set<number> => {
    const bound = new Set<number>();
    for (const g of groups) {
      for (const p of g.players) {
        if (userEdits[p.id] !== undefined) {
          if (userEdits[p.id]) bound.add(userEdits[p.id]!);
        } else if (p.boundUser) {
          bound.add(p.boundUser.id);
        }
      }
    }
    return bound;
  };

  const boundUserIds = getBoundUserIds();

  const hasChanges = Object.keys(nameEdits).length > 0 || Object.keys(userEdits).length > 0;

  const handleSave = async () => {
    const allPlayerIds = new Set<number>();
    Object.keys(nameEdits).forEach((id) => allPlayerIds.add(Number(id)));
    Object.keys(userEdits).forEach((id) => allPlayerIds.add(Number(id)));

    const assignments = Array.from(allPlayerIds).map((playerId) => {
      const result: { playerId: number; name?: string | null; userId?: number | null } = { playerId };
      if (nameEdits[playerId] !== undefined) {
        result.name = nameEdits[playerId].trim() || null;
      }
      if (userEdits[playerId] !== undefined) {
        result.userId = userEdits[playerId];
      }
      return result;
    });

    if (assignments.length === 0) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments }),
      });

      if (res.ok) {
        toast.success(`已保存 ${assignments.length} 项修改`);
        setNameEdits({});
        setUserEdits({});
        fetchData();
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

  const handleClearAll = () => {
    const allNameEdits: Record<number, string> = {};
    const allUserEdits: Record<number, number | null> = {};
    groups.forEach((g) => {
      g.players.forEach((p) => {
        if (p.name) allNameEdits[p.id] = "";
        if (p.boundUser) allUserEdits[p.id] = null;
      });
    });
    setNameEdits(allNameEdits);
    setUserEdits(allUserEdits);
  };

  const handleAddAlternate = async (groupId: number, positionNumber: number) => {
    if (!tournamentId) return;
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/groups/alternate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, positionNumber }),
      });
      if (res.ok) {
        toast.success("已添加候补位置");
        fetchData();
      } else {
        const data = await res.json() as { error?: string };
        toast.error(data.error || "添加失败");
      }
    } catch {
      toast.error("网络错误");
    }
  };

  const handleRemoveAlternate = async (playerId: number) => {
    if (!tournamentId) return;
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/groups/alternate`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      if (res.ok) {
        toast.success("已删除候补");
        fetchData();
      } else {
        const data = await res.json() as { error?: string };
        toast.error(data.error || "删除失败");
      }
    } catch {
      toast.error("网络错误");
    }
  };

  // Group players by positionNumber for display
  const getPositionPlayers = (groupPlayers: Player[]) => {
    const positions = new Map<number, { primary?: Player; alternate?: Player }>();
    for (const p of groupPlayers) {
      const entry = positions.get(p.positionNumber) || {};
      if ((p.slotIndex || 1) === 1) entry.primary = p;
      else entry.alternate = p;
      positions.set(p.positionNumber, entry);
    }
    return Array.from(positions.entries()).sort(([a], [b]) => a - b);
  };

  if (tournamentLoading || (currentId !== null && loadedTournamentId !== currentId) || loading) {
    return <div className="text-center py-12 text-gray-400">加载中...</div>;
  }

  if (groups.length === 0) {
    return (
      <div className="admin-page-shell">
        <AdminPageHeader
          title="运动员设置"
          icon={Users}
          iconClassName="w-4.5 h-4.5 text-sky-600"
        />
        <Card className="border-dashed border-gray-200">
          <CardContent className="py-12 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{currentId ? "暂无小组数据" : "尚未选择赛事"}</p>
            <p className="text-sm text-gray-400 mt-2">
              {currentId ? "请先在赛制设置中完成分组编制" : "请先回到管理后台选择一个赛事"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPlayers = groups.reduce((acc, g) => acc + g.players.length, 0);
  const boundPlayers = groups.reduce(
    (acc, g) => acc + g.players.filter((p) => getCurrentUserId(p)).length,
    0
  );
  const namedPlayers = groups.reduce(
    (acc, g) => acc + g.players.filter((p) => {
      const name = getDisplayName(p);
      return name && name.trim().length > 0;
    }).length,
    0
  );

  return (
    <div className="admin-page-shell">
      <AdminPageHeader
        title="运动员设置"
        icon={Users}
        iconClassName="w-4.5 h-4.5 text-sky-600"
        extraBadge={<span className="text-xs text-gray-400">绑定 {boundPlayers}/{totalPlayers} · 命名 {namedPlayers}/{totalPlayers}</span>}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200"
              onClick={handleClearAll}
            >
              清空所有
            </Button>
            <Button
              size="sm"
              className="bg-sky-600 hover:bg-sky-700 text-white shadow-md"
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              {saving ? "保存中..." : `保存修改 ${hasChanges ? `(${Object.keys(nameEdits).length + Object.keys(userEdits).length})` : ""}`}
            </Button>
          </div>
        )}
      />

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Link2 className="w-4 h-4 text-blue-500" />
          <span>已注册运动员: {registeredUsers.length}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <UserCheck className="w-4 h-4 text-green-500" />
          <span>已绑定: {boundPlayers}/{totalPlayers}</span>
        </div>
      </div>


      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <Card key={group.id} className="border-green-100 shadow-sm card-hover overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-2xl">{group.icon}</span>
                <span className="text-green-800">{group.name}</span>
                <Badge
                  variant="outline"
                  className="ml-auto text-xs border-green-200 text-green-600"
                >
                  {group.players.filter((p) => getCurrentUserId(p)).length}/{group.players.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 space-y-1">
              {getPositionPlayers(group.players).map(([posNum, { primary, alternate }]) => {
                const renderPlayerRow = (player: Player, isAlternate: boolean) => {
                  const currentUid = getCurrentUserId(player);
                  return (
                    <div
                      key={player.id}
                      className={`grid grid-cols-[auto_minmax(0,1fr)_minmax(120px,1fr)_auto] items-center gap-2 ${isAlternate ? "ml-6 opacity-90" : ""}`}
                    >
                      <PositionBadge
                        gender={player.gender}
                        positionNumber={player.positionNumber}
                        className={`h-8 min-w-[60px] shrink-0 px-2 text-xs ${
                          isAlternate
                            ? "border-dashed border-amber-300 bg-amber-50 text-amber-700"
                            : player.gender === "M"
                              ? "border-blue-200 bg-blue-50 text-blue-600"
                              : "border-pink-200 bg-pink-50 text-pink-600"
                        }`}
                      />
                      <Input
                        placeholder={isAlternate ? "候补姓名" : `输入姓名（默认${group.icon}${player.positionNumber}号位）`}
                        value={getDisplayName(player)}
                        onChange={(e) => handleNameChange(player.id, e.target.value)}
                        className="h-8 min-w-0 text-sm border-gray-200 focus:border-green-400 focus:ring-green-400"
                      />
                      <div className="min-w-0">
                        <Select
                          value={currentUid || "none"}
                          onValueChange={(v: string | null) => handleUserChange(player.id, v || "none")}
                        >
                          <SelectTrigger className="h-8 w-full min-w-0 border-gray-200 text-xs">
                            <span className="flex min-w-0 flex-1 text-left truncate">
                              {currentUid ? (
                                <span className="flex min-w-0 items-center gap-1 text-green-700">
                                  <UserCheck className="w-3 h-3" />
                                  <span className="truncate">{getCurrentUserLabel(player)}</span>
                                </span>
                              ) : (
                                <span className="truncate text-gray-400">绑定账号（可选）</span>
                              )}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">手动填写姓名，不绑定账号</SelectItem>
                            {registeredUsers.map((u) => {
                              const isBound = boundUserIds.has(u.id) && String(u.id) !== currentUid;
                              return (
                                <SelectItem
                                  key={u.id}
                                  value={String(u.id)}
                                  disabled={isBound}
                                >
                                  {u.username} {isBound ? "(已绑定)" : ""}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-7 flex justify-center">
                        {isAlternate ? (
                          <button
                            title="删除候补"
                            onClick={() => handleRemoveAlternate(player.id)}
                            className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : !alternate ? (
                          <button
                            title="添加候补"
                            onClick={() => handleAddAlternate(group.id, posNum)}
                            className="p-1 text-gray-300 hover:text-amber-600 transition-colors"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                          </button>
                        ) : <div className="w-3.5" />}
                      </div>
                    </div>
                  );
                };

                return (
                  <div key={posNum} className="space-y-1">
                    {primary && renderPlayerRow(primary, false)}
                    {alternate && renderPlayerRow(alternate, true)}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sticky save bar */}
      {hasChanges && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-2rem)]">
          <div className="flex items-center gap-2 whitespace-nowrap squircle-pill border border-green-200 bg-white/95 backdrop-blur-sm shadow-xl pl-4 pr-1.5 py-1.5">
            <span className="text-xs font-medium text-gray-600">
              {Object.keys(nameEdits).length + Object.keys(userEdits).length} 项修改
            </span>
            <button
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 squircle-pill transition-colors"
              onClick={() => { setNameEdits({}); setUserEdits({}); }}
            >
              撤销
            </button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white squircle-pill h-7 px-4 text-xs"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlayersPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-400">加载中...</div>}>
      <PlayersContent />
    </Suspense>
  );
}
