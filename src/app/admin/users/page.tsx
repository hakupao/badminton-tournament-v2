"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/layout/admin-page-header";
import { useTournament } from "@/lib/tournament-context";
import { Users, Trash2, KeyRound, ShieldCheck, User } from "lucide-react";

interface UserItem {
  id: number;
  username: string;
  role: string;
  playerId: number | null;
}

interface UsersResponse {
  users?: UserItem[];
  error?: string;
}

interface UserMutationResponse {
  error?: string;
}

export default function AdminUsersPage() {
  const { currentName } = useTournament();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create user form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"athlete" | "admin">("athlete");
  const [creating, setCreating] = useState(false);

  // Reset password
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json() as UsersResponse;
      if (!res.ok) {
        throw new Error(data.error || "加载用户列表失败");
      }
      setUsers(data.users || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载用户列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const createUser = async () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      toast.error("请填写用户名和密码");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword.trim(),
          role: newRole,
        }),
      });
      if (res.ok) {
        toast.success(`用户「${newUsername}」创建成功`);
        setNewUsername("");
        setNewPassword("");
        fetchUsers();
      } else {
        const err = await res.json() as UserMutationResponse;
        toast.error(err.error || "创建失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setCreating(false);
    }
  };

  const deleteUser = async (id: number, username: string) => {
    if (!confirm(`确定要删除用户「${username}」吗？`)) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("已删除");
        fetchUsers();
      } else {
        const err = await res.json() as UserMutationResponse;
        toast.error(err.error || "删除失败");
      }
    } catch {
      toast.error("网络错误");
    }
  };

  const handleResetPassword = async (id: number) => {
    if (!resetPassword.trim()) {
      toast.error("请输入新密码");
      return;
    }
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword.trim() }),
      });
      if (res.ok) {
        toast.success("密码已重置");
        setResetUserId(null);
        setResetPassword("");
      } else {
        const err = await res.json() as UserMutationResponse;
        toast.error(err.error || "重置失败");
      }
    } catch {
      toast.error("网络错误");
    }
  };

  const admins = users.filter((u) => u.role === "admin");
  const athletes = users.filter((u) => u.role === "athlete");

  if (loading) return <div className="text-center py-12 text-gray-400">加载中...</div>;

  return (
    <div className="admin-page-shell">
      <AdminPageHeader
        title="账号管理"
        description={`共 ${users.length} 个账号 · ${athletes.length} 名运动员 · ${admins.length} 名管理员${currentName ? " · 当前赛事上下文已保留" : ""}`}
        icon={Users}
        iconClassName="w-5 h-5 text-cyan-600"
        extraBadge={currentName ? <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-700">全局账号</Badge> : undefined}
      />

      {/* Create User */}
      <Card className="border-cyan-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-cyan-500" />
            创建账号
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs text-gray-500 mb-1 block">用户名</label>
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="输入用户名"
                className="h-9"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs text-gray-500 mb-1 block">密码</label>
              <Input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="输入密码"
                type="password"
                className="h-9"
              />
            </div>
            <div className="w-28">
              <label className="text-xs text-gray-500 mb-1 block">角色</label>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={newRole === "athlete" ? "default" : "outline"}
                  className={`h-9 flex-1 text-xs ${newRole === "athlete" ? "bg-blue-600" : ""}`}
                  onClick={() => setNewRole("athlete")}
                >
                  运动员
                </Button>
                <Button
                  size="sm"
                  variant={newRole === "admin" ? "default" : "outline"}
                  className={`h-9 flex-1 text-xs ${newRole === "admin" ? "bg-amber-600" : ""}`}
                  onClick={() => setNewRole("admin")}
                >
                  管理
                </Button>
              </div>
            </div>
            <Button
              className="bg-cyan-600 hover:bg-cyan-700 h-9"
              onClick={createUser}
              disabled={creating || !newUsername.trim() || !newPassword.trim()}
            >
              {creating ? "创建中..." : "创建"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Athletes List */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-500" />
          运动员 <span className="text-sm font-normal text-gray-400">({athletes.length})</span>
        </h2>
        {athletes.length === 0 ? (
          <Card className="border-dashed border-gray-200">
            <CardContent className="py-6 text-center text-gray-400 text-sm">
              暂无运动员账号
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2">
            {athletes.map((u) => (
              <Card key={u.id} className="border-blue-50">
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <span className="font-medium text-gray-800">{u.username}</span>
                      {u.playerId && (
                        <Badge variant="outline" className="ml-2 text-xs border-green-200 text-green-600">
                          已绑定
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {resetUserId === u.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                          placeholder="新密码"
                          type="password"
                          className="h-7 w-28 text-xs"
                        />
                        <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700" onClick={() => handleResetPassword(u.id)}>
                          确认
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setResetUserId(null); setResetPassword(""); }}>
                          取消
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-gray-400 hover:text-amber-600 gap-1"
                          onClick={() => setResetUserId(u.id)}
                        >
                          <KeyRound className="w-3 h-3" /> 重置密码
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-gray-300 hover:text-red-500"
                          onClick={() => deleteUser(u.id, u.username)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Admins List */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-500" />
          管理员 <span className="text-sm font-normal text-gray-400">({admins.length})</span>
        </h2>
        <div className="grid gap-2">
          {admins.map((u) => (
            <Card key={u.id} className="border-amber-50">
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="font-medium text-gray-800">{u.username}</span>
                </div>
                <div className="flex items-center gap-1">
                  {resetUserId === u.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        placeholder="新密码"
                        type="password"
                        className="h-7 w-28 text-xs"
                      />
                      <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700" onClick={() => handleResetPassword(u.id)}>
                        确认
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setResetUserId(null); setResetPassword(""); }}>
                        取消
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-gray-400 hover:text-amber-600 gap-1"
                      onClick={() => setResetUserId(u.id)}
                    >
                      <KeyRound className="w-3 h-3" /> 重置密码
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
