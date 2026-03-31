/**
 * ShuttleArena - 核心赛事引擎
 * 负责比赛生成、赛程编排、质量评估
 */

import type { TemplateMatch } from "@/db/schema";
import {
  DEFAULT_MAX_CONSECUTIVE_PLAYING_LIMIT,
  DEFAULT_MAX_CONSECUTIVE_RESTING_LIMIT,
} from "@/lib/constants";

// ========== 类型定义 ==========

export interface SimulationParams {
  groupCount: number;
  malesPerGroup: number;
  femalesPerGroup: number;
  courtsCount: number;
  roundDurationMinutes: number;
  startTime: string; // "09:00"
  endTime: string;   // "19:00"
  maxConsecutivePlayingLimit?: number;
  maxConsecutiveRestingLimit?: number;
  templateMatches: Pick<TemplateMatch, "matchType" | "homePos1" | "homePos2" | "awayPos1" | "awayPos2">[];
}

interface GeneratedMatch {
  homeGroupIndex: number;
  awayGroupIndex: number;
  matchType: "MD" | "WD" | "XD";
  homePos1: number;
  homePos2: number;
  awayPos1: number;
  awayPos2: number;
  templateIndex: number;
}

interface ScheduledMatch extends GeneratedMatch {
  roundNumber: number;
  courtNumber: number;
}

interface PlayerScheduleInfo {
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

interface SimulationResult {
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

function getPlayingLimit(params?: Pick<SimulationParams, "maxConsecutivePlayingLimit">) {
  return Math.max(
    1,
    params?.maxConsecutivePlayingLimit ?? DEFAULT_MAX_CONSECUTIVE_PLAYING_LIMIT
  );
}

function getRestingLimit(params?: Pick<SimulationParams, "maxConsecutiveRestingLimit">) {
  return Math.max(
    1,
    params?.maxConsecutiveRestingLimit ?? DEFAULT_MAX_CONSECUTIVE_RESTING_LIMIT
  );
}

/**
 * Round-robin circle method: 生成循环赛配对
 * 每个循环包含 floor(N/2) 组对战，每队恰好出场一次。
 * N 个队伍产生 N-1 个循环（奇数队时自动加 bye）。
 */
function generateRoundRobinCycles(groupCount: number): Array<Array<[number, number]>> {
  const teams = Array.from({ length: groupCount }, (_, i) => i);

  // 奇数队伍补一个 bye(-1)
  if (groupCount % 2 !== 0) teams.push(-1);

  const n = teams.length;
  const cycles: Array<Array<[number, number]>> = [];

  for (let round = 0; round < n - 1; round++) {
    const pairs: Array<[number, number]> = [];

    for (let i = 0; i < n / 2; i++) {
      const a = teams[i];
      const b = teams[n - 1 - i];

      if (a === -1 || b === -1) continue;

      // 统一：小序号在前（与 generateMatches 的 key 一致）
      pairs.push(a < b ? [a, b] : [b, a]);
    }

    cycles.push(pairs);

    // 旋转：固定 teams[0]，其余顺时针旋转
    const last = teams[n - 1];
    for (let i = n - 1; i > 1; i--) {
      teams[i] = teams[i - 1];
    }
    teams[1] = last;
  }

  return cycles;
}

/**
 * 生成数组的全排列（仅用于场地数量级别的小数组，通常 2-5）
 */
function getPermutations(arr: number[]): number[][] {
  if (arr.length <= 1) return [[...arr]];
  const results: number[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of getPermutations(rest)) {
      results.push([arr[i], ...perm]);
    }
  }
  return results;
}

/**
 * 为一个 batch 的对战组分配场地，尽量避免队伍与上一个循环在同一场地。
 */
function assignCourtsForBatch(
  batch: Array<[number, number]>,
  courtsCount: number,
  lastCourtForTeam: Map<number, number>
): Array<{ pair: [number, number]; court: number }> {
  const availableCourts = Array.from(
    { length: Math.min(batch.length, courtsCount) },
    (_, i) => i + 1
  );

  const perms = getPermutations(availableCourts);
  let bestPerm = availableCourts;
  let bestScore = Infinity;

  for (const perm of perms) {
    let score = 0;
    for (let i = 0; i < batch.length; i++) {
      const [home, away] = batch[i];
      const court = perm[i];
      if (lastCourtForTeam.get(home) === court) score++;
      if (lastCourtForTeam.get(away) === court) score++;
    }
    if (score < bestScore) {
      bestScore = score;
      bestPerm = perm;
      if (score === 0) break; // 完美，无重复
    }
  }

  return batch.map((pair, i) => ({
    pair,
    court: bestPerm[i],
  }));
}

/**
 * 评估一组模板比赛顺序的连续上场惩罚分
 */
function evaluateTemplateOrder(
  orderedMatches: GeneratedMatch[],
  startRound: number,
  maxConsecutivePlayingLimit: number,
  playerLastPlayedRound: Map<string, number>,
  playerConsecutivePlaying: Map<string, number>,
): number {
  let penalty = 0;

  // 复制状态用于模拟
  const simLastPlayed = new Map(playerLastPlayedRound);
  const simConsecutive = new Map(playerConsecutivePlaying);

  for (let t = 0; t < orderedMatches.length; t++) {
    const round = startRound + t;
    const players = getMatchPlayers(orderedMatches[t]);

    for (const p of players) {
      const lastRound = simLastPlayed.get(p) ?? 0;
      const gap = round - lastRound;

      if (gap === 1) {
        const consec = (simConsecutive.get(p) ?? 0) + 1;
        simConsecutive.set(p, consec);
        if (consec > maxConsecutivePlayingLimit) {
          penalty += 100;
        } else if (consec === maxConsecutivePlayingLimit) {
          penalty += 5;
        }
      } else {
        simConsecutive.set(p, 1);
      }
      simLastPlayed.set(p, round);
    }
  }

  return penalty;
}

/**
 * 穷举法：找到惩罚最小的模板排列（模板数 ≤ 8 时使用）
 */
function exhaustiveTemplateOrder(
  pairMatches: GeneratedMatch[],
  startRound: number,
  maxConsecutivePlayingLimit: number,
  playerLastPlayedRound: Map<string, number>,
  playerConsecutivePlaying: Map<string, number>,
): GeneratedMatch[] {
  const indices = pairMatches.map((_, i) => i);
  const perms = getPermutations(indices);

  let bestPerm = indices;
  let bestPenalty = Infinity;

  for (const perm of perms) {
    const ordered = perm.map(i => pairMatches[i]);
    const penalty = evaluateTemplateOrder(
      ordered, startRound, maxConsecutivePlayingLimit,
      playerLastPlayedRound, playerConsecutivePlaying
    );
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestPerm = perm;
      if (penalty === 0) break;
    }
  }

