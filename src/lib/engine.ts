/**
 * ShuttleArena - 核心赛事引擎
 * 负责比赛生成、赛程编排、质量评估
 */

import type { TemplateMatch } from "@/db/schema";

// ========== 类型定义 ==========

export interface SimulationParams {
  groupCount: number;
  malesPerGroup: number;
  femalesPerGroup: number;
  courtsCount: number;
  roundDurationMinutes: number;
  startTime: string; // "09:00"
  endTime: string;   // "19:00"
  templateMatches: Pick<TemplateMatch, "matchType" | "homePos1" | "homePos2" | "awayPos1" | "awayPos2">[];
}

export interface GeneratedMatch {
  homeGroupIndex: number;
  awayGroupIndex: number;
  matchType: "MD" | "WD" | "XD";
  homePos1: number;
  homePos2: number;
  awayPos1: number;
  awayPos2: number;
  templateIndex: number;
}

export interface ScheduledMatch extends GeneratedMatch {
  roundNumber: number;
  courtNumber: number;
}

export interface PlayerScheduleInfo {
  groupIndex: number;
  position: number;
  gender: "M" | "F";
  totalMatches: number;
  totalRounds: number; // 上场轮次
  maxConsecutivePlaying: number;
  maxConsecutiveResting: number;
  maxRestMinutes: number;
  rounds: boolean[]; // true = 该轮上场
}

export interface SimulationResult {
  totalMatches: number;
  totalRounds: number;
  estimatedDurationMinutes: number;
  availableMinutes: number;
  isOverTime: boolean;
  schedule: ScheduledMatch[];
  playerStats: PlayerScheduleInfo[];
  warnings: string[];
}

// ========== 比赛生成 ==========

/**
 * 生成所有比赛（小组间两两交锋 × 模板场次）
 */
export function generateMatches(params: SimulationParams): GeneratedMatch[] {
  const { groupCount, templateMatches } = params;
  const matches: GeneratedMatch[] = [];

  // 所有小组两两配对
  for (let i = 0; i < groupCount; i++) {
    for (let j = i + 1; j < groupCount; j++) {
      // 每对小组按模板打若干场
      templateMatches.forEach((tm, templateIndex) => {
        matches.push({
          homeGroupIndex: i,
          awayGroupIndex: j,
          matchType: tm.matchType as "MD" | "WD" | "XD",
          homePos1: tm.homePos1,
          homePos2: tm.homePos2,
          awayPos1: tm.awayPos1,
          awayPos2: tm.awayPos2,
          templateIndex,
        });
      });
    }
  }

  return matches;
}

// ========== 赛程编排 ==========

/**
 * 获取一场比赛涉及的所有选手（用 groupIndex-position 标识）
 */
function getMatchPlayers(match: GeneratedMatch): string[] {
  return [
    `${match.homeGroupIndex}-${match.homePos1}`,
    `${match.homeGroupIndex}-${match.homePos2}`,
    `${match.awayGroupIndex}-${match.awayPos1}`,
    `${match.awayGroupIndex}-${match.awayPos2}`,
  ];
}

/**
 * Simple seeded pseudo-random number generator (mulberry32)
 */
function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Shuffle an array in place using a provided random function
 */
function shuffleArray<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Evaluate a schedule's quality: lower is better.
 * Penalizes consecutive playing (heavily) and consecutive resting.
 */
function evaluateScheduleQuality(schedule: ScheduledMatch[]): number {
  const totalRounds = Math.max(...schedule.map((s) => s.roundNumber), 0);
  if (totalRounds === 0) return 0;

  // Build per-player round presence
  const playerRoundsMap: Map<string, boolean[]> = new Map();

  for (const match of schedule) {
    const players = getMatchPlayers(match);
    for (const p of players) {
      if (!playerRoundsMap.has(p)) {
        playerRoundsMap.set(p, new Array(totalRounds).fill(false));
      }
      playerRoundsMap.get(p)![match.roundNumber - 1] = true;
    }
  }

  let penalty = 0;
  for (const [, rounds] of playerRoundsMap) {
    const maxPlay = maxConsecutive(rounds);
    const maxRest = maxConsecutive(rounds.map((r) => !r));

    // Heavy penalty for consecutive playing > 2
    if (maxPlay > 2) penalty += (maxPlay - 2) * 100;
    // Moderate penalty for consecutive playing == 2
    if (maxPlay === 2) penalty += 5;
    // Penalty for consecutive resting > 3
    if (maxRest > 3) penalty += (maxRest - 3) * 50;
    // Mild penalty for resting 3
    if (maxRest === 3) penalty += 10;
  }

  return penalty;
}

