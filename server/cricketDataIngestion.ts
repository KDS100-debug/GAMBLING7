import { storage } from './storage';
import { CricketApiService, MockCricketProvider, CricApiProvider, RateLimiter } from './cricketApiService';
import { CricketWebSocketManager } from './cricketWebSocketService';
import { LiveMatchData, LiveBallEvent } from '@shared/schema';

export class CricketDataIngestionService {
  private apiService: CricketApiService;
  private wsManager: CricketWebSocketManager;
  private rateLimiter: RateLimiter;
  private pollingInterval: NodeJS.Timeout | null = null;
  private activeMatches = new Set<string>();
  private lastSequenceNumbers = new Map<string, number>();

  constructor(wsManager: CricketWebSocketManager) {
    this.wsManager = wsManager;
    
    // Initialize with mock provider for demo - user can provide real API key later
    const mockProvider = new MockCricketProvider();
    this.apiService = new CricketApiService(mockProvider, (log) => storage.logApiCall(log));
    
    // Rate limiter: 60 requests per minute
    this.rateLimiter = new RateLimiter(60, 60 * 1000);
  }

  async initializeTeamsAndPlayers(): Promise<void> {
    console.log('Initializing IPL teams and players...');
    
    // Create IPL teams
    const teams = [
      { id: 'MI', name: 'Mumbai Indians', shortName: 'MI', color: '#004ba0', logo: '/teams/mi.png' },
      { id: 'CSK', name: 'Chennai Super Kings', shortName: 'CSK', color: '#f9cd05', logo: '/teams/csk.png' },
      { id: 'RCB', name: 'Royal Challengers Bangalore', shortName: 'RCB', color: '#ec1c24', logo: '/teams/rcb.png' },
      { id: 'DC', name: 'Delhi Capitals', shortName: 'DC', color: '#17479e', logo: '/teams/dc.png' },
      { id: 'KKR', name: 'Kolkata Knight Riders', shortName: 'KKR', color: '#3a225d', logo: '/teams/kkr.png' },
      { id: 'PBKS', name: 'Punjab Kings', shortName: 'PBKS', color: '#ed1a37', logo: '/teams/pbks.png' },
      { id: 'RR', name: 'Rajasthan Royals', shortName: 'RR', color: '#254aa5', logo: '/teams/rr.png' },
      { id: 'SRH', name: 'Sunrisers Hyderabad', shortName: 'SRH', color: '#ff822a', logo: '/teams/srh.png' },
      { id: 'GT', name: 'Gujarat Titans', shortName: 'GT', color: '#1b2133', logo: '/teams/gt.png' },
      { id: 'LSG', name: 'Lucknow Super Giants', shortName: 'LSG', color: '#00a9e0', logo: '/teams/lsg.png' }
    ];

    for (const team of teams) {
      try {
        const existingTeam = await storage.getCricketTeam(team.id);
        if (!existingTeam) {
          await storage.createCricketTeam(team);
          console.log(`Created team: ${team.name}`);
        }
      } catch (error) {
        console.error(`Error creating team ${team.name}:`, error);
      }
    }

    // Create sample players for Mumbai Indians and Chennai Super Kings
    const players = [
      // Mumbai Indians
      { id: 'rohit-sharma', name: 'Rohit Sharma', teamId: 'MI', role: 'batsman', battingStyle: 'right-hand' },
      { id: 'jasprit-bumrah', name: 'Jasprit Bumrah', teamId: 'MI', role: 'bowler', bowlingStyle: 'right-arm fast' },
      { id: 'hardik-pandya', name: 'Hardik Pandya', teamId: 'MI', role: 'all-rounder', battingStyle: 'right-hand' },
      { id: 'ishan-kishan', name: 'Ishan Kishan', teamId: 'MI', role: 'wicket-keeper', battingStyle: 'left-hand' },
      
      // Chennai Super Kings
      { id: 'ms-dhoni', name: 'MS Dhoni', teamId: 'CSK', role: 'wicket-keeper', battingStyle: 'right-hand' },
      { id: 'ravindra-jadeja', name: 'Ravindra Jadeja', teamId: 'CSK', role: 'all-rounder', battingStyle: 'left-hand' },
      { id: 'ruturaj-gaikwad', name: 'Ruturaj Gaikwad', teamId: 'CSK', role: 'batsman', battingStyle: 'right-hand' },
      { id: 'deepak-chahar', name: 'Deepak Chahar', teamId: 'CSK', role: 'bowler', bowlingStyle: 'right-arm medium' },
    ];

    for (const player of players) {
      try {
        const existingPlayer = await storage.getCricketPlayer(player.id);
        if (!existingPlayer) {
          await storage.createCricketPlayer(player);
          console.log(`Created player: ${player.name}`);
        }
      } catch (error) {
        console.error(`Error creating player ${player.name}:`, error);
      }
    }

    console.log('Team and player initialization complete');
  }

