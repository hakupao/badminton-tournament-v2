import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  tournaments,
  groups,
  players,
  matches,
  matchGames,
  refereeRecords,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = 'edge';

interface GroupStanding {
  groupId: number;
  groupName: string;
  groupIcon: string;
  wins: number;
  draws: number;
  losses: number;
  points: number; // win=3, draw=1, loss=0
  matchesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  netGames: number;
  pointsFor: number;
  pointsAgainst: number;
  netPoints: number;
}

interface PlayerStat {
  playerId: number;
  playerName: string | null;
  groupId: number;
  groupName: string;
  groupIcon: string;
  gender: string;
  positionNumber: number;
  wins: number;
  losses: number;
  draws: number;
  matchesPlayed: number;
  netGames: number;
  pointsFor: number;
  pointsAgainst: number;
  netPoints: number;
  winRate: number;
}

interface CombinationStat {
  player1Id: number;
  player1Name: string | null;
  player1GroupIcon: string;
  player1Position: number;
  player2Id: number;
  player2Name: string | null;
  player2GroupIcon: string;
  player2Position: number;
  wins: number;
  losses: number;
  draws: number;
  matchesPlayed: number;
  netGames: number;
  pointsFor: number;
  pointsAgainst: number;
  netPoints: number;
}

interface PositionStat {
  groupId: number;
  groupName: string;
  groupIcon: string;
  positionNumber: number;
  gender: string;
  players: { id: number; name: string | null; slotIndex: number }[];
  wins: number;
  losses: number;
  draws: number;
  matchesPlayed: number;
  netGames: number;
  pointsFor: number;
  pointsAgainst: number;
  netPoints: number;
  winRate: number;
}

interface MatchTypeStat {
  matchType: string;
  totalMatches: number;
  finishedMatches: number;
  homeWins: number;
  awayWins: number;
  draws: number;
}

interface RefereeStat {
  playerId: number;
  playerName: string | null;
  refereeCount: number;
  lineJudgeCount: number;
  totalCount: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb();
    const includeRefereeLeaderboard =
      request.nextUrl.searchParams.get("includeReferee") === "1";
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

    const allGroups = await db
      .select()
      .from(groups)
      .where(eq(groups.tournamentId, tournamentId))
      .all();

    const allPlayers = await db
      .select()
      .from(players)
      .where(eq(players.tournamentId, tournamentId))
      .all();

    const allMatches = await db
      .select()
      .from(matches)
      .where(eq(matches.tournamentId, tournamentId))
      .all();

    const finishedMatches = allMatches.filter((m) => m.status === "finished");
    const matchIds = new Set(allMatches.map((m) => m.id));

    // Fetch all games + referee records in ONE query each (not N+1)
    const [allGamesRaw, allRefereeRecordsRaw] = await Promise.all([
      db.select().from(matchGames).all(),
      db.select().from(refereeRecords).all(),
    ]);

    const allGames = allGamesRaw.filter((g) => matchIds.has(g.matchId));
    const tournamentRefereeRecords = allRefereeRecordsRaw.filter((r) =>
      matchIds.has(r.matchId)
    );

    // Pre-index games by matchId for O(1) lookup
    const gamesByMatch = new Map<number, typeof allGames>();
    for (const g of allGames) {
      const arr = gamesByMatch.get(g.matchId);
      if (arr) arr.push(g);
      else gamesByMatch.set(g.matchId, [g]);
    }

    // ========== Group Standings ==========
    const groupMap = new Map(allGroups.map((g) => [g.id, g]));

    const groupStandings: GroupStanding[] = allGroups.map((g) => ({
      groupId: g.id,
      groupName: g.name,
      groupIcon: g.icon,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0,
      matchesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      netGames: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      netPoints: 0,
    }));

    const standingMap = new Map(groupStandings.map((s) => [s.groupId, s]));

    // Group matches into encounters (same roundNumber + same team pair)
    // An encounter is one "对阵": two teams play multiple matches in a round,
    // the team winning more matches wins the encounter and gets 3 points.
    const encounterMap = new Map<string, typeof finishedMatches>();
    for (const m of finishedMatches) {
      const [minId, maxId] = m.homeGroupId < m.awayGroupId
        ? [m.homeGroupId, m.awayGroupId]
        : [m.awayGroupId, m.homeGroupId];
      const key = `${m.roundNumber}-${minId}-${maxId}`;
      let arr = encounterMap.get(key);
      if (!arr) {
        arr = [];
        encounterMap.set(key, arr);
      }
      arr.push(m);
    }

