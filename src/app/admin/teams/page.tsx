"use client";

import { useCallback, useEffect, useState } from "react";
import { Palette, Save } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/layout/admin-page-header";
import { useTournament } from "@/lib/tournament-context";

interface GroupInfo {
  id: number;
  icon: string;
  name: string;
  sortOrder: number;
}

interface TournamentResponse {
  groups?: GroupInfo[];
}

interface GroupEdit {
  icon: string;
  name: string;
}

export default function AdminTeamsPage() {
  const { currentId, loading: tournamentLoading } = useTournament();
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [groupEdits, setGroupEdits] = useState<GroupEdit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedTournamentId, setLoadedTournamentId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchGroups = useCallback(async () => {
    if (!currentId) {
      setGroups([]);
      setGroupEdits([]);
      setLoadedTournamentId(null);
      setLoading(false);
      return;
    }

    const selectedTournamentId = currentId;
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${selectedTournamentId}`);
      const data = await res.json() as TournamentResponse;
      const nextGroups = (data.groups || []).sort((a, b) => a.sortOrder - b.sortOrder);
      setGroups(nextGroups);
      setGroupEdits(nextGroups.map((group) => ({ icon: group.icon, name: group.name })));
    } catch {
      toast.error("加载队伍设置失败");
    } finally {
      setLoadedTournamentId(selectedTournamentId);
      setLoading(false);
    }
  }, [currentId]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleSave = async () => {
    if (!currentId || groups.length === 0) return;

    setSaving(true);
    try {
      const groupUpdates = groups.map((group, index) => ({
        groupId: group.id,
        icon: groupEdits[index]?.icon || group.icon,
        name: groupEdits[index]?.name || group.name,
      }));

      const res = await fetch(`/api/tournaments/${currentId}/groups`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupUpdates }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        toast.error(data.error || "保存失败");
        return;
      }

      toast.success("队伍设置已保存");
      await fetchGroups();
    } catch {
      toast.error("网络错误");
    } finally {
      setSaving(false);
    }
  };

  if (tournamentLoading || (currentId !== null && loadedTournamentId !== currentId) || loading) {
    return <div className="text-center py-12 text-gray-400">加载中...</div>;
  }

  if (!currentId || groups.length === 0) {
    return (
      <div className="admin-page-narrow">
        <AdminPageHeader title="队伍设置" icon={Palette} iconClassName="w-4.5 h-4.5 text-violet-600" />
        <Card className="border-dashed border-gray-200">
          <CardContent className="py-10 text-center text-gray-400 text-sm">
            请先回到管理后台选择赛事并完成基础分组创建
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-page-narrow">
      <AdminPageHeader
        title="队伍设置"
        icon={Palette}
        iconClassName="w-4.5 h-4.5 text-violet-600"
        actions={(
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-violet-600 hover:bg-violet-700 text-white gap-1"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "保存中..." : "保存"}
          </Button>
        )}
      />

      <Card className="border-gray-200">
        <CardContent className="pt-5 space-y-3">
          {groups.map((group, index) => (
            <div key={group.id} className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-5 text-right shrink-0">{group.sortOrder + 1}</span>
              <Input
                value={groupEdits[index]?.icon || ""}
                onChange={(e) => {
                  const next = [...groupEdits];
                  next[index] = { ...next[index], icon: e.target.value };
                  setGroupEdits(next);
                }}
                className="w-16 text-center text-lg"
                placeholder="图标"
              />
              <Input
                value={groupEdits[index]?.name || ""}
                onChange={(e) => {
                  const next = [...groupEdits];
                  next[index] = { ...next[index], name: e.target.value };
                  setGroupEdits(next);
                }}
                className="flex-1"
                placeholder="队名"
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
