import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  decimal,
  boolean,
  text
} from "drizzle-orm/pg-core";
import { desc } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (now OTP-based)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  phone: varchar("phone").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  balance: integer("balance").default(0),
  totalWinnings: integer("total_winnings").default(0),
  gamesPlayed: integer("games_played").default(0),
  upiId: varchar("upi_id"), // Store user's UPI ID for withdrawals
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// OTP storage for authentication
export const otpCodes = pgTable("otp_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  identifier: varchar("identifier").notNull(), // email or phone
  identifierType: varchar("identifier_type").notNull(), // 'email' or 'phone'
  otp: varchar("otp").notNull(),
  attempts: integer("attempts").default(0),
  used: boolean("used").default(false),
  ipAddress: varchar("ip_address"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Transactions table for top-ups and game transactions
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: varchar("type").notNull(), // 'topup', 'game_bet', 'game_win'
  amount: integer("amount").notNull(),
  status: varchar("status").default('completed'), // 'pending', 'completed', 'failed'
  gameType: varchar("game_type"), // 'color_game', 'aviator'
  gameRoundId: varchar("game_round_id"),
  paymentId: varchar("payment_id"), // for top-ups
  createdAt: timestamp("created_at").defaultNow(),
});

// Game rounds for tracking individual game sessions
export const gameRounds = pgTable("game_rounds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  gameType: varchar("game_type").notNull(), // 'color_game', 'aviator'
  betAmount: integer("bet_amount").notNull(),
  result: varchar("result").notNull(), // 'win', 'loss'
  winAmount: integer("win_amount").default(0),
  gameData: jsonb("game_data"), // Store game-specific data
  createdAt: timestamp("created_at").defaultNow(),
});

