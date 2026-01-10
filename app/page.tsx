import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Dice1, CircleDot, Spade, Grid3X3, TriangleRight, CircleDashed, PlayCircle } from "lucide-react";

const games = [
  { name: "Roulette", icon: CircleDot, href: "/games/roulette", color: "from-red-500 to-red-700" },
  { name: "Blackjack", icon: Spade, href: "/games/blackjack", color: "from-green-500 to-green-700" },
  { name: "Slots", icon: Grid3X3, href: "/games/slots", color: "from-purple-500 to-purple-700" },
  { name: "Dice", icon: Dice1, href: "/games/dice", color: "from-blue-500 to-blue-700" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 via-transparent to-transparent" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-40 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        
        <div className="relative container mx-auto px-4 py-24 text-center">
          <div className="flex justify-center mb-6">
            <Sparkles className="w-16 h-16 text-yellow-400 animate-float" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="text-gradient">Casino Royale</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-2xl mx-auto">
            Experience the thrill of casino games with virtual tokens
          </p>
          <p className="text-sm text-yellow-500/80 mb-8">
            🎲 Play-money only • No real gambling • For entertainment only 🎲
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/lobby">
              <Button size="xl" variant="casino" className="gap-2">
                <PlayCircle className="w-5 h-5" />
                Play Now
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button size="xl" variant="outline" className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Games */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">
          <span className="text-gradient">Featured Games</span>
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {games.map((game) => (
            <Link key={game.name} href={game.href}>
              <Card className="glass hover:border-yellow-500/50 transition-all duration-300 group cursor-pointer overflow-hidden">
                <CardContent className="p-6">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <game.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{game.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Play {game.name.toLowerCase()} with virtual tokens
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        
        <div className="text-center mt-8">
          <Link href="/lobby">
            <Button variant="outline" className="border-yellow-500/50 text-yellow-500">
              View All Games →
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="glass text-center p-6">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Provably Fair</h3>
            <p className="text-sm text-muted-foreground">
              Verify every game outcome with our transparent RNG system
            </p>
          </Card>
          
          <Card className="glass text-center p-6">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
              <CircleDashed className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Free Tokens Daily</h3>
            <p className="text-sm text-muted-foreground">
              Claim free tokens every day from our faucet
            </p>
          </Card>
          
          <Card className="glass text-center p-6">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <TriangleRight className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">8+ Games</h3>
            <p className="text-sm text-muted-foreground">
              Roulette, Blackjack, Slots, Dice, Mines, Plinko & more
            </p>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16">
        <Card className="glass border-yellow-500/30 overflow-hidden">
          <CardContent className="p-8 md:p-12 text-center relative">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-yellow-500/5" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4 relative">
              Ready to Play?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto relative">
              Create your free account and receive 10,000 tokens to start playing instantly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center relative">
              <Link href="/auth/register">
                <Button size="lg" variant="casino">
                  Get Started Free
                </Button>
              </Link>
              <Link href="/responsible-gaming">
                <Button size="lg" variant="ghost" className="text-muted-foreground">
                  Responsible Gaming
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
