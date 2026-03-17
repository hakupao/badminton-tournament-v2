"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTournament } from "@/lib/tournament-context";

export default function TournamentRedirectPage() {
  const router = useRouter();
  const { currentId, loading } = useTournament();

  useEffect(() => {
    if (!loading) {
      router.replace(currentId ? "/admin/schedule" : "/admin");
    }
  }, [currentId, loading, router]);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">加载中...</div>;
  }

  return <div className="text-center py-12 text-muted-foreground">正在跳转...</div>;
}
