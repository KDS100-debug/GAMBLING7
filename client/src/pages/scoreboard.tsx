import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Clock, Target, Users, TrendingUp, Radio } from "lucide-react";

interface Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
  logo: string;
}

interface MatchInnings {
  inning: number;
  team: string;
  runs: number;
  wickets: number;
  overs: string;
  runRate: number;
  requiredRunRate?: number;
}

interface LiveMatchData {
  matchId: string;
  teams: {
    home: Team;
    away: Team;
  };
  status: string;
  currentInnings: number;
  score: MatchInnings[];
  lastUpdated: string;
}

interface BallEvent {
  type: 'ball' | 'boundary' | 'wicket' | 'extra';
  over: number;
  ballInOver: number;
  batsman: string;
  bowler: string;
  runs: number;
  extras: number;
  wicket: boolean;
  commentary: string;
  scoreAfterBall: {
    team: string;
    runs: number;
    wickets: number;
    overs: string;
  };
  timestamp: string;
}

interface MatchDetails {
  match: any;
  innings: any[];
  recentBalls: BallEvent[];
  fallOfWickets: any[];
}

export default function ScoreboardPage() {
  const [liveData, setLiveData] = useState<LiveMatchData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastBallEvent, setLastBallEvent] = useState<BallEvent | null>(null);

  // Fetch initial match data
  const { data: matchDetails, isLoading } = useQuery<MatchDetails>({
    queryKey: ['/api/cricket/matches/ipl-2025-1234'],
    refetchInterval: 10000,
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      console.log('WebSocket connected for cricket');
      setIsConnected(true);
      
      ws.send(JSON.stringify({
        type: 'subscribe_match',
        matchId: 'ipl-2025-1234'
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'match_update') {
          setLiveData(data.data);
        } else if (data.type === 'ball_event') {
          setLastBallEvent(data.data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading live match...</div>
      </div>
    );
  }

  const currentMatch = liveData || {
    matchId: 'ipl-2025-1234',
    teams: {
      home: { id: 'MI', name: 'Mumbai Indians', shortName: 'MI', color: '#004ba0', logo: '/teams/mi.png' },
      away: { id: 'CSK', name: 'Chennai Super Kings', shortName: 'CSK', color: '#f9cd05', logo: '/teams/csk.png' }
    },
    status: 'live',
    currentInnings: 2,
    score: [
      { inning: 1, team: 'MI', runs: 187, wickets: 4, overs: '20.0', runRate: 9.35 },
      { inning: 2, team: 'CSK', runs: 134, wickets: 6, overs: '16.3', runRate: 8.18, requiredRunRate: 15.43 }
    ],
    lastUpdated: new Date().toISOString(),
  };

  const currentInnings = currentMatch.score[currentMatch.currentInnings - 1];
  const targetScore = currentMatch.currentInnings === 2 ? currentMatch.score[0].runs + 1 : null;
  const ballsRemaining = currentMatch.currentInnings === 2 ? 
    (20 * 6) - ((parseFloat(currentInnings.overs.split('.')[0]) * 6) + parseInt(currentInnings.overs.split('.')[1] || '0')) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">IPL 2025 • LIVE</h1>
                <p className="text-sm text-gray-300">Wankhede Stadium, Mumbai</p>
              </div>
              <div className="text-right">
                <a href="/" className="text-sm text-blue-400 hover:text-blue-300 underline">
                  ← Back to Games
                </a>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              <span className="text-sm">{isConnected ? 'LIVE' : 'OFFLINE'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Main Score Card */}
        <Card className="bg-black/40 backdrop-blur-sm border-white/20" data-testid="main-score-card">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Team Scores */}
              <div className="space-y-4">
                {currentMatch.score.map((innings, index) => {
                  const team = innings.team === 'MI' ? currentMatch.teams.home : currentMatch.teams.away;
                  const isCurrentInnings = index + 1 === currentMatch.currentInnings;
                  
                  return (
                    <div 
                      key={index}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        isCurrentInnings ? 'bg-white/10 border border-yellow-400' : 'bg-white/5'
                      }`}
                      data-testid={`team-score-${team.shortName}`}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{ backgroundColor: team.color }}
                        >
                          {team.shortName}
                        </div>
                        <div>
                          <div className="font-semibold">{team.name}</div>
                          <div className="text-sm text-gray-400">
                            {index === 0 ? '1st Innings' : '2nd Innings'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold" data-testid={`runs-${team.shortName}`}>
                          {innings.runs}/{innings.wickets}
                        </div>
                        <div className="text-sm text-gray-400" data-testid={`overs-${team.shortName}`}>
                          ({innings.overs} ov)
                        </div>
                        <div className="text-xs text-gray-500">
                          RR: {innings.runRate.toFixed(2)}
                          {innings.requiredRunRate && ` | RRR: ${innings.requiredRunRate}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Match Status */}
              <div className="space-y-4">
                {targetScore && ballsRemaining && (
                  <Card className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border-green-400/30">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-lg font-semibold">Target: {targetScore}</div>
                        <div className="text-sm text-gray-300">
                          Need {targetScore - currentInnings.runs} runs in {ballsRemaining} balls
                        </div>
                        <Progress 
                          value={(currentInnings.runs / targetScore) * 100} 
                          className="mt-2"
                          data-testid="target-progress"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4 text-center">
                      <Clock className="w-6 h-6 mx-auto mb-2 text-blue-400" />
                      <div className="text-sm text-gray-400">Current Over</div>
                      <div className="text-xl font-bold">{currentInnings.overs}</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4 text-center">
                      <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-400" />
                      <div className="text-sm text-gray-400">Run Rate</div>
                      <div className="text-xl font-bold">{currentInnings.runRate.toFixed(2)}</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Latest Ball Event */}
        {lastBallEvent && (
          <Card className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-400/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300 border-yellow-400/30">
                  LATEST
                </Badge>
                <span className="text-sm text-gray-300">
                  {lastBallEvent.over}.{lastBallEvent.ballInOver}
                </span>
                <span className="font-semibold">{lastBallEvent.commentary}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Tabs */}
        <Tabs defaultValue="commentary" className="space-y-4">
          <TabsList className="bg-black/40 border-white/20">
            <TabsTrigger value="commentary" data-testid="tab-commentary">Commentary</TabsTrigger>
            <TabsTrigger value="scorecard" data-testid="tab-scorecard">Scorecard</TabsTrigger>
            <TabsTrigger value="stats" data-testid="tab-stats">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="commentary">
            <Card className="bg-black/40 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-green-400" />
                  Live Commentary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CommentarySection matchId={currentMatch.matchId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scorecard">
            <Card className="bg-black/40 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle>Detailed Scorecard</CardTitle>
              </CardHeader>
              <CardContent>
                <ScorecardSection matchDetails={matchDetails} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats">
            <Card className="bg-black/40 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle>Match Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <StatsSection currentMatch={currentMatch} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CommentarySection({ matchId }: { matchId: string }) {
  const { data: commentary } = useQuery({
    queryKey: [`/api/cricket/matches/${matchId}/commentary`],
    refetchInterval: 5000,
  });

  if (!commentary) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="flex gap-3">
              <div className="w-16 h-4 bg-white/10 rounded" />
              <div className="flex-1 h-4 bg-white/10 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      {Array.isArray(commentary) ? commentary.slice(0, 20).map((ball: any, index: number) => (
        <div key={index} className="border-l-2 border-gray-600 pl-4 pb-3">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <span className="font-semibold">
              {ball.overNumber}.{ball.ballNumber}
            </span>
            <Badge variant="outline" className="text-xs">
              {ball.runs} run{ball.runs !== 1 ? 's' : ''}
            </Badge>
            {ball.isWicket && (
              <Badge variant="destructive" className="text-xs">
                WICKET
              </Badge>
            )}
          </div>
          <p className="text-white">{ball.commentary}</p>
          <div className="text-xs text-gray-500 mt-1">
            {ball.scoreAfterBall?.runs}/{ball.scoreAfterBall?.wickets} ({ball.scoreAfterBall?.overs} ov)
          </div>
        </div>
      )) : (
        <div className="text-center text-gray-400">No commentary available</div>
      )}
    </div>
  );
}

function ScorecardSection({ matchDetails }: { matchDetails: MatchDetails | undefined }) {
  if (!matchDetails) {
    return <div className="text-center text-gray-400">Loading scorecard...</div>;
  }

  return (
    <div className="space-y-6">
      {matchDetails.innings.map((innings: any, index: number) => (
        <div key={index}>
          <h3 className="text-lg font-semibold mb-3">
            {index === 0 ? 'First' : 'Second'} Innings - {innings.battingTeamId}
          </h3>
          <div className="bg-white/5 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{innings.runs || 0}</div>
                <div className="text-sm text-gray-400">Runs</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{innings.wickets || 0}</div>
                <div className="text-sm text-gray-400">Wickets</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{innings.overs || '0.0'}</div>
                <div className="text-sm text-gray-400">Overs</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{innings.runRate || '0.00'}</div>
                <div className="text-sm text-gray-400">Run Rate</div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatsSection({ currentMatch }: { currentMatch: LiveMatchData }) {
  const currentInnings = currentMatch.score[currentMatch.currentInnings - 1];
  const powerplayOvers = 6;
  const currentOver = parseFloat(currentInnings.overs.split('.')[0]);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Innings Breakdown</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Powerplay (1-6 overs)</span>
            <span className="font-semibold">
              {currentOver <= powerplayOvers ? `${currentInnings.runs} runs` : 'Completed'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Middle Overs (7-15)</span>
            <span className="font-semibold">
              {currentOver > powerplayOvers && currentOver <= 15 ? 'In Progress' : 
               currentOver > 15 ? 'Completed' : 'Upcoming'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Death Overs (16-20)</span>
            <span className="font-semibold">
              {currentOver > 15 ? 'In Progress' : 'Upcoming'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Required Rate</h3>
        {currentMatch.currentInnings === 2 && (
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Current Run Rate</span>
              <span className="font-semibold">{currentInnings.runRate.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Required Run Rate</span>
              <span className="font-semibold text-yellow-400">
                {currentInnings.requiredRunRate || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Equation</span>
              <span className="font-semibold text-green-400">
                {(currentMatch.score[0].runs + 1) - currentInnings.runs} runs needed
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}