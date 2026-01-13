"use client";

import Link from "next/link";

interface AnimatedGameCardProps {
  id: string;
  name: string;
  provider: string;
  isTop?: boolean;
  href: string;
  theme: "zeus" | "pharaoh" | "lightning" | "lucky" | "roulette" | "cards" | "fortune" | "stars" | "candy" | "dice" | "plinko" | "mines";
}

const themeStyles: Record<string, { gradient: string; icon: string; accent: string }> = {
  zeus: {
    gradient: "from-blue-600 via-purple-600 to-yellow-500",
    icon: "⚡",
    accent: "bg-yellow-400",
  },
  pharaoh: {
    gradient: "from-amber-700 via-yellow-600 to-orange-500",
    icon: "📜",
    accent: "bg-amber-400",
  },
  lightning: {
    gradient: "from-red-600 via-orange-500 to-yellow-400",
    icon: "⚡",
    accent: "bg-yellow-300",
  },
  lucky: {
    gradient: "from-pink-500 via-rose-400 to-pink-300",
    icon: "🍀",
    accent: "bg-pink-300",
  },
  roulette: {
    gradient: "from-green-700 via-emerald-600 to-green-500",
    icon: "🎰",
    accent: "bg-green-400",
  },
  cards: {
    gradient: "from-emerald-800 via-green-700 to-teal-600",
    icon: "🃏",
    accent: "bg-emerald-400",
  },
  fortune: {
    gradient: "from-indigo-700 via-purple-600 to-pink-500",
    icon: "💎",
    accent: "bg-purple-400",
  },
  stars: {
    gradient: "from-violet-600 via-purple-500 to-fuchsia-500",
    icon: "⭐",
    accent: "bg-fuchsia-400",
  },
  candy: {
    gradient: "from-pink-400 via-rose-300 to-orange-300",
    icon: "🍬",
    accent: "bg-pink-300",
  },
  dice: {
    gradient: "from-slate-700 via-gray-600 to-zinc-500",
    icon: "🎲",
    accent: "bg-gray-400",
  },
  plinko: {
    gradient: "from-cyan-500 via-blue-500 to-indigo-600",
    icon: "⚪",
    accent: "bg-cyan-400",
  },
  mines: {
    gradient: "from-gray-800 via-slate-700 to-zinc-600",
    icon: "💣",
    accent: "bg-red-500",
  },
};

export function AnimatedGameCard({ id, name, provider, isTop = false, href, theme }: AnimatedGameCardProps) {
  const style = themeStyles[theme] || themeStyles.zeus;

  return (
    <Link href={href} className="block group">
      <div className="relative rounded-xl overflow-hidden aspect-[3/4] transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-red-500/30">
        {/* Animated Background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} animate-gradient`}>
          {/* Sparkle Effects */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="sparkle sparkle-1" />
            <div className="sparkle sparkle-2" />
            <div className="sparkle sparkle-3" />
            <div className="sparkle sparkle-4" />
          </div>
          
          {/* Animated Shapes */}
          <div className="absolute inset-0">
            <div className={`absolute top-4 right-4 w-16 h-16 ${style.accent} rounded-full opacity-30 animate-pulse`} />
            <div className={`absolute bottom-20 left-4 w-12 h-12 ${style.accent} rounded-full opacity-20 animate-bounce`} />
            <div className={`absolute top-1/3 left-1/2 w-8 h-8 ${style.accent} rotate-45 opacity-25 animate-spin-slow`} />
          </div>

          {/* Central Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl animate-float drop-shadow-2xl">{style.icon}</span>
          </div>

          {/* Shine Effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 animate-shine" />
        </div>

        {/* TOP Badge */}
        {isTop && (
          <div className="absolute top-2 left-2 z-10">
            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg">
              TOP
            </span>
          </div>
        )}

        {/* Bottom Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {/* Game Info */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-white text-sm font-bold truncate drop-shadow-lg">
            {name}
          </h3>
          <div className="flex items-center mt-1">
            <span className="text-[10px] text-gray-300 uppercase tracking-wide bg-black/40 px-1.5 py-0.5 rounded">
              {provider}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
