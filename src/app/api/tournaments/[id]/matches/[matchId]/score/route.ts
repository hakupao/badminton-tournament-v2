import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { matches, matchGames, refereeRecords, scoreEvents } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  // Require logged-in user (admin or athlete)
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: Login required" },
      { status: 401 }
    );
  }

  try {
    const db = getDb();
    const { id, matchId: matchIdStr } = await params;
    const tournamentId = parseInt(id, 10);
    const matchId = parseInt(matchIdStr, 10);

    if (isNaN(tournamentId) || isNaN(matchId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const match = await db
      .select()
      .from(matches)
      .where(eq(matches.id, matchId))
      .get();

    if (!match || match.tournamentId !== tournamentId) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Any logged-in user can submit scores (anyone can be a referee)

    const body = await request.json();
    const { games, refereePlayerId, lineJudgePlayerId, scoreEventLog } = body;

    if (!Array.isArray(games) || games.length === 0) {
      return NextResponse.json(
        { error: "games must be a non-empty array of {homeScore, awayScore}" },
        { status: 400 }
      );
    }

    // Validate each game
    for (const game of games) {
      if (
        typeof game.homeScore !== "number" ||
        typeof game.awayScore !== "number" ||
        game.homeScore < 0 ||
        game.awayScore < 0
      ) {
        return NextResponse.json(
          { error: "Each game must have non-negative homeScore and awayScore" },
          { status: 400 }
        );
      }
    }

    // Delete existing games for this match
    await db.delete(matchGames)
      .where(eq(matchGames.matchId, matchId))
      .run();

    // Delete existing referee records for this match
    await db.delete(refereeRecords)
      .where(eq(refereeRecords.matchId, matchId))
      .run();

    // Insert games and calculate winners
    let homeWins = 0;
    let awayWins = 0;
    const insertedGames = [];

    for (let i = 0; i < games.length; i++) {
      const { homeScore, awayScore } = games[i];
      let gameWinner: "home" | "away" | null = null;

      if (homeScore > awayScore) {
        gameWinner = "home";
        homeWins++;
      } else if (awayScore > homeScore) {
        gameWinner = "away";
        awayWins++;
      }

      const inserted = await db
        .insert(matchGames)
        .values({
          matchId,
          gameNumber: i + 1,
          homeScore,
          awayScore,
          winner: gameWinner,
        })
        .returning()
        .get();

      insertedGames.push(inserted);
    }

    // Determine overall match winner
    let matchWinner: "home" | "away" | null = null;
    if (homeWins > awayWins) {
      matchWinner = "home";
    } else if (awayWins > homeWins) {
      matchWinner = "away";
    }
    // If tied in games, could remain null (draw) or decide by total points
    // For single-game modes, the game winner is the match winner

    // Update match status and winner
    await db.update(matches)
      .set({
        status: "finished",
        winner: matchWinner,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(matches.id, matchId))
      .run();

    // Insert referee records
    if (refereePlayerId && typeof refereePlayerId === "number") {
      await db.insert(refereeRecords)
        .values({
          matchId,
          playerId: refereePlayerId,
          role: "referee",
        })
        .run();
    }

    if (lineJudgePlayerId && typeof lineJudgePlayerId === "number") {
      await db.insert(refereeRecords)
        .values({
          matchId,
          playerId: lineJudgePlayerId,
          role: "line_judge",
        })
        .run();
    }

    // Store score events (point-by-point tracking) if provided
    if (Array.isArray(scoreEventLog) && scoreEventLog.length > 0) {
      // Delete existing events for this match
      await db.delete(scoreEvents)
        .where(eq(scoreEvents.matchId, matchId))
        .run();

      for (const evt of scoreEventLog) {
        if (
          typeof evt.gameNumber === "number" &&
          typeof evt.eventOrder === "number" &&
          typeof evt.scoringSide === "string" &&
          typeof evt.homeScore === "number" &&
          typeof evt.awayScore === "number"
        ) {
          await db.insert(scoreEvents)
            .values({
              matchId,
              gameNumber: evt.gameNumber,
              eventOrder: evt.eventOrder,
              scoringSide: evt.scoringSide,
              homeScore: evt.homeScore,
              awayScore: evt.awayScore,
              timestamp: evt.timestamp || new Date().toISOString(),
            })
            .run();
        }
      }
    }

    return NextResponse.json({
      match: {
        ...match,
        status: "finished",
        winner: matchWinner,
      },
      games: insertedGames,
    });
  } catch (error) {
    console.error("Score match error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
