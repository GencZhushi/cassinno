"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { AnimatedGameCard } from "@/components/AnimatedGameCard";
import { FloatingButtons } from "@/components/FloatingButtons";
import { useLanguage } from "@/lib/LanguageContext";

type GameTheme = "zeus" | "pharaoh" | "lightning" | "lucky" | "roulette" | "cards" | "fortune" | "stars" | "candy" | "dice" | "plinko" | "mines" | "fish" | "wolf" | "explorer" | "wheel" | "poker" | "chicken";

const casinoGames: Array<{
  id: string;
  nameKey: string;
  provider: string;
  isTop: boolean;
  href: string;
  theme: GameTheme;
  image?: string;
  category: "table" | "slots" | "instant";
}> = [
  { id: "gates-of-olympus", nameKey: "gatesOfOlympus", provider: "Pragmatic Play", isTop: true, href: "/games/gates-of-olympus", theme: "zeus", image: "/games/gates-of-olympus.png", category: "slots" },
  { id: "book-of-dead", nameKey: "bookOfDead", provider: "Play'n GO", isTop: true, href: "/games/book-of-dead", theme: "pharaoh", category: "slots" },
  { id: "coin-strike", nameKey: "coinStrike", provider: "Playson", isTop: true, href: "/games/coin-strike", theme: "lightning", image: "/games/coin-strike.png", category: "slots" },
  { id: "sweet-bonanza", nameKey: "sweetBonanza", provider: "Pragmatic Play", isTop: true, href: "/games/sweet-bonanza", theme: "candy", image: "/games/sweet-bonanza.png", category: "slots" },
  { id: "roulette", nameKey: "roulette", provider: "Evolution", isTop: true, href: "/games/roulette", theme: "roulette", image: "/games/roulette.png", category: "table" },
  { id: "blackjack", nameKey: "blackjack", provider: "Evolution", isTop: true, href: "/games/blackjack", theme: "cards", category: "table" },
  { id: "starburst", nameKey: "starburst", provider: "NetEnt", isTop: true, href: "/games/starburst", theme: "stars", category: "slots" },
  { id: "big-bass-bonanza", nameKey: "bigBassBonanza", provider: "Pragmatic Play", isTop: true, href: "/games/big-bass-bonanza", theme: "fish", category: "slots" },
  { id: "wolf-gold", nameKey: "wolfGold", provider: "Pragmatic Play", isTop: true, href: "/games/wolf-gold", theme: "wolf", category: "slots" },
  { id: "gonzos-quest-megaways", nameKey: "gonzosQuestMegaways", provider: "Red Tiger", isTop: true, href: "/games/gonzos-quest-megaways", theme: "explorer", category: "slots" },
  { id: "slots", nameKey: "slots", provider: "Classic", isTop: false, href: "/games/slots", theme: "fortune", category: "slots" },
  { id: "dice", nameKey: "dice", provider: "Evolution", isTop: false, href: "/games/dice", theme: "dice", category: "instant" },
  { id: "plinko", nameKey: "plinko", provider: "BGaming", isTop: false, href: "/games/plinko", theme: "plinko", category: "instant" },
  { id: "mines", nameKey: "mines", provider: "Spribe", isTop: false, href: "/games/mines", theme: "mines", category: "instant" },
  { id: "wheel", nameKey: "wheel", provider: "Evolution", isTop: false, href: "/games/wheel", theme: "wheel", category: "instant" },
  { id: "video-poker", nameKey: "videoPoker", provider: "Classic", isTop: false, href: "/games/video-poker", theme: "poker", category: "table" },
  { id: "chicken-road", nameKey: "chickenRoad", provider: "InOut Games", isTop: true, href: "/games/chicken-road", theme: "chicken", category: "instant" },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("slots");
  const { t } = useLanguage();

  const filteredGames = casinoGames.filter((game) => {
    if (activeTab === "slots") return true;
    if (activeTab === "new") return ["sweet-bonanza", "plinko", "mines", "dice", "gonzos-quest-megaways", "chicken-road"].includes(game.id);
    if (activeTab === "live") return game.category === "table";
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
