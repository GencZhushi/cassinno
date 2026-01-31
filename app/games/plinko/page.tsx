"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Matter from "matter-js";

const RISK_LEVELS = ["low", "medium", "high"] as const;
const ROWS = 12;

const MULTIPLIERS: Record<string, number[]> = {
  low: [5.6, 2.1, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 2.1, 5.6],
  medium: [13, 3, 1.3, 0.7, 0.4, 0.3, 0.4, 0.7, 1.3, 3, 13],
  high: [110, 41, 10, 5, 2, 0.2, 2, 5, 10, 41, 110],
};

const MULTIPLIER_COLORS: Record<string, string[]> = {
  low: ["#16a34a", "#22c55e", "#4ade80", "#86efac", "#bbf7d0", "#fecaca", "#bbf7d0", "#86efac", "#4ade80", "#22c55e", "#16a34a"],
  medium: ["#dc2626", "#ef4444", "#f97316", "#eab308", "#a3e635", "#fecaca", "#a3e635", "#eab308", "#f97316", "#ef4444", "#dc2626"],
  high: ["#7c3aed", "#8b5cf6", "#a855f7", "#c084fc", "#d8b4fe", "#fecaca", "#d8b4fe", "#c084fc", "#a855f7", "#8b5cf6", "#7c3aed"],
};

const BOARD_WIDTH = 700;
const BOARD_HEIGHT = 600;
const PEG_RADIUS = 6;
const BALL_RADIUS = 10;
const BUCKET_HEIGHT = 50;

interface ActiveBall {
  id: string;
  body: Matter.Body;
  multiplier: number;
  payout: number;
  landed: boolean;
}

interface BallResult {
  id: string;
  bucket: number;
  multiplier: number;
  payout: number;
  timestamp: number;
}

