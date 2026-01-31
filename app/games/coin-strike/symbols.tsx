"use client";

import Image from "next/image";

interface SymbolProps {
  className?: string;
  size?: number;
}

// Helper to determine if we should use fill mode
const useFillMode = (size: number, className: string) => 
  size === 0 || className.includes('w-full') || className.includes('h-full');

// Image-based symbols - fill container completely
export const CherrySymbol = ({ className = "", size = 64 }: SymbolProps) => (
  useFillMode(size, className) ? (
    <div className={`relative ${className}`}>
      <Image src="/symbols/cherry.png" alt="Cherry" fill className="object-contain" unoptimized />
    </div>
  ) : (
    <Image src="/symbols/cherry.png" alt="Cherry" width={size} height={size} className={`object-contain ${className}`} unoptimized />
  )
);

export const OrangeSymbol = ({ className = "", size = 64 }: SymbolProps) => (
  useFillMode(size, className) ? (
    <div className={`relative ${className}`}>
      <Image src="/symbols/orange.png" alt="Orange" fill className="object-contain" unoptimized />
    </div>
  ) : (
    <Image src="/symbols/orange.png" alt="Orange" width={size} height={size} className={`object-contain ${className}`} unoptimized />
  )
);

export const BellSymbol = ({ className = "", size = 64 }: SymbolProps) => (
  useFillMode(size, className) ? (
    <div className={`relative ${className}`}>
      <Image src="/symbols/bell.png" alt="Bell" fill className="object-contain" unoptimized />
    </div>
  ) : (
    <Image src="/symbols/bell.png" alt="Bell" width={size} height={size} className={`object-contain ${className}`} unoptimized />
  )
);

export const GrapesSymbol = ({ className = "", size = 64 }: SymbolProps) => (
  useFillMode(size, className) ? (
    <div className={`relative ${className}`}>
      <Image src="/symbols/grapes.png" alt="Grapes" fill className="object-contain" unoptimized />
    </div>
  ) : (
    <Image src="/symbols/grapes.png" alt="Grapes" width={size} height={size} className={`object-contain ${className}`} unoptimized />
  )
);

export const BarSymbol = ({ className = "", size = 64 }: SymbolProps) => (
  useFillMode(size, className) ? (
    <div className={`relative ${className}`}>
      <Image src="/symbols/gold-bar.png" alt="Gold Bar" fill className="object-contain" unoptimized />
    </div>
  ) : (
    <Image src="/symbols/gold-bar.png" alt="Gold Bar" width={size} height={size} className={`object-contain ${className}`} unoptimized />
  )
);

export const SevenSymbol = ({ className = "", size = 64 }: SymbolProps) => (
  useFillMode(size, className) ? (
    <div className={`relative ${className}`}>
      <Image src="/symbols/seven.png" alt="Lucky 7" fill className="object-contain" unoptimized />
    </div>
  ) : (
    <Image src="/symbols/seven.png" alt="Lucky 7" width={size} height={size} className={`object-contain ${className}`} unoptimized />
  )
);

export const GoldCoinSymbol = ({ className = "", size = 64 }: SymbolProps) => (
  useFillMode(size, className) ? (
    <div className={`relative ${className}`}>
      <Image src="/symbols/coin.png" alt="Gold Coin" fill className="object-contain" unoptimized />
    </div>
  ) : (
    <Image src="/symbols/coin.png" alt="Gold Coin" width={size} height={size} className={`object-contain ${className}`} unoptimized />
  )
);

export const WildSymbol = ({ className = "", size = 64 }: SymbolProps) => (
  useFillMode(size, className) ? (
    <div className={`relative ${className}`}>
      <Image src="/symbols/wild.png" alt="Wild" fill className="object-contain" unoptimized />
    </div>
  ) : (
    <Image src="/symbols/wild.png" alt="Wild" width={size} height={size} className={`object-contain ${className}`} unoptimized />
  )
);

export const SlotSymbol = ({ symbol, size = 64, className = "" }: { symbol: string; size?: number; className?: string }) => {
  const props = { size, className };
  
  switch (symbol) {
    case "🍒":
    case "cherry":
      return <CherrySymbol {...props} />;
    case "🍊":
    case "orange":
      return <OrangeSymbol {...props} />;
    case "🍇":
    case "grapes":
      return <GrapesSymbol {...props} />;
    case "🔔":
    case "bell":
      return <BellSymbol {...props} />;
    case "📊":
    case "bar":
      return <BarSymbol {...props} />;
    case "7️⃣":
    case "seven":
      return <SevenSymbol {...props} />;
    case "🪙":
    case "coin":
      return <GoldCoinSymbol {...props} />;
    case "⚡":
    case "wild":
      return <WildSymbol {...props} />;
    default:
      return <span className={className} style={{ fontSize: size * 0.8 }}>{symbol}</span>;
  }
};

export default SlotSymbol;
