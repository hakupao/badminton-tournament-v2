"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useTournament } from "@/lib/tournament-context";
import { Home, CalendarDays, Trophy, Settings, LogIn, LogOut, Shield, Menu, X, ChevronDown, User } from "lucide-react";
import { ShuttlecockIcon } from "@/components/brand/shuttlecock-icon";
import { SiteLogo } from "@/components/brand/site-logo";

const publicLinks = [
  { href: "/", label: "首页", icon: Home },
  { href: "/schedule", label: "赛程", icon: CalendarDays },
  { href: "/standings", label: "排名", icon: Trophy },
];

const adminLinks = [
  { href: "/admin", label: "管理后台", icon: Settings },
];

export function MainNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { tournaments, currentId, currentName, setCurrentId } = useTournament();
  const [open, setOpen] = useState(false);
  const [tournamentDropdown, setTournamentDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTournamentDropdown(false);
      }
    };
    if (tournamentDropdown) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [tournamentDropdown]);

  const isAdmin = user?.role === "admin";
  const loggedInLinks = user ? [
    { href: "/my-matches", label: "我的比赛", icon: ShuttlecockIcon },
    { href: "/account", label: "我的账号", icon: User },
  ] : [];
  const allLinks = [...publicLinks, ...loggedInLinks, ...(isAdmin ? adminLinks : [])];

  const handleLogout = async () => {
    await logout();
    router.push("/");
    setOpen(false);
  };

  const showSwitcher = tournaments.length > 1;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-green-100/80 bg-white/92 backdrop-blur-lg shadow-sm">
      {/* Tournament switcher bar - only show when multiple tournaments */}
      {showSwitcher && (
        <div className="w-full bg-gradient-to-r from-green-50 to-teal-50 border-b border-green-100/60">
          <div className="container mx-auto max-w-7xl px-4 flex items-center justify-center h-9 gap-2">
            <span className="text-xs text-gray-500 hidden sm:inline">当前赛事:</span>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setTournamentDropdown(!tournamentDropdown)}
                className="flex items-center gap-1.5 px-3 py-1 squircle-pill bg-white/80 border border-green-200/80 hover:border-green-400 transition-colors text-sm font-semibold text-green-800 shadow-sm"
              >
                {currentName || "选择赛事"}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${tournamentDropdown ? "rotate-180" : ""}`} />
              </button>
              {tournamentDropdown && (
                <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-white squircle-lg shadow-lg border border-gray-200 py-1 min-w-[200px] z-[60]">
                  {tournaments.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setCurrentId(t.id);
                        setTournamentDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-green-50 transition-colors flex items-center gap-2 ${
                        t.id === currentId ? "bg-green-50 text-green-700 font-semibold" : "text-gray-700"
                      }`}
                    >
                      {t.id === currentId && <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />}
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="block">
          <SiteLogo
            size="nav"
            titleClassName="text-gradient-court"
            markClassName="shadow-sm shadow-green-200/50"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {allLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={`text-sm font-semibold gap-1.5 ${isActive ? "bg-green-600 hover:bg-green-700 text-white shadow-md" : "text-gray-600 hover:text-green-700 hover:bg-green-50"}`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Button>
              </Link>
            );
          })}

          <div className="ml-2 pl-2 border-l border-gray-200">
            {loading ? null : user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 bg-green-50 px-2.5 py-1 squircle-pill flex items-center gap-1">
                  {user.role === "admin" ? <Shield className="w-3 h-3" /> : <ShuttlecockIcon className="w-3 h-3" />}
                  {user.username}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-gray-400 hover:text-red-500 gap-1"
                  onClick={handleLogout}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  退出
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-sm font-medium border-green-200 text-green-700 hover:bg-green-50 gap-1.5"
                >
                  <LogIn className="w-4 h-4" />
                  登录
                </Button>
              </Link>
            )}
          </div>
        </nav>

        <div className="md:hidden flex items-center gap-2 min-w-0">
          {!loading && user && (
            <Link href={isAdmin ? "/admin" : "/my-matches"} className="min-w-0 max-w-[11rem]">
              <Button
                variant="outline"
                size="sm"
                className="h-8 max-w-full squircle-pill border-green-200 bg-green-50 px-2.5 text-xs font-medium text-green-800 shadow-sm hover:bg-green-100"
              >
                {user.role === "admin" ? <Shield className="h-3.5 w-3.5 shrink-0" /> : <ShuttlecockIcon className="h-3.5 w-3.5 shrink-0" />}
                <span className="truncate">{user.username}</span>
              </Button>
            </Link>
          )}
          {!loading && !user && (
            <Link href="/login">
              <Button
                variant="outline"
                size="sm"
                className="h-8 squircle-pill border-green-200 px-2.5 text-xs font-medium text-green-700 hover:bg-green-50"
              >
                <LogIn className="h-3.5 w-3.5" />
                登录
              </Button>
            </Link>
          )}
          <Button variant="ghost" size="sm" className="px-2 text-gray-600" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-green-100/80 bg-white/98 backdrop-blur-lg">
          <nav className="container mx-auto max-w-7xl px-4 py-3 flex flex-col gap-1">
            {allLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={`w-full justify-start font-semibold gap-2 ${isActive ? "bg-green-600 text-white" : "text-gray-600"}`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Button>
                </Link>
              );
            })}
            <div className="border-t border-gray-100 pt-2 mt-1">
              {user ? (
                <>
                  <div className="px-4 py-2 text-sm text-gray-500 flex items-center gap-1.5">
                    {user.role === "admin" ? <Shield className="w-3.5 h-3.5" /> : <ShuttlecockIcon className="w-3.5 h-3.5" />}
                    {user.username}
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-red-500 gap-2"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4" />
                    退出登录
                  </Button>
                </>
              ) : (
                <Link href="/login" onClick={() => setOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start text-green-700 gap-2">
                    <LogIn className="w-4 h-4" />
                    登录
                  </Button>
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