    for (const encounterMatches of encounterMap.values()) {
      // Accumulate score points and match wins per group
      const matchWins = new Map<number, number>();
      const groupIds = new Set<number>();

      for (const m of encounterMatches) {
        groupIds.add(m.homeGroupId);
        groupIds.add(m.awayGroupId);

        const homeStanding = standingMap.get(m.homeGroupId);
        const awayStanding = standingMap.get(m.awayGroupId);
        if (!homeStanding || !awayStanding) continue;

        // Accumulate score points from individual games
        const matchGamesList = gamesByMatch.get(m.id) || [];
        for (const g of matchGamesList) {
          homeStanding.pointsFor += g.homeScore;
          homeStanding.pointsAgainst += g.awayScore;
          awayStanding.pointsFor += g.awayScore;
          awayStanding.pointsAgainst += g.homeScore;
        }

        // Count match wins
        if (m.winner === "home") {
          matchWins.set(m.homeGroupId, (matchWins.get(m.homeGroupId) || 0) + 1);
        } else if (m.winner === "away") {
          matchWins.set(m.awayGroupId, (matchWins.get(m.awayGroupId) || 0) + 1);
        }
      }

      // Determine encounter result
      const [groupAId, groupBId] = [...groupIds];
      const standingA = standingMap.get(groupAId);
      const standingB = standingMap.get(groupBId);
      if (!standingA || !standingB) continue;

      const aMatchWins = matchWins.get(groupAId) || 0;
      const bMatchWins = matchWins.get(groupBId) || 0;

      standingA.matchesPlayed++;
      standingB.matchesPlayed++;
      standingA.gamesWon += aMatchWins;
      standingA.gamesLost += bMatchWins;
      standingB.gamesWon += bMatchWins;
      standingB.gamesLost += aMatchWins;

      if (aMatchWins > bMatchWins) {
        standingA.wins++;
        standingA.points += 3;
        standingB.losses++;
      } else if (bMatchWins > aMatchWins) {
        standingB.wins++;
        standingB.points += 3;
        standingA.losses++;
      } else {
        // Draw (equal match wins)
        standingA.draws++;
        standingB.draws++;
        standingA.points += 1;
        standingB.points += 1;
      }
    }

    // Calculate net values
    for (const s of groupStandings) {
      s.netGames = s.gamesWon - s.gamesLost;
      s.netPoints = s.pointsFor - s.pointsAgainst;
    }

    // Sort by points desc, then netGames desc, then netPoints desc
    groupStandings.sort((a, b) =>
      b.points - a.points || b.netGames - a.netGames || b.netPoints - a.netPoints
    );

    // ========== Player Stats ==========
    const playerMap = new Map(allPlayers.map((p) => [p.id, p]));

    const playerStatsMap = new Map<number, PlayerStat>();
    for (const p of allPlayers) {
      const group = groupMap.get(p.groupId);
      playerStatsMap.set(p.id, {
        playerId: p.id,
        playerName: p.name,
        groupId: p.groupId,
        groupName: group?.name || "",
        groupIcon: group?.icon || "",
        gender: p.gender,
        positionNumber: p.positionNumber,
        wins: 0,
        losses: 0,
        draws: 0,
        matchesPlayed: 0,
        netGames: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        netPoints: 0,
        winRate: 0,
      });
    }

    for (const m of finishedMatches) {
      const homePlayers = [m.homePlayer1Id, m.homePlayer2Id].filter(Boolean) as number[];
      const awayPlayers = [m.awayPlayer1Id, m.awayPlayer2Id].filter(Boolean) as number[];
      const matchGamesList = gamesByMatch.get(m.id) || [];

      const totalHomeScore = matchGamesList.reduce((sum, g) => sum + g.homeScore, 0);
      const totalAwayScore = matchGamesList.reduce((sum, g) => sum + g.awayScore, 0);

      for (const pid of homePlayers) {
        const stat = playerStatsMap.get(pid);
        if (!stat) continue;
        stat.matchesPlayed++;
        stat.pointsFor += totalHomeScore;
        stat.pointsAgainst += totalAwayScore;
        if (m.winner === "home") stat.wins++;
        else if (m.winner === "away") stat.losses++;
        else stat.draws++;
      }

      for (const pid of awayPlayers) {
        const stat = playerStatsMap.get(pid);
        if (!stat) continue;
        stat.matchesPlayed++;
        stat.pointsFor += totalAwayScore;
        stat.pointsAgainst += totalHomeScore;
        if (m.winner === "away") stat.wins++;
        else if (m.winner === "home") stat.losses++;
        else stat.draws++;
      }
    }

