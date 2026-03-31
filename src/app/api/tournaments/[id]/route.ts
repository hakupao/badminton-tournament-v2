import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  tournaments,
  groups,
  players,
  users,
  tournamentParticipants,
  templatePositions,
  templateMatches,
  matches,
  matchGames,
  refereeRecords,
  scoreEvents,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { buildDefaultTemplate, getDefaultTeam } from "@/lib/constants";
import type { ScoringMode } from "@/lib/constants";
import { eq } from "drizzle-orm";

export const runtime = 'edge';

function isIntegerInRange(value: number, min: number, max: number) {
  return Number.isInteger(value) && value >= min && value <= max;
}

interface UpdateTournamentRequestBody {
  name?: string;
  courtsCount?: number;
  roundDurationMinutes?: number;
  scoringMode?: ScoringMode;
  deuceEnabled?: boolean;
  eventDate?: string | null;
  startTime?: string;
  endTime?: string;
  malesPerGroup?: number;
  femalesPerGroup?: number;
  groupCount?: number;
  status?: "draft" | "active" | "finished";
}

async function deleteTournamentMatches(db: ReturnType<typeof getDb>, tournamentId: number) {
  const tournamentMatches = await db
    .select()
    .from(matches)
    .where(eq(matches.tournamentId, tournamentId))
    .all();

  for (const match of tournamentMatches) {
    await db.delete(scoreEvents).where(eq(scoreEvents.matchId, match.id)).run();
    await db.delete(refereeRecords).where(eq(refereeRecords.matchId, match.id)).run();
    await db.delete(matchGames).where(eq(matchGames.matchId, match.id)).run();
  }

  if (tournamentMatches.length > 0) {
    await db.delete(matches).where(eq(matches.tournamentId, tournamentId)).run();
  }
}