/**
 * Greedy scheduling with enhanced penalties for consecutive playing/resting
 */
function greedySchedule(
  allMatches: GeneratedMatch[],
  courtsCount: number
): ScheduledMatch[] {
  const scheduled: ScheduledMatch[] = [];
  const remaining = [...allMatches];

  // 记录每个选手上一次上场的轮次
  const lastPlayedRound: Map<string, number> = new Map();
  // 记录每个选手连续上场的次数（到当前为止）
  const consecutivePlaying: Map<string, number> = new Map();
  // 记录每个选手上场的轮次列表
  const playerRounds: Map<string, number[]> = new Map();

  let roundNumber = 1;

  while (remaining.length > 0) {
    const roundMatches: GeneratedMatch[] = [];
    const roundPlayers = new Set<string>();

    // 对剩余比赛评分，优先选择"休息最久的人"参与的比赛
    const scored = remaining.map((match, index) => {
      const players = getMatchPlayers(match);

      // 检查是否有冲突（同一轮已有该选手）
      const hasConflict = players.some((p) => roundPlayers.has(p));
      if (hasConflict) return { index, score: -Infinity };

      // 计算得分：选手休息越久，得分越高
      let score = 0;
      for (const p of players) {
        const lastRound = lastPlayedRound.get(p) ?? 0;
        const restGap = roundNumber - lastRound;

        // Bonus for players who have been resting too long (3+ rounds)
        if (restGap >= 4) score += 30;
        else if (restGap >= 3) score += 15;
        else score += restGap;

        // 惩罚：上一轮刚打过的选手（连续上场）
        if (restGap === 1) {
          score -= 20;
          // Heavy penalty: if player played in round N-1 AND N-2, heavily penalize round N
          const consec = consecutivePlaying.get(p) ?? 0;
          if (consec >= 2) {
            score -= 200; // Very heavy penalty to prevent 3+ consecutive
          } else if (consec >= 1) {
            score -= 50; // Strong penalty for potential 3rd consecutive
          }
        }
      }
      return { index, score };
    });

    // 按得分排序，优先选高分
    scored.sort((a, b) => b.score - a.score);

    for (const { index, score } of scored) {
      if (score === -Infinity) continue;
      if (roundMatches.length >= courtsCount) break;

      const match = remaining[index];
      const players = getMatchPlayers(match);

      // 再次检查冲突（因为可能在本轮中已加入了新比赛）
      if (players.some((p) => roundPlayers.has(p))) continue;

      roundMatches.push(match);
      players.forEach((p) => roundPlayers.add(p));
    }

    // 如果本轮一场都没安排上，说明有问题，强制选一场
    if (roundMatches.length === 0 && remaining.length > 0) {
      roundMatches.push(remaining[0]);
      const players = getMatchPlayers(remaining[0]);
      players.forEach((p) => roundPlayers.add(p));
    }

    // 将本轮比赛从剩余列表移除，并分配场地
    for (let courtIdx = 0; courtIdx < roundMatches.length; courtIdx++) {
      const match = roundMatches[courtIdx];
      const matchIndex = remaining.indexOf(match);
      remaining.splice(matchIndex, 1);

      const scheduledMatch: ScheduledMatch = {
        ...match,
        roundNumber,
        courtNumber: courtIdx + 1,
      };
      scheduled.push(scheduledMatch);

      // 更新选手记录
      const players = getMatchPlayers(match);
      for (const p of players) {
        const lastRound = lastPlayedRound.get(p) ?? 0;
        if (lastRound === roundNumber - 1) {
          consecutivePlaying.set(p, (consecutivePlaying.get(p) ?? 0) + 1);
        } else {
          consecutivePlaying.set(p, 1);
        }
        lastPlayedRound.set(p, roundNumber);
        if (!playerRounds.has(p)) playerRounds.set(p, []);
        playerRounds.get(p)!.push(roundNumber);
      }
    }

    roundNumber++;
  }

  return scheduled;
}

/**
 * Local search optimization: try swapping matches between rounds to reduce
 * consecutive playing/resting.
 */