    const playerStats = Array.from(playerStatsMap.values()).map((s) => ({
      ...s,
      netGames: s.wins - s.losses,
      netPoints: s.pointsFor - s.pointsAgainst,
      winRate: s.matchesPlayed > 0 ? Math.round((s.wins / s.matchesPlayed) * 100) / 100 : 0,
    }));

    playerStats.sort((a, b) =>
      b.wins - a.wins ||
      b.netGames - a.netGames ||
      b.netPoints - a.netPoints ||
      b.winRate - a.winRate
    );

    // ========== Position Stats (merged for shared positions) ==========
    const positionMap = new Map<string, PositionStat>();

    for (const p of allPlayers) {
      const key = `${p.groupId}-${p.positionNumber}`;
      if (!positionMap.has(key)) {
        const group = groupMap.get(p.groupId);
        positionMap.set(key, {
          groupId: p.groupId,
          groupName: group?.name || "",
          groupIcon: group?.icon || "",
          positionNumber: p.positionNumber,
          gender: p.gender,
          players: [],
          wins: 0,
          losses: 0,
          draws: 0,
          matchesPlayed: 0,
          netGames: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          netPoints: 0,
          winRate: 0,
        });
      }
      const pos = positionMap.get(key)!;
      pos.players.push({ id: p.id, name: p.name, slotIndex: (p as unknown as { slotIndex?: number }).slotIndex ?? 1 });
    }

    // Aggregate player stats into position stats
    for (const ps of playerStats) {
      const key = `${ps.groupId}-${ps.positionNumber}`;
      const pos = positionMap.get(key);
      if (!pos) continue;
      pos.wins += ps.wins;
      pos.losses += ps.losses;
      pos.draws += ps.draws;
      pos.matchesPlayed += ps.matchesPlayed;
      pos.pointsFor += ps.pointsFor;
      pos.pointsAgainst += ps.pointsAgainst;
    }

    const positionStats = Array.from(positionMap.values())
      .map((s) => ({
        ...s,
        players: s.players.sort((a, b) => a.slotIndex - b.slotIndex),
        netGames: s.wins - s.losses,
        netPoints: s.pointsFor - s.pointsAgainst,
        winRate: s.matchesPlayed > 0 ? Math.round((s.wins / s.matchesPlayed) * 100) / 100 : 0,
      }))
      .sort((a, b) =>
        b.wins - a.wins || b.netGames - a.netGames || b.netPoints - a.netPoints
      );

    // ========== Combination Stats ==========
    const comboMap = new Map<string, CombinationStat>();

    const getComboKey = (id1: number, id2: number) => {
      const sorted = [id1, id2].sort((a, b) => a - b);
      return `${sorted[0]}-${sorted[1]}`;
    };