// Aviator game state for real-time multiplayer
export const aviatorGameState = pgTable("aviator_game_state", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roundId: varchar("round_id").notNull(),
  status: varchar("status").default('betting'), // 'betting', 'flying', 'crashed'
  multiplier: decimal("multiplier", { precision: 10, scale: 2 }).default('1.00'),
  crashPoint: decimal("crash_point", { precision: 10, scale: 2 }),
  startTime: timestamp("start_time"),
  crashTime: timestamp("crash_time"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Aviator bets for tracking player bets in each round
export const aviatorBets = pgTable("aviator_bets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  roundId: varchar("round_id").notNull(),
  betAmount: integer("bet_amount").notNull(),
  autoCashOut: decimal("auto_cash_out", { precision: 10, scale: 2 }),
  cashOutAt: decimal("cash_out_at", { precision: 10, scale: 2 }),
  status: varchar("status").default('active'), // 'active', 'cashed_out', 'crashed'
  winAmount: integer("win_amount").default(0),
  isNextRoundBet: boolean("is_next_round_bet").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Admin users for system management
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique().notNull(),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash").notNull(),
  role: varchar("role").default('admin'), // 'admin', 'super_admin'
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payment requests for top-ups
export const paymentRequests = pgTable("payment_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  pointsToCredit: integer("points_to_credit").notNull(),
  paymentMethod: varchar("payment_method").notNull(), // 'upi', 'bank_transfer', 'card'
  paymentTransactionId: varchar("payment_transaction_id"),
  payerUpiId: varchar("payer_upi_id"),
  payerBankDetails: jsonb("payer_bank_details"),
  status: varchar("status").default('pending'), // 'pending', 'approved', 'rejected'
  qrCodeId: varchar("qr_code_id"),
  approvedBy: varchar("approved_by").references(() => adminUsers.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Withdrawal requests
export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  pointsToWithdraw: integer("points_to_withdraw").notNull(),
  withdrawalAmount: decimal("withdrawal_amount", { precision: 10, scale: 2 }).notNull(),
  recipientUpiId: varchar("recipient_upi_id").notNull(),
  status: varchar("status").default('pending'), // 'pending', 'processing', 'completed', 'rejected'
  processedBy: varchar("processed_by").references(() => adminUsers.id),
  processedAt: timestamp("processed_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// QR codes for payments
export const paymentQrCodes = pgTable("payment_qr_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  qrCodeData: text("qr_code_data").notNull(),
  qrCodeImage: text("qr_code_image"), // Base64 or URL
  merchantUpiId: varchar("merchant_upi_id").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// System configuration
export const systemConfig = pgTable("system_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  configKey: varchar("config_key").unique().notNull(),
  configValue: text("config_value").notNull(),
  description: text("description"),
  updatedBy: varchar("updated_by").references(() => adminUsers.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertOtpCode = typeof otpCodes.$inferInsert;
export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type InsertGameRound = typeof gameRounds.$inferInsert;
export type GameRound = typeof gameRounds.$inferSelect;
export type InsertAviatorGameState = typeof aviatorGameState.$inferInsert;
export type AviatorGameState = typeof aviatorGameState.$inferSelect;
export type InsertAviatorBet = typeof aviatorBets.$inferInsert;
export type AviatorBet = typeof aviatorBets.$inferSelect;

// Admin system types
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;
export type PaymentRequest = typeof paymentRequests.$inferSelect;
export type InsertPaymentRequest = typeof paymentRequests.$inferInsert;
export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;
export type InsertWithdrawalRequest = typeof withdrawalRequests.$inferInsert;
export type PaymentQrCode = typeof paymentQrCodes.$inferSelect;
export type InsertPaymentQrCode = typeof paymentQrCodes.$inferInsert;
export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = typeof systemConfig.$inferInsert;

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertGameRoundSchema = createInsertSchema(gameRounds).omit({
  id: true,
  createdAt: true,
});

export const insertAviatorBetSchema = createInsertSchema(aviatorBets).omit({
  id: true,
  createdAt: true,
});

export const insertOtpCodeSchema = createInsertSchema(otpCodes).omit({
  id: true,
  createdAt: true,
});

// OTP Authentication Schemas
export const sendOtpSchema = z.object({
  identifier: z.string().min(1, "Email or phone is required"),
  type: z.enum(["email", "phone"]),
});

export const verifyOtpSchema = z.object({
  identifier: z.string().min(1, "Email or phone is required"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  type: z.enum(["email", "phone"]),
});

export type SendOtpRequest = z.infer<typeof sendOtpSchema>;
export type VerifyOtpRequest = z.infer<typeof verifyOtpSchema>;

// IPL Cricket Scoreboard Tables

// Cricket teams
export const cricketTeams = pgTable("cricket_teams", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  shortName: varchar("short_name").notNull(),
  logo: varchar("logo"),
  color: varchar("color"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cricket matches
export const cricketMatches = pgTable("cricket_matches", {
  id: varchar("id").primaryKey(),
  homeTeamId: varchar("home_team_id").references(() => cricketTeams.id).notNull(),
  awayTeamId: varchar("away_team_id").references(() => cricketTeams.id).notNull(),
  venue: varchar("venue"),
  tournament: varchar("tournament").default("IPL"),
  matchType: varchar("match_type").default("T20"),
  status: varchar("status").default("scheduled"), // scheduled, live, completed, abandoned
  tossWinner: varchar("toss_winner").references(() => cricketTeams.id),
  tossDecision: varchar("toss_decision"), // bat, bowl
  currentInnings: integer("current_innings").default(1),
  matchResult: text("match_result"),
  winnerTeamId: varchar("winner_team_id").references(() => cricketTeams.id),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cricket players
export const cricketPlayers = pgTable("cricket_players", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  teamId: varchar("team_id").references(() => cricketTeams.id),
  role: varchar("role"), // batsman, bowler, wicket-keeper, all-rounder
  battingStyle: varchar("batting_style"), // right-hand, left-hand
  bowlingStyle: varchar("bowling_style"), // right-arm fast, left-arm spin, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Match innings (two per match typically)
export const matchInnings = pgTable("match_innings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").references(() => cricketMatches.id).notNull(),
  battingTeamId: varchar("batting_team_id").references(() => cricketTeams.id).notNull(),
  bowlingTeamId: varchar("bowling_team_id").references(() => cricketTeams.id).notNull(),
  inningsNumber: integer("innings_number").notNull(), // 1 or 2
  runs: integer("runs").default(0),
  wickets: integer("wickets").default(0),
  overs: decimal("overs", { precision: 4, scale: 1 }).default('0.0'),
  runRate: decimal("run_rate", { precision: 5, scale: 2 }).default('0.00'),
  target: integer("target"), // for second innings
  requiredRunRate: decimal("required_run_rate", { precision: 5, scale: 2 }),
  status: varchar("status").default("not_started"), // not_started, in_progress, completed
  extras: jsonb("extras").default('{"wides": 0, "noBalls": 0, "byes": 0, "legByes": 0, "penalties": 0}'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ball-by-ball commentary and events
export const ballEvents = pgTable("ball_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").references(() => cricketMatches.id).notNull(),
  inningsId: varchar("innings_id").references(() => matchInnings.id).notNull(),
  overNumber: integer("over_number").notNull(),
  ballNumber: integer("ball_number").notNull(), // 1-6 for valid balls
  batsmanId: varchar("batsman_id").references(() => cricketPlayers.id),
  bowlerId: varchar("bowler_id").references(() => cricketPlayers.id),
  runs: integer("runs").default(0),
  extras: integer("extras").default(0),
  extraType: varchar("extra_type"), // wide, no-ball, bye, leg-bye
  isWicket: boolean("is_wicket").default(false),
  wicketType: varchar("wicket_type"), // bowled, caught, lbw, stumped, run-out, hit-wicket
  dismissedPlayerId: varchar("dismissed_player_id").references(() => cricketPlayers.id),
  fielderId: varchar("fielder_id").references(() => cricketPlayers.id),
  commentary: text("commentary"),
  scoreAfterBall: jsonb("score_after_ball"), // {runs: x, wickets: y, overs: z}
  sequence: integer("sequence").notNull(), // for ordering
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Player statistics for current match
export const playerMatchStats = pgTable("player_match_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").references(() => cricketMatches.id).notNull(),
  playerId: varchar("player_id").references(() => cricketPlayers.id).notNull(),
  
  // Batting stats
  battingRuns: integer("batting_runs").default(0),
  ballsFaced: integer("balls_faced").default(0),
  fours: integer("fours").default(0),
  sixes: integer("sixes").default(0),
  strikeRate: decimal("strike_rate", { precision: 6, scale: 2 }).default('0.00'),
  isNotOut: boolean("is_not_out").default(true),
  dismissalType: varchar("dismissal_type"),
  
  // Bowling stats
  oversBowled: decimal("overs_bowled", { precision: 4, scale: 1 }).default('0.0'),
  runsConceded: integer("runs_conceded").default(0),
  wicketsTaken: integer("wickets_taken").default(0),
  maidens: integer("maidens").default(0),
  economy: decimal("economy", { precision: 5, scale: 2 }).default('0.00'),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Fall of wickets tracking
export const fallOfWickets = pgTable("fall_of_wickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").references(() => cricketMatches.id).notNull(),
  inningsId: varchar("innings_id").references(() => matchInnings.id).notNull(),
  wicketNumber: integer("wicket_number").notNull(), // 1st wicket, 2nd wicket, etc.
  playerId: varchar("player_id").references(() => cricketPlayers.id).notNull(),
  runs: integer("runs").notNull(), // team score when wicket fell
  overs: decimal("overs", { precision: 4, scale: 1 }).notNull(),
  dismissalType: varchar("dismissal_type").notNull(),
  bowlerId: varchar("bowler_id").references(() => cricketPlayers.id),
  fielderId: varchar("fielder_id").references(() => cricketPlayers.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// External API call logs for monitoring
export const apiCallLogs = pgTable("api_call_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: varchar("provider").notNull(), // cricapi, sportmonks, etc.
  endpoint: varchar("endpoint").notNull(),
  method: varchar("method").default("GET"),
  requestData: jsonb("request_data"),
  responseStatus: integer("response_status"),
  responseTime: integer("response_time"), // milliseconds
  errorMessage: text("error_message"),
  matchId: varchar("match_id").references(() => cricketMatches.id),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Cricket API configurations
export const cricketApiConfig = pgTable("cricket_api_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: varchar("provider").notNull(),
  apiKey: varchar("api_key"),
  baseUrl: varchar("base_url").notNull(),
  rateLimitPerMinute: integer("rate_limit_per_minute").default(60),
  isActive: boolean("is_active").default(true),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cricket data types
export type CricketTeam = typeof cricketTeams.$inferSelect;
export type InsertCricketTeam = typeof cricketTeams.$inferInsert;
export type CricketMatch = typeof cricketMatches.$inferSelect;
export type InsertCricketMatch = typeof cricketMatches.$inferInsert;
export type CricketPlayer = typeof cricketPlayers.$inferSelect;
export type InsertCricketPlayer = typeof cricketPlayers.$inferInsert;
export type MatchInnings = typeof matchInnings.$inferSelect;
export type InsertMatchInnings = typeof matchInnings.$inferInsert;
export type BallEvent = typeof ballEvents.$inferSelect;
export type InsertBallEvent = typeof ballEvents.$inferInsert;
export type PlayerMatchStats = typeof playerMatchStats.$inferSelect;
export type InsertPlayerMatchStats = typeof playerMatchStats.$inferInsert;
export type FallOfWickets = typeof fallOfWickets.$inferSelect;
export type InsertFallOfWickets = typeof fallOfWickets.$inferInsert;
export type ApiCallLog = typeof apiCallLogs.$inferSelect;
export type InsertApiCallLog = typeof apiCallLogs.$inferInsert;
export type CricketApiConfig = typeof cricketApiConfig.$inferSelect;
export type InsertCricketApiConfig = typeof cricketApiConfig.$inferInsert;

// Cricket schemas for validation
export const insertCricketMatchSchema = createInsertSchema(cricketMatches).omit({
  createdAt: true,
  lastUpdated: true,
});

export const insertBallEventSchema = createInsertSchema(ballEvents).omit({
  id: true,
  createdAt: true,
  timestamp: true,
});

export const insertMatchInningsSchema = createInsertSchema(matchInnings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Real-time cricket data interface types
export interface LiveMatchData {
  matchId: string;
  teams: {
    home: { id: string; name: string; shortName: string; };
    away: { id: string; name: string; shortName: string; };
  };
  status: string;
  currentInnings: number;
  score: Array<{
    inning: number;
    team: string;
    runs: number;
    wickets: number;
    overs: string;
    runRate?: number;
    requiredRunRate?: number;
  }>;
  lastUpdated: string;
}

export interface LiveBallEvent {
  type: "ball" | "wicket" | "boundary" | "over_complete" | "innings_break";
  matchId: string;
  over: number;
  ballInOver: number;
  batsman?: string;
  bowler?: string;
  runs: number;
  extras: number;
  wicket: boolean;
  wicketType?: string;
  commentary?: string;
  scoreAfterBall: {
    team: string;
    runs: number;
    wickets: number;
    overs: string;
  };
  timestamp: string;
  sequence: number;
}
