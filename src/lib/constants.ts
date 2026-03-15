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

// 计分方式
export const SCORING_MODES = {
  single_21: { label: "一局 21 分", games: 1, points: 21 },
  single_30: { label: "一局 30 分", games: 1, points: 30 },
  best_of_3_15: { label: "三局两胜 15 分", games: 3, points: 15 },
  best_of_3_21: { label: "三局两胜 21 分", games: 3, points: 21 },
} as const;

export type ScoringMode = keyof typeof SCORING_MODES;

// 默认比赛模板 (3男2女 = 5人组)
export const DEFAULT_TEMPLATE = {
  positions: [
    { positionNumber: 1, gender: "M" as const },
    { positionNumber: 2, gender: "M" as const },
    { positionNumber: 3, gender: "M" as const },
    { positionNumber: 4, gender: "F" as const },
    { positionNumber: 5, gender: "F" as const },
  ],
  matches: [
    { matchType: "MD" as const, homePos1: 1, homePos2: 2, awayPos1: 1, awayPos2: 2, sortOrder: 1 },
    { matchType: "MD" as const, homePos1: 2, homePos2: 3, awayPos1: 2, awayPos2: 3, sortOrder: 2 },
    { matchType: "WD" as const, homePos1: 4, homePos2: 5, awayPos1: 4, awayPos2: 5, sortOrder: 3 },
    { matchType: "XD" as const, homePos1: 1, homePos2: 4, awayPos1: 1, awayPos2: 4, sortOrder: 4 },
    { matchType: "XD" as const, homePos1: 3, homePos2: 5, awayPos1: 3, awayPos2: 5, sortOrder: 5 },
  ],
};
