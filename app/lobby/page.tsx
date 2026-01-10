import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CircleDot, Spade, Grid3X3, Dice1, Bomb, TriangleRight, CircleDashed, PlayCircle, Candy, Zap, BookOpen, Fish, Moon, Star, Mountain } from "lucide-react";
import { GAME_INFO } from "@/lib/games";

const gameIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  ROULETTE: CircleDot,
  BLACKJACK: Spade,
  SLOTS: Grid3X3,
  DICE: Dice1,
  MINES: Bomb,
  PLINKO: TriangleRight,
  WHEEL: CircleDashed,
  VIDEO_POKER: PlayCircle,
  SWEET_BONANZA: Candy,
  GATES_OF_OLYMPUS: Zap,
  BOOK_OF_DEAD: BookOpen,
  BIG_BASS_BONANZA: Fish,
  WOLF_GOLD: Moon,
  STARBURST: Star,
  GONZOS_QUEST_MEGAWAYS: Mountain,
};

const gameColors: Record<string, string> = {
  ROULETTE: "from-red-500 to-red-700",
  BLACKJACK: "from-green-500 to-green-700",
  SLOTS: "from-purple-500 to-purple-700",
  DICE: "from-blue-500 to-blue-700",
  MINES: "from-orange-500 to-orange-700",
  PLINKO: "from-pink-500 to-pink-700",
  WHEEL: "from-yellow-500 to-yellow-700",
  VIDEO_POKER: "from-indigo-500 to-indigo-700",
  SWEET_BONANZA: "from-pink-500 via-purple-500 to-cyan-500",
  GATES_OF_OLYMPUS: "from-amber-500 via-yellow-500 to-orange-500",
  BOOK_OF_DEAD: "from-amber-600 via-yellow-600 to-amber-800",
  BIG_BASS_BONANZA: "from-cyan-500 via-blue-500 to-sky-600",
  WOLF_GOLD: "from-indigo-600 via-purple-600 to-amber-600",
  STARBURST: "from-purple-500 via-pink-500 to-cyan-400",
  GONZOS_QUEST_MEGAWAYS: "from-emerald-600 via-green-600 to-amber-600",
};

export default function LobbyPage() {
  const games = Object.entries(GAME_INFO);

  return (
    <main className="min-h-screen pb-20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gradient mb-2">Game Lobby</h1>
            <p className="text-muted-foreground">Choose your game and start playing</p>
          </div>
          <div className="flex gap-2">
            <Link href="/wallet">
              <Button variant="outline" className="border-yellow-500/50 text-yellow-500">
                Wallet
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="ghost">Profile</Button>
            </Link>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          <Button variant="secondary" size="sm">All Games</Button>
          <Button variant="ghost" size="sm">Table Games</Button>
          <Button variant="ghost" size="sm">Slots</Button>
          <Button variant="ghost" size="sm">Instant Win</Button>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {games.map(([key, game]) => {
            const Icon = gameIcons[key] || CircleDot;
            const colorClass = gameColors[key] || "from-gray-500 to-gray-700";
            const href = `/games/${key.toLowerCase().replace(/_/g, "-")}`;

            return (
              <Link key={key} href={href}>
                <Card className="glass hover:border-yellow-500/50 transition-all duration-300 group cursor-pointer overflow-hidden h-full">
                  <CardContent className="p-6">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{game.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{game.description}</p>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>RTP: {(game.rtp * 100).toFixed(1)}%</span>
                      <span>Min: {game.minBet}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Responsible Gaming Notice */}
        <Card className="glass mt-12 border-yellow-500/20">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              🎲 Remember: This is play-money only. No real gambling.{" "}
              <Link href="/responsible-gaming" className="text-yellow-500 hover:underline">
                Learn about responsible gaming
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