  async startDataIngestion(): Promise<void> {
    console.log('Starting cricket data ingestion service...');
    
    await this.initializeTeamsAndPlayers();
    await this.setupDemoMatch();

    // Start polling for live data every 3 seconds
    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollForUpdates();
      } catch (error) {
        console.error('Error in polling cycle:', error);
      }
    }, 3000);

    console.log('Cricket data ingestion service started');
  }

  private async setupDemoMatch(): Promise<void> {
    const existingMatch = await storage.getCricketMatch('ipl-2025-1234');
    
    if (!existingMatch) {
      // Create a demo live match
      const match = await storage.createCricketMatch({
        id: 'ipl-2025-1234',
        homeTeamId: 'MI',
        awayTeamId: 'CSK',
        venue: 'Wankhede Stadium, Mumbai',
        tournament: 'IPL',
        matchType: 'T20',
        status: 'live',
        tossWinner: 'MI',
        tossDecision: 'bat',
        currentInnings: 2,
        scheduledAt: new Date(),
        startedAt: new Date(),
      });

      // Create innings
      const firstInnings = await storage.createMatchInnings({
        matchId: 'ipl-2025-1234',
        battingTeamId: 'MI',
        bowlingTeamId: 'CSK',
        inningsNumber: 1,
        runs: 187,
        wickets: 4,
        overs: '20.0',
        runRate: '9.35',
        status: 'completed',
      });

      const secondInnings = await storage.createMatchInnings({
        matchId: 'ipl-2025-1234',
        battingTeamId: 'CSK',
        bowlingTeamId: 'MI',
        inningsNumber: 2,
        runs: 134,
        wickets: 6,
        overs: '16.3',
        runRate: '8.18',
        target: 188,
        requiredRunRate: '15.43',
        status: 'in_progress',
      });

      this.activeMatches.add('ipl-2025-1234');
      this.lastSequenceNumbers.set('ipl-2025-1234', 0);

      console.log('Demo match setup complete');
    } else {
      this.activeMatches.add('ipl-2025-1234');
      
      // Get the last sequence number
      const lastEvents = await storage.getLatestBallEvents('ipl-2025-1234', 1);
      this.lastSequenceNumbers.set('ipl-2025-1234', lastEvents[0]?.sequence || 0);
    }
  }

  private async pollForUpdates(): Promise<void> {
    if (!this.rateLimiter.canMakeRequest()) {
      console.log(`Rate limit reached, waiting ${this.rateLimiter.getWaitTime()}ms`);
      return;
    }

    for (const matchId of Array.from(this.activeMatches)) {
      try {
        await this.updateMatchData(matchId);
        await this.generateBallEvent(matchId); // For demo purposes
      } catch (error) {
        console.error(`Error updating match ${matchId}:`, error);
      }
    }
  }

  private async updateMatchData(matchId: string): Promise<void> {
    try {
      const liveData = await this.apiService.getLiveScore(matchId);
      
      if (liveData && liveData.data) {
        const matchData: LiveMatchData = {
          matchId,
          teams: {
            home: { id: 'MI', name: 'Mumbai Indians', shortName: 'MI' },
            away: { id: 'CSK', name: 'Chennai Super Kings', shortName: 'CSK' },
          },
          status: liveData.data.status || 'live',
          currentInnings: liveData.data.current_innings || 2,
          score: [
            {
              inning: 1,
              team: 'MI',
              runs: 187,
              wickets: 4,
              overs: '20.0',
              runRate: 9.35,
            },
            {
              inning: 2,
              team: 'CSK',
              runs: liveData.data.teams?.b?.scores?.r || 134,
              wickets: liveData.data.teams?.b?.scores?.w || 6,
              overs: liveData.data.teams?.b?.scores?.o || '16.3',
              runRate: 8.18,
              requiredRunRate: 15.43,
            },
          ],
          lastUpdated: new Date().toISOString(),
        };

        // Broadcast to all subscribed clients
        this.wsManager.broadcastMatchUpdate(matchId, matchData);
      }
    } catch (error) {
      console.error(`Error fetching live data for match ${matchId}:`, error);
    }
  }

  private async generateBallEvent(matchId: string): Promise<void> {
    // For demo purposes, generate a ball event every few polling cycles
    if (Math.random() < 0.3) { // 30% chance to generate an event
      const currentSequence = this.lastSequenceNumbers.get(matchId) || 0;
      const newSequence = currentSequence + 1;
      
      const currentInnings = await storage.getCurrentMatchInnings(matchId);
      if (!currentInnings) return;

      const runs = Math.floor(Math.random() * 7); // 0-6 runs
      const isWicket = runs === 0 && Math.random() < 0.1; // 10% chance of wicket on 0 runs
      const currentOver = Math.floor((newSequence - 1) / 6) + 1;
      const ballInOver = ((newSequence - 1) % 6) + 1;

      const ballEvent: LiveBallEvent = {
        type: isWicket ? 'wicket' : runs >= 4 ? 'boundary' : 'ball',
        matchId,
        over: currentOver,
        ballInOver,
        batsman: 'MS Dhoni',
        bowler: 'Jasprit Bumrah',
        runs,
        extras: 0,
        wicket: isWicket,
        wicketType: isWicket ? 'caught' : undefined,
        commentary: this.generateCommentary(runs, isWicket),
        scoreAfterBall: {
          team: 'CSK',
          runs: (currentInnings.runs || 0) + runs,
          wickets: (currentInnings.wickets || 0) + (isWicket ? 1 : 0),
          overs: `${currentOver}.${ballInOver}`,
        },
        timestamp: new Date().toISOString(),
        sequence: newSequence,
      };

      // Save to database
      await storage.createBallEvent({
        matchId,
        inningsId: currentInnings.id,
        overNumber: currentOver,
        ballNumber: ballInOver,
        batsmanId: 'ms-dhoni',
        bowlerId: 'jasprit-bumrah',
        runs,
        extras: 0,
        isWicket,
        wicketType: isWicket ? 'caught' : undefined,
        commentary: ballEvent.commentary,
        scoreAfterBall: ballEvent.scoreAfterBall,
        sequence: newSequence,
      });

      // Update innings
      const newRuns = (currentInnings.runs || 0) + runs;
      const newWickets = (currentInnings.wickets || 0) + (isWicket ? 1 : 0);
      const totalOvers = (currentOver - 1) + ballInOver / 6;
      
      await storage.updateMatchInnings(currentInnings.id, {
        runs: newRuns,
        wickets: newWickets,
        overs: `${currentOver}.${ballInOver}`,
        runRate: totalOvers > 0 ? (newRuns / totalOvers).toFixed(2) : '0.00',
      });

      // Update sequence number
      this.lastSequenceNumbers.set(matchId, newSequence);

      // Broadcast to subscribed clients
      this.wsManager.broadcastBallEvent(matchId, ballEvent);

      console.log(`Generated ball event: ${ballEvent.commentary}`);
    }
  }

  private generateCommentary(runs: number, isWicket: boolean): string {
    if (isWicket) {
      const wicketComments = [
        "OUT! Excellent catch in the deep!",
        "WICKET! The batsman holes out to the fielder",
        "Gone! A brilliant piece of bowling",
        "OUT! The pressure tells and wicket falls",
      ];
      return wicketComments[Math.floor(Math.random() * wicketComments.length)];
    }

    if (runs === 6) {
      return "SIX! What a magnificent hit! The ball sails over the boundary";
    }
    if (runs === 4) {
      return "FOUR! Beautifully timed shot races away to the boundary";
    }
    if (runs === 0) {
      return "Dot ball. Good tight bowling from the bowler";
    }
    
    return `${runs} run${runs > 1 ? 's' : ''} taken. Good running between the wickets`;
  }

  stopDataIngestion(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('Cricket data ingestion service stopped');
    }
  }

  // Method to switch to real API provider when user provides credentials
  async switchToRealProvider(provider: 'cricapi' | 'api-cricket', apiKey: string): Promise<void> {
    let realProvider;
    
    if (provider === 'cricapi') {
      realProvider = new CricApiProvider(apiKey);
    } else {
      realProvider = new CricApiProvider(apiKey); // Placeholder for API-Cricket
    }

    this.apiService = new CricketApiService(realProvider, (log) => storage.logApiCall(log));
    
    // Save API config
    await storage.createCricketApiConfig({
      provider,
      apiKey,
      baseUrl: provider === 'cricapi' ? 'https://api.cricapi.com/v1' : 'https://api.api-cricket.com/v1',
      rateLimitPerMinute: 60,
      isActive: true,
    });

    console.log(`Switched to real ${provider} provider`);
  }

  getIngestionStatus() {
    return {
      isRunning: this.pollingInterval !== null,
      activeMatches: Array.from(this.activeMatches),
      providerName: this.apiService ? 'mock' : 'unknown',
      connectedClients: this.wsManager.getConnectedClients(),
      lastSequenceNumbers: Object.fromEntries(this.lastSequenceNumbers),
    };
  }
}