async function deleteTournamentDependencies(
  db: ReturnType<typeof getDb>,
  tournamentId: number
) {
  await deleteTournamentMatches(db, tournamentId);

  const tournamentPlayers = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.tournamentId, tournamentId))
    .all();

  for (const player of tournamentPlayers) {
    await db.update(users).set({ playerId: null }).where(eq(users.playerId, player.id)).run();
  }

  await db
    .delete(tournamentParticipants)
    .where(eq(tournamentParticipants.tournamentId, tournamentId))
    .run();
  await db.delete(players).where(eq(players.tournamentId, tournamentId)).run();
  await db.delete(groups).where(eq(groups.tournamentId, tournamentId)).run();
  await db.delete(templateMatches).where(eq(templateMatches.tournamentId, tournamentId)).run();
  await db.delete(templatePositions).where(eq(templatePositions.tournamentId, tournamentId)).run();
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
      deuceEnabled,
      eventDate,
      startTime,
      endTime,
      malesPerGroup,
      femalesPerGroup,
      groupCount,
      status,
    } = body;

    if (
      scoringMode !== undefined &&
      scoringMode !== "single_21" &&
      scoringMode !== "single_30" &&
      scoringMode !== "best_of_3_15" &&
      scoringMode !== "best_of_3_21"
    ) {
      return NextResponse.json({ error: "Invalid scoring mode" }, { status: 400 });
    }

    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
      return NextResponse.json({ error: "Tournament name is required" }, { status: 400 });
    }

    if (courtsCount !== undefined && !isIntegerInRange(courtsCount, 1, 20)) {
      return NextResponse.json({ error: "场地数必须在 1 到 20 之间" }, { status: 400 });
    }

    if (roundDurationMinutes !== undefined && !isIntegerInRange(roundDurationMinutes, 5, 120)) {
      return NextResponse.json({ error: "每轮时长必须在 5 到 120 分钟之间" }, { status: 400 });
    }

    if (malesPerGroup !== undefined && !isIntegerInRange(malesPerGroup, 1, 10)) {
      return NextResponse.json({ error: "每组男生人数必须在 1 到 10 之间" }, { status: 400 });
    }

    if (femalesPerGroup !== undefined && !isIntegerInRange(femalesPerGroup, 1, 10)) {
      return NextResponse.json({ error: "每组女生人数必须在 1 到 10 之间" }, { status: 400 });
    }

    if (groupCount !== undefined && !isIntegerInRange(groupCount, 2, 20)) {
      return NextResponse.json({ error: "小组数必须在 2 到 20 之间" }, { status: 400 });
    }

    if (
      status !== undefined &&
      status !== "draft" &&
      status !== "active" &&
      status !== "finished"
    ) {
      return NextResponse.json({ error: "Invalid tournament status" }, { status: 400 });
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (courtsCount !== undefined) updateData.courtsCount = courtsCount;
    if (roundDurationMinutes !== undefined) updateData.roundDurationMinutes = roundDurationMinutes;
    if (scoringMode !== undefined) updateData.scoringMode = scoringMode;
    if (deuceEnabled !== undefined) updateData.deuceEnabled = deuceEnabled;
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

    const currentGroups = (await db
      .select()
      .from(groups)
      .where(eq(groups.tournamentId, tournamentId))
      .all())
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const nextGroupCount = groupCount ?? currentGroups.length;
    const nextMalesPerGroup = malesPerGroup ?? updated.malesPerGroup;
    const nextFemalesPerGroup = femalesPerGroup ?? updated.femalesPerGroup;
    const groupCountChanged = currentGroups.length !== nextGroupCount;
    const rosterShapeChanged =
      existing.malesPerGroup !== nextMalesPerGroup ||
      existing.femalesPerGroup !== nextFemalesPerGroup;

    if (groupCountChanged || rosterShapeChanged) {
      await deleteTournamentMatches(db, tournamentId);

      if (rosterShapeChanged) {
        await db
          .delete(tournamentParticipants)
          .where(eq(tournamentParticipants.tournamentId, tournamentId))
          .run();
      }

      const tournamentPlayers = await db
        .select()
        .from(players)
        .where(eq(players.tournamentId, tournamentId))
        .all();
      for (const player of tournamentPlayers) {
        await db.update(users).set({ playerId: null }).where(eq(users.playerId, player.id)).run();
      }

      await db.delete(players).where(eq(players.tournamentId, tournamentId)).run();

      let groupsForPlayers = currentGroups;
      if (groupCountChanged) {
        await db.delete(groups).where(eq(groups.tournamentId, tournamentId)).run();

        for (let i = 0; i < nextGroupCount; i++) {
          const existingGroup = currentGroups[i];
          const fallbackTeam = getDefaultTeam(i);

          await db
            .insert(groups)
            .values({
              tournamentId,
              name: existingGroup?.name || fallbackTeam.name,
              icon: existingGroup?.icon || fallbackTeam.icon,
              sortOrder: i,
            })
            .run();
        }

        groupsForPlayers = (await db
          .select()
          .from(groups)
          .where(eq(groups.tournamentId, tournamentId))
          .all())
          .sort((a, b) => a.sortOrder - b.sortOrder);
      }

      const totalPerGroup = nextMalesPerGroup + nextFemalesPerGroup;
      for (const group of groupsForPlayers) {
        for (let position = 1; position <= totalPerGroup; position++) {
          await db
            .insert(players)
            .values({
              tournamentId,
              groupId: group.id,
              positionNumber: position,
              gender: position <= nextMalesPerGroup ? "M" : "F",
            })
            .run();
        }
      }

      if (rosterShapeChanged) {
        const defaultTemplate = buildDefaultTemplate(nextMalesPerGroup, nextFemalesPerGroup);

        await db.delete(templateMatches).where(eq(templateMatches.tournamentId, tournamentId)).run();
        await db.delete(templatePositions).where(eq(templatePositions.tournamentId, tournamentId)).run();

        for (const position of defaultTemplate.positions) {
          await db
            .insert(templatePositions)
            .values({
              tournamentId,
              positionNumber: position.positionNumber,
              gender: position.gender,
            })
            .run();
        }

        for (const match of defaultTemplate.matches) {
          await db
            .insert(templateMatches)
            .values({
              tournamentId,
              matchType: match.matchType,
              homePos1: match.homePos1,
              homePos2: match.homePos2,
              awayPos1: match.awayPos1,
              awayPos2: match.awayPos2,
              sortOrder: match.sortOrder,
            })
            .run();
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

    await deleteTournamentDependencies(db, tournamentId);
    await db.delete(tournaments).where(eq(tournaments.id, tournamentId)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete tournament error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
