import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { tournamentParticipants, tournaments, users, groups } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export const runtime = 'edge';

interface ParticipantAssignmentInput {
  userId: number;
  assignedPosition: number;
  gender: "M" | "F";
}

interface ParticipantAssignmentsRequest {
  assignments?: ParticipantAssignmentInput[];
}

// GET: List all participants for a tournament (with their assigned positions)
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

    const tournament = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .get();

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    // Get all participants with user info
    const allParticipants = await db
      .select()
      .from(tournamentParticipants)
      .where(eq(tournamentParticipants.tournamentId, tournamentId))
      .all();

    const allUsers = await db
      .select({ id: users.id, username: users.username, role: users.role })
      .from(users)
      .all();

    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    const enriched = allParticipants.map((p) => ({
      ...p,
      username: userMap.get(p.userId)?.username || "未知",
    }));

    // Calculate position limits: each position can have at most groupCount people
    const tournamentGroups = await db
      .select()
      .from(groups)
      .where(eq(groups.tournamentId, tournamentId))
      .all();

    return NextResponse.json({
      participants: enriched,
      malesPerGroup: tournament.malesPerGroup,
      femalesPerGroup: tournament.femalesPerGroup,
      groupCount: tournamentGroups.length,
    });
  } catch (error) {
    console.error("Get participants error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Add or update a participant's position assignment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
  }

  try {
    const db = getDb();
    const { id } = await params;
    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid tournament ID" }, { status: 400 });
    }

    const body = await request.json() as ParticipantAssignmentsRequest;
    const { assignments } = body;

    if (!Array.isArray(assignments)) {
      return NextResponse.json(
        { error: "assignments must be an array of {userId, assignedPosition, gender}" },
        { status: 400 }
      );
    }

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

    const groupCount = tournamentGroups.length;
    const totalPerGroup = tournament.malesPerGroup + tournament.femalesPerGroup;

    for (const { userId, assignedPosition, gender } of assignments) {
      if (!userId || !assignedPosition || !gender) {
        return NextResponse.json(
          { error: "Each assignment needs userId, assignedPosition, gender" },
          { status: 400 }
        );
      }

      if (assignedPosition < 1 || assignedPosition > totalPerGroup) {
        return NextResponse.json(
          { error: `位置号必须在 1-${totalPerGroup} 之间` },
          { status: 400 }
        );
      }

      // Check position capacity (max = groupCount)
      const existingInPosition = (await db
        .select()
        .from(tournamentParticipants)
        .where(
          and(
            eq(tournamentParticipants.tournamentId, tournamentId),
            eq(tournamentParticipants.assignedPosition, assignedPosition)
          )
        )
        .all())
        .filter((p) => p.userId !== userId);

      if (existingInPosition.length >= groupCount) {
        return NextResponse.json(
          { error: `位置 ${assignedPosition} 已满（上限 ${groupCount} 人）` },
          { status: 400 }
        );
      }

      // Upsert: delete existing then insert
      await db.delete(tournamentParticipants)
        .where(
          and(
            eq(tournamentParticipants.tournamentId, tournamentId),
            eq(tournamentParticipants.userId, userId)
          )
        )
        .run();

      await db.insert(tournamentParticipants)
        .values({
          tournamentId,
          userId,
          assignedPosition,
          gender,
        })
        .run();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Assign participants error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Remove a participant from the tournament
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
  }

  try {
    const db = getDb();
    const { id } = await params;
    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid tournament ID" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const userId = parseInt(searchParams.get("userId") || "", 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    await db.delete(tournamentParticipants)
      .where(
        and(
          eq(tournamentParticipants.tournamentId, tournamentId),
          eq(tournamentParticipants.userId, userId)
        )
      )
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove participant error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
