import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  tournaments,
  groups,
  players,
  users,
  templatePositions,
  templateMatches,
  matches,
  matchGames,
  refereeRecords,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getDefaultTeam } from "@/lib/constants";
import { eq } from "drizzle-orm";

export const runtime = 'edge';

interface UpdateTournamentRequestBody {
  name?: string;
  courtsCount?: number;
  roundDurationMinutes?: number;
  scoringMode?: string;
  eventDate?: string | null;
  startTime?: string;
  endTime?: string;
  malesPerGroup?: number;
  femalesPerGroup?: number;
  groupCount?: number;
  status?: "draft" | "active" | "finished";
}

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

    const tournamentGroups = await db
      .select()
      .from(groups)
      .where(eq(groups.tournamentId, tournamentId))
      .all();

    const tournamentPlayers = await db
      .select()
      .from(players)
      .where(eq(players.tournamentId, tournamentId))
      .all();

    const positions = await db
      .select()
      .from(templatePositions)
      .where(eq(templatePositions.tournamentId, tournamentId))
      .all();

    const templates = await db
      .select()
      .from(templateMatches)
      .where(eq(templateMatches.tournamentId, tournamentId))
      .all();

    // Enrich players with bound username
    const allUsers = await db
      .select({ id: users.id, username: users.username, playerId: users.playerId })
      .from(users)
      .all();
    const userByPlayerId = new Map(
      allUsers.filter((u) => u.playerId).map((u) => [u.playerId, u])
    );
    const enrichedPlayers = tournamentPlayers.map((p) => {
      const boundUser = userByPlayerId.get(p.id);
      return { ...p, boundUsername: boundUser?.username || null };
    });

    return NextResponse.json({
      tournament,
      groups: tournamentGroups,
      players: enrichedPlayers,
      template: {
        positions,
        matches: templates,
      },
    });
  } catch (error) {
    console.error("Get tournament error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid tournament ID" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .get();

    if (!existing) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const body = await request.json() as UpdateTournamentRequestBody;
    const {
      name,
      courtsCount,
      roundDurationMinutes,
      scoringMode,
      eventDate,
      startTime,
      endTime,
      malesPerGroup,
      femalesPerGroup,
      groupCount,
      status,
    } = body;

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (courtsCount !== undefined) updateData.courtsCount = courtsCount;
    if (roundDurationMinutes !== undefined) updateData.roundDurationMinutes = roundDurationMinutes;
    if (scoringMode !== undefined) updateData.scoringMode = scoringMode;
    if (eventDate !== undefined) updateData.eventDate = eventDate;
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (malesPerGroup !== undefined) updateData.malesPerGroup = malesPerGroup;
    if (femalesPerGroup !== undefined) updateData.femalesPerGroup = femalesPerGroup;
    if (status !== undefined) updateData.status = status;
    updateData.updatedAt = new Date().toISOString();

    await db
      .update(tournaments)
      .set(updateData)
      .where(eq(tournaments.id, tournamentId))
      .run();

    const updated = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .get();

    if (!updated) {
      throw new Error("Updated tournament not found");
    }

    // If groupCount changed, recreate groups and players
    if (groupCount !== undefined) {
      const currentGroups = await db
        .select()
        .from(groups)
        .where(eq(groups.tournamentId, tournamentId))
        .all();

      if (currentGroups.length !== groupCount) {
        // Unbind users from players in this tournament
        const tournamentPlayers = await db.select().from(players).where(eq(players.tournamentId, tournamentId)).all();
        const playerIds = tournamentPlayers.map(p => p.id);
        for (const pid of playerIds) {
          await db.update(users).set({ playerId: null }).where(eq(users.playerId, pid)).run();
        }

        // Delete matches and related data
        const tournamentMatches = await db.select().from(matches).where(eq(matches.tournamentId, tournamentId)).all();
        for (const m of tournamentMatches) {
          await db.delete(refereeRecords).where(eq(refereeRecords.matchId, m.id)).run();
          await db.delete(matchGames).where(eq(matchGames.matchId, m.id)).run();
        }
        await db.delete(matches).where(eq(matches.tournamentId, tournamentId)).run();

        // Delete existing players for this tournament
        await db.delete(players)
          .where(eq(players.tournamentId, tournamentId))
          .run();

        // Delete existing groups
        await db.delete(groups)
          .where(eq(groups.tournamentId, tournamentId))
          .run();

        // Recreate groups and players
        const males = malesPerGroup ?? updated.malesPerGroup;
        const females = femalesPerGroup ?? updated.femalesPerGroup;
        const totalPerGroup = males + females;

        for (let i = 0; i < groupCount; i++) {
          const team = getDefaultTeam(i);
          await db
            .insert(groups)
            .values({
              tournamentId,
              name: team.name,
              icon: team.icon,
              sortOrder: i,
            })
            .run();
        }

        // Query back created groups to get their real IDs
        const createdGroups = await db
          .select()
          .from(groups)
          .where(eq(groups.tournamentId, tournamentId))
          .all();

        for (const group of createdGroups) {
          for (let p = 1; p <= totalPerGroup; p++) {
            await db.insert(players)
              .values({
                tournamentId,
                groupId: group.id,
                positionNumber: p,
                gender: p <= males ? "M" : "F",
              })
              .run();
          }
        }
      }
    }

    return NextResponse.json({ tournament: updated });
  } catch (error) {
    console.error("Update tournament error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid tournament ID" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .get();

    if (!existing) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    // Delete in dependency order
    const tournamentMatches = await db.select().from(matches).where(eq(matches.tournamentId, tournamentId)).all();
    const matchIds = tournamentMatches.map((m) => m.id);

    if (matchIds.length > 0) {
      for (const mid of matchIds) {
        await db.delete(refereeRecords).where(eq(refereeRecords.matchId, mid)).run();
        await db.delete(matchGames).where(eq(matchGames.matchId, mid)).run();
      }
      await db.delete(matches).where(eq(matches.tournamentId, tournamentId)).run();
    }

    await db.delete(players).where(eq(players.tournamentId, tournamentId)).run();
    await db.delete(groups).where(eq(groups.tournamentId, tournamentId)).run();
    await db.delete(templateMatches).where(eq(templateMatches.tournamentId, tournamentId)).run();
    await db.delete(templatePositions).where(eq(templatePositions.tournamentId, tournamentId)).run();
    await db.delete(tournaments).where(eq(tournaments.id, tournamentId)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete tournament error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
