import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ========== 用户账号 ==========
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "athlete"] }).notNull().default("athlete"),
  playerId: integer("player_id").references(() => players.id),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// ========== 赛事 ==========
export const tournaments = sqliteTable("tournaments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  status: text("status", { enum: ["draft", "active", "finished"] }).notNull().default("draft"),
  courtsCount: integer("courts_count").notNull().default(3),
  roundDurationMinutes: integer("round_duration_minutes").notNull().default(20),
  scoringMode: text("scoring_mode", {
    enum: ["single_21", "single_30", "best_of_3_15", "best_of_3_21"],
  }).notNull().default("single_21"),
  eventDate: text("event_date"),
  startTime: text("start_time").default("09:00"),
  endTime: text("end_time").default("19:00"),
  malesPerGroup: integer("males_per_group").notNull().default(3),
  femalesPerGroup: integer("females_per_group").notNull().default(2),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// ========== 小组 ==========
export const groups = sqliteTable("groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id),
  name: text("name").notNull(),       // 如「猫队」
  icon: text("icon").notNull(),       // 如「🐱」
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// ========== 参赛者（= 代号位置，抽签前无真名） ==========
export const players = sqliteTable("players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id),
  groupId: integer("group_id").notNull().references(() => groups.id),
  positionNumber: integer("position_number").notNull(), // 1,2,3=男 4,5=女
  slotIndex: integer("slot_index").notNull().default(1), // 1=主选手 2=候补选手（同位置双人轮换）
  gender: text("gender", { enum: ["M", "F"] }).notNull(),
  name: text("name"), // 真名，抽签后填入
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// ========== 比赛模板 - 位置定义 ==========
export const templatePositions = sqliteTable("template_positions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id),
  positionNumber: integer("position_number").notNull(),
  gender: text("gender", { enum: ["M", "F"] }).notNull(),
});

// ========== 比赛模板 - 对阵定义 ==========
export const templateMatches = sqliteTable("template_matches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id),
  matchType: text("match_type", { enum: ["MD", "WD", "XD"] }).notNull(),
  homePos1: integer("home_pos_1").notNull(),
  homePos2: integer("home_pos_2").notNull(),
  awayPos1: integer("away_pos_1").notNull(),
  awayPos2: integer("away_pos_2").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ========== 比赛（实际生成的每场比赛） ==========
export const matches = sqliteTable("matches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id),
  roundNumber: integer("round_number").notNull(),
  courtNumber: integer("court_number").notNull(),
  homeGroupId: integer("home_group_id").notNull().references(() => groups.id),
  awayGroupId: integer("away_group_id").notNull().references(() => groups.id),
  templateMatchId: integer("template_match_id").references(() => templateMatches.id),
  matchType: text("match_type", { enum: ["MD", "WD", "XD"] }).notNull(),
  homePlayer1Id: integer("home_player_1_id").references(() => players.id),
  homePlayer2Id: integer("home_player_2_id").references(() => players.id),
  awayPlayer1Id: integer("away_player_1_id").references(() => players.id),
  awayPlayer2Id: integer("away_player_2_id").references(() => players.id),
  status: text("status", { enum: ["pending", "in_progress", "finished"] }).notNull().default("pending"),
  winner: text("winner", { enum: ["home", "away"] }),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// ========== 比分（每局） ==========
export const matchGames = sqliteTable("match_games", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  matchId: integer("match_id").notNull().references(() => matches.id),
  gameNumber: integer("game_number").notNull(),
  homeScore: integer("home_score").notNull().default(0),
  awayScore: integer("away_score").notNull().default(0),
  winner: text("winner", { enum: ["home", "away"] }),
});

// ========== 裁判志愿记录 ==========
export const refereeRecords = sqliteTable("referee_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  matchId: integer("match_id").notNull().references(() => matches.id),
  playerId: integer("player_id").notNull().references(() => players.id),
  role: text("role", { enum: ["referee", "line_judge"] }).notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// ========== 得分事件（逐球记录） ==========
export const scoreEvents = sqliteTable("score_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  matchId: integer("match_id").notNull().references(() => matches.id),
  gameNumber: integer("game_number").notNull(),
  eventOrder: integer("event_order").notNull(), // 该局内的事件序号
  scoringSide: text("scoring_side", { enum: ["home", "away"] }).notNull(),
  homeScore: integer("home_score").notNull(), // 得分后的比分
  awayScore: integer("away_score").notNull(),
  timestamp: text("timestamp").notNull().default(sql`(datetime('now'))`),
});

// ========== 赛事报名（摇号前的位置分配） ==========
export const tournamentParticipants = sqliteTable("tournament_participants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id),
  userId: integer("user_id").notNull().references(() => users.id),
  assignedPosition: integer("assigned_position").notNull(), // 技术位置 1-n
  gender: text("gender", { enum: ["M", "F"] }).notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// ========== 类型导出 ==========
export type User = typeof users.$inferSelect;
export type Tournament = typeof tournaments.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type Player = typeof players.$inferSelect;
export type TemplatePosition = typeof templatePositions.$inferSelect;
export type TemplateMatch = typeof templateMatches.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type MatchGame = typeof matchGames.$inferSelect;
export type RefereeRecord = typeof refereeRecords.$inferSelect;
export type ScoreEvent = typeof scoreEvents.$inferSelect;
export type TournamentParticipant = typeof tournamentParticipants.$inferSelect;
