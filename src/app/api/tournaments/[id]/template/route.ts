import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { templatePositions, templateMatches, tournaments } from "@/db/schema";
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

    const body: any = await request.json();
    const { positions, matches } = body;

    if (!Array.isArray(positions) || !Array.isArray(matches)) {
      return NextResponse.json(
        { error: "positions and matches must be arrays" },
        { status: 400 }
      );
    }

    // Validate positions
    for (const pos of positions) {
      if (!pos.positionNumber || !["M", "F"].includes(pos.gender)) {
        return NextResponse.json(
          { error: "Each position needs positionNumber and gender (M/F)" },
          { status: 400 }
        );
      }
    }

    // Validate matches
    const validTypes = ["MD", "WD", "XD"];
    for (const m of matches) {
      if (!validTypes.includes(m.matchType)) {
        return NextResponse.json(
          { error: `Invalid match type: ${m.matchType}` },
          { status: 400 }
        );
      }
      if (!m.homePos1 || !m.homePos2 || !m.awayPos1 || !m.awayPos2) {
        return NextResponse.json(
          { error: "Each match needs homePos1, homePos2, awayPos1, awayPos2" },
          { status: 400 }
        );
      }
    }

    // Delete existing template
    await db.delete(templateMatches)
      .where(eq(templateMatches.tournamentId, tournamentId))
      .run();
    await db.delete(templatePositions)
      .where(eq(templatePositions.tournamentId, tournamentId))
      .run();

    // Insert new positions
    for (const pos of positions) {
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
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
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
