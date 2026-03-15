"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function TournamentRedirectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tournaments")
      .then((r) => r.json())
      .then((data) => {
        const tournaments = data.tournaments || [];
        if (tournaments.length > 0) {
          // Redirect to the latest tournament
          router.replace(`/admin/tournament/${tournaments[0].id}`);
        } else {
          setLoading(false);
        }
      });
  }, [router]);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">加载中...</div>;
  }

  return (
    <div className="text-center py-12 text-muted-foreground">
      <p>还没有赛事，请先在管理后台创建一个</p>
    </div>
  );
}
