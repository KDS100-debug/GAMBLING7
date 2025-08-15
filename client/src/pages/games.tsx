import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/navigation";
import GameCard from "@/components/game-card";
import { Trophy, Radio, Play, Users, Clock, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export default function Games() {
  const [liveMatchData, setLiveMatchData] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch live cricket data for the game card
  const { data: matchDetails } = useQuery({
    queryKey: ['/api/cricket/matches/ipl-2025-1234'],
    refetchInterval: 10000,
  });

  // WebSocket for live cricket updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
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
          setLiveMatchData(data.data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  const currentMatch = liveMatchData || {
    teams: {
      home: { shortName: 'MI', name: 'Mumbai Indians', color: '#004ba0' },
      away: { shortName: 'CSK', name: 'Chennai Super Kings', color: '#f9cd05' }
    },
    score: [
      { runs: 187, wickets: 4, overs: '20.0' },
      { runs: 134, wickets: 6, overs: '16.3' }
    ],
    currentInnings: 2
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark via-surface to-dark">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white">Game Lobby 🎯</h1>
          <p className="text-gray-400">Choose your game and test your luck!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Featured Game: IPL Cricket Scoreboard */}
          <Card className="bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 border-white/20 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              <Badge variant="secondary" className="bg-red-500/20 text-red-300 border-red-400/30">
                <Radio className="w-3 h-3 mr-1" />
                LIVE
              </Badge>
            </div>
            
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white">
                <Trophy className="w-6 h-6 text-yellow-400" />
                IPL 2025 Live Cricket
              </CardTitle>
              <p className="text-gray-300 text-sm">Real-time cricket scoreboard with live match updates</p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Live Match Display */}
              <div className="bg-black/30 rounded-lg p-4">
                <div className="text-xs text-gray-400 mb-2">CURRENT MATCH</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: currentMatch.teams.home.color }}
                      >
                        {currentMatch.teams.home.shortName}
                      </div>
                      <span className="text-white text-sm font-semibold">
                        {currentMatch.score[0]?.runs}/{currentMatch.score[0]?.wickets}
                      </span>
                      <span className="text-gray-400 text-xs">({currentMatch.score[0]?.overs})</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: currentMatch.teams.away.color }}
                      >
                        {currentMatch.teams.away.shortName}
                      </div>
                      <span className="text-white text-sm font-semibold">
                        {currentMatch.score[1]?.runs}/{currentMatch.score[1]?.wickets}
                      </span>
                      <span className="text-gray-400 text-xs">({currentMatch.score[1]?.overs})</span>
                    </div>
                  </div>
                </div>
                <div className="text-center mt-3 text-yellow-400 text-xs font-semibold">
                  {currentMatch.currentInnings === 2 ? 'Second Innings • LIVE' : 'First Innings'}
                </div>
              </div>

              {/* Features */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/5 rounded-lg p-3">
                  <Users className="w-4 h-4 mx-auto mb-1 text-blue-400" />
                  <div className="text-xs text-gray-400">Live</div>
                  <div className="text-sm font-bold text-white">Match</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <Clock className="w-4 h-4 mx-auto mb-1 text-green-400" />
                  <div className="text-xs text-gray-400">Ball by</div>
                  <div className="text-sm font-bold text-white">Ball</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <TrendingUp className="w-4 h-4 mx-auto mb-1 text-yellow-400" />
                  <div className="text-xs text-gray-400">Live</div>
                  <div className="text-sm font-bold text-white">Stats</div>
                </div>
              </div>

              <Link href="/scoreboard">
                <Button 
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold"
                  data-testid="button-watch-live"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Watch Live Match
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Game 1: Six-Color Challenge */}
          <GameCard
            title="Six-Color Challenge"
            description="Pick up to 3 colors and win if the random color matches your selection!"
            preview={
              <div className="h-48 bg-gradient-to-br from-primary via-secondary to-accent p-6 relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-black bg-opacity-50 rounded-full px-3 py-1 text-sm font-semibold text-white">
                  Live
                </div>
                <div className="flex flex-wrap gap-2 mt-8">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-lg"></div>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg"></div>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg"></div>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 shadow-lg"></div>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 shadow-lg"></div>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 shadow-lg"></div>
                </div>
                <h3 className="text-2xl font-bold text-white mt-4">Six-Color Challenge</h3>
              </div>
            }
            rules={[
              { label: "1 Color:", reward: "20 → 40 Points" },
              { label: "2 Colors:", reward: "30 → 60 Points" },
              { label: "3 Colors:", reward: "45 → 90 Points" },
            ]}
            href="/color-game"
            buttonText="Play Now"
            buttonGradient="from-primary to-secondary"
          />

          {/* Game 2: Aviator */}
          <GameCard
            title="Aviator"
            description="Watch the multiplier rise and cash out before the plane flies away!"
            preview={
              <div className="h-48 bg-gradient-to-br from-blue-900 via-blue-700 to-cyan-500 p-6 relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-black bg-opacity-50 rounded-full px-3 py-1 text-sm font-semibold text-white">
                  Live
                </div>
                <div className="absolute bottom-8 left-8">
                  <div className="text-4xl text-white opacity-80 transform rotate-12">✈️</div>
                </div>
                <div className="absolute top-8 right-16 text-3xl font-bold text-white animate-pulse">
                  2.45x
                </div>
                <h3 className="text-2xl font-bold text-white mt-16">Aviator</h3>
                <p className="text-blue-200 text-sm">Cash out before you crash out!</p>
              </div>
            }
            rules={[
              { label: "Min Bet:", reward: "10 Points" },
              { label: "Max Multiplier:", reward: "∞" },
              { label: "House Edge:", reward: "3%" },
            ]}
            href="/aviator-game"
            buttonText="Take Flight"
            buttonGradient="from-secondary to-primary"
          />
        </div>

        {/* Additional Features Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6 text-white">More Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-surface/80 border-surface-light backdrop-blur-sm hover:bg-surface/90 transition-colors cursor-pointer">
              <CardContent className="p-6 text-center">
                <Trophy className="w-8 h-8 mx-auto mb-3 text-yellow-400" />
                <h3 className="font-semibold mb-2 text-white">Live Sports</h3>
                <p className="text-sm text-gray-400">Real-time cricket scores and commentary</p>
              </CardContent>
            </Card>
            
            <Card className="bg-surface/80 border-surface-light backdrop-blur-sm hover:bg-surface/90 transition-colors cursor-pointer">
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 mx-auto mb-3 text-blue-400" />
                <h3 className="font-semibold mb-2 text-white">Multiplayer</h3>
                <p className="text-sm text-gray-400">Play with friends in real-time</p>
              </CardContent>
            </Card>
            
            <Card className="bg-surface/80 border-surface-light backdrop-blur-sm hover:bg-surface/90 transition-colors cursor-pointer">
              <CardContent className="p-6 text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-3 text-green-400" />
                <h3 className="font-semibold mb-2 text-white">Statistics</h3>
                <p className="text-sm text-gray-400">Track your gaming performance</p>
              </CardContent>
            </Card>
            
            <Card className="bg-surface/80 border-surface-light backdrop-blur-sm hover:bg-surface/90 transition-colors cursor-pointer">
              <CardContent className="p-6 text-center">
                <Clock className="w-8 h-8 mx-auto mb-3 text-purple-400" />
                <h3 className="font-semibold mb-2 text-white">24/7 Gaming</h3>
                <p className="text-sm text-gray-400">Games available around the clock</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}