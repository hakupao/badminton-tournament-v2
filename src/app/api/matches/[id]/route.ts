import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  matches,
  matchGames,
  groups,
  players,
  tournaments,
  refereeRecords,
  users,
  scoreEvents,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { SCORING_MODES } from "@/lib/constants";
import type { ScoringMode } from "@/lib/constants";

export const runtime = 'edge';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb();
    const { id } = await params;
    const matchId = parseInt(id, 10);
    if (isNaN(matchId)) {
      return NextResponse.json({ error: "Invalid match ID" }, { status: 400 });
    }

    const match = await db
      .select()
      .from(matches)
      .where(eq(matches.id, matchId))
      .get();

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Get tournament for scoring mode
    const tournament = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, match.tournamentId))
      .get();

    // Get groups
    const homeGroup = await db.select().from(groups).where(eq(groups.id, match.homeGroupId)).get();
    const awayGroup = await db.select().from(groups).where(eq(groups.id, match.awayGroupId)).get();

    // Get players
    const allTournamentPlayers = await db
      .select()
      .from(players)
      .where(eq(players.tournamentId, match.tournamentId))
      .all();

    const playerMap = new Map(allTournamentPlayers.map((p) => [p.id, p]));

    // Get bound usernames
    const allUsers = await db
      .select({ id: users.id, username: users.username, playerId: users.playerId })
      .from(users)
      .all();
    const userByPlayerId = new Map(
      allUsers.filter((u) => u.playerId).map((u) => [u.playerId, u])
    );

    const buildPlayer = (playerId: number | null) => {
      if (!playerId) return null;
      const p = playerMap.get(playerId);
      if (!p) return null;
      const g = p.groupId === match.homeGroupId ? homeGroup : awayGroup;
      const boundUser = userByPlayerId.get(p.id);
      return {
        id: p.id,
        name: p.name,
        position: p.positionNumber,
        gender: p.gender,
        groupIcon: g?.icon || "",
        boundUsername: boundUser?.username || null,
      };
    };

    const homePlayers = [buildPlayer(match.homePlayer1Id), buildPlayer(match.homePlayer2Id)].filter(Boolean);
    const awayPlayers = [buildPlayer(match.awayPlayer1Id), buildPlayer(match.awayPlayer2Id)].filter(Boolean);

    // Get games
    const games = (await db
      .select()
      .from(matchGames)
      .where(eq(matchGames.matchId, matchId))
      .all())
      .sort((a, b) => a.gameNumber - b.gameNumber);

    // Get referee records
    const refs = await db
      .select()
      .from(refereeRecords)
      .where(eq(refereeRecords.matchId, matchId))
      .all();

    const referees = [];
    for (const r of refs) {
      const p = playerMap.get(r.playerId);
      const g = p ? await db.select().from(groups).where(eq(groups.id, p.groupId)).get() : null;
      referees.push({
        playerName: p?.name || null,
        role: r.role,
        groupIcon: g?.icon || "",
        position: p?.positionNumber || 0,
      });
    }

    // Scoring info
    const scoringMode = (tournament?.scoringMode || "single_21") as ScoringMode;
    const scoringInfo = SCORING_MODES[scoringMode];

    // All players for referee selection
    const allPlayersForSelect = [];
    for (const p of allTournamentPlayers) {
      const g = await db.select().from(groups).where(eq(groups.id, p.groupId)).get();
      const boundUser = userByPlayerId.get(p.id);
      allPlayersForSelect.push({
        id: p.id,
        name: p.name,
        groupIcon: g?.icon || "",
        position: p.positionNumber,
        boundUsername: boundUser?.username || null,
      });
    }

    // Get score events (point-by-point log)
    const matchScoreEvents = (await db
      .select()
      .from(scoreEvents)
      .where(eq(scoreEvents.matchId, matchId))
      .all())
      .sort((a, b) => a.gameNumber - b.gameNumber || a.eventOrder - b.eventOrder);

    return NextResponse.json({
      id: match.id,
      tournamentId: match.tournamentId,
      roundNumber: match.roundNumber,
      courtNumber: match.courtNumber,
      matchType: match.matchType,
      status: match.status,
      winner: match.winner,
      homeGroup: homeGroup ? { id: homeGroup.id, icon: homeGroup.icon, name: homeGroup.name } : null,
      awayGroup: awayGroup ? { id: awayGroup.id, icon: awayGroup.icon, name: awayGroup.name } : null,
      homePlayers,
      awayPlayers,
      games,
      referees,
      scoringMode,
      targetScore: scoringInfo.points,
      bestOf: scoringInfo.games,
      allPlayers: allPlayersForSelect,
      scoreEvents: matchScoreEvents,
    });
  } catch (error) {
    console.error("Get match error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
