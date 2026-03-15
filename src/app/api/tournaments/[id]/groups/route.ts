import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { groups, players, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

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

    // Get all users with playerId set to find bindings
    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        playerId: users.playerId,
      })
      .from(users)
      .all();

    const userByPlayerId = new Map(
      allUsers.filter((u) => u.playerId).map((u) => [u.playerId, u])
    );

    // Group players by groupId
    const groupsWithPlayers = tournamentGroups.map((group) => ({
      ...group,
      players: tournamentPlayers
        .filter((p) => p.groupId === group.id)
        .sort((a, b) => a.positionNumber - b.positionNumber)
        .map((p) => ({
          ...p,
          boundUser: userByPlayerId.get(p.id) || null,
        })),
    }));

    return NextResponse.json({ groups: groupsWithPlayers });
  } catch (error) {
    console.error("List groups error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT: Update group icons/names
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const { id } = await params;
    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid tournament ID" }, { status: 400 });
    }

    const body = await request.json();
    const { groupUpdates } = body;

    if (!Array.isArray(groupUpdates)) {
      return NextResponse.json(
        { error: "groupUpdates must be an array of {groupId, icon?, name?}" },
        { status: 400 }
      );
    }

    for (const { groupId, icon, name } of groupUpdates) {
      if (!groupId || typeof groupId !== "number") {
        return NextResponse.json({ error: "Each update must have a numeric groupId" }, { status: 400 });
      }

      // Verify group belongs to this tournament
      const group = await db
        .select()
        .from(groups)
        .where(eq(groups.id, groupId))
        .get();

      if (!group || group.tournamentId !== tournamentId) {
        return NextResponse.json({ error: `Group ${groupId} not found in this tournament` }, { status: 400 });
      }

      const updateData: Record<string, unknown> = {};
      if (icon !== undefined && typeof icon === "string" && icon.trim()) {
        updateData.icon = icon.trim();
      }
      if (name !== undefined && typeof name === "string" && name.trim()) {
        updateData.name = name.trim();
      }

      if (Object.keys(updateData).length > 0) {
        await db.update(groups)
          .set(updateData)
          .where(eq(groups.id, groupId))
          .run();
      }
    }

    // Return updated groups
    const updatedGroups = await db
      .select()
      .from(groups)
      .where(eq(groups.tournamentId, tournamentId))
      .all();

    return NextResponse.json({ groups: updatedGroups });
  } catch (error) {
    console.error("Update groups error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Assign players to groups
export async function POST(
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

    const body = await request.json();
    const { assignments } = body;

    if (!Array.isArray(assignments)) {
      return NextResponse.json(
        { error: "assignments must be an array of {playerId, name}" },
        { status: 400 }
      );
    }

    for (const { playerId, name, userId } of assignments) {
      if (!playerId || typeof playerId !== "number") {
        return NextResponse.json(
          { error: "Each assignment must have a numeric playerId" },
          { status: 400 }
        );
      }

      // Verify player belongs to this tournament
      const player = await db
        .select()
        .from(players)
        .where(eq(players.id, playerId))
        .get();

      if (!player || player.tournamentId !== tournamentId) {
        return NextResponse.json(
          { error: `Player ${playerId} not found in this tournament` },
          { status: 400 }
        );
      }

      // Update player name if provided
      if (name !== undefined) {
        await db.update(players)
          .set({ name: name || null })
          .where(eq(players.id, playerId))
          .run();
      }

      // Bind/unbind user to this player position
      if (userId !== undefined) {
        // First, unbind any user currently bound to this player
        const currentlyBound = await db
          .select()
          .from(users)
          .where(eq(users.playerId, playerId))
          .all();
        for (const u of currentlyBound) {
          await db.update(users)
            .set({ playerId: null })
            .where(eq(users.id, u.id))
            .run();
        }

        // Bind the new user (if userId is not null/0)
        if (userId && typeof userId === "number") {
          await db.update(users)
            .set({ playerId: playerId })
            .where(eq(users.id, userId))
            .run();
        }
      }
    }

    // Return updated players
    const updatedPlayers = await db
      .select()
      .from(players)
      .where(eq(players.tournamentId, tournamentId))
      .all();

    return NextResponse.json({ players: updatedPlayers });
  } catch (error) {
    console.error("Assign players error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
