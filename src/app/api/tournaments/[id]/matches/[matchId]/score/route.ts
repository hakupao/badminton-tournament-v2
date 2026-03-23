import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { matches, matchGames, refereeRecords, scoreEvents } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const runtime = 'edge';

interface ScoreGameInput {
  homeScore?: unknown;
  awayScore?: unknown;
}

interface ScoreEventInput {
  gameNumber?: unknown;
  eventOrder?: unknown;
  scoringSide?: unknown;
  homeScore?: unknown;
  awayScore?: unknown;
  timestamp?: unknown;
}

interface ScoreRequestBody {
  games?: ScoreGameInput[];
  refereePlayerId?: unknown;
  lineJudgePlayerId?: unknown;
  scoreEventLog?: ScoreEventInput[];
}

interface ValidatedScoreGame {
  homeScore: number;
  awayScore: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  try {
    const user = await getCurrentUser();
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

    const isAdmin = user?.role === "admin";
    if (match.status === "finished" && !isAdmin) {
      return NextResponse.json(
        { error: "比分已提交，如需修改请联系管理员" },
        { status: 403 }
      );
    }

    const body = await request.json() as ScoreRequestBody;
    const games = body.games;
    const refereePlayerId =
      typeof body.refereePlayerId === "number" ? body.refereePlayerId : undefined;
    const lineJudgePlayerId =
      typeof body.lineJudgePlayerId === "number" ? body.lineJudgePlayerId : undefined;
    const scoreEventLog = Array.isArray(body.scoreEventLog) ? body.scoreEventLog : [];

    if (!Array.isArray(games) || games.length === 0) {
      return NextResponse.json(
        { error: "games must be a non-empty array of {homeScore, awayScore}" },
        { status: 400 }
      );
    }

    if (!isAdmin) {
      const claimedIds = [refereePlayerId, lineJudgePlayerId].filter(
        (playerId): playerId is number => typeof playerId === "number"
      );

      if (claimedIds.length > 0 && !user) {
        return NextResponse.json(
          { error: "匿名记分不能登记裁判身份，请先登录并绑定选手" },
          { status: 401 }
        );
      }

      if (claimedIds.length > 0 && !user?.playerId) {
        return NextResponse.json(
          { error: "你的账号未绑定选手，不能登记裁判身份" },
          { status: 400 }
        );
      }

      if (claimedIds.some((playerId) => playerId !== user?.playerId)) {
        return NextResponse.json(
          { error: "普通用户只能登记自己的裁判身份" },
          { status: 403 }
        );
      }
    }

    const validatedGames: ValidatedScoreGame[] = [];

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

      validatedGames.push({
        homeScore: game.homeScore,
        awayScore: game.awayScore,
      });
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

    for (let i = 0; i < validatedGames.length; i++) {
      const { homeScore, awayScore } = validatedGames[i];
      let gameWinner: "home" | "away" | null = null;

      if (homeScore > awayScore) {
        gameWinner = "home";
        homeWins++;
      } else if (awayScore > homeScore) {
        gameWinner = "away";
        awayWins++;
      }

      await db
        .insert(matchGames)
        .values({
          matchId,
          gameNumber: i + 1,
          homeScore,
          awayScore,
          winner: gameWinner,
        })
        .run();
    }

    // Query back inserted games
    const insertedGames = await db
      .select()
      .from(matchGames)
      .where(eq(matchGames.matchId, matchId))
      .all();

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

    // Replace the timeline to avoid keeping stale point-by-point data after edits.
    await db.delete(scoreEvents)
      .where(eq(scoreEvents.matchId, matchId))
      .run();

    for (const evt of scoreEventLog) {
      if (
        typeof evt.gameNumber === "number" &&
        typeof evt.eventOrder === "number" &&
        (evt.scoringSide === "home" || evt.scoringSide === "away") &&
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
            timestamp:
              typeof evt.timestamp === "string"
                ? evt.timestamp
                : new Date().toISOString(),
          })
          .run();
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
