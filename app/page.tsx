"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { AnimatedGameCard } from "@/components/AnimatedGameCard";
import { FloatingButtons } from "@/components/FloatingButtons";
import { useLanguage } from "@/lib/LanguageContext";

type GameTheme = "zeus" | "pharaoh" | "lightning" | "lucky" | "roulette" | "cards" | "fortune" | "stars" | "candy" | "dice" | "plinko" | "mines";

const casinoGames: Array<{
  id: string;
  nameKey: string;
  provider: string;
  isTop: boolean;
  href: string;
  theme: GameTheme;
  image?: string;
}> = [
  { id: "gates-olympus", nameKey: "gatesOfOlympus", provider: "Pragmatic Play", isTop: true, href: "/games/slots", theme: "zeus" },
  { id: "book-of-ra", nameKey: "bookOfRa", provider: "Greentube", isTop: true, href: "/games/slots", theme: "pharaoh" },
  { id: "coin-strike", nameKey: "coinStrike", provider: "Playson", isTop: true, href: "/games/coin-strike", theme: "lightning", image: "/games/coin-strike.png" },
  { id: "lucky-lady", nameKey: "luckyLady", provider: "Greentube", isTop: true, href: "/games/slots", theme: "lucky" },
  { id: "roulette-live", nameKey: "liveRoulette", provider: "Evolution", isTop: true, href: "/games/roulette", theme: "roulette" },
  { id: "blackjack-vip", nameKey: "blackjackVip", provider: "Evolution", isTop: true, href: "/games/blackjack", theme: "cards" },
  { id: "mega-fortune", nameKey: "megaFortune", provider: "NetEnt", isTop: true, href: "/games/slots", theme: "fortune" },
  { id: "starburst", nameKey: "starburst", provider: "NetEnt", isTop: true, href: "/games/slots", theme: "stars" },
  { id: "sweet-bonanza", nameKey: "sweetBonanza", provider: "Pragmatic Play", isTop: true, href: "/games/slots", theme: "candy" },
  { id: "dice-game", nameKey: "lightningDice", provider: "Evolution", isTop: false, href: "/games/dice", theme: "dice" },
  { id: "plinko", nameKey: "plinko", provider: "BGaming", isTop: false, href: "/games/plinko", theme: "plinko" },
  { id: "mines", nameKey: "mines", provider: "Spribe", isTop: false, href: "/games/mines", theme: "mines" },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("slots");
  const { t } = useLanguage();

  const filteredGames = casinoGames.filter((game) => {
    if (activeTab === "slots") return true;
    if (activeTab === "new") return ["sweet-bonanza", "plinko", "mines", "dice-game"].includes(game.id);
    if (activeTab === "live") return ["roulette-live", "blackjack-vip", "dice-game"].includes(game.id);
    return true;
  });

  return (
    <main className="min-h-screen bg-black">
      <Header />
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Games Grid */}
      <section className="container mx-auto px-4 py-4 pb-24">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {filteredGames.map((game) => (
            <AnimatedGameCard
              key={game.id}
              id={game.id}
              name={t(game.nameKey as any)}
              provider={game.provider}
              isTop={game.isTop}
              href={game.href}
              theme={game.theme}
              image={game.image}
            />
          ))}
        </div>
      </section>

      <FloatingButtons />
    </main>
  );
}