function localSearchOptimize(
  schedule: ScheduledMatch[],
  courtsCount: number,
  maxIterations: number = 500
): ScheduledMatch[] {
  let best = [...schedule];
  let bestScore = evaluateScheduleQuality(best);

  if (bestScore === 0) return best;

  const totalRounds = Math.max(...schedule.map((s) => s.roundNumber), 0);

  // Group matches by round
  function groupByRound(sched: ScheduledMatch[]): Map<number, ScheduledMatch[]> {
    const map = new Map<number, ScheduledMatch[]>();
    for (const m of sched) {
      if (!map.has(m.roundNumber)) map.set(m.roundNumber, []);
      map.get(m.roundNumber)!.push(m);
    }
    return map;
  }

  for (let iter = 0; iter < maxIterations; iter++) {
    if (bestScore === 0) break;

    // Pick two random rounds to try swapping a match between them
    const r1 = Math.floor(Math.random() * totalRounds) + 1;
    let r2 = Math.floor(Math.random() * totalRounds) + 1;
    if (r1 === r2) continue;

    const roundMap = groupByRound(best);
    const round1 = roundMap.get(r1) ?? [];
    const round2 = roundMap.get(r2) ?? [];

    if (round1.length === 0 || round2.length === 0) continue;

    // Pick random matches from each round
    const idx1 = Math.floor(Math.random() * round1.length);
    const idx2 = Math.floor(Math.random() * round2.length);

    const match1 = round1[idx1];
    const match2 = round2[idx2];

    // Check that swapping won't cause player conflicts within each round
    const players1 = getMatchPlayers(match1);
    const players2 = getMatchPlayers(match2);

    // Players in round1 excluding match1, plus match2's players
    const otherPlayersR1 = new Set<string>();
    for (const m of round1) {
      if (m === match1) continue;
      getMatchPlayers(m).forEach((p) => otherPlayersR1.add(p));
    }
    if (players2.some((p) => otherPlayersR1.has(p))) continue;

    // Players in round2 excluding match2, plus match1's players
    const otherPlayersR2 = new Set<string>();
    for (const m of round2) {
      if (m === match2) continue;
      getMatchPlayers(m).forEach((p) => otherPlayersR2.add(p));
    }
    if (players1.some((p) => otherPlayersR2.has(p))) continue;

    // Also check court capacity
    // round1 loses match1, gains match2 -> same size, ok
    // round2 loses match2, gains match1 -> same size, ok

    // Try the swap
    const candidate = best.map((m) => {
      if (m === match1) {
        return { ...m, roundNumber: r2, courtNumber: match2.courtNumber };
      }
      if (m === match2) {
        return { ...m, roundNumber: r1, courtNumber: match1.courtNumber };
      }
      return m;
    });

    const candidateScore = evaluateScheduleQuality(candidate);
    if (candidateScore < bestScore) {
      best = candidate;
      bestScore = candidateScore;
    }
  }

  return best;
}

/**
 * 赛程编排：将所有比赛分配到轮次和场地
 * 多次随机贪心 + 局部搜索优化
 */
export function scheduleMatches(
  allMatches: GeneratedMatch[],
  courtsCount: number
): ScheduledMatch[] {
  const NUM_ATTEMPTS = 8;

  let bestSchedule: ScheduledMatch[] | null = null;
  let bestScore = Infinity;

  for (let attempt = 0; attempt < NUM_ATTEMPTS; attempt++) {
    // Shuffle input order with different seeds
    const shuffled = [...allMatches];
    if (attempt > 0) {
      const rng = seededRandom(attempt * 7919 + 42);
      shuffleArray(shuffled, rng);
    }

    // Greedy pass
    let candidate = greedySchedule(shuffled, courtsCount);

    // Local search optimization pass
    candidate = localSearchOptimize(candidate, courtsCount, 500);

    const score = evaluateScheduleQuality(candidate);
    if (score < bestScore) {
      bestScore = score;
      bestSchedule = candidate;
    }

    // Perfect score, no need to try more
    if (bestScore === 0) break;
  }

  return bestSchedule!;
}

// ========== 质量评估 ==========

/**
 * 计算连续序列长度
 */
