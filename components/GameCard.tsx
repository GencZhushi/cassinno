"use client";

import Link from "next/link";

interface GameCardProps {
  id: string;
  name: string;
  image: string;
  provider: string;
  isTop?: boolean;
  href: string;
}

export function GameCard({ id, name, image, provider, isTop = false, href }: GameCardProps) {
  return (
    <Link href={href} className="block group">
      <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-[3/4] transition-transform duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-red-500/20">
        {/* TOP Badge */}
        {isTop && (
          <div className="absolute top-2 left-2 z-10">
            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded">
              TOP
            </span>
          </div>
        )}

        {/* Game Image */}
        <img
          src={image}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Game Name */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-white text-sm font-semibold truncate drop-shadow-lg">
            {name}
          </h3>
          {/* Provider Logo/Name */}
          <div className="flex items-center mt-1">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">
              {provider}
            </span>
          </div>
        </div>

        {/* Hover Effect */}
        <div className="absolute inset-0 bg-red-600/0 group-hover:bg-red-600/10 transition-colors duration-300" />
      </div>
    </Link>
  );
}
