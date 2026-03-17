"use client";

import { useCallback, useEffect, useState } from "react";
import { Settings2, Info } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/layout/admin-page-header";
import { useTournament } from "@/lib/tournament-context";

interface TournamentDetail {
  id: number;
  name: string;
  eventDate: string | null;
  startTime: string;
  endTime: string;
}

interface TournamentResponse {
  tournament?: TournamentDetail | null;
}

function formatDurationSummary(startTime: string, endTime: string) {
  if (!startTime || !endTime) return "待设置";

  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;

  if (Number.isNaN(startTotal) || Number.isNaN(endTotal) || endTotal <= startTotal) {
    return "请检查时间范围";
  }

  const diff = endTotal - startTotal;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours} 小时 ${minutes} 分钟`;
  }

  if (hours > 0) {
    return `${hours} 小时`;
  }

  return `${minutes} 分钟`;
}

export default function AdminSettingsPage() {
  const { currentId, refresh } = useTournament();
  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    eventDate: "",
    startTime: "09:00",
    endTime: "19:00",
  });

  const fetchTournament = useCallback(async () => {
    if (!currentId) {
      setTournament(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${currentId}`);
      const data = await res.json() as TournamentResponse;
      const nextTournament = data.tournament || null;
      setTournament(nextTournament);
      if (nextTournament) {
        setForm({
          name: nextTournament.name,
          eventDate: nextTournament.eventDate || "",
          startTime: nextTournament.startTime || "09:00",
          endTime: nextTournament.endTime || "19:00",
        });
      }
    } catch {
      toast.error("加载赛事设置失败");
    } finally {
      setLoading(false);
    }
  }, [currentId]);

  useEffect(() => {
    fetchTournament();
  }, [fetchTournament]);

  const handleSave = async () => {
    if (!currentId) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/tournaments/${currentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          eventDate: form.eventDate || null,
          startTime: form.startTime || "09:00",
          endTime: form.endTime || "19:00",
        }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        toast.error(data.error || "保存失败");
        return;
      }

      toast.success("赛事设置已保存");
      await refresh();
      await fetchTournament();
    } catch {
      toast.error("网络错误");
    } finally {
      setSaving(false);
    }
  };

  const durationSummary = formatDurationSummary(form.startTime, form.endTime);

  if (loading) {
    return <div className="text-center py-12 text-gray-400">加载中...</div>;
  }

  if (!currentId || !tournament) {
    return (
      <div className="admin-page-shell">
        <AdminPageHeader
          title="赛事设置"
          description="名称、日期与时间窗口"
          icon={Settings2}
          iconClassName="w-5 h-5 text-emerald-600"
        />
        <Card className="border-dashed border-gray-200">
          <CardContent className="py-12 text-center text-gray-500">
            请先回到管理后台选择一个赛事
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-page-shell">
      <AdminPageHeader
        title="赛事设置"
        description="管理赛事名称、日期和比赛时间窗口"
        icon={Settings2}
        iconClassName="w-5 h-5 text-emerald-600"
        actions={(
          <Button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving ? "保存中..." : "保存设置"}
          </Button>
        )}
      />

      <div className="admin-page-grid">
        <div className="admin-page-main">
          <Card className="border-emerald-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-800">基础信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-600 font-medium">赛事名称</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-600 font-medium">比赛日期</Label>
                <Input
                  type="date"
                  value={form.eventDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, eventDate: e.target.value }))}
                  className="border-emerald-200"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-gray-600 font-medium">开始时间</Label>
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                    className="border-emerald-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-600 font-medium">结束时间</Label>
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
                    className="border-emerald-200"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="admin-page-sidebar">
          <Card className="border-emerald-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-800">当前概览</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                <div className="text-xs text-emerald-700">赛事名称</div>
                <div className="mt-1 text-base font-semibold text-gray-800">{form.name.trim() || "未命名赛事"}</div>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2.5">
                <span className="text-gray-500">比赛日期</span>
                <span className="font-medium text-gray-700">{form.eventDate || "待定"}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2.5">
                <span className="text-gray-500">时间窗口</span>
                <span className="font-medium text-gray-700">{form.startTime} - {form.endTime}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2.5">
                <span className="text-gray-500">可用时长</span>
                <span className="font-medium text-emerald-700">{durationSummary}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-100 bg-blue-50/60 shadow-sm">
            <CardContent className="py-4 text-sm text-blue-900 flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                赛事状态切换、赛事切换与删除入口保留在管理后台首页。
                时间窗口会影响赛程模拟中的可用总时长判断。
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
