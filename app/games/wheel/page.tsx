"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ArrowLeft, Loader2, Sparkles, Trophy, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SEGMENTS = [
  { multiplier: 0, color: "#374151", gradient: ["#374151", "#1f2937"], label: "0x" },
  { multiplier: 1.2, color: "#2563eb", gradient: ["#3b82f6", "#1d4ed8"], label: "1.2x" },
  { multiplier: 1.5, color: "#16a34a", gradient: ["#22c55e", "#15803d"], label: "1.5x" },
  { multiplier: 2, color: "#ca8a04", gradient: ["#eab308", "#a16207"], label: "2x" },
  { multiplier: 0, color: "#374151", gradient: ["#374151", "#1f2937"], label: "0x" },
  { multiplier: 1.2, color: "#2563eb", gradient: ["#3b82f6", "#1d4ed8"], label: "1.2x" },
  { multiplier: 3, color: "#7c3aed", gradient: ["#8b5cf6", "#6d28d9"], label: "3x" },
  { multiplier: 0, color: "#374151", gradient: ["#374151", "#1f2937"], label: "0x" },
  { multiplier: 1.5, color: "#16a34a", gradient: ["#22c55e", "#15803d"], label: "1.5x" },
  { multiplier: 5, color: "#dc2626", gradient: ["#ef4444", "#b91c1c"], label: "5x" },
  { multiplier: 1.2, color: "#2563eb", gradient: ["#3b82f6", "#1d4ed8"], label: "1.2x" },
  { multiplier: 10, color: "#db2777", gradient: ["#ec4899", "#be185d"], label: "10x" },
];

const WheelSVG = ({ rotation, isSpinning }: { rotation: number; isSpinning: boolean }) => {
  const size = 320;
  const center = size / 2;
  const radius = size / 2 - 10;
  const segmentCount = SEGMENTS.length;
  const segmentAngle = 360 / segmentCount;

  const createSegmentPath = (index: number) => {
    const startAngle = (index * segmentAngle - 90) * (Math.PI / 180);
    const endAngle = ((index + 1) * segmentAngle - 90) * (Math.PI / 180);
    
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);
    
    return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
  };

  const getLabelPosition = (index: number) => {
    const angle = ((index + 0.5) * segmentAngle - 90) * (Math.PI / 180);
    const labelRadius = radius * 0.7;
    return {
      x: center + labelRadius * Math.cos(angle),
      y: center + labelRadius * Math.sin(angle),
      rotation: (index + 0.5) * segmentAngle,
    };
  };

  return (
    <div className="relative">
      {/* Outer glow ring */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          background: "conic-gradient(from 0deg, #fbbf24, #f59e0b, #d97706, #fbbf24)",
          filter: "blur(8px)",
          opacity: isSpinning ? 0.8 : 0.4,
          transition: "opacity 0.3s",
        }}
      />
      
      {/* Decorative lights around the wheel */}
      <div className="absolute inset-[-12px]">
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 15) * (Math.PI / 180);
          const x = (size / 2 + 12) + (size / 2 + 6) * Math.cos(angle);
          const y = (size / 2 + 12) + (size / 2 + 6) * Math.sin(angle);
          return (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                left: x - 6,
                top: y - 6,
                background: i % 2 === 0 ? "#fbbf24" : "#ffffff",
                boxShadow: `0 0 ${isSpinning ? "10px" : "6px"} ${i % 2 === 0 ? "#fbbf24" : "#ffffff"}`,
                animation: isSpinning ? `pulse 0.5s ease-in-out ${i * 0.05}s infinite alternate` : "none",
              }}
            />
          );
        })}
      </div>

      <svg
        width={size}
        height={size}
        className="relative z-10 drop-shadow-2xl"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: isSpinning ? "transform 4s cubic-bezier(0.2, 0.8, 0.3, 1)" : "none",
        }}
      >
        <defs>
          {SEGMENTS.map((seg, i) => (
            <linearGradient key={`grad-${i}`} id={`segment-gradient-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={seg.gradient[0]} />
              <stop offset="100%" stopColor={seg.gradient[1]} />
            </linearGradient>
          ))}
          <filter id="segment-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodOpacity="0.3" />
          </filter>
          <radialGradient id="center-gradient" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="50%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#ca8a04" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Outer ring */}
        <circle cx={center} cy={center} r={radius + 5} fill="none" stroke="url(#center-gradient)" strokeWidth="10" />

        {/* Segments */}
        {SEGMENTS.map((seg, i) => (
          <path
            key={i}
            d={createSegmentPath(i)}
            fill={`url(#segment-gradient-${i})`}
            stroke="#0a0a0a"
            strokeWidth="2"
            filter="url(#segment-shadow)"
          />
        ))}

        {/* Segment dividers with metallic look */}
        {SEGMENTS.map((_, i) => {
          const angle = (i * segmentAngle - 90) * (Math.PI / 180);
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          return (
            <line
              key={`divider-${i}`}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#fbbf24"
              strokeWidth="3"
              opacity="0.6"
            />
          );
        })}

        {/* Labels */}
        {SEGMENTS.map((seg, i) => {
          const pos = getLabelPosition(i);
          return (
            <text
              key={`label-${i}`}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize={seg.multiplier >= 5 ? "18" : "14"}
              fontWeight="bold"
              style={{
                textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
                transform: `rotate(${pos.rotation}deg)`,
                transformOrigin: `${pos.x}px ${pos.y}px`,
              }}
            >
              {seg.label}
            </text>
          );
        })}

        {/* Center hub */}
        <circle cx={center} cy={center} r="45" fill="url(#center-gradient)" filter="url(#glow)" />
        <circle cx={center} cy={center} r="38" fill="#1a1a2e" />
        <circle cx={center} cy={center} r="32" fill="url(#center-gradient)" />
        <text x={center} y={center + 5} textAnchor="middle" fontSize="24" fill="#1a1a2e">
          🎰
        </text>
      </svg>
    </div>
  );
};