export default function PlinkoPage() {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const activeBallsRef = useRef<Map<string, ActiveBall>>(new Map());
  const animationFrameRef = useRef<number | null>(null);

  const [balance, setBalance] = useState<number>(0);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [risk, setRisk] = useState<"low" | "medium" | "high">("medium");
  const [isDropping, setIsDropping] = useState(false);
  const [activeBallCount, setActiveBallCount] = useState(0);
  const [recentResults, setRecentResults] = useState<BallResult[]>([]);
  const [totalWinSession, setTotalWinSession] = useState<number>(0);
  const [gameInitialized, setGameInitialized] = useState(false);

  const multipliers = MULTIPLIERS[risk];
  const colors = MULTIPLIER_COLORS[risk];

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

  const initPhysics = useCallback(() => {
    if (!canvasRef.current || engineRef.current) return;

    const Engine = Matter.Engine;
    const Render = Matter.Render;
    const Runner = Matter.Runner;
    const Bodies = Matter.Bodies;
    const Composite = Matter.Composite;

    const engine = Engine.create({
      gravity: { x: 0, y: 1.2 },
    });

    const render = Render.create({
      canvas: canvasRef.current,
      engine: engine,
      options: {
        width: BOARD_WIDTH,
        height: BOARD_HEIGHT,
        wireframes: false,
        background: "transparent",
      },
    });

    engineRef.current = engine;
    renderRef.current = render;

    const pegs: Matter.Body[] = [];
    const startY = 60;
    const pegSpacingX = 50;
    const pegSpacingY = 40;

    for (let row = 0; row < ROWS; row++) {
      const pegsInRow = row + 3;
      const rowWidth = (pegsInRow - 1) * pegSpacingX;
      const startX = (BOARD_WIDTH - rowWidth) / 2;

      for (let col = 0; col < pegsInRow; col++) {
        const x = startX + col * pegSpacingX;
        const y = startY + row * pegSpacingY;

        const peg = Bodies.circle(x, y, PEG_RADIUS, {
          isStatic: true,
          restitution: 0.5,
          friction: 0.1,
          render: {
            fillStyle: "#ffffff",
          },
          label: "peg",
        });
        pegs.push(peg);
      }
    }

    const walls = [
      Bodies.rectangle(-10, BOARD_HEIGHT / 2, 20, BOARD_HEIGHT, { isStatic: true, render: { fillStyle: "#1f2937" } }),
      Bodies.rectangle(BOARD_WIDTH + 10, BOARD_HEIGHT / 2, 20, BOARD_HEIGHT, { isStatic: true, render: { fillStyle: "#1f2937" } }),
    ];

    const buckets: Matter.Body[] = [];
    const numBuckets = multipliers.length;
    const bucketWidth = (BOARD_WIDTH - 40) / numBuckets;
    const bucketY = BOARD_HEIGHT - BUCKET_HEIGHT / 2;

    for (let i = 0; i <= numBuckets; i++) {
      const x = 20 + i * bucketWidth;
      const divider = Bodies.rectangle(x, bucketY, 4, BUCKET_HEIGHT, {
        isStatic: true,
        render: { fillStyle: "#374151" },
        label: "divider",
      });
      buckets.push(divider);
    }

    const floor = Bodies.rectangle(BOARD_WIDTH / 2, BOARD_HEIGHT + 25, BOARD_WIDTH, 50, {
      isStatic: true,
      render: { fillStyle: "#1f2937" },
      label: "floor",
    });

    Composite.add(engine.world, [...pegs, ...walls, ...buckets, floor]);

    Render.run(render);

    const runner = Runner.create();
    Runner.run(runner, engine);
    runnerRef.current = runner;

    setGameInitialized(true);
  }, [multipliers.length]);

  useEffect(() => {
    initPhysics();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (renderRef.current) {
        Matter.Render.stop(renderRef.current);
      }
      if (runnerRef.current) {
        Matter.Runner.stop(runnerRef.current);
      }
      if (engineRef.current) {
        Matter.Engine.clear(engineRef.current);
      }
      engineRef.current = null;
      renderRef.current = null;
      runnerRef.current = null;
    };
  }, [initPhysics]);

  const checkAllBalls = useCallback(() => {
    if (!engineRef.current) return;


    activeBallsRef.current.forEach((activeBall, ballId) => {
      if (activeBall.landed) return;

      const { body } = activeBall;
      const ballY = body.position.y;
      const ballX = body.position.x;
      const velocity = body.velocity;
      const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

      if (ballY > BOARD_HEIGHT - BUCKET_HEIGHT - BALL_RADIUS && speed < 1) {
        const numBuckets = multipliers.length;
        const bucketWidth = (BOARD_WIDTH - 40) / numBuckets;
        const bucketIndex = Math.floor((ballX - 20) / bucketWidth);
        const clampedBucket = Math.max(0, Math.min(numBuckets - 1, bucketIndex));

        activeBall.landed = true;

        const result: BallResult = {
          id: ballId,
          bucket: clampedBucket,
          multiplier: activeBall.multiplier,
          payout: activeBall.payout,
          timestamp: Date.now(),
        };

        setRecentResults(prev => [result, ...prev].slice(0, 10));
        setTotalWinSession(prev => prev + activeBall.payout);

        if (activeBall.multiplier >= 1) {
          toast({ title: `${activeBall.multiplier}x - Won ${activeBall.payout.toLocaleString()}!`, variant: "success" });
        }

        setTimeout(() => {
          if (engineRef.current && activeBallsRef.current.has(ballId)) {
            const ball = activeBallsRef.current.get(ballId);
            if (ball) {
              Matter.Composite.remove(engineRef.current.world, ball.body);
              activeBallsRef.current.delete(ballId);
              setActiveBallCount(activeBallsRef.current.size);
            }
          }
        }, 1500);
      }
    });

    if (activeBallsRef.current.size > 0) {
      animationFrameRef.current = requestAnimationFrame(checkAllBalls);
    }
  }, [multipliers.length, toast]);

  useEffect(() => {
    if (activeBallCount > 0 && !animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(checkAllBalls);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [activeBallCount, checkAllBalls]);

  const dropBall = async () => {
    if (betAmount <= 0 || betAmount > balance) {
      toast({ title: "Invalid bet amount", variant: "destructive" });
      return;
    }

    if (!engineRef.current) {
      toast({ title: "Game not ready", variant: "destructive" });
      return;
    }

    setIsDropping(true);

    try {
      const res = await fetch("/api/games/plinko/drop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: betAmount, risk }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setBalance(parseInt(data.newBalance));

      const ballId = `ball_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const startX = BOARD_WIDTH / 2 + (Math.random() - 0.5) * 30;
      
      const ballColors = ["#fbbf24", "#f97316", "#ef4444", "#a855f7", "#3b82f6", "#22c55e"];
      const randomColor = ballColors[Math.floor(Math.random() * ballColors.length)];

      const ball = Matter.Bodies.circle(startX, 15, BALL_RADIUS, {
        restitution: 0.6,
        friction: 0.1,
        frictionAir: 0.01,
        density: 0.002,
        render: {
          fillStyle: randomColor,
        },
        label: ballId,
      });

      const activeBall: ActiveBall = {
        id: ballId,
        body: ball,
        multiplier: data.multiplier,
        payout: parseInt(data.payout),
        landed: false,
      };

      activeBallsRef.current.set(ballId, activeBall);
      Matter.Composite.add(engineRef.current.world, ball);
      setActiveBallCount(activeBallsRef.current.size);

      if (!animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(checkAllBalls);
      }

    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Drop failed", variant: "destructive" });
    } finally {
      setIsDropping(false);
    }
  };

  return (
    <main className="min-h-screen pb-20">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center text-2xl">📍</div>
          <div>
            <h1 className="text-3xl font-bold">Plinko</h1>
            <p className="text-muted-foreground">Balance: {balance.toLocaleString()} tokens</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <Card className="glass xl:col-span-3">
            <CardContent className="p-6">
              <div className="relative bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 rounded-xl overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={BOARD_WIDTH}
                  height={BOARD_HEIGHT}
                  className="mx-auto block"
                  style={{ maxWidth: "100%", height: "auto" }}
                />

                <div 
                  className="flex justify-center absolute bottom-0 left-0 right-0"
                  style={{ padding: "0 20px" }}
                >
                  {multipliers.map((mult, i) => {
                    const recentHit = recentResults.length > 0 && recentResults[0].bucket === i && 
                      Date.now() - recentResults[0].timestamp < 2000;
                    return (
                      <div
                        key={i}
                        className={`flex-1 h-12 flex items-center justify-center text-xs font-bold transition-all border-x border-gray-700 ${
                          recentHit ? "scale-110 z-10" : ""
                        }`}
                        style={{
                          backgroundColor: recentHit ? "#fbbf24" : colors[i],
                          color: recentHit ? "#000" : "#fff",
                        }}
                      >
                        {mult}x
                      </div>
                    );
                  })}
                </div>

                {activeBallCount > 0 && (
                  <div className="absolute top-4 left-4 bg-black/80 px-4 py-2 rounded-lg">
                    <p className="text-sm font-medium text-white">
                      Balls in play: <span className="text-yellow-400">{activeBallCount}</span>
                    </p>
                  </div>
                )}

                {recentResults.length > 0 && recentResults[0].timestamp > Date.now() - 3000 && (
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/80 px-6 py-3 rounded-xl">
                    <p className="text-2xl font-bold text-yellow-400 text-center">
                      {recentResults[0].multiplier}x = +{recentResults[0].payout.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle>Drop Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Bet Amount</label>
                <Input 
                  type="number" 
                  value={betAmount} 
                  onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)} 
                  min={1} 
                  disabled={isDropping}
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[10, 50, 100, 500].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setBetAmount(amount)}
                    disabled={isDropping}
                    className="text-xs"
                  >
                    {amount}
                  </Button>
                ))}
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Risk Level</label>
                <div className="flex gap-2 mt-2">
                  {RISK_LEVELS.map((r) => (
                    <Button
                      key={r}
                      variant={risk === r ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRisk(r)}
                      disabled={isDropping}
                      className={risk === r ? "bg-pink-600" : ""}
                    >
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-white/5 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Possible Multipliers:</p>
                <div className="flex flex-wrap gap-1">
                  {Array.from(new Set(multipliers)).sort((a, b) => b - a).map((m, i) => (
                    <span 
                      key={i} 
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{ backgroundColor: colors[multipliers.indexOf(m)] }}
                    >
                      {m}x
                    </span>
                  ))}
                </div>
              </div>

              <Button 
                onClick={dropBall} 
                disabled={isDropping || !gameInitialized} 
                className="w-full bg-pink-600 hover:bg-pink-700 h-12 text-lg"
              >
                {isDropping ? (
                  <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Dropping...</>
                ) : (
                  "Drop Ball"
                )}
              </Button>

              {totalWinSession > 0 && (
                <div className="p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Session Winnings</p>
                  <p className="text-2xl font-bold text-yellow-400">+{totalWinSession.toLocaleString()}</p>
                </div>
              )}

              {recentResults.length > 0 && (
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">Recent Drops:</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {recentResults.slice(0, 5).map((result) => (
                      <div key={result.id} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{result.multiplier}x</span>
                        <span className={result.payout > 0 ? "text-green-400" : "text-red-400"}>
                          {result.payout > 0 ? "+" : ""}{result.payout.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
