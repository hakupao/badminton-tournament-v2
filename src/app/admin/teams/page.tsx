"use client";

import { useCallback, useEffect, useState } from "react";
import { Palette, Save } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const { currentId } = useTournament();
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [groupEdits, setGroupEdits] = useState<GroupEdit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchGroups = useCallback(async () => {
    if (!currentId) {
      setGroups([]);
      setGroupEdits([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${currentId}`);
      const data = await res.json() as TournamentResponse;
      const nextGroups = (data.groups || []).sort((a, b) => a.sortOrder - b.sortOrder);
      setGroups(nextGroups);
      setGroupEdits(nextGroups.map((group) => ({ icon: group.icon, name: group.name })));
    } catch {
      toast.error("加载队伍设置失败");
    } finally {
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

  if (loading) {
    return <div className="text-center py-12 text-gray-400">加载中...</div>;
  }

  if (!currentId || groups.length === 0) {
    return (
      <div className="admin-page-shell">
        <AdminPageHeader
          title="队伍设置"
          description="管理分组代号与队名"
          icon={Palette}
          iconClassName="w-5 h-5 text-violet-600"
        />
        <Card className="border-dashed border-gray-200">
          <CardContent className="py-12 text-center text-gray-500">
            请先回到管理后台选择赛事并完成基础分组创建
          </CardContent>
        </Card>
      </div>
    );
  }

  const namedGroupCount = groupEdits.filter((group) => group.name.trim()).length;
  const iconGroupCount = groupEdits.filter((group) => group.icon.trim()).length;

  return (
    <div className="admin-page-shell">
      <AdminPageHeader
        title="队伍设置"
        description="编辑每个小组的图标和队名，这些代号会同步显示在赛程、比分和人员页面中"
        icon={Palette}
        iconClassName="w-5 h-5 text-violet-600"
        actions={(
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-violet-600 hover:bg-violet-700 text-white gap-1"
          >
            <Save className="w-4 h-4" />
            {saving ? "保存中..." : "保存队伍设置"}
          </Button>
        )}
      />

      <div className="admin-page-grid">
        <div className="admin-page-main">
          <Card className="border-violet-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-800">分组代号</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {groups.map((group, index) => (
                <div key={group.id} className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
                  <div className="flex items-center gap-3">
                    <Input
                      value={groupEdits[index]?.icon || ""}
                      onChange={(e) => {
                        const next = [...groupEdits];
                        next[index] = { ...next[index], icon: e.target.value };
                        setGroupEdits(next);
                      }}
                      className="w-24 text-center text-lg border-violet-200"
                      placeholder="图标"
                    />
                    <Input
                      value={groupEdits[index]?.name || ""}
                      onChange={(e) => {
                        const next = [...groupEdits];
                        next[index] = { ...next[index], name: e.target.value };
                        setGroupEdits(next);
                      }}
                      className="flex-1 border-violet-200"
                      placeholder="队名"
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    当前排序：第 {group.sortOrder + 1} 组。图标可使用 emoji、文字或符号。
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="admin-page-sidebar">
          <Card className="border-violet-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-800">实时预览</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
                  <div className="text-xs text-violet-700">已命名队伍</div>
                  <div className="mt-1 text-2xl font-bold text-violet-700">{namedGroupCount}</div>
                </div>
                <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
                  <div className="text-xs text-violet-700">已设置图标</div>
                  <div className="mt-1 text-2xl font-bold text-violet-700">{iconGroupCount}</div>
                </div>
              </div>
              <div className="space-y-2">
                {groups.map((group, index) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2.5"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{groupEdits[index]?.icon || "•"}</span>
                      <span className="font-medium text-gray-700">
                        {groupEdits[index]?.name?.trim() || `第 ${group.sortOrder + 1} 组`}
                      </span>
                    </span>
                    <span className="text-xs text-gray-400">G{group.sortOrder + 1}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-100 bg-blue-50/60 shadow-sm">
            <CardContent className="py-4 text-sm text-blue-900">
              队名和图标会同步展示在赛程安排、比分录入、运动员设置与单场详情中，适合在这里统一调整视觉命名。
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
