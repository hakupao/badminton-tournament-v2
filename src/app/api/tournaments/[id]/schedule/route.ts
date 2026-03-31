import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  tournaments,
  groups,
  players,
  templateMatches,
  matches,
  matchGames,
  refereeRecords,
  scoreEvents,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { generateMatches, scheduleMatches, generateTimeSlots } from "@/lib/engine";
import type { SimulationParams } from "@/lib/engine";
import { eq } from "drizzle-orm";

export const runtime = 'edge';

interface ProvidedScheduledMatch {
  roundNumber?: unknown;
  courtNumber?: unknown;
  homeGroupIndex?: unknown;
  awayGroupIndex?: unknown;
  matchType?: unknown;
  homePos1?: unknown;
  homePos2?: unknown;
  awayPos1?: unknown;
  awayPos2?: unknown;
  templateIndex?: unknown;
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

    const allMatches = await db
      .select()
      .from(matches)
      .where(eq(matches.tournamentId, tournamentId))
      .all();

    // Fetch game scores only for this tournament's matches
    const matchIds = allMatches.map((m) => m.id);
    const allGames = matchIds.length > 0
      ? (await db.select().from(matchGames).all()).filter((g) => matchIds.includes(g.matchId))
      : [];

    const gamesByMatch = new Map<number, typeof allGames>();
    for (const g of allGames) {
      const existing = gamesByMatch.get(g.matchId) || [];
      existing.push(g);
      gamesByMatch.set(g.matchId, existing);
    }

    const matchesWithGames = allMatches.map((m) => ({
      ...m,
      games: (gamesByMatch.get(m.id) || []).sort((a, b) => a.gameNumber - b.gameNumber),
    }));

    const totalRounds = allMatches.length > 0
      ? Math.max(...allMatches.map((m) => m.roundNumber))
      : 0;

    const timeSlots = totalRounds > 0
      ? generateTimeSlots(totalRounds, tournament.startTime || "09:00", tournament.roundDurationMinutes)
      : [];

