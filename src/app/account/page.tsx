"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShuttlecockIcon } from "@/components/brand/shuttlecock-icon";
import { useAuth } from "@/lib/auth-context";
import { KeyRound, LogIn, Save, Shield, User } from "lucide-react";

interface UpdateAccountResponse {
  user?: {
    id: number;
    username: string;
    role: "admin" | "athlete";
    playerId?: number | null;
  };
  error?: string;
}

export default function AccountPage() {
  const { user, loading, refresh } = useAuth();
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
    }
  }, [user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      toast.error("请先登录");
      return;
    }

    const trimmedUsername = username.trim();
    const usernameChanged = trimmedUsername !== user.username;
    const passwordChanged = newPassword.length > 0;

    if (!currentPassword) {
      toast.error("请输入当前密码");
      return;
    }

    if (!usernameChanged && !passwordChanged) {
      toast.error("没有需要保存的修改");
      return;
    }

    if (trimmedUsername.length < 2) {
      toast.error("用户名至少 2 个字符");
      return;
    }

    if (passwordChanged && newPassword.length < 4) {
      toast.error("新密码至少 4 位");
      return;
    }

    if (passwordChanged && newPassword !== confirmPassword) {
      toast.error("两次输入的新密码不一致");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: trimmedUsername,
          currentPassword,
          newPassword: passwordChanged ? newPassword : undefined,
        }),
      });

      const data = await response.json() as UpdateAccountResponse;
      if (!response.ok) {
        throw new Error(data.error || "保存失败");
      }

      await refresh();
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setUsername(data.user?.username || trimmedUsername);
      toast.success("账号信息已更新");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-gray-400">加载中...</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md py-6">
        <Card className="border-dashed border-green-200 bg-green-50/50">
          <CardContent className="py-10 text-center">
            <LogIn className="mx-auto mb-3 h-8 w-8 text-green-500" />
            <p className="text-sm font-medium text-gray-700">请先登录</p>
            <Link href="/login" className="mt-4 inline-block">
              <Button size="sm" className="bg-green-600 text-white hover:bg-green-700">
                前往登录
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAdmin = user.role === "admin";

  return (
    <div className="mx-auto max-w-xl space-y-5 py-4">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-green-500 to-teal-500 px-5 py-5 text-white shadow-md shadow-green-200/30">
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-white" />
          <div className="absolute bottom-[18%] left-[12%] right-[12%] top-[18%] rounded-xl border-2 border-white" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-green-50/80">
                <User className="h-3.5 w-3.5" />
                我的账号
              </div>
              <h1 className="mt-1 text-xl font-bold">{user.username}</h1>
            </div>
            <Badge className="border-white/25 bg-white/15 text-white text-xs">
              {isAdmin ? <Shield className="h-3 w-3" /> : <ShuttlecockIcon className="h-3 w-3" />}
              {isAdmin ? "管理员" : "运动员"}
            </Badge>
          </div>
        </div>
      </section>

      <Card className="border-green-100/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <KeyRound className="h-3.5 w-3.5 text-green-600" />
            修改账号信息
          </CardTitle>
          <CardDescription className="text-xs">
            修改前需输入当前密码。新密码留空则仅改用户名。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account-username">用户名</Label>
              <Input
                id="account-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                className="h-11"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-current-password">当前密码</Label>
              <Input
                id="account-current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="请输入当前密码"
                className="h-11"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="account-new-password">新密码</Label>
                <Input
                  id="account-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="留空则不修改"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account-confirm-password">确认新密码</Label>
                <Input
                  id="account-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入新密码"
                  className="h-11"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={saving}
                className="h-10 bg-green-600 px-4 font-semibold text-white hover:bg-green-700"
              >
                <Save className="h-4 w-4" />
                {saving ? "保存中..." : "保存修改"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 border-gray-200"
                onClick={() => {
                  setUsername(user.username);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                disabled={saving}
              >
                重置表单
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
