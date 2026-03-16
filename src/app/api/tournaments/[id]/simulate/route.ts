import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { tournaments, groups, templateMatches } from "@/db/schema";
import { runSimulation } from "@/lib/engine";
import type { SimulationParams } from "@/lib/engine";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const runtime = 'edge';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid tournament ID" }, { status: 400 });
    }

    const db = getDb();
    const tournament = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .get();

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const tournamentGroups = await db
      .select()
      .from(groups)
      .where(eq(groups.tournamentId, tournamentId))
      .all();

    const templates = await db
      .select()
      .from(templateMatches)
      .where(eq(templateMatches.tournamentId, tournamentId))
      .all();

    const simParams: SimulationParams = {
      groupCount: tournamentGroups.length,
      malesPerGroup: tournament.malesPerGroup,
      femalesPerGroup: tournament.femalesPerGroup,
      courtsCount: tournament.courtsCount,
      roundDurationMinutes: tournament.roundDurationMinutes,
      startTime: tournament.startTime || "09:00",
      endTime: tournament.endTime || "19:00",
      templateMatches: templates.map((t) => ({
        matchType: t.matchType,
        homePos1: t.homePos1,
        homePos2: t.homePos2,
        awayPos1: t.awayPos1,
        awayPos2: t.awayPos2,
      })),
    };

    const result = runSimulation(simParams);

    // Include group info for frontend display
    const groupsInfo = tournamentGroups
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((g) => ({ icon: g.icon, name: g.name }));

    return NextResponse.json({ ...result, groups: groupsInfo });
  } catch (error) {
    console.error("Simulate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
