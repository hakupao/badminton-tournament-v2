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
  gender: string;
  positionNumber: number;
  wins: number;
  losses: number;
  draws: number;
  matchesPlayed: number;
  pointsFor: number;
  pointsAgainst: number;
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

    // Fetch all games for finished matches
    const allGames: Array<{ matchId: number; gameNumber: number; homeScore: number; awayScore: number; winner: string | null }> = [];
    for (const m of finishedMatches) {
      const games = await db
        .select()
        .from(matchGames)
        .where(eq(matchGames.matchId, m.id))
        .all();
      allGames.push(...games);
    }

    const allRefereeRecords = await db
      .select()
      .from(refereeRecords)
      .all();

    // Filter referee records to this tournament's matches
    const matchIds = new Set(allMatches.map((m) => m.id));
    const tournamentRefereeRecords = allRefereeRecords.filter((r) =>
      matchIds.has(r.matchId)
    );

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

    for (const m of finishedMatches) {
      const homeStanding = standingMap.get(m.homeGroupId);
      const awayStanding = standingMap.get(m.awayGroupId);
      if (!homeStanding || !awayStanding) continue;

      homeStanding.matchesPlayed++;
      awayStanding.matchesPlayed++;

      // Count games won/lost per match
      const matchGamesList = allGames.filter((g) => g.matchId === m.id);
      let homeGamesWon = 0;
      let awayGamesWon = 0;

      for (const g of matchGamesList) {
        homeStanding.pointsFor += g.homeScore;
        homeStanding.pointsAgainst += g.awayScore;
        awayStanding.pointsFor += g.awayScore;
        awayStanding.pointsAgainst += g.homeScore;

        if (g.winner === "home") {
          homeGamesWon++;
        } else if (g.winner === "away") {
          awayGamesWon++;
        }
      }

      homeStanding.gamesWon += homeGamesWon;
      homeStanding.gamesLost += awayGamesWon;
      awayStanding.gamesWon += awayGamesWon;
      awayStanding.gamesLost += homeGamesWon;

      if (m.winner === "home") {
        homeStanding.wins++;
        homeStanding.points += 3;
        awayStanding.losses++;
      } else if (m.winner === "away") {
        awayStanding.wins++;
        awayStanding.points += 3;
        homeStanding.losses++;
      } else {
        // Draw
        homeStanding.draws++;
        awayStanding.draws++;
        homeStanding.points += 1;
        awayStanding.points += 1;
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
        gender: p.gender,
        positionNumber: p.positionNumber,
        wins: 0,
        losses: 0,
        draws: 0,
        matchesPlayed: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        winRate: 0,
      });
    }

    for (const m of finishedMatches) {
      const homePlayers = [m.homePlayer1Id, m.homePlayer2Id].filter(Boolean) as number[];
      const awayPlayers = [m.awayPlayer1Id, m.awayPlayer2Id].filter(Boolean) as number[];
      const matchGamesList = allGames.filter((g) => g.matchId === m.id);

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
      winRate: s.matchesPlayed > 0 ? Math.round((s.wins / s.matchesPlayed) * 100) / 100 : 0,
    }));

    // Sort by wins desc, then winRate desc
    playerStats.sort((a, b) => b.wins - a.wins || b.winRate - a.winRate);

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
          });
        }
        const combo = comboMap.get(key)!;
        combo.matchesPlayed++;
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
          });
        }
        const combo = comboMap.get(key)!;
        combo.matchesPlayed++;
        if (m.winner === "away") combo.wins++;
        else if (m.winner === "home") combo.losses++;
        else combo.draws++;
      }
    }

    const combinationStats = Array.from(comboMap.values()).sort(
      (a, b) => b.wins - a.wins || b.matchesPlayed - a.matchesPlayed
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

    const refereeLeaderboard = Array.from(refereeMap.values()).sort(
      (a, b) => b.totalCount - a.totalCount
    );

    return NextResponse.json({
      groupStandings,
      playerStats,
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