    return NextResponse.json({
      matches: matchesWithGames,
      totalRounds,
      timeSlots,
    });
  } catch (error) {
    console.error("Get schedule error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
    const { id } = await params;
    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid tournament ID" }, { status: 400 });
    }

    const db = getDb();
    const tournament = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .get();

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    if (tournament.status === "archived") {
      return NextResponse.json({ error: "赛事已归档，数据已冻结，不能修改" }, { status: 403 });
    }

    const tournamentGroups = (await db
      .select()
      .from(groups)
      .where(eq(groups.tournamentId, tournamentId))
      .all())
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const tournamentPlayers = await db
      .select()
      .from(players)
      .where(eq(players.tournamentId, tournamentId))
      .all();

    const templates = (await db
      .select()
      .from(templateMatches)
      .where(eq(templateMatches.tournamentId, tournamentId))
      .all())
      .sort((a, b) => a.sortOrder - b.sortOrder);

    if (tournamentGroups.length < 2) {
      return NextResponse.json(
        { error: "Need at least 2 groups to generate schedule" },
        { status: 400 }
      );
    }

    if (templates.length === 0) {
      return NextResponse.json(
        { error: "No template matches defined" },
        { status: 400 }
      );
    }

    let providedSchedule: Array<{
      roundNumber: number;
      courtNumber: number;
      homeGroupIndex: number;
      awayGroupIndex: number;
      matchType: "MD" | "WD" | "XD";
      homePos1: number;
      homePos2: number;
      awayPos1: number;
      awayPos2: number;
      templateIndex: number;
    }> | null = null;

    const rawBody = await request.text();
    if (rawBody.trim()) {
      let body: { scheduledMatches?: ProvidedScheduledMatch[] };
      try {
        body = JSON.parse(rawBody) as { scheduledMatches?: ProvidedScheduledMatch[] };
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      if (body.scheduledMatches !== undefined) {
        if (!Array.isArray(body.scheduledMatches) || body.scheduledMatches.length === 0) {
          return NextResponse.json(
            { error: "scheduledMatches must be a non-empty array when provided" },
            { status: 400 }
          );
        }

        const validated: Array<{
          roundNumber: number;
          courtNumber: number;
          homeGroupIndex: number;
          awayGroupIndex: number;
          matchType: "MD" | "WD" | "XD";
          homePos1: number;
          homePos2: number;
          awayPos1: number;
          awayPos2: number;
          templateIndex: number;
        }> = [];

        for (const match of body.scheduledMatches) {
          const validType =
            match.matchType === "MD" || match.matchType === "WD" || match.matchType === "XD";
          const numericFields = [
            match.roundNumber,
            match.courtNumber,
            match.homeGroupIndex,
            match.awayGroupIndex,
            match.homePos1,
            match.homePos2,
            match.awayPos1,
            match.awayPos2,
            match.templateIndex,
          ];

          if (!validType || numericFields.some((value) => typeof value !== "number")) {
            return NextResponse.json(
              { error: "Each scheduled match needs round/court/group indexes, template index, type and positions" },
              { status: 400 }
            );
          }

          validated.push({
            roundNumber: match.roundNumber as number,
            courtNumber: match.courtNumber as number,
            homeGroupIndex: match.homeGroupIndex as number,
            awayGroupIndex: match.awayGroupIndex as number,
            matchType: match.matchType as "MD" | "WD" | "XD",
            homePos1: match.homePos1 as number,
            homePos2: match.homePos2 as number,
            awayPos1: match.awayPos1 as number,
            awayPos2: match.awayPos2 as number,
            templateIndex: match.templateIndex as number,
          });
        }

        providedSchedule = validated;
      }
    }

    if (providedSchedule) {
      const totalPositions = tournament.malesPerGroup + tournament.femalesPerGroup;

      for (const match of providedSchedule) {
        if (
          !Number.isInteger(match.roundNumber) ||
          match.roundNumber < 1 ||
          !Number.isInteger(match.courtNumber) ||
          match.courtNumber < 1 ||
          match.courtNumber > tournament.courtsCount
        ) {
          return NextResponse.json(
            { error: "赛程中的轮次和场地号必须为有效正整数" },
            { status: 400 }
          );
        }

        if (
          match.homeGroupIndex < 0 ||
          match.homeGroupIndex >= tournamentGroups.length ||
          match.awayGroupIndex < 0 ||
          match.awayGroupIndex >= tournamentGroups.length ||
          match.homeGroupIndex === match.awayGroupIndex
        ) {
          return NextResponse.json(
            { error: "赛程中的队伍索引无效" },
            { status: 400 }
          );
        }

        if (
          match.homePos1 < 1 ||
          match.homePos1 > totalPositions ||
          match.homePos2 < 1 ||
          match.homePos2 > totalPositions ||
          match.awayPos1 < 1 ||
          match.awayPos1 > totalPositions ||
          match.awayPos2 < 1 ||
          match.awayPos2 > totalPositions
        ) {
          return NextResponse.json(
            { error: "赛程中的位置编号超出当前编制范围" },
            { status: 400 }
          );
        }

        const templateMatch = templates[match.templateIndex];
        if (
          !templateMatch ||
          templateMatch.matchType !== match.matchType ||
          templateMatch.homePos1 !== match.homePos1 ||
          templateMatch.homePos2 !== match.homePos2 ||
          templateMatch.awayPos1 !== match.awayPos1 ||
          templateMatch.awayPos2 !== match.awayPos2
        ) {
          return NextResponse.json(
            { error: "赛程草稿与当前比赛模板不一致，请重新模拟后再发布" },
            { status: 400 }
          );
        }
      }
    }

    // Delete existing matches and dependent records for this tournament
    const existingMatches = await db
      .select()
      .from(matches)
      .where(eq(matches.tournamentId, tournamentId))
      .all();

    for (const m of existingMatches) {
      await db.delete(scoreEvents).where(eq(scoreEvents.matchId, m.id)).run();
      await db.delete(matchGames).where(eq(matchGames.matchId, m.id)).run();
      await db.delete(refereeRecords).where(eq(refereeRecords.matchId, m.id)).run();
    }

    await db.delete(matches)
      .where(eq(matches.tournamentId, tournamentId))
      .run();

    // Generate and schedule matches
    const scheduled = providedSchedule ?? (() => {
      const simParams: SimulationParams = {
        groupCount: tournamentGroups.length,
        malesPerGroup: tournament.malesPerGroup,
        femalesPerGroup: tournament.femalesPerGroup,
        courtsCount: tournament.courtsCount,
        roundDurationMinutes: tournament.roundDurationMinutes,
        startTime: tournament.startTime || "09:00",
        endTime: tournament.endTime || "19:00",
        templateMatches: templates.map((t) => ({
          matchType: t.matchType,
          homePos1: t.homePos1,
          homePos2: t.homePos2,
          awayPos1: t.awayPos1,
          awayPos2: t.awayPos2,
        })),
      };

      const generatedMatches = generateMatches(simParams);
      return scheduleMatches(generatedMatches, tournament.courtsCount, tournamentGroups.length);
    })();

    // Helper: find primary player (slotIndex=1) by groupIndex + positionNumber
    const findPlayer = (groupIndex: number, positionNumber: number) => {
      const group = tournamentGroups[groupIndex];
      if (!group) return null;
      return tournamentPlayers.find(
        (p) => p.groupId === group.id && p.positionNumber === positionNumber && (p.slotIndex ?? 1) === 1
      ) || null;
    };

    // Insert matches with actual player references
    for (const sm of scheduled) {
      const homeGroup = tournamentGroups[sm.homeGroupIndex];
      const awayGroup = tournamentGroups[sm.awayGroupIndex];

      const homePlayer1 = findPlayer(sm.homeGroupIndex, sm.homePos1);
      const homePlayer2 = findPlayer(sm.homeGroupIndex, sm.homePos2);
      const awayPlayer1 = findPlayer(sm.awayGroupIndex, sm.awayPos1);
      const awayPlayer2 = findPlayer(sm.awayGroupIndex, sm.awayPos2);

      const templateMatch = templates[sm.templateIndex] || null;

      await db
        .insert(matches)
        .values({
          tournamentId,
          roundNumber: sm.roundNumber,
          courtNumber: sm.courtNumber,
          homeGroupId: homeGroup.id,
          awayGroupId: awayGroup.id,
          templateMatchId: templateMatch?.id || null,
          matchType: sm.matchType,
          homePlayer1Id: homePlayer1?.id || null,
          homePlayer2Id: homePlayer2?.id || null,
          awayPlayer1Id: awayPlayer1?.id || null,
          awayPlayer2Id: awayPlayer2?.id || null,
        })
        .run();
    }

    // Query back inserted matches
    const insertedMatches = await db
      .select()
      .from(matches)
      .where(eq(matches.tournamentId, tournamentId))
      .all();

    const totalRounds = scheduled.length > 0
      ? Math.max(...scheduled.map((s) => s.roundNumber))
      : 0;

    const timeSlots = generateTimeSlots(
      totalRounds,
      tournament.startTime || "09:00",
      tournament.roundDurationMinutes
    );

    return NextResponse.json({
      matches: insertedMatches,
      totalMatches: insertedMatches.length,
      totalRounds,
      timeSlots,
    });
  } catch (error) {
    console.error("Generate schedule error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