export default function WheelPage() {
  const { toast } = useToast();
  const [balance, setBalance] = useState<number>(0);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [lastWin, setLastWin] = useState<number>(0);
  const [lastMultiplier, setLastMultiplier] = useState<number>(0);
  const [showWin, setShowWin] = useState(false);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const data = await res.json();
      setBalance(parseInt(data.balance));
    }
  };

  const spin = async () => {
    if (betAmount <= 0 || betAmount > balance) {
      toast({ title: "Invalid bet amount", variant: "destructive" });
      return;
    }

    setIsSpinning(true);
    setShowWin(false);
    setLastWin(0);

    try {
      const res = await fetch("/api/games/wheel/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: betAmount }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const segmentAngle = 360 / SEGMENTS.length;
      const targetRotation = 360 * 6 + (360 - (data.position * segmentAngle) - (segmentAngle / 2));
      setRotation(prev => prev + targetRotation);

      setTimeout(() => {
        setLastMultiplier(data.multiplier);
        setLastWin(parseInt(data.payout));
        setBalance(parseInt(data.newBalance));
        setIsSpinning(false);
        setShowWin(true);

        if (data.multiplier > 0) {
          toast({ title: `${data.multiplier}x - Won ${parseInt(data.payout).toLocaleString()}!`, variant: "success" });
        } else {
          toast({ title: "No win this time", variant: "destructive" });
        }
      }, 4000);
    } catch (error) {
      setIsSpinning(false);
      toast({ title: error instanceof Error ? error.message : "Spin failed", variant: "destructive" });
    }
  };

  return (
    <main className="min-h-screen pb-20 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <style jsx global>{`
        @keyframes pulse {
          from { transform: scale(1); opacity: 0.6; }
          to { transform: scale(1.2); opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes winGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(250, 204, 21, 0.4); }
          50% { box-shadow: 0 0 40px rgba(250, 204, 21, 0.8); }
        }
      `}</style>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/lobby">
            <Button variant="ghost" size="icon" className="hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/30">
            🎡
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">
              Wheel of Fortune
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Coins className="w-4 h-4 text-yellow-500" />
              Balance: <span className="text-yellow-400 font-semibold">{balance.toLocaleString()}</span> tokens
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Wheel Section */}
          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-xl overflow-hidden">
              <CardContent className="p-8 flex flex-col items-center relative">
                {/* Background decoration */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-amber-500 to-transparent rounded-full" />
                </div>

                {/* Pointer */}
                <div className="relative z-20 mb-4">
                  <div 
                    className="w-0 h-0 border-l-[20px] border-r-[20px] border-t-[35px] border-l-transparent border-r-transparent border-t-amber-400"
                    style={{
                      filter: "drop-shadow(0 4px 6px rgba(251, 191, 36, 0.5))",
                    }}
                  />
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full" />
                </div>
                
                {/* Wheel */}
                <div className="relative" style={{ animation: isSpinning ? "none" : "float 3s ease-in-out infinite" }}>
                  <WheelSVG rotation={rotation} isSpinning={isSpinning} />
                </div>

                {/* Result Display */}
                {showWin && !isSpinning && (
                  <div 
                    className="mt-8 text-center p-6 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700"
                    style={{ animation: lastMultiplier > 0 ? "winGlow 2s ease-in-out infinite" : "none" }}
                  >
                    {lastMultiplier > 0 ? (
                      <>
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Trophy className="w-8 h-8 text-yellow-400" />
                          <span className="text-5xl font-black bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300 bg-clip-text text-transparent">
                            {lastMultiplier}x
                          </span>
                          <Trophy className="w-8 h-8 text-yellow-400" />
                        </div>
                        <p className="text-3xl font-bold text-green-400 flex items-center justify-center gap-2">
                          <Sparkles className="w-6 h-6" />
                          +{lastWin.toLocaleString()} tokens
                          <Sparkles className="w-6 h-6" />
                        </p>
                      </>
                    ) : (
                      <p className="text-2xl text-slate-400">No win - Try again!</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-amber-300">
                  <Sparkles className="w-5 h-5" />
                  Spin Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Bet Amount</label>
                  <Input 
                    type="number" 
                    value={betAmount} 
                    onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)} 
                    min={1}
                    className="bg-slate-900/50 border-slate-700 text-lg font-semibold text-center"
                  />
                </div>
                
                <div className="grid grid-cols-5 gap-2">
                  {[10, 25, 50, 100, 250].map((amt) => (
                    <Button 
                      key={amt} 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setBetAmount(amt)}
                      className={`border-slate-600 hover:bg-amber-500/20 hover:border-amber-500/50 transition-all ${
                        betAmount === amt ? "bg-amber-500/20 border-amber-500" : ""
                      }`}
                    >
                      {amt}
                    </Button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setBetAmount(Math.floor(betAmount / 2))}
                    className="flex-1 border-slate-600 hover:bg-slate-700"
                  >
                    ½
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setBetAmount(betAmount * 2)}
                    className="flex-1 border-slate-600 hover:bg-slate-700"
                  >
                    2×
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setBetAmount(balance)}
                    className="flex-1 border-slate-600 hover:bg-slate-700"
                  >
                    MAX
                  </Button>
                </div>

                <Button 
                  onClick={spin} 
                  disabled={isSpinning || betAmount <= 0 || betAmount > balance} 
                  className="w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-600 hover:via-yellow-600 hover:to-amber-600 text-slate-900 text-xl font-bold py-7 shadow-lg shadow-amber-500/30 transition-all hover:shadow-amber-500/50 disabled:opacity-50"
                >
                  {isSpinning ? (
                    <Loader2 className="w-7 h-7 animate-spin" />
                  ) : (
                    <>🎡 SPIN THE WHEEL</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Multipliers Info */}
            <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-400">Prize Multipliers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { m: 0, color: "from-gray-600 to-gray-700", text: "text-gray-300" },
                    { m: 1.2, color: "from-blue-500 to-blue-700", text: "text-blue-300" },
                    { m: 1.5, color: "from-green-500 to-green-700", text: "text-green-300" },
                    { m: 2, color: "from-yellow-500 to-yellow-700", text: "text-yellow-300" },
                    { m: 3, color: "from-purple-500 to-purple-700", text: "text-purple-300" },
                    { m: 5, color: "from-red-500 to-red-700", text: "text-red-300" },
                    { m: 10, color: "from-pink-500 to-pink-700", text: "text-pink-300", span: true },
                  ].map((item) => (
                    <div 
                      key={item.m} 
                      className={`bg-gradient-to-br ${item.color} rounded-lg p-2 text-center ${item.span ? "col-span-2" : ""}`}
                    >
                      <span className={`font-bold ${item.text} ${item.m >= 5 ? "text-lg" : "text-sm"}`}>
                        {item.m}×
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
