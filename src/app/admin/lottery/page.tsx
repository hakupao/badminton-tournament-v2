"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { PositionBadge } from "@/components/player/position-label";
import { AdminPageHeader } from "@/components/layout/admin-page-header";
import { toast } from "sonner";
import { useTournament } from "@/lib/tournament-context";
import { Shuffle, Users, UserPlus, Trash2, Dices } from "lucide-react";

interface RegisteredUser {
  id: number;
  username: string;
  role: string;
  playerId: number | null;
}

interface Participant {
  id: number;
  tournamentId: number;
  userId: number;
  assignedPosition: number;
  gender: "M" | "F";
  username: string;
}

interface LotteryResult {
  playerId: number;
  userId: number;
  username: string;
  groupName: string;
  position: number;
}

interface ActionResponse {
  error?: string;
  message?: string;
  assignments?: LotteryResult[];
}

export default function LotteryPage() {
  const { currentId } = useTournament();
  const tournamentId = currentId ? String(currentId) : "";

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [malesPerGroup, setMalesPerGroup] = useState(3);
  const [femalesPerGroup, setFemalesPerGroup] = useState(2);
  const [groupCount, setGroupCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lotteryRunning, setLotteryRunning] = useState(false);
  const [lotteryResults, setLotteryResults] = useState<LotteryResult[] | null>(null);

  // For adding new participant
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<string>("");
  const [selectedGender, setSelectedGender] = useState<string>("");

  const fetchData = useCallback(async () => {
    if (!tournamentId) { setLoading(false); return; }
    try {
      const [partRes, usersRes] = await Promise.all([
        fetch(`/api/tournaments/${tournamentId}/participants`),
        fetch("/api/users"),
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const partData: any = await partRes.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const usersData: any = await usersRes.json();
      setParticipants(partData.participants || []);
      setMalesPerGroup(partData.malesPerGroup || 3);
      setFemalesPerGroup(partData.femalesPerGroup || 2);
      setGroupCount(partData.groupCount || 0);
      setRegisteredUsers(
        (usersData.users || []).filter((u: RegisteredUser) => u.role === "athlete")
      );
    } catch {
      toast.error("加载失败");
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPerGroup = malesPerGroup + femalesPerGroup;
  const assignedUserIds = new Set(participants.map((p) => p.userId));

  const addParticipant = async () => {
    if (!selectedUserId || !selectedPosition || !selectedGender) {
      toast.error("请选择运动员、位置和性别");
      return;
    }

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignments: [{
            userId: Number(selectedUserId),
            assignedPosition: Number(selectedPosition),
            gender: selectedGender,
          }],
        }),
      });

      if (res.ok) {
        toast.success("已添加参赛者");
        setSelectedUserId("");
        setSelectedPosition("");
        setSelectedGender("");
        fetchData();
      } else {
        const err = await res.json() as ActionResponse;
        toast.error(err.error || "添加失败");
      }
    } catch {
      toast.error("网络错误");
    }
  };

  const removeParticipant = async (userId: number) => {
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/participants?userId=${userId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        toast.success("已移除");
        fetchData();
      }
    } catch {
      toast.error("移除失败");
    }
  };

  const runLottery = async () => {
    if (!confirm("确定要进行摇号？这将覆盖当前的人员分配。")) return;

    setLotteryRunning(true);
    setLotteryResults(null);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/lottery`, {
        method: "POST",
      });
      const data = await res.json() as ActionResponse;
      if (res.ok) {
        toast.success(data.message || "摇号完成！");
        setLotteryResults(data.assignments || []);
        fetchData();
      } else {
        toast.error(data.error || "摇号失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setLotteryRunning(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-400">加载中...</div>;

  if (!currentId) {
    return (
      <div className="admin-page-medium">
        <AdminPageHeader
          title="摇号分组"
          icon={Shuffle}
          iconClassName="w-4.5 h-4.5 text-indigo-600"
        />
        <Card className="border-dashed border-gray-200">
          <CardContent className="py-10 text-center text-gray-400 text-sm">
            请先回到管理后台选择一个赛事
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group participants by position for display
  const byPosition = new Map<number, Participant[]>();
  for (const p of participants) {
    const list = byPosition.get(p.assignedPosition) || [];
    list.push(p);
    byPosition.set(p.assignedPosition, list);
  }

  return (
    <div className="admin-page-medium">
      <AdminPageHeader
        title="摇号分组"
        icon={Shuffle}
        iconClassName="w-4.5 h-4.5 text-indigo-600"
        actions={(
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-md"
            onClick={runLottery}
            disabled={lotteryRunning || participants.length === 0}
          >
            <Dices className="w-4 h-4" />
            {lotteryRunning ? "摇号中..." : "开始摇号"}
          </Button>
        )}
      />

      {/* Stats */}
      <div className="flex gap-4 flex-wrap text-sm text-gray-500">
        <span>已报名: <strong className="text-gray-800">{participants.length}</strong> 人</span>
        <span>队伍数: <strong className="text-gray-800">{groupCount}</strong></span>
        <span>每队: <strong className="text-blue-600">{malesPerGroup}男</strong> + <strong className="text-pink-600">{femalesPerGroup}女</strong></span>
        <span>每位置上限: <strong className="text-gray-800">{groupCount}</strong> 人</span>
      </div>

      {/* Add participant form */}
      <Card className="border-indigo-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-indigo-500" />
            添加参赛者
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs text-gray-500 mb-1 block">运动员</label>
              <Select value={selectedUserId} onValueChange={(v: string | null) => setSelectedUserId(v || "")}>
                <SelectTrigger className="h-9">
                  <span className="truncate">
                    {selectedUserId
                      ? registeredUsers.find((u) => String(u.id) === selectedUserId)?.username || "选择"
                      : "选择运动员"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {registeredUsers
                    .filter((u) => !assignedUserIds.has(u.id))
                    .map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.username}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-24">
              <label className="text-xs text-gray-500 mb-1 block">性别</label>
              <Select value={selectedGender} onValueChange={(v: string | null) => {
                setSelectedGender(v || "");
                setSelectedPosition(""); // reset position when gender changes
              }}>
                <SelectTrigger className="h-9">
                  <span>{selectedGender === "M" ? "♂ 男" : selectedGender === "F" ? "♀ 女" : "选择"}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">♂ 男</SelectItem>
                  <SelectItem value="F">♀ 女</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-28">
              <label className="text-xs text-gray-500 mb-1 block">位置号</label>
              <Select value={selectedPosition} onValueChange={(v: string | null) => setSelectedPosition(v || "")}>
                <SelectTrigger className="h-9">
                  <span>{selectedPosition ? `${selectedPosition}号位` : "选择"}</span>
                </SelectTrigger>
                <SelectContent>
                  {selectedGender === "M" &&
                    Array.from({ length: malesPerGroup }, (_, i) => i + 1).map((pos) => {
                      const count = byPosition.get(pos)?.length || 0;
                      return (
                        <SelectItem key={pos} value={String(pos)} disabled={count >= groupCount}>
                          {pos}号位 ({count}/{groupCount})
                        </SelectItem>
                      );
                    })}
                  {selectedGender === "F" &&
                    Array.from({ length: femalesPerGroup }, (_, i) => malesPerGroup + i + 1).map((pos) => {
                      const count = byPosition.get(pos)?.length || 0;
                      return (
                        <SelectItem key={pos} value={String(pos)} disabled={count >= groupCount}>
                          {pos}号位 ({count}/{groupCount})
                        </SelectItem>
                      );
                    })}
                  {!selectedGender && (
                    <SelectItem value="__" disabled>请先选择性别</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 h-9"
              onClick={addParticipant}
              disabled={!selectedUserId || !selectedPosition || !selectedGender}
            >
              添加
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Participants by position */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-500" />
          已分配位置
        </h2>

        {participants.length === 0 ? (
          <Card className="border-dashed border-gray-200">
            <CardContent className="py-8 text-center">
              <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">尚无参赛者</p>
              <p className="text-sm text-gray-400">使用上方表单添加运动员并分配位置</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: totalPerGroup }, (_, i) => {
              const pos = i + 1;
              const isMale = pos <= malesPerGroup;
              const posParticipants = byPosition.get(pos) || [];

              return (
                <Card key={pos} className={`border ${isMale ? "border-blue-100" : "border-pink-100"}`}>
                  <CardHeader className={`pb-2 ${isMale ? "bg-blue-50/50" : "bg-pink-50/50"} border-b ${isMale ? "border-blue-100" : "border-pink-100"}`}>
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <PositionBadge
                          gender={isMale ? "M" : "F"}
                          positionNumber={pos}
                          suffix="号位"
                          className={isMale ? "border-blue-200 text-blue-600" : "border-pink-200 text-pink-600"}
                        />
                      </span>
                      <span className="text-xs text-gray-400">
                        {posParticipants.length}/{groupCount}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    {posParticipants.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">暂无人员</p>
                    ) : (
                      <div className="space-y-1.5">
                        {posParticipants.map((p) => (
                          <div key={p.id} className="flex items-center justify-between group">
                            <span className="text-sm text-gray-700">{p.username}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeParticipant(p.userId)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Fill indicator */}
                    <div className="mt-2 w-full bg-gray-100 rounded-full h-1">
                      <div
                        className={`h-1 rounded-full transition-all ${isMale ? "bg-blue-400" : "bg-pink-400"}`}
                        style={{ width: `${groupCount > 0 ? (posParticipants.length / groupCount) * 100 : 0}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Lottery Results */}
      {lotteryResults && (
        <Card className="border-indigo-200 bg-indigo-50/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Dices className="w-5 h-5 text-indigo-600" />
              摇号结果
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              {lotteryResults.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-white rounded-lg border border-indigo-100 px-3 py-2"
                >
                  <span className="font-medium text-gray-800">{r.username}</span>
                  <span className="text-sm text-indigo-600">
                    → {r.groupName} {r.position}号位
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