function maxConsecutive(arr: boolean[]): number {
  let max = 0;
  let current = 0;
  for (const v of arr) {
    if (v) {
      current++;
      max = Math.max(max, current);
    } else {
      current = 0;
    }
  }
  return max;
}

/**
 * 生成排布质量报告
 */
export function analyzeSchedule(
  schedule: ScheduledMatch[],
  params: SimulationParams,
  roundDurationMinutes?: number
): PlayerScheduleInfo[] {
  const totalRounds = Math.max(...schedule.map((s) => s.roundNumber), 0);
  const playersPerGroup = params.malesPerGroup + params.femalesPerGroup;
  const stats: PlayerScheduleInfo[] = [];
  const durationPerRound = roundDurationMinutes ?? params.roundDurationMinutes;

  for (let g = 0; g < params.groupCount; g++) {
    for (let p = 1; p <= playersPerGroup; p++) {
      const key = `${g}-${p}`;
      const gender = p <= params.malesPerGroup ? "M" : "F";

      // 该选手参与了哪些轮次
      const rounds = new Array(totalRounds).fill(false);
      let totalMatches = 0;

      for (const match of schedule) {
        const players = getMatchPlayers(match);
        if (players.includes(key)) {
          rounds[match.roundNumber - 1] = true;
          totalMatches++;
        }
      }

      const playingRounds = rounds.map((r: boolean) => r);
      const restingRounds = rounds.map((r: boolean) => !r);

      const maxConsResting = maxConsecutive(restingRounds);

      stats.push({
        groupIndex: g,
        position: p,
        gender: gender as "M" | "F",
        totalMatches,
        totalRounds: rounds.filter(Boolean).length,
        maxConsecutivePlaying: maxConsecutive(playingRounds),
        maxConsecutiveResting: maxConsResting,
        maxRestMinutes: maxConsResting * durationPerRound,
        rounds,
      });
    }
  }

  return stats;
}

// ========== 模拟器主函数 ==========

/**
 * 运行完整模拟
 */
export function runSimulation(params: SimulationParams): SimulationResult {
  const warnings: string[] = [];

  // 1. 生成所有比赛
  const allMatches = generateMatches(params);

  // 2. 赛程编排
  const schedule = scheduleMatches(allMatches, params.courtsCount);

  // 3. 质量评估
  const playerStats = analyzeSchedule(schedule, params, params.roundDurationMinutes);

  // 4. 时间计算
  const totalRounds = Math.max(...schedule.map((s) => s.roundNumber), 0);
  const estimatedDurationMinutes = totalRounds * params.roundDurationMinutes;

  const [startH, startM] = params.startTime.split(":").map(Number);
  const [endH, endM] = params.endTime.split(":").map(Number);
  const availableMinutes = (endH * 60 + endM) - (startH * 60 + startM);

  const isOverTime = estimatedDurationMinutes > availableMinutes;
  if (isOverTime) {
    warnings.push(
      `预计时长 ${Math.floor(estimatedDurationMinutes / 60)}小时${estimatedDurationMinutes % 60}分钟 超出可用时间 ${Math.floor(availableMinutes / 60)}小时${availableMinutes % 60}分钟`
    );
  }

  // 检查连续上场/轮空异常
  for (const ps of playerStats) {
    if (ps.maxConsecutivePlaying >= 3) {
      warnings.push(`选手 组${ps.groupIndex + 1}-${ps.position}号位 连续上场 ${ps.maxConsecutivePlaying} 轮`);
    }
    if (ps.maxConsecutiveResting >= 4) {
      warnings.push(`选手 组${ps.groupIndex + 1}-${ps.position}号位 连续轮空 ${ps.maxConsecutiveResting} 轮（休息 ${ps.maxRestMinutes} 分钟）`);
    }
  }

  return {
    totalMatches: allMatches.length,
    totalRounds,
    estimatedDurationMinutes,
    availableMinutes,
    isOverTime,
    schedule,
    playerStats,
    warnings,
  };
}

/**
 * 生成赛程时间表（每轮的开始时间）
 */
export function generateTimeSlots(
  totalRounds: number,
  startTime: string,
  roundDurationMinutes: number
): string[] {
  const [startH, startM] = startTime.split(":").map(Number);
  const slots: string[] = [];

  for (let i = 0; i < totalRounds; i++) {
    const totalMinutes = startH * 60 + startM + i * roundDurationMinutes;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    slots.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
  }

  return slots;
}
