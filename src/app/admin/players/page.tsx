"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTournament } from "@/lib/tournament-context";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, UserCheck, Link2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface BoundUser {
  id: number;
  username: string;
  role: string;
}

interface Player {
  id: number;
  positionNumber: number;
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
  const { currentId } = useTournament();
  const tournamentId = currentId ? String(currentId) : "1";
  const [groups, setGroups] = useState<GroupWithPlayers[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nameEdits, setNameEdits] = useState<Record<number, string>>({});
  const [userEdits, setUserEdits] = useState<Record<number, number | null>>({});

  const fetchData = useCallback(async () => {
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
      setLoading(false);
    }
  }, [tournamentId]);

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

  if (loading) {
    return <div className="text-center py-12 text-gray-400">加载中...</div>;
  }

  if (groups.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2.5">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-1 text-gray-500">
              <ArrowLeft className="w-4 h-4" /> 返回
            </Button>
          </Link>
          <Users className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl sm:text-2xl font-bold text-green-900">人员管理</h1>
        </div>
        <Card className="border-dashed border-gray-200">
          <CardContent className="py-12 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">暂无小组数据</p>
            <p className="text-sm text-gray-400 mt-2">请先在管理后台创建赛事并生成小组</p>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-1 text-gray-500">
              <ArrowLeft className="w-4 h-4" /> 返回
            </Button>
          </Link>
          <Users className="w-5 h-5 text-blue-600" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-green-900">人员管理</h1>
            <p className="text-xs text-gray-400">
              绑定账号 {boundPlayers}/{totalPlayers} · 已命名 {namedPlayers}/{totalPlayers}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
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
            className="bg-green-600 hover:bg-green-700 text-white shadow-md"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? "保存中..." : `保存修改 ${hasChanges ? `(${Object.keys(nameEdits).length + Object.keys(userEdits).length})` : ""}`}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Link2 className="w-4 h-4 text-blue-500" />
          <span>已注册运动员: {registeredUsers.length}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <UserCheck className="w-4 h-4 text-green-500" />
          <span>已绑定: {boundPlayers}/{totalPlayers}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="bg-green-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${totalPlayers > 0 ? (boundPlayers / totalPlayers) * 100 : 0}%` }}
        />
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
            <CardContent className="pt-3 space-y-3">
              {group.players.map((player) => {
                const currentUid = getCurrentUserId(player);
                return (
                  <div key={player.id} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`h-8 w-16 shrink-0 justify-center text-xs leading-none ${
                          player.gender === "M"
                            ? "border-blue-200 text-blue-600 bg-blue-50"
                            : "border-pink-200 text-pink-600 bg-pink-50"
                        }`}
                      >
                        {player.gender === "M" ? "♂" : "♀"} {player.positionNumber}号
                      </Badge>
                      <Input
                        placeholder={`${group.icon}${player.positionNumber}号位`}
                        value={getDisplayName(player)}
                        onChange={(e) => handleNameChange(player.id, e.target.value)}
                        className="h-8 text-sm border-gray-200 focus:border-green-400 focus:ring-green-400"
                      />
                    </div>
                    <div className="flex items-center gap-2 pl-[72px]">
                      <Select
                        value={currentUid || "none"}
                        onValueChange={(v: string | null) => handleUserChange(player.id, v || "none")}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <span className="flex flex-1 text-left truncate">
                            {currentUid ? (
                              <span className="text-green-700 flex items-center gap-1">
                                <UserCheck className="w-3 h-3" />
                                {getCurrentUserLabel(player)}
                              </span>
                            ) : (
                              <span className="text-gray-400">绑定账号...</span>
                            )}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">不绑定</SelectItem>
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
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sticky save bar */}
      {hasChanges && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
          <Card className="border-green-200 shadow-xl bg-white/95 backdrop-blur-sm">
            <CardContent className="py-3 px-6 flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {Object.keys(nameEdits).length + Object.keys(userEdits).length} 项修改待保存
              </span>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-200"
                onClick={() => { setNameEdits({}); setUserEdits({}); }}
              >
                撤销
              </Button>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "保存中..." : "保存"}
              </Button>
            </CardContent>
          </Card>
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
