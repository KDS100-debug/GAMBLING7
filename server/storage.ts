import {
  users,
  transactions,
  gameRounds,
  aviatorGameState,
  aviatorBets,
  otpCodes,
  paymentRequests,
  withdrawalRequests,
  cricketTeams,
  cricketMatches,
  cricketPlayers,
  matchInnings,
  ballEvents,
  playerMatchStats,
  fallOfWickets,
  apiCallLogs,
  cricketApiConfig,
  type User,
  type UpsertUser,
  type InsertTransaction,
  type Transaction,
  type InsertGameRound,
  type GameRound,
  type InsertAviatorGameState,
  type AviatorGameState,
  type InsertAviatorBet,
  type AviatorBet,
  type InsertOtpCode,
  type OtpCode,
  type CricketTeam,
  type InsertCricketTeam,
  type CricketMatch,
  type InsertCricketMatch,
  type CricketPlayer,
  type InsertCricketPlayer,
  type MatchInnings,
  type InsertMatchInnings,
  type BallEvent,
  type InsertBallEvent,
  type PlayerMatchStats,
  type InsertPlayerMatchStats,
  type FallOfWickets,
  type InsertFallOfWickets,
  type ApiCallLog,
  type InsertApiCallLog,
  type CricketApiConfig,
  type InsertCricketApiConfig,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (supports both Replit Auth and OTP Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Balance operations
  updateUserBalance(userId: string, amount: number): Promise<void>;
  getUserBalance(userId: string): Promise<number>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactions(userId: string, limit?: number): Promise<Transaction[]>;
  
  // Game operations
  createGameRound(gameRound: InsertGameRound): Promise<GameRound>;
  getUserGameHistory(userId: string, limit?: number): Promise<GameRound[]>;
  updateUserStats(userId: string, won: boolean, winAmount?: number): Promise<void>;
  
  // Aviator game operations
  createAviatorGameState(gameState: InsertAviatorGameState): Promise<AviatorGameState>;
  updateAviatorGameState(roundId: string, updates: Partial<AviatorGameState>): Promise<void>;
  getCurrentAviatorGame(): Promise<AviatorGameState | undefined>;
  createAviatorBet(bet: InsertAviatorBet): Promise<AviatorBet>;
  updateAviatorBet(id: string, updates: Partial<AviatorBet>): Promise<void>;
  getAviatorBetsForRound(roundId: string): Promise<AviatorBet[]>;
  getUserAviatorBet(userId: string, roundId: string): Promise<AviatorBet | undefined>;
  getUserAviatorBets(userId: string, limit?: number): Promise<AviatorBet[]>;

  // Cricket operations
  // Teams
  createCricketTeam(team: InsertCricketTeam): Promise<CricketTeam>;
  getCricketTeams(): Promise<CricketTeam[]>;
  getCricketTeam(id: string): Promise<CricketTeam | undefined>;
  
  // Matches
  createCricketMatch(match: InsertCricketMatch): Promise<CricketMatch>;
  updateCricketMatch(id: string, updates: Partial<CricketMatch>): Promise<void>;
  getCricketMatches(status?: string): Promise<CricketMatch[]>;
  getCricketMatch(id: string): Promise<CricketMatch | undefined>;
  
  // Players
  createCricketPlayer(player: InsertCricketPlayer): Promise<CricketPlayer>;
  getCricketPlayers(teamId?: string): Promise<CricketPlayer[]>;
  getCricketPlayer(id: string): Promise<CricketPlayer | undefined>;
  
  // Match innings
  createMatchInnings(innings: InsertMatchInnings): Promise<MatchInnings>;
  updateMatchInnings(id: string, updates: Partial<MatchInnings>): Promise<void>;
  getMatchInnings(matchId: string): Promise<MatchInnings[]>;
  getCurrentMatchInnings(matchId: string): Promise<MatchInnings | undefined>;
  
  // Ball events
  createBallEvent(event: InsertBallEvent): Promise<BallEvent>;
  getBallEvents(matchId: string, inningsId?: string): Promise<BallEvent[]>;
  getLatestBallEvents(matchId: string, limit?: number): Promise<BallEvent[]>;
  
  // Player match stats
  createPlayerMatchStats(stats: InsertPlayerMatchStats): Promise<PlayerMatchStats>;
  updatePlayerMatchStats(id: string, updates: Partial<PlayerMatchStats>): Promise<void>;
  getPlayerMatchStats(matchId: string, playerId?: string): Promise<PlayerMatchStats[]>;
  
  // Fall of wickets
  createFallOfWickets(fow: InsertFallOfWickets): Promise<FallOfWickets>;
  getFallOfWickets(matchId: string, inningsId?: string): Promise<FallOfWickets[]>;
  
  // API monitoring
  logApiCall(log: InsertApiCallLog): Promise<void>;
  getApiCallLogs(provider?: string, matchId?: string, limit?: number): Promise<ApiCallLog[]>;
  
  // API configuration
  createCricketApiConfig(config: InsertCricketApiConfig): Promise<CricketApiConfig>;
  updateCricketApiConfig(id: string, updates: Partial<CricketApiConfig>): Promise<void>;
  getCricketApiConfigs(): Promise<CricketApiConfig[]>;
  getActiveCricketApiConfig(provider: string): Promise<CricketApiConfig | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Balance operations
  async updateUserBalance(userId: string, amount: number): Promise<void> {
    await db
      .update(users)
      .set({ 
        balance: amount,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async getUserBalance(userId: string): Promise<number> {
    const [user] = await db
      .select({ balance: users.balance })
      .from(users)
      .where(eq(users.id, userId));
    return user?.balance || 0;
  }

  // Transaction operations
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db
      .insert(transactions)
      .values(transaction)
      .returning();
    return newTransaction;
  }

  async getUserTransactions(userId: string, limit: number = 10): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  // Game operations
  async createGameRound(gameRound: InsertGameRound): Promise<GameRound> {
    const [newGameRound] = await db
      .insert(gameRounds)
      .values(gameRound)
      .returning();
    return newGameRound;
  }

  async getUserGameHistory(userId: string, limit: number = 10): Promise<GameRound[]> {
    return await db
      .select()
      .from(gameRounds)
      .where(eq(gameRounds.userId, userId))
      .orderBy(desc(gameRounds.createdAt))
      .limit(limit);
  }

  async updateUserStats(userId: string, won: boolean, winAmount: number = 0): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    await db
      .update(users)
      .set({
        gamesPlayed: (user.gamesPlayed || 0) + 1,
        totalWinnings: won ? (user.totalWinnings || 0) + winAmount : (user.totalWinnings || 0),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // Aviator game operations
  async createAviatorGameState(gameState: InsertAviatorGameState): Promise<AviatorGameState> {
    const [newGameState] = await db
      .insert(aviatorGameState)
      .values(gameState)
      .returning();
    return newGameState;
  }

  async updateAviatorGameState(roundId: string, updates: Partial<AviatorGameState>): Promise<void> {
    await db
      .update(aviatorGameState)
      .set(updates)
      .where(eq(aviatorGameState.roundId, roundId));
  }

  async getCurrentAviatorGame(): Promise<AviatorGameState | undefined> {
    const [currentGame] = await db
      .select()
      .from(aviatorGameState)
      .orderBy(desc(aviatorGameState.createdAt))
      .limit(1);
    return currentGame;
  }

  async createAviatorBet(bet: InsertAviatorBet): Promise<AviatorBet> {
    const [newBet] = await db
      .insert(aviatorBets)
      .values(bet)
      .returning();
    return newBet;
  }

  async updateAviatorBet(id: string, updates: Partial<AviatorBet>): Promise<void> {
    await db
      .update(aviatorBets)
      .set(updates)
      .where(eq(aviatorBets.id, id));
  }

  async getAviatorBetsForRound(roundId: string): Promise<AviatorBet[]> {
    return await db
      .select()
      .from(aviatorBets)
      .where(eq(aviatorBets.roundId, roundId));
  }

  async getUserAviatorBet(userId: string, roundId: string): Promise<AviatorBet | undefined> {
    const [bet] = await db
      .select()
      .from(aviatorBets)
      .where(and(eq(aviatorBets.userId, userId), eq(aviatorBets.roundId, roundId)));
    return bet;
  }

  async getUserAviatorBets(userId: string, limit: number = 10): Promise<AviatorBet[]> {
    return await db
      .select()
      .from(aviatorBets)
      .where(eq(aviatorBets.userId, userId))
      .orderBy(desc(aviatorBets.createdAt))
      .limit(limit);
  }

  // Admin and Payment System Methods
  async updateUserUpiId(userId: string, upiId: string): Promise<void> {
    await db.update(users)
      .set({ upiId })
      .where(eq(users.id, userId));
  }

  async createPaymentRequest(data: any): Promise<any> {
    const [result] = await db.insert(paymentRequests).values(data).returning();
    return result;
  }

  async getUserPaymentRequests(userId: string): Promise<any[]> {
    return db.select()
      .from(paymentRequests)
      .where(eq(paymentRequests.userId, userId))
      .orderBy(desc(paymentRequests.createdAt));
  }

  async createWithdrawalRequest(data: any): Promise<any> {
    const [result] = await db.insert(withdrawalRequests).values(data).returning();
    return result;
  }

  async getUserWithdrawalRequests(userId: string): Promise<any[]> {
    return db.select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.userId, userId))
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async getAdminDashboardStats(): Promise<any> {
    const [totalPaymentsResult] = await db.select({
      total: sql<string>`COALESCE(SUM(amount), 0)`
    }).from(paymentRequests).where(eq(paymentRequests.status, 'approved'));

    const [totalWithdrawalsResult] = await db.select({
      total: sql<string>`COALESCE(SUM(withdrawal_amount), 0)`
    }).from(withdrawalRequests).where(eq(withdrawalRequests.status, 'completed'));

    const [pendingPaymentsResult] = await db.select({
      count: sql<string>`COUNT(*)`
    }).from(paymentRequests).where(eq(paymentRequests.status, 'pending'));

    const [activeUsersResult] = await db.select({
      count: sql<string>`COUNT(*)`
    }).from(users);

    return {
      totalPayments: totalPaymentsResult?.total || 0,
      totalWithdrawals: totalWithdrawalsResult?.total || 0,
      pendingPayments: pendingPaymentsResult?.count || 0,
      activeUsers: activeUsersResult?.count || 0,
    };
  }

  async getPendingPayments(): Promise<any[]> {
    return db.select()
      .from(paymentRequests)
      .where(eq(paymentRequests.status, 'pending'))
      .orderBy(desc(paymentRequests.createdAt));
  }

  async approvePayment(paymentId: string, adminId: string): Promise<any> {
    const [result] = await db.update(paymentRequests)
      .set({ 
        status: 'approved',
        approvedBy: adminId,
        approvedAt: new Date()
      })
      .where(eq(paymentRequests.id, paymentId))
      .returning();
    
    return result;
  }

  async getPendingWithdrawals(): Promise<any[]> {
    return db.select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.status, 'pending'))
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async completeWithdrawal(withdrawalId: string, adminId: string): Promise<any> {
    const [result] = await db.update(withdrawalRequests)
      .set({
        status: 'completed',
        processedBy: adminId,
        processedAt: new Date()
      })
      .where(eq(withdrawalRequests.id, withdrawalId))
      .returning();

    return result;
  }

  // Cricket operations implementation
  
  // Teams
  async createCricketTeam(team: InsertCricketTeam): Promise<CricketTeam> {
    const [newTeam] = await db.insert(cricketTeams).values(team).returning();
    return newTeam;
  }

  async getCricketTeams(): Promise<CricketTeam[]> {
    return await db.select().from(cricketTeams);
  }

  async getCricketTeam(id: string): Promise<CricketTeam | undefined> {
    const [team] = await db.select().from(cricketTeams).where(eq(cricketTeams.id, id));
    return team;
  }

  // Matches
  async createCricketMatch(match: InsertCricketMatch): Promise<CricketMatch> {
    const [newMatch] = await db.insert(cricketMatches).values(match).returning();
    return newMatch;
  }

  async updateCricketMatch(id: string, updates: Partial<CricketMatch>): Promise<void> {
    await db.update(cricketMatches)
      .set({ ...updates, lastUpdated: new Date() })
      .where(eq(cricketMatches.id, id));
  }

  async getCricketMatches(status?: string): Promise<CricketMatch[]> {
    if (status) {
      return await db.select().from(cricketMatches).where(eq(cricketMatches.status, status));
    }
    return await db.select().from(cricketMatches).orderBy(desc(cricketMatches.scheduledAt));
  }

  async getCricketMatch(id: string): Promise<CricketMatch | undefined> {
    const [match] = await db.select().from(cricketMatches).where(eq(cricketMatches.id, id));
    return match;
  }

  // Players
  async createCricketPlayer(player: InsertCricketPlayer): Promise<CricketPlayer> {
    const [newPlayer] = await db.insert(cricketPlayers).values(player).returning();
    return newPlayer;
  }

  async getCricketPlayers(teamId?: string): Promise<CricketPlayer[]> {
    if (teamId) {
      return await db.select().from(cricketPlayers).where(eq(cricketPlayers.teamId, teamId));
    }
    return await db.select().from(cricketPlayers);
  }

  async getCricketPlayer(id: string): Promise<CricketPlayer | undefined> {
    const [player] = await db.select().from(cricketPlayers).where(eq(cricketPlayers.id, id));
    return player;
  }

  // Match innings
  async createMatchInnings(innings: InsertMatchInnings): Promise<MatchInnings> {
    const [newInnings] = await db.insert(matchInnings).values(innings).returning();
    return newInnings;
  }

  async updateMatchInnings(id: string, updates: Partial<MatchInnings>): Promise<void> {
    await db.update(matchInnings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(matchInnings.id, id));
  }

  async getMatchInnings(matchId: string): Promise<MatchInnings[]> {
    return await db.select()
      .from(matchInnings)
      .where(eq(matchInnings.matchId, matchId))
      .orderBy(matchInnings.inningsNumber);
  }

  async getCurrentMatchInnings(matchId: string): Promise<MatchInnings | undefined> {
    const [innings] = await db.select()
      .from(matchInnings)
      .where(and(eq(matchInnings.matchId, matchId), eq(matchInnings.status, "in_progress")))
      .limit(1);
    return innings;
  }

  // Ball events
  async createBallEvent(event: InsertBallEvent): Promise<BallEvent> {
    const [newEvent] = await db.insert(ballEvents).values(event).returning();
    return newEvent;
  }

  async getBallEvents(matchId: string, inningsId?: string): Promise<BallEvent[]> {
    if (inningsId) {
      return await db.select()
        .from(ballEvents)
        .where(and(eq(ballEvents.matchId, matchId), eq(ballEvents.inningsId, inningsId)))
        .orderBy(ballEvents.sequence);
    }
    
    return await db.select()
      .from(ballEvents)
      .where(eq(ballEvents.matchId, matchId))
      .orderBy(ballEvents.sequence);
  }

  async getLatestBallEvents(matchId: string, limit: number = 10): Promise<BallEvent[]> {
    return await db.select()
      .from(ballEvents)
      .where(eq(ballEvents.matchId, matchId))
      .orderBy(desc(ballEvents.sequence))
      .limit(limit);
  }

  // Player match stats
  async createPlayerMatchStats(stats: InsertPlayerMatchStats): Promise<PlayerMatchStats> {
    const [newStats] = await db.insert(playerMatchStats).values(stats).returning();
    return newStats;
  }

  async updatePlayerMatchStats(id: string, updates: Partial<PlayerMatchStats>): Promise<void> {
    await db.update(playerMatchStats)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(playerMatchStats.id, id));
  }

  async getPlayerMatchStats(matchId: string, playerId?: string): Promise<PlayerMatchStats[]> {
    if (playerId) {
      return await db.select()
        .from(playerMatchStats)
        .where(and(eq(playerMatchStats.matchId, matchId), eq(playerMatchStats.playerId, playerId)));
    }
    return await db.select()
      .from(playerMatchStats)
      .where(eq(playerMatchStats.matchId, matchId));
  }

  // Fall of wickets
  async createFallOfWickets(fow: InsertFallOfWickets): Promise<FallOfWickets> {
    const [newFow] = await db.insert(fallOfWickets).values(fow).returning();
    return newFow;
  }

  async getFallOfWickets(matchId: string, inningsId?: string): Promise<FallOfWickets[]> {
    if (inningsId) {
      return await db.select()
        .from(fallOfWickets)
        .where(and(eq(fallOfWickets.matchId, matchId), eq(fallOfWickets.inningsId, inningsId)))
        .orderBy(fallOfWickets.wicketNumber);
    }
    return await db.select()
      .from(fallOfWickets)
      .where(eq(fallOfWickets.matchId, matchId))
      .orderBy(fallOfWickets.wicketNumber);
  }

  // API monitoring
  async logApiCall(log: InsertApiCallLog): Promise<void> {
    await db.insert(apiCallLogs).values(log);
  }

  async getApiCallLogs(provider?: string, matchId?: string, limit: number = 100): Promise<ApiCallLog[]> {
    const conditions = [];
    if (provider) conditions.push(eq(apiCallLogs.provider, provider));
    if (matchId) conditions.push(eq(apiCallLogs.matchId, matchId));
    
    if (conditions.length > 0) {
      return await db.select()
        .from(apiCallLogs)
        .where(and(...conditions))
        .orderBy(desc(apiCallLogs.timestamp))
        .limit(limit);
    }
    
    return await db.select()
      .from(apiCallLogs)
      .orderBy(desc(apiCallLogs.timestamp))
      .limit(limit);
  }

  // API configuration
  async createCricketApiConfig(config: InsertCricketApiConfig): Promise<CricketApiConfig> {
    const [newConfig] = await db.insert(cricketApiConfig).values(config).returning();
    return newConfig;
  }

  async updateCricketApiConfig(id: string, updates: Partial<CricketApiConfig>): Promise<void> {
    await db.update(cricketApiConfig)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(cricketApiConfig.id, id));
  }

  async getCricketApiConfigs(): Promise<CricketApiConfig[]> {
    return await db.select().from(cricketApiConfig);
  }

  async getActiveCricketApiConfig(provider: string): Promise<CricketApiConfig | undefined> {
    const [config] = await db.select()
      .from(cricketApiConfig)
      .where(and(eq(cricketApiConfig.provider, provider), eq(cricketApiConfig.isActive, true)))
      .limit(1);
    return config;
  }
}

export const storage = new DatabaseStorage();
