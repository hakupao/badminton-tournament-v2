"use client";

export const runtime = "edge";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTournament } from "@/lib/tournament-context";

export default function LegacyTournamentPage() {
  const params = useParams();
  const router = useRouter();
  const { setCurrentId } = useTournament();

  useEffect(() => {
    const rawId = params.id;
    const nextId = typeof rawId === "string" ? parseInt(rawId, 10) : NaN;
    if (!Number.isNaN(nextId)) {
      setCurrentId(nextId);
    }
    router.replace("/admin/schedule");
  }, [params.id, router, setCurrentId]);

  return <div className="text-center py-12 text-gray-400">正在跳转到新的赛程安排页...</div>;
}
