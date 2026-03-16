import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { tournaments, templatePositions, templateMatches, groups, players } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getDefaultTeam, DEFAULT_TEMPLATE } from "@/lib/constants";
import { eq } from "drizzle-orm";

export const runtime = 'edge';

export async function GET() {
  try {
    const db = getDb();
    const allTournaments = await db.select().from(tournaments).all();
    return NextResponse.json({ tournaments: allTournaments });
  } catch (error) {
    console.error("List tournaments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json(
      { error: "Unauthorized: Admin access required" },
      { status: 403 }
    );
  }

  try {
    const db = getDb();
    const body: any = await request.json();
    const {
      name,
      courtsCount = 3,
      roundDurationMinutes = 20,
      scoringMode = "single_21",
      eventDate,
      startTime = "09:00",
      endTime = "19:00",
      malesPerGroup = 3,
      femalesPerGroup = 2,
      groupCount = 4,
    } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Tournament name is required" },
        { status: 400 }
      );
    }

    if (groupCount < 2 || groupCount > 20) {
      return NextResponse.json(
        { error: "小组数必须在 2 到 20 之间" },
        { status: 400 }
      );
    }

    // Create tournament
    await db
      .insert(tournaments)
      .values({
        name: name.trim(),
        courtsCount,
        roundDurationMinutes,
        scoringMode,
        eventDate: eventDate || null,
        startTime,
        endTime,
        malesPerGroup,
        femalesPerGroup,
      })
      .run();

    // Query back to get the real ID (D1 compatible - .returning().get() unreliable on D1)
    const recentTournaments = await db.select().from(tournaments).all();
    const tournament = recentTournaments.sort((a, b) => b.id - a.id)[0];

    // Create default template positions
    for (const pos of DEFAULT_TEMPLATE.positions) {
      await db.insert(templatePositions)
        .values({
          tournamentId: tournament.id,
          positionNumber: pos.positionNumber,
          gender: pos.gender,
        })
        .run();
    }

    // Create default template matches
    for (const tm of DEFAULT_TEMPLATE.matches) {
      await db.insert(templateMatches)
        .values({
          tournamentId: tournament.id,
          matchType: tm.matchType,
          homePos1: tm.homePos1,
          homePos2: tm.homePos2,
          awayPos1: tm.awayPos1,
          awayPos2: tm.awayPos2,
          sortOrder: tm.sortOrder,
        })
        .run();
    }

    // Create groups using ANIMAL_TEAMS
    for (let i = 0; i < groupCount; i++) {
      const team = getDefaultTeam(i);
      await db
        .insert(groups)
        .values({
          tournamentId: tournament.id,
          name: team.name,
          icon: team.icon,
          sortOrder: i,
        })
        .run();
    }

    // Query back the created groups to get their real IDs
    const createdGroups = await db
      .select()
      .from(groups)
      .where(eq(groups.tournamentId, tournament.id))
      .all();

    // Create player slots for each group
    const totalPerGroup = malesPerGroup + femalesPerGroup;
    for (const group of createdGroups) {
      for (let p = 1; p <= totalPerGroup; p++) {
        await db.insert(players)
          .values({
            tournamentId: tournament.id,
            groupId: group.id,
            positionNumber: p,
            gender: p <= malesPerGroup ? "M" : "F",
          })
          .run();
      }
    }

    return NextResponse.json({ tournament }, { status: 201 });
  } catch (error) {
    console.error("Create tournament error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
