import { ApiCallLog, InsertApiCallLog } from "@shared/schema.ts";

export interface CricketApiProvider {
  name: string;
  fetchMatches(): Promise<any>;
  fetchMatchDetails(matchId: string): Promise<any>;
  fetchLiveScore(matchId: string): Promise<any>;
  fetchBallByBall(matchId: string): Promise<any>;
}

// CricAPI.com implementation (free tier for prototyping)
export class CricApiProvider implements CricketApiProvider {
  name = "cricapi";
  private baseUrl = "https://api.cricapi.com/v1";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async fetchMatches(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/matches?apikey=${this.apiKey}&offset=0`);
    return response.json();
  }

  async fetchMatchDetails(matchId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/match_info?apikey=${this.apiKey}&id=${matchId}`);
    return response.json();
  }

  async fetchLiveScore(matchId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/crickscore?apikey=${this.apiKey}&id=${matchId}`);
    return response.json();
  }

  async fetchBallByBall(matchId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/match_scorecard?apikey=${this.apiKey}&id=${matchId}`);
    return response.json();
  }
}

// API-Cricket.com implementation (alternative free option)
export class ApiCricketProvider implements CricketApiProvider {
  name = "api-cricket";
  private baseUrl = "https://api.api-cricket.com/v1";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async fetchMatches(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/matches?apikey=${this.apiKey}`);
    return response.json();
  }

  async fetchMatchDetails(matchId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/matches/${matchId}?apikey=${this.apiKey}`);
    return response.json();
  }

  async fetchLiveScore(matchId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/matches/${matchId}/live?apikey=${this.apiKey}`);
    return response.json();
  }

  async fetchBallByBall(matchId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/matches/${matchId}/balls?apikey=${this.apiKey}`);
    return response.json();
  }
}

// Mock provider for testing without external dependencies
export class MockCricketProvider implements CricketApiProvider {
  name = "mock";

  async fetchMatches(): Promise<any> {
    return {
      data: [
        {
          id: "ipl-2025-1234",
          name: "Mumbai Indians vs Chennai Super Kings",
          teams: ["Mumbai Indians", "Chennai Super Kings"],
          status: "live",
          venue: "Wankhede Stadium, Mumbai",
          date: new Date().toISOString(),
        },
        {
          id: "ipl-2025-1235", 
          name: "Royal Challengers Bangalore vs Delhi Capitals",
          teams: ["Royal Challengers Bangalore", "Delhi Capitals"],
          status: "scheduled",
          venue: "M. Chinnaswamy Stadium, Bangalore",
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }
      ]
    };
  }

  async fetchMatchDetails(matchId: string): Promise<any> {
    if (matchId === "ipl-2025-1234") {
      return {
        data: {
          id: "ipl-2025-1234",
          name: "Mumbai Indians vs Chennai Super Kings",
          status: "live",
          venue: "Wankhede Stadium, Mumbai",
          toss: {
            winner: "Mumbai Indians",
            decision: "bat"
          },
          teams: {
            a: {
              id: "MI",
              name: "Mumbai Indians",
              scores: [
                {
                  inning: 1,
                  r: 187,
                  w: 4,
                  o: 20.0
                }
              ]
            },
            b: {
              id: "CSK", 
              name: "Chennai Super Kings",
              scores: [
                {
                  inning: 2,
                  r: 134,
                  w: 6,
                  o: 16.3
                }
              ]
            }
          }
        }
      };
    }
    return { data: null };
  }

  async fetchLiveScore(matchId: string): Promise<any> {
    if (matchId === "ipl-2025-1234") {
      return {
        data: {
          id: "ipl-2025-1234",
          status: "live", 
          current_innings: 2,
          teams: {
            a: {
              name: "Mumbai Indians",
              scores: { r: 187, w: 4, o: 20.0 }
            },
            b: {
              name: "Chennai Super Kings", 
              scores: { r: 134, w: 6, o: 16.3 }
            }
          },
          live: {
            current_over: 16.3,
            batsman: ["MS Dhoni", "Ravindra Jadeja"],
            bowler: "Jasprit Bumrah",
            recent_balls: ["4", "1", "0", "W", "6", "2"]
          }
        }
      };
    }
    return { data: null };
  }

