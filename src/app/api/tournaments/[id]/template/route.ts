import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  templatePositions,
  templateMatches,
  tournaments,
  matches as tournamentMatches,
  matchGames,
  refereeRecords,
  scoreEvents,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = 'edge';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb();
    const { id } = await params;
    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid tournament ID" }, { status: 400 });
    }

    const positions = await db
      .select()
      .from(templatePositions)
      .where(eq(templatePositions.tournamentId, tournamentId))
      .all();

    const matches = (await db
      .select()
      .from(templateMatches)
      .where(eq(templateMatches.tournamentId, tournamentId))
      .all())
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return NextResponse.json({ positions, matches });
  } catch (error) {
    console.error("Get template error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb();
    const { id } = await params;
    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid tournament ID" }, { status: 400 });
    }

    const tournament = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .get();

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const body = await request.json() as {
      positions?: Array<{ positionNumber?: number; gender?: string }>;
      matches?: Array<{
        matchType?: string;
        homePos1?: number;
        homePos2?: number;
        awayPos1?: number;
        awayPos2?: number;
      }>;
    };
    const { positions, matches } = body;

    if (!Array.isArray(positions) || !Array.isArray(matches)) {
      return NextResponse.json(
        { error: "positions and matches must be arrays" },
        { status: 400 }
      );
    }

    const validatedPositions: Array<{ positionNumber: number; gender: "M" | "F" }> = [];
    for (const pos of positions) {
      if (
        typeof pos.positionNumber !== "number" ||
        !pos.positionNumber ||
        (pos.gender !== "M" && pos.gender !== "F")
      ) {
        return NextResponse.json(
          { error: "Each position needs positionNumber and gender (M/F)" },
          { status: 400 }
        );
      }

      validatedPositions.push({
        positionNumber: pos.positionNumber,
        gender: pos.gender,
      });
    }

    const validatedMatches: Array<{
      matchType: "MD" | "WD" | "XD";
      homePos1: number;
      homePos2: number;
      awayPos1: number;
      awayPos2: number;
    }> = [];

    const validTypes = ["MD", "WD", "XD"];
    for (const m of matches) {
      if (
        !m.matchType ||
        !validTypes.includes(m.matchType) ||
        typeof m.homePos1 !== "number" ||
        typeof m.homePos2 !== "number" ||
        typeof m.awayPos1 !== "number" ||
        typeof m.awayPos2 !== "number" ||
        !m.homePos1 ||
        !m.homePos2 ||
        !m.awayPos1 ||
        !m.awayPos2
      ) {
        return NextResponse.json(
          { error: `Each match needs matchType, homePos1, homePos2, awayPos1, awayPos2` },
          { status: 400 }
        );
      }

      validatedMatches.push({
        matchType: m.matchType as "MD" | "WD" | "XD",
        homePos1: m.homePos1,
        homePos2: m.homePos2,
        awayPos1: m.awayPos1,
        awayPos2: m.awayPos2,
      });
    }

    // Template changes invalidate the generated schedule.
    const scheduledMatches = await db
      .select()
      .from(tournamentMatches)
      .where(eq(tournamentMatches.tournamentId, tournamentId))
      .all();

    for (const scheduledMatch of scheduledMatches) {
      await db.delete(scoreEvents).where(eq(scoreEvents.matchId, scheduledMatch.id)).run();
      await db.delete(refereeRecords).where(eq(refereeRecords.matchId, scheduledMatch.id)).run();
      await db.delete(matchGames).where(eq(matchGames.matchId, scheduledMatch.id)).run();
    }
    await db
      .delete(tournamentMatches)
      .where(eq(tournamentMatches.tournamentId, tournamentId))
      .run();

    // Delete existing template
    await db.delete(templateMatches)
      .where(eq(templateMatches.tournamentId, tournamentId))
      .run();
    await db.delete(templatePositions)
      .where(eq(templatePositions.tournamentId, tournamentId))
      .run();

    // Insert new positions
    for (const pos of validatedPositions) {
      await db
        .insert(templatePositions)
        .values({
          tournamentId,
          positionNumber: pos.positionNumber,
          gender: pos.gender,
        })
        .run();
    }

    // Insert new matches
    for (let i = 0; i < validatedMatches.length; i++) {
      const m = validatedMatches[i];
      await db
        .insert(templateMatches)
        .values({
          tournamentId,
          matchType: m.matchType,
          homePos1: m.homePos1,
          homePos2: m.homePos2,
          awayPos1: m.awayPos1,
          awayPos2: m.awayPos2,
          sortOrder: i + 1,
        })
        .run();
    }

    // Query back inserted data
    const insertedPositions = await db
      .select()
      .from(templatePositions)
      .where(eq(templatePositions.tournamentId, tournamentId))
      .all();

    const insertedMatches = await db
      .select()
      .from(templateMatches)
      .where(eq(templateMatches.tournamentId, tournamentId))
      .all();

    return NextResponse.json({
      positions: insertedPositions,
      matches: insertedMatches,
    });
  } catch (error) {
    console.error("Update template error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