    for (const m of finishedMatches) {
      const homePairs: [number, number][] = [];
      const awayPairs: [number, number][] = [];

      if (m.homePlayer1Id && m.homePlayer2Id) {
        homePairs.push([m.homePlayer1Id, m.homePlayer2Id]);
      }
      if (m.awayPlayer1Id && m.awayPlayer2Id) {
        awayPairs.push([m.awayPlayer1Id, m.awayPlayer2Id]);
      }

      for (const [p1, p2] of homePairs) {
        const key = getComboKey(p1, p2);
        if (!comboMap.has(key)) {
          const player1 = playerMap.get(p1);
          const player2 = playerMap.get(p2);
          const group1 = player1 ? groupMap.get(player1.groupId) : null;
          const group2 = player2 ? groupMap.get(player2.groupId) : null;
          comboMap.set(key, {
            player1Id: p1,
            player1Name: player1?.name || null,
            player1GroupIcon: group1?.icon || "",
            player1Position: player1?.positionNumber || 0,
            player2Id: p2,
            player2Name: player2?.name || null,
            player2GroupIcon: group2?.icon || "",
            player2Position: player2?.positionNumber || 0,
            wins: 0,
            losses: 0,
            draws: 0,
            matchesPlayed: 0,
            netGames: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            netPoints: 0,
          });
        }
        const combo = comboMap.get(key)!;
        const matchGamesList = gamesByMatch.get(m.id) || [];
        combo.matchesPlayed++;
        combo.pointsFor += matchGamesList.reduce((sum, g) => sum + g.homeScore, 0);
        combo.pointsAgainst += matchGamesList.reduce((sum, g) => sum + g.awayScore, 0);
        if (m.winner === "home") combo.wins++;
        else if (m.winner === "away") combo.losses++;
        else combo.draws++;
      }

      for (const [p1, p2] of awayPairs) {
        const key = getComboKey(p1, p2);
        if (!comboMap.has(key)) {
          const player1 = playerMap.get(p1);
          const player2 = playerMap.get(p2);
          const group1 = player1 ? groupMap.get(player1.groupId) : null;
          const group2 = player2 ? groupMap.get(player2.groupId) : null;
          comboMap.set(key, {
            player1Id: p1,
            player1Name: player1?.name || null,
            player1GroupIcon: group1?.icon || "",
            player1Position: player1?.positionNumber || 0,
            player2Id: p2,
            player2Name: player2?.name || null,
            player2GroupIcon: group2?.icon || "",
            player2Position: player2?.positionNumber || 0,
            wins: 0,
            losses: 0,
            draws: 0,
            matchesPlayed: 0,
            netGames: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            netPoints: 0,
          });
        }
        const combo = comboMap.get(key)!;
        const matchGamesList = gamesByMatch.get(m.id) || [];
        combo.matchesPlayed++;
        combo.pointsFor += matchGamesList.reduce((sum, g) => sum + g.awayScore, 0);
        combo.pointsAgainst += matchGamesList.reduce((sum, g) => sum + g.homeScore, 0);
        if (m.winner === "away") combo.wins++;
        else if (m.winner === "home") combo.losses++;
        else combo.draws++;
      }
    }

    const combinationStats = Array.from(comboMap.values())
      .map((combo) => ({
        ...combo,
        netGames: combo.wins - combo.losses,
        netPoints: combo.pointsFor - combo.pointsAgainst,
      }))
      .sort(
        (a, b) =>
          b.wins - a.wins ||
          b.netGames - a.netGames ||
          b.netPoints - a.netPoints ||
          b.matchesPlayed - a.matchesPlayed
      );

    // ========== Match Type Stats ==========
    const matchTypeMap = new Map<string, MatchTypeStat>();

    for (const m of allMatches) {
      if (!matchTypeMap.has(m.matchType)) {
        matchTypeMap.set(m.matchType, {
          matchType: m.matchType,
          totalMatches: 0,
          finishedMatches: 0,
          homeWins: 0,
          awayWins: 0,
          draws: 0,
        });
      }
      const stat = matchTypeMap.get(m.matchType)!;
      stat.totalMatches++;
      if (m.status === "finished") {
        stat.finishedMatches++;
        if (m.winner === "home") stat.homeWins++;
        else if (m.winner === "away") stat.awayWins++;
        else stat.draws++;
      }
    }

    const matchTypeStats = Array.from(matchTypeMap.values());

    // ========== Referee Leaderboard ==========
    let refereeLeaderboard: RefereeStat[] = [];

    if (includeRefereeLeaderboard) {
      const refereeMap = new Map<number, RefereeStat>();

      for (const r of tournamentRefereeRecords) {
        if (!refereeMap.has(r.playerId)) {
          const player = playerMap.get(r.playerId);
          refereeMap.set(r.playerId, {
            playerId: r.playerId,
            playerName: player?.name || null,
            refereeCount: 0,
            lineJudgeCount: 0,
            totalCount: 0,
          });
        }
        const stat = refereeMap.get(r.playerId)!;
        if (r.role === "referee") stat.refereeCount++;
        else if (r.role === "line_judge") stat.lineJudgeCount++;
        stat.totalCount++;
      }

      refereeLeaderboard = Array.from(refereeMap.values()).sort(
        (a, b) => b.totalCount - a.totalCount
      );
    }

    return NextResponse.json({
      groupStandings,
      playerStats,
      positionStats,
      combinationStats,
      matchTypeStats,
      refereeLeaderboard,
      summary: {
        totalMatches: allMatches.length,
        finishedMatches: finishedMatches.length,
        totalGroups: allGroups.length,
        totalPlayers: allPlayers.length,
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