  return bestPerm.map(i => pairMatches[i]);
}

/**
 * 贪心法：逐轮选择惩罚最小的模板比赛（模板数 > 8 时使用）
 */
function greedyTemplateOrder(
  pairMatches: GeneratedMatch[],
  startRound: number,
  maxConsecutivePlayingLimit: number,
  playerLastPlayedRound: Map<string, number>,
  playerConsecutivePlaying: Map<string, number>,
): GeneratedMatch[] {
  const remaining = [...pairMatches];
  const result: GeneratedMatch[] = [];

  const simLastPlayed = new Map(playerLastPlayedRound);
  const simConsecutive = new Map(playerConsecutivePlaying);

  for (let t = 0; t < pairMatches.length; t++) {
    const round = startRound + t;
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const players = getMatchPlayers(remaining[i]);
      let score = 0;

      for (const p of players) {
        const lastRound = simLastPlayed.get(p) ?? 0;
        const gap = round - lastRound;

        if (gap === 1) {
          const consec = (simConsecutive.get(p) ?? 0) + 1;
          if (consec > maxConsecutivePlayingLimit) score -= 200;
          else if (consec === maxConsecutivePlayingLimit) score -= 50;
          else score -= 20;
        } else {
          score += gap;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    const chosen = remaining[bestIdx];
    result.push(chosen);
    remaining.splice(bestIdx, 1);

    const players = getMatchPlayers(chosen);
    for (const p of players) {
      const lastRound = simLastPlayed.get(p) ?? 0;
      if (lastRound === round - 1) {
        simConsecutive.set(p, (simConsecutive.get(p) ?? 0) + 1);
      } else {
        simConsecutive.set(p, 1);
      }
      simLastPlayed.set(p, round);
    }
  }

  return result;
}

/**
 * 为一组对战的模板比赛选择最优顺序，减少选手连续上场
 */
function optimizeTemplateOrder(
  pairMatches: GeneratedMatch[],
  startRound: number,
  maxConsecutivePlayingLimit: number,
  playerLastPlayedRound: Map<string, number>,
  playerConsecutivePlaying: Map<string, number>,
): GeneratedMatch[] {
  if (pairMatches.length <= 1) return pairMatches;

  if (pairMatches.length <= 8) {
    return exhaustiveTemplateOrder(
      pairMatches, startRound, maxConsecutivePlayingLimit,
      playerLastPlayedRound, playerConsecutivePlaying
    );
  }
  return greedyTemplateOrder(
    pairMatches, startRound, maxConsecutivePlayingLimit,
    playerLastPlayedRound, playerConsecutivePlaying
  );
}

/**
 * 赛程编排：循环制场地绑定 + 模板顺序贪心优化
 * - 同一对战的所有比赛绑定在同一个场地，连续打完
 * - 每个循环结束后重新分配场地，尽量避免队伍连续在同一场地
 * - 在场地绑定的约束下，优化模板比赛顺序以减少选手连续上场
 */
export function scheduleMatches(
  allMatches: GeneratedMatch[],
  courtsCount: number,
  groupCount: number,
  maxConsecutivePlayingLimit: number = DEFAULT_MAX_CONSECUTIVE_PLAYING_LIMIT,
): ScheduledMatch[] {
  // Step 1: 按对战组分组 (homeGroupIndex-awayGroupIndex)
  const matchupMap = new Map<string, GeneratedMatch[]>();
  for (const match of allMatches) {
    const key = `${match.homeGroupIndex}-${match.awayGroupIndex}`;
    if (!matchupMap.has(key)) matchupMap.set(key, []);
    matchupMap.get(key)!.push(match);
  }

  // Step 2: 生成 round-robin 循环配对
  const cycles = generateRoundRobinCycles(groupCount);

  const scheduled: ScheduledMatch[] = [];
  const lastCourtForTeam = new Map<number, number>();
  // 选手状态跟踪（跨循环传递，用于贪心优化）
  const playerLastPlayedRound = new Map<string, number>();
  const playerConsecutivePlaying = new Map<string, number>();
  let roundNumber = 1;

  for (const cycle of cycles) {
    // 如果一个循环的对战组数 > 场地数，拆分成多个 batch
    for (let batchStart = 0; batchStart < cycle.length; batchStart += courtsCount) {
      const batch = cycle.slice(batchStart, batchStart + courtsCount);

      // 分配场地（带轮转偏好）
      const courtAssignment = assignCourtsForBatch(batch, courtsCount, lastCourtForTeam);

      // 本 batch 各对战组的最大模板场次数
      const maxTemplates = Math.max(
        ...batch.map(pair => {
          const key = `${pair[0]}-${pair[1]}`;
          return matchupMap.get(key)?.length ?? 0;
        })
      );

      // 为每对对战组优化模板顺序，然后安排到对应场地
      const batchScheduled: ScheduledMatch[] = [];

      for (const { pair, court } of courtAssignment) {
        const key = `${pair[0]}-${pair[1]}`;
        const pairMatches = matchupMap.get(key);
        if (!pairMatches || pairMatches.length === 0) continue;

        // 找到最优模板顺序
        const orderedMatches = optimizeTemplateOrder(
          pairMatches, roundNumber, maxConsecutivePlayingLimit,
          playerLastPlayedRound, playerConsecutivePlaying
        );

        for (let t = 0; t < orderedMatches.length; t++) {
          batchScheduled.push({
            ...orderedMatches[t],
            roundNumber: roundNumber + t,
            courtNumber: court,
          });
        }
      }

      scheduled.push(...batchScheduled);

      // 更新选手状态（同 batch 各对战组不共享选手，顺序无关）
      for (let t = 0; t < maxTemplates; t++) {
        const round = roundNumber + t;
        for (const sm of batchScheduled) {
          if (sm.roundNumber !== round) continue;
          const players = getMatchPlayers(sm);
          for (const p of players) {
            const lastRound = playerLastPlayedRound.get(p) ?? 0;
            if (lastRound === round - 1) {
              playerConsecutivePlaying.set(p, (playerConsecutivePlaying.get(p) ?? 0) + 1);
            } else {
              playerConsecutivePlaying.set(p, 1);
            }
            playerLastPlayedRound.set(p, round);
          }
        }
      }

      roundNumber += maxTemplates;

      // 更新各队最后使用的场地
      for (const { pair, court } of courtAssignment) {
        lastCourtForTeam.set(pair[0], court);
        lastCourtForTeam.set(pair[1], court);
      }
    }
  }

  return scheduled;
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
function analyzeSchedule(
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
  const maxConsecutivePlayingLimit = getPlayingLimit(params);
  const maxConsecutiveRestingLimit = getRestingLimit(params);

  // 1. 生成所有比赛
  const allMatches = generateMatches(params);

  // 2. 赛程编排（循环制场地绑定 + 模板顺序贪心优化）
  const schedule = scheduleMatches(
    allMatches,
    params.courtsCount,
    params.groupCount,
    maxConsecutivePlayingLimit,
  );

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
    if (ps.maxConsecutivePlaying > maxConsecutivePlayingLimit) {
      warnings.push(`选手 组${ps.groupIndex + 1}-${ps.position}号位 连续上场 ${ps.maxConsecutivePlaying} 轮`);
    }
    if (ps.maxConsecutiveResting > maxConsecutiveRestingLimit) {
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
