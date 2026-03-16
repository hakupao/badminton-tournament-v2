// 默认代号库（创建时使用，之后可在赛事设置中完全自定义）
export const DEFAULT_TEAM_ICONS = [
  { icon: "🐱", name: "猫队" },
  { icon: "🐶", name: "狗队" },
  { icon: "🐰", name: "兔队" },
  { icon: "🐼", name: "熊猫队" },
  { icon: "🐹", name: "仓鼠队" },
  { icon: "🦝", name: "浣熊队" },
  { icon: "🐨", name: "考拉队" },
  { icon: "🦔", name: "刺猬队" },
  { icon: "🦦", name: "水獭队" },
  { icon: "🐧", name: "企鹅队" },
  { icon: "🦊", name: "狐狸队" },
  { icon: "🐻", name: "熊队" },
  { icon: "🐸", name: "青蛙队" },
  { icon: "🦁", name: "狮子队" },
  { icon: "🐯", name: "老虎队" },
  { icon: "🐮", name: "牛队" },
  { icon: "🐷", name: "猪队" },
  { icon: "🐴", name: "马队" },
  { icon: "🐲", name: "龙队" },
  { icon: "🦅", name: "鹰队" },
];

// Backward compatibility alias
export const ANIMAL_TEAMS = DEFAULT_TEAM_ICONS;

// Helper: get default team for index (falls back to numbered teams beyond the list)
export function getDefaultTeam(index: number) {
  if (index < DEFAULT_TEAM_ICONS.length) return DEFAULT_TEAM_ICONS[index];
  return { icon: `${index + 1}`, name: `第${index + 1}队` };
}

// 比赛类型中文名
export const MATCH_TYPE_LABELS = {
  MD: "男双",
  WD: "女双",
  XD: "混双",
} as const;

export type MatchType = keyof typeof MATCH_TYPE_LABELS;

export const DEFAULT_MAX_CONSECUTIVE_PLAYING_LIMIT = 2;
export const DEFAULT_MAX_CONSECUTIVE_RESTING_LIMIT = 3;

// 计分方式
export const SCORING_MODES = {
  single_21: { label: "一局 21 分", games: 1, points: 21 },
  single_30: { label: "一局 30 分", games: 1, points: 30 },
  best_of_3_15: { label: "三局两胜 15 分", games: 3, points: 15 },
  best_of_3_21: { label: "三局两胜 21 分", games: 3, points: 21 },
} as const;

export type ScoringMode = keyof typeof SCORING_MODES;

export interface TemplatePositionConfig {
  positionNumber: number;
  gender: "M" | "F";
}

export interface MirroredTemplateMatchConfig {
  matchType: MatchType;
  homePos1: number;
  homePos2: number;
  awayPos1: number;
  awayPos2: number;
  sortOrder: number;
}

export function buildTemplatePositions(
  malesPerGroup: number,
  femalesPerGroup: number
) {
  const total = malesPerGroup + femalesPerGroup;
  const positions: TemplatePositionConfig[] = [];

  for (let i = 1; i <= total; i++) {
    positions.push({
      positionNumber: i,
      gender: i <= malesPerGroup ? "M" : "F",
    });
  }

  return positions;
}

function createMirroredTemplateMatch(
  matchType: MatchType,
  pos1: number,
  pos2: number,
  sortOrder: number
): MirroredTemplateMatchConfig {
  return {
    matchType,
    homePos1: pos1,
    homePos2: pos2,
    awayPos1: pos1,
    awayPos2: pos2,
    sortOrder,
  };
}

export function buildDefaultTemplate(
  malesPerGroup: number,
  femalesPerGroup: number
) {
  const positions = buildTemplatePositions(malesPerGroup, femalesPerGroup);
  const malePositions = positions
    .filter((position) => position.gender === "M")
    .map((position) => position.positionNumber);
  const femalePositions = positions
    .filter((position) => position.gender === "F")
    .map((position) => position.positionNumber);

  const matches: MirroredTemplateMatchConfig[] = [];
  const seen = new Set<string>();

  const pushMatch = (matchType: MatchType, pos1?: number, pos2?: number) => {
    if (!pos1 || !pos2) return;

    const key = `${matchType}:${pos1}-${pos2}`;
    if (seen.has(key)) return;

    matches.push(createMirroredTemplateMatch(matchType, pos1, pos2, matches.length + 1));
    seen.add(key);
  };

  pushMatch("MD", malePositions[0], malePositions[1]);
  pushMatch("MD", malePositions[1], malePositions[2]);
  pushMatch("WD", femalePositions[0], femalePositions[1]);
  pushMatch("XD", malePositions[0], femalePositions[0]);
  pushMatch("XD", malePositions[malePositions.length - 1], femalePositions[femalePositions.length - 1]);

  return {
    positions,
    matches,
  };
}

// 默认比赛模板 (3男2女 = 5人组)
export const DEFAULT_TEMPLATE = buildDefaultTemplate(3, 2);
