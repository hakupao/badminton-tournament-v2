import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { players, users, matches } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export const runtime = 'edge';

// POST: Add alternate player (slotIndex=2) to a position
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const db = getDb();
    const { id } = await params;
    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid tournament ID" }, { status: 400 });
    }

    const body = await request.json() as {
      groupId?: number;
      positionNumber?: number;
      name?: string | null;
      userId?: number | null;
    };

    const { groupId, positionNumber, name, userId } = body;

    if (!groupId || !positionNumber) {
      return NextResponse.json(
        { error: "groupId and positionNumber are required" },
        { status: 400 }
      );
    }

    // Check that a primary player (slotIndex=1) exists for this position
    const primaryPlayer = (await db
      .select()
      .from(players)
      .where(eq(players.tournamentId, tournamentId))
      .all())
      .find(p => p.groupId === groupId && p.positionNumber === positionNumber && p.slotIndex === 1);

    if (!primaryPlayer) {
      return NextResponse.json(
        { error: "该位置不存在主选手" },
        { status: 400 }
      );
    }

    // Check that an alternate (slotIndex=2) doesn't already exist
    const existingAlternate = (await db
      .select()
      .from(players)
      .where(eq(players.tournamentId, tournamentId))
      .all())
      .find(p => p.groupId === groupId && p.positionNumber === positionNumber && p.slotIndex === 2);

    if (existingAlternate) {
      return NextResponse.json(
        { error: "该位置已有候补选手" },
        { status: 400 }
      );
    }

    // Create the alternate player
    await db
      .insert(players)
      .values({
        tournamentId,
        groupId,
        positionNumber,
        slotIndex: 2,
        gender: primaryPlayer.gender,
        name: name || null,
      })
      .run();

    // Query back to get the created player's ID
    const allPlayers = await db
      .select()
      .from(players)
      .where(eq(players.tournamentId, tournamentId))
      .all();

    const newPlayer = allPlayers.find(
      p => p.groupId === groupId && p.positionNumber === positionNumber && p.slotIndex === 2
    );

    // Bind user if provided
    if (userId && newPlayer) {
      await db.update(users)
        .set({ playerId: newPlayer.id })
        .where(eq(users.id, userId))
        .run();
    }

    return NextResponse.json({ player: newPlayer }, { status: 201 });
  } catch (error) {
    console.error("Add alternate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Remove alternate player (slotIndex=2) from a position
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const db = getDb();
    const { id } = await params;
    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid tournament ID" }, { status: 400 });
    }

    const body = await request.json() as { playerId?: number };
    const { playerId } = body;

    if (!playerId) {
      return NextResponse.json({ error: "playerId is required" }, { status: 400 });
    }

    // Verify player exists, belongs to this tournament, and is slotIndex=2
    const player = await db
      .select()
      .from(players)
      .where(eq(players.id, playerId))
      .get();

    if (!player || player.tournamentId !== tournamentId) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    if (player.slotIndex !== 2) {
      return NextResponse.json(
        { error: "只能删除候补选手（slotIndex=2）" },
        { status: 400 }
      );
    }

    // Check if this player is referenced in any match
    const allMatches = await db
      .select()
      .from(matches)
      .where(eq(matches.tournamentId, tournamentId))
      .all();

    const isReferenced = allMatches.some(
      m => m.homePlayer1Id === playerId ||
           m.homePlayer2Id === playerId ||
           m.awayPlayer1Id === playerId ||
           m.awayPlayer2Id === playerId
    );

    if (isReferenced) {
      return NextResponse.json(
        { error: "该候补选手已被排入赛程，请先在换人管理中替换回主选手" },
        { status: 400 }
      );
    }

    // Unbind any user bound to this player
    const boundUsers = await db
      .select()
      .from(users)
      .where(eq(users.playerId, playerId))
      .all();
    for (const u of boundUsers) {
      await db.update(users)
        .set({ playerId: null })
        .where(eq(users.id, u.id))
        .run();
    }

    // Delete the player
    await db.delete(players).where(eq(players.id, playerId)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove alternate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
