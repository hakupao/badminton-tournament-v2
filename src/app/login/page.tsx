"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { Volleyball, UserPlus, CheckCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");

  // Login state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    const result = await login(loginUsername, loginPassword);
    setLoginLoading(false);

    if (result.ok) {
      router.push("/");
    } else {
      setLoginError(result.error || "登录失败");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");

    if (regPassword !== regConfirm) {
      setRegError("两次输入的密码不一致");
      return;
    }
    if (regPassword.length < 4) {
      setRegError("密码至少 4 位");
      return;
    }
    if (regUsername.trim().length < 2) {
      setRegError("用户名至少 2 个字符");
      return;
    }

    setRegLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername.trim(),
          password: regPassword,
          role: "athlete",
        }),
      });
      const data: any = await res.json();

      if (res.ok) {
        setRegSuccess(true);
        // Auto-login after register
        const loginResult = await login(regUsername.trim(), regPassword);
        if (loginResult.ok) {
          setTimeout(() => router.push("/"), 1000);
        }
      } else {
        setRegError(data.error || "注册失败");
      }
    } catch {
      setRegError("网络错误");
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Decorative header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-teal-500 shadow-lg shadow-green-200/50 mb-4">
            <Volleyball className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-green-800 tracking-tight">ShuttleArena</h1>
          <p className="text-sm text-gray-400 mt-1 font-medium">羽球竞技场 · 团体循环赛管理系统</p>
        </div>

        <Card className="border-green-100/60 shadow-xl shadow-green-100/30 backdrop-blur-sm">
          <CardContent className="pt-6">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
              <TabsList className="w-full grid grid-cols-2 mb-5 bg-green-50/80">
                <TabsTrigger
                  value="login"
                  className="font-semibold data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                >
                  登录
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="font-semibold data-[state=active]:bg-teal-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                >
                  运动员注册
                </TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-username" className="text-gray-600 text-sm font-medium">用户名</Label>
                    <Input
                      id="login-username"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="请输入用户名"
                      className="h-11 border-gray-200 focus:border-green-400 focus:ring-green-400/30 transition-colors"
                      autoFocus
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-gray-600 text-sm font-medium">密码</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="请输入密码"
                      className="h-11 border-gray-200 focus:border-green-400 focus:ring-green-400/30 transition-colors"
                      required
                    />
                  </div>

                  {loginError && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                      {loginError}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold shadow-md shadow-green-200/50 transition-all"
                    disabled={loginLoading}
                  >
                    {loginLoading ? "登录中..." : "登录"}
                  </Button>

                  <p className="text-center text-xs text-gray-400 pt-2">
                    管理员默认账号：admin / admin123
                  </p>
                </form>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register">
                {regSuccess ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-lg font-bold text-green-700">注册成功！</p>
                    <p className="text-sm text-gray-500 mt-2">正在跳转...</p>
                  </div>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="bg-teal-50 border border-teal-100 rounded-lg p-3 text-sm text-teal-700 flex items-start gap-2">
                      <UserPlus className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>运动员注册后可查看个人赛程、比赛记录。管理员稍后可将你绑定到具体参赛位置。</span>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-username" className="text-gray-600 text-sm font-medium">用户名</Label>
                      <Input
                        id="reg-username"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="建议使用真实姓名或昵称"
                        className="h-11 border-gray-200 focus:border-teal-400 focus:ring-teal-400/30 transition-colors"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password" className="text-gray-600 text-sm font-medium">密码</Label>
                      <Input
                        id="reg-password"
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="至少 4 位"
                        className="h-11 border-gray-200 focus:border-teal-400 focus:ring-teal-400/30 transition-colors"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-confirm" className="text-gray-600 text-sm font-medium">确认密码</Label>
                      <Input
                        id="reg-confirm"
                        type="password"
                        value={regConfirm}
                        onChange={(e) => setRegConfirm(e.target.value)}
                        placeholder="再次输入密码"
                        className="h-11 border-gray-200 focus:border-teal-400 focus:ring-teal-400/30 transition-colors"
                        required
                      />
                    </div>

                    {regError && (
                      <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                        {regError}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-11 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white font-bold shadow-md shadow-teal-200/50 transition-all"
                      disabled={regLoading}
                    >
                      {regLoading ? "注册中..." : "注册运动员账号"}
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