  async fetchBallByBall(matchId: string): Promise<any> {
    if (matchId === "ipl-2025-1234") {
      return {
        data: {
          balls: [
            {
              over: 16,
              ball: 3,
              batsman: "MS Dhoni",
              bowler: "Jasprit Bumrah", 
              runs: 4,
              extras: 0,
              wicket: false,
              commentary: "Four! Dhoni finds the gap between covers and point"
            },
            {
              over: 16,
              ball: 4,
              batsman: "Ravindra Jadeja",
              bowler: "Jasprit Bumrah",
              runs: 0,
              extras: 0, 
              wicket: true,
              wicket_type: "caught",
              commentary: "OUT! Jadeja attempts a big shot but gets caught at long-on"
            }
          ]
        }
      };
    }
    return { data: { balls: [] } };
  }
}

export class CricketApiService {
  private provider: CricketApiProvider;
  private logApiCall: (log: InsertApiCallLog) => Promise<void>;

  constructor(provider: CricketApiProvider, logApiCall: (log: InsertApiCallLog) => Promise<void>) {
    this.provider = provider;
    this.logApiCall = logApiCall;
  }

  private async logCall(endpoint: string, method: string, requestData?: any, responseStatus?: number, responseTime?: number, errorMessage?: string, matchId?: string): Promise<void> {
    try {
      await this.logApiCall({
        provider: this.provider.name,
        endpoint,
        method,
        requestData,
        responseStatus,
        responseTime,
        errorMessage,
        matchId,
      });
    } catch (error) {
      console.error("Failed to log API call:", error);
    }
  }

  async getMatches(): Promise<any> {
    const startTime = Date.now();
    try {
      const result = await this.provider.fetchMatches();
      const responseTime = Date.now() - startTime;
      await this.logCall("matches", "GET", null, 200, responseTime);
      return result;
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      await this.logCall("matches", "GET", null, 500, responseTime, error.message);
      throw error;
    }
  }

  async getMatchDetails(matchId: string): Promise<any> {
    const startTime = Date.now();
    try {
      const result = await this.provider.fetchMatchDetails(matchId);
      const responseTime = Date.now() - startTime;
      await this.logCall(`match_details/${matchId}`, "GET", null, 200, responseTime, undefined, matchId);
      return result;
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      await this.logCall(`match_details/${matchId}`, "GET", null, 500, responseTime, error.message, matchId);
      throw error;
    }
  }

  async getLiveScore(matchId: string): Promise<any> {
    const startTime = Date.now();
    try {
      const result = await this.provider.fetchLiveScore(matchId);
      const responseTime = Date.now() - startTime;
      await this.logCall(`live_score/${matchId}`, "GET", null, 200, responseTime, undefined, matchId);
      return result;
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      await this.logCall(`live_score/${matchId}`, "GET", null, 500, responseTime, error.message, matchId);
      throw error;
    }
  }

  async getBallByBall(matchId: string): Promise<any> {
    const startTime = Date.now();
    try {
      const result = await this.provider.fetchBallByBall(matchId);
      const responseTime = Date.now() - startTime;
      await this.logCall(`ball_by_ball/${matchId}`, "GET", null, 200, responseTime, undefined, matchId);
      return result;
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      await this.logCall(`ball_by_ball/${matchId}`, "GET", null, 500, responseTime, error.message, matchId);
      throw error;
    }
  }
}

// Rate limiter utility
export class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    // Check if we can make a new request
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    
    return false;
  }

  getWaitTime(): number {
    if (this.requests.length === 0) return 0;
    
    const oldestRequest = this.requests[0];
    const waitTime = this.windowMs - (Date.now() - oldestRequest);
    return Math.max(0, waitTime);
  }
}