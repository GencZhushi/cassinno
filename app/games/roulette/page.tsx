"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Volume2, VolumeX, Coins, TrendingUp, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

// European roulette wheel order (clockwise from top)
const WHEEL_NUMBERS = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];

type BetType = "straight" | "red" | "black" | "odd" | "even" | "low" | "high" | "dozen" | "column";

interface Bet {
  type: BetType;
  value?: number;
  amount: number;
}

interface SpinHistoryItem {
  number: number;
  color: "red" | "black" | "green";
}

const CHIP_VALUES = [1, 5, 10, 25, 100, 500];

export default function RoulettePage() {
  const { toast } = useToast();
  const [balance, setBalance] = useState<number>(0);
  const [selectedChip, setSelectedChip] = useState<number>(10);
  const [bets, setBets] = useState<Bet[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [lastWin, setLastWin] = useState<number>(0);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [ballAngle, setBallAngle] = useState(0);
  const [ballRadius, setBallRadius] = useState(176);
  const [spinHistory, setSpinHistory] = useState<SpinHistoryItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const [ballPhase, setBallPhase] = useState<'idle' | 'spinning' | 'dropping' | 'bouncing' | 'settled'>('idle');
  const [visualWheelRotation, setVisualWheelRotation] = useState(0);
  const [ballSpeed, setBallSpeed] = useState(0);
  const animationRef = useRef<number | null>(null);
  const ballAnimationRef = useRef<number | null>(null);
  const wheelRotationRef = useRef(0);

  useEffect(() => {
    fetchBalance();
    
    const animRef = animationRef.current;
    const ballRef = ballAnimationRef.current;
    
    return () => {
      if (animRef) cancelAnimationFrame(animRef);
      if (ballRef) cancelAnimationFrame(ballRef);
    };
  }, []);

  const fetchBalance = async () => {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const data = await res.json();
      setBalance(parseInt(data.balance));
    }
  };

  const getNumberColor = (num: number): "red" | "black" | "green" => {
    if (num === 0) return "green";
    return RED_NUMBERS.includes(num) ? "red" : "black";
  };

  const getColorClass = (num: number) => {
    const color = getNumberColor(num);
    if (color === "green") return "bg-gradient-to-br from-green-500 to-green-700";
    if (color === "red") return "bg-gradient-to-br from-red-500 to-red-700";
    return "bg-gradient-to-br from-gray-800 to-gray-900";
  };

  const getBetCount = (type: BetType, value?: number): number => {
    return bets.filter(b => b.type === type && b.value === value).reduce((sum, b) => sum + b.amount, 0);
  };

  const getTotalBet = useCallback(() => bets.reduce((sum, bet) => sum + bet.amount, 0), [bets]);

  const addBet = useCallback((type: BetType, value?: number) => {
    if (isSpinning) return;
    if (selectedChip <= 0) {
      toast({ title: "Select a chip value", variant: "destructive" });
      return;
    }
    if (selectedChip > balance - getTotalBet()) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }
    setBets(prev => [...prev, { type, value, amount: selectedChip }]);
  }, [selectedChip, balance, isSpinning, toast, getTotalBet]);

  const clearBets = () => {
    if (isSpinning) return;
    setBets([]);
    setResult(null);
    setLastWin(0);
    setShowWinAnimation(false);
  };

  const undoLastBet = () => {
    if (isSpinning || bets.length === 0) return;
    setBets(prev => prev.slice(0, -1));
  };

  const doubleBets = () => {
    if (isSpinning || bets.length === 0) return;
    const totalBet = getTotalBet();
    if (totalBet * 2 > balance) {
      toast({ title: "Insufficient balance to double", variant: "destructive" });
      return;
    }
    setBets(prev => [...prev, ...prev]);
  };


  // ═══════════════════════════════════════════════════════════════
  // SUPER-REALISTIC PHYSICS ENGINE
  // Models: friction, gravity spiral, deflector collisions, pocket bouncing
  // ═══════════════════════════════════════════════════════════════
  const animateBallPhysics = (
    _winningNumberIndex: number,
    wheelStartRotation: number,
    wheelEndRotation: number,
    onComplete: () => void
  ) => {
    const DEGREES_PER_SLOT = 360 / 37;
    const pocketCenterOffset = DEGREES_PER_SLOT / 2;

    // Physical dimensions (relative to 460px container)
    const TRACK_RADIUS = 176;
    const DEFLECTOR_RADIUS = 152;
    const POCKET_RADIUS = 110;

    // Ball state – counter-clockwise spin (opposite to wheel, like real roulette)
    let angle = Math.random() * 360;
    let radius = TRACK_RADIUS;
    let angularVel = -(580 + Math.random() * 220); // deg/s, negative = CCW
    let radialVel = 0;

    // Deflector collision state
    const NUM_DEFLECTORS = 8;
    const deflectorAngles = Array.from({ length: NUM_DEFLECTORS }, (_, i) => i * (360 / NUM_DEFLECTORS));
    let lastDeflectorIdx = -1;
    let deflectorCooldown = 0;

    // Bounce state
    let bounceEnergy = 1.0;
    let pocketBounceCount = 0;
    const maxPocketBounces = 3 + Math.floor(Math.random() * 4);

    // Randomised phase durations for variety
    const SPIN_END = 2600 + Math.random() * 500;
    const DROP_END = SPIN_END + 1600 + Math.random() * 500;
    const BOUNCE_END = DROP_END + 2000 + Math.random() * 400;
    const WHEEL_ANIM_DURATION = 7000;

    const startTime = performance.now();
    let lastTime = startTime;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const dt = Math.min((now - lastTime) / 1000, 0.04); // seconds, cap at 40ms
      lastTime = now;

      // Wheel interpolation (cubic ease-out)
      const wp = Math.min(elapsed / WHEEL_ANIM_DURATION, 1);
      const wheelEase = 1 - Math.pow(1 - wp, 3);
      const currentWheelRot = wheelStartRotation + (wheelEndRotation - wheelStartRotation) * wheelEase;
      wheelRotationRef.current = currentWheelRot;

      let phase: 'spinning' | 'dropping' | 'bouncing' | 'settled';

      if (elapsed < SPIN_END) {
        // ── Phase 1: SPINNING on outer ball track ──
        phase = 'spinning';
        const speedRatio = Math.abs(angularVel) / 600;
        const friction = 0.986 - 0.006 * (1 - speedRatio);
        angularVel *= Math.pow(friction, dt * 60);
        angle += angularVel * dt;

        // Subtle track vibration
        const vibAmp = 1.2 * (Math.abs(angularVel) / 600);
        radius = TRACK_RADIUS + Math.sin(elapsed * 0.015) * vibAmp;
        setBallSpeed(Math.abs(angularVel));

      } else if (elapsed < DROP_END) {
        // ── Phase 2: SPIRAL DESCENT (gravity pulls ball inward) ──
        phase = 'dropping';
        const dropProgress = (elapsed - SPIN_END) / (DROP_END - SPIN_END);

        angularVel *= Math.pow(0.978, dt * 60);
        angle += angularVel * dt;

        // Gravity-driven inward spiral
        const gravityPull = 100 * Math.pow(dropProgress, 0.4);
        radialVel -= gravityPull * dt;
        radialVel *= Math.pow(0.91, dt * 60);
        radius += radialVel * dt;
        radius = Math.max(POCKET_RADIUS - 3, Math.min(TRACK_RADIUS, radius));

        // ── Deflector collision detection ──
        deflectorCooldown -= dt;
        if (radius < DEFLECTOR_RADIUS + 10 && radius > DEFLECTOR_RADIUS - 10 && deflectorCooldown <= 0) {
          const normAngle = ((angle % 360) + 360) % 360;
          for (let d = 0; d < NUM_DEFLECTORS; d++) {
            const diff = Math.abs(normAngle - deflectorAngles[d]);
            const angleDist = Math.min(diff, 360 - diff);
            if (angleDist < 12 && lastDeflectorIdx !== d) {
              lastDeflectorIdx = d;
              deflectorCooldown = 0.18;
              const bounceDir = Math.random() > 0.5 ? 1 : -1;
              angularVel += bounceDir * (25 + Math.random() * 45);
              radialVel = -(35 + Math.random() * 25);
              radius -= 5;
              break;
            }
          }
        }

        // Wobble decreases as ball drops
        radius += Math.sin(elapsed * 0.02) * 3 * (1 - dropProgress);
        setBallSpeed(Math.abs(angularVel));

      } else if (elapsed < BOUNCE_END) {
        // ── Phase 3: POCKET BOUNCING ──
        phase = 'bouncing';
        const bounceProgress = (elapsed - DROP_END) / (BOUNCE_END - DROP_END);

        angularVel *= Math.pow(0.925, dt * 60);
        angle += angularVel * dt;
        bounceEnergy *= Math.pow(0.88, dt * 60);

        // Pocket wall bouncing oscillation
        const bounceFreq = 5 + bounceProgress * 10;
        const bounceAmp = 8 * bounceEnergy;
        radius = POCKET_RADIUS + Math.sin(elapsed * bounceFreq * 0.001) * bounceAmp;

        // Random pocket hops
        if (pocketBounceCount < maxPocketBounces && bounceProgress < 0.55) {
          if (Math.random() < 0.007 * dt * 60) {
            pocketBounceCount++;
            const hopDir = Math.random() > 0.5 ? 1 : -1;
            angularVel += hopDir * DEGREES_PER_SLOT * (0.5 + Math.random() * 1.5) * 2.5;
            bounceEnergy *= 0.75;
            radius += 6;
          }
        }

        // Converge toward target angle (pointer = top)
        const normAngle = ((angle % 360) + 360) % 360;
        let targetDiff = pocketCenterOffset - normAngle;
        if (targetDiff < -180) targetDiff += 360;
        if (targetDiff > 180) targetDiff -= 360;

        const converge = Math.pow(bounceProgress, 1.8) * 0.1;
        angle += targetDiff * converge;

        if (bounceProgress > 0.8) {
          angle += targetDiff * 0.2;
          radius += (POCKET_RADIUS - radius) * 0.15;
        }
        if (bounceProgress > 0.92) {
          angle += targetDiff * 0.4;
          radius += (POCKET_RADIUS - radius) * 0.35;
        }
        setBallSpeed(Math.abs(angularVel) * bounceEnergy);

      } else {
        // ── Phase 4: SETTLED in pocket ──
        setBallAngle(pocketCenterOffset);
        setBallRadius(POCKET_RADIUS);
        setBallPhase('settled');
        setBallSpeed(0);
        onComplete();
        return;
      }

      setBallPhase(phase);
      setBallAngle(angle);
      setBallRadius(Math.max(POCKET_RADIUS - 4, Math.min(TRACK_RADIUS + 2, radius)));
      setVisualWheelRotation(currentWheelRot);

      ballAnimationRef.current = requestAnimationFrame(animate);
    };

    setBallPhase('spinning');
    ballAnimationRef.current = requestAnimationFrame(animate);
  };

  const spin = async () => {
    if (bets.length === 0) {
      toast({ title: "Place at least one bet", variant: "destructive" });
      return;
    }

    const totalBet = getTotalBet();
    if (totalBet > balance) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }

    setIsSpinning(true);
    setResult(null);
    setLastWin(0);
    setShowWinAnimation(false);

    // Cancel any existing animations
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (ballAnimationRef.current) cancelAnimationFrame(ballAnimationRef.current);

    try {
      const res = await fetch("/api/games/roulette/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bets }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const winningNumber = data.result;
      const numberIndex = WHEEL_NUMBERS.indexOf(winningNumber);
      
      // Calculate wheel rotation to land winning number at the pointer (top)
      // Number at index 0 is at top when wheelRotation = 0
      // To get number at index N to the top, we need to rotate by -(N * DEGREES_PER_SLOT)
      const DEGREES_PER_SLOT = 360 / 37;
      const winningNumberOffset = numberIndex * DEGREES_PER_SLOT;
      
      // Calculate how much additional rotation needed to align winning number with pointer
      const currentWheelMod = wheelRotation % 360;
      let alignmentRotation = (360 - winningNumberOffset - currentWheelMod + 360) % 360;
      if (alignmentRotation < 10) alignmentRotation += 360; // Ensure at least some rotation
      
      // Add 5-7 full rotations for dramatic effect
      const extraSpins = 5 + Math.floor(Math.random() * 3);
      const totalRotation = alignmentRotation + extraSpins * 360;
      
      const startRotation = wheelRotation;
      const finalWheelRotation = wheelRotation + totalRotation;
      
      // Start wheel spinning
      setWheelRotation(finalWheelRotation);
      
      // Start ball animation - ball will land at pointer (top) where winning number will be
      animateBallPhysics(numberIndex, startRotation, finalWheelRotation, () => {
        setResult(winningNumber);
        setLastWin(parseInt(data.totalWin));
        setBalance(parseInt(data.newBalance));
        setIsSpinning(false);

        setSpinHistory(prev => [
          { number: winningNumber, color: getNumberColor(winningNumber) },
          ...prev.slice(0, 19)
        ]);

        if (parseInt(data.totalWin) > 0) {
          setShowWinAnimation(true);
          toast({ title: `🎉 You won ${parseInt(data.totalWin).toLocaleString()} tokens!`, variant: "success" });
        } else {
          toast({ title: "No win this time", variant: "destructive" });
        }
      });
    } catch (error) {
      setIsSpinning(false);
      toast({ title: error instanceof Error ? error.message : "Spin failed", variant: "destructive" });
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // ROULETTE WHEEL – Premium visual design with ball effects
  // ═══════════════════════════════════════════════════════════════
  const RouletteWheel = () => {
    const segmentAngle = 360 / 37;

    // Ball screen position
    const ballAngleRad = (ballAngle * Math.PI) / 180;
    const ballX = Math.sin(ballAngleRad) * ballRadius;
    const ballY = -Math.cos(ballAngleRad) * ballRadius;

    const isMoving = ballPhase !== 'idle' && ballPhase !== 'settled';
    const isMovingFast = ballPhase === 'spinning';
    const speedNorm = Math.min(ballSpeed / 500, 1);

    // Ball size varies by phase (3D depth illusion)
    const bSize = ballPhase === 'spinning' ? 18 : ballPhase === 'dropping' ? 17 : ballPhase === 'bouncing' ? 16 : ballPhase === 'settled' ? 15 : 18;

    return (
      <div className="relative w-[480px] h-[480px] mx-auto select-none" style={{ aspectRatio: '1 / 1' }}>
        {/* Ambient glow underneath wheel */}
        <div className="absolute inset-8 rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.35) 0%, transparent 70%)' }} />

        {/* Outer chrome/gold ring – conic gradient for metallic look */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] h-[440px] rounded-full p-[5px] shadow-[0_0_50px_rgba(212,175,55,0.35),0_0_100px_rgba(212,175,55,0.12)]"
          style={{ background: 'conic-gradient(from 0deg, #8B6914, #D4AF37, #F5E6A3, #D4AF37, #8B6914, #D4AF37, #F5E6A3, #D4AF37, #8B6914, #D4AF37, #F5E6A3, #D4AF37, #8B6914)' }}
        >
          {/* Inner chrome ring */}
          <div className="w-full h-full rounded-full p-[3px]"
            style={{ background: 'conic-gradient(from 45deg, #6B5210, #C4A135, #E8D48B, #C4A135, #6B5210, #C4A135, #E8D48B, #C4A135, #6B5210)' }}>

            {/* Ball track – dark mahogany wood */}
            <div className="w-full h-full rounded-full bg-gradient-to-br from-[#2c1810] via-[#3d2317] to-[#1e0f09] p-3 relative shadow-[inset_0_0_30px_rgba(0,0,0,0.7)]">
              {/* Ball track groove */}
              <div className="absolute inset-4 rounded-full shadow-[inset_0_2px_12px_rgba(0,0,0,0.7),0_1px_3px_rgba(210,170,50,0.15)]"
                style={{ border: '2px solid rgba(30,15,9,0.8)' }} />

              {/* Track surface highlight */}
              <div className="absolute inset-5 rounded-full opacity-20 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 35% 25%, rgba(255,220,150,0.3) 0%, transparent 50%)' }} />

              {/* Deflectors/diamonds on the track */}
              {[...Array(8)].map((_, i) => {
                const ang = (i * 45 * Math.PI) / 180;
                const dx = Math.sin(ang) * 168;
                const dy = -Math.cos(ang) * 168;
                return (
                  <div key={`deflector-${i}`} className="absolute z-[5]"
                    style={{ left: `calc(50% + ${dx}px - 7px)`, top: `calc(50% + ${dy}px - 9px)`, transform: `rotate(${i * 45}deg)` }}>
                    <div className="w-[14px] h-[18px] relative">
                      <div className="absolute inset-0 bg-gradient-to-b from-[#F5E6A3] via-[#D4AF37] to-[#8B6914]"
                        style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
                      <div className="absolute inset-[1px] bg-gradient-to-b from-[#FCF3D1] via-[#E8C84A] to-[#A07D1C] opacity-80"
                        style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
                    </div>
                  </div>
                );
              })}

              {/* ── Spinning wheel rotor ── */}
              <div
                className="absolute inset-6 rounded-full overflow-hidden shadow-[inset_0_0_40px_rgba(0,0,0,0.6)]"
                style={{ transform: `rotate(${isSpinning ? visualWheelRotation : wheelRotation}deg)` }}
              >
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  <defs>
                    <radialGradient id="pocketDepth" cx="50%" cy="50%" r="50%">
                      <stop offset="60%" stopColor="transparent" />
                      <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
                    </radialGradient>
                    <radialGradient id="hubGrad" cx="35%" cy="30%">
                      <stop offset="0%" stopColor="#5a3a1a" />
                      <stop offset="100%" stopColor="#2a1a08" />
                    </radialGradient>
                    <radialGradient id="innerHubGrad" cx="35%" cy="30%">
                      <stop offset="0%" stopColor="#fcd34d" />
                      <stop offset="100%" stopColor="#a16207" />
                    </radialGradient>
                    <radialGradient id="centerGem" cx="35%" cy="30%">
                      <stop offset="0%" stopColor="#fef08a" />
                      <stop offset="50%" stopColor="#eab308" />
                      <stop offset="100%" stopColor="#a16207" />
                    </radialGradient>
                  </defs>

                  {WHEEL_NUMBERS.map((num, i) => {
                    const startAngle = i * segmentAngle - 90;
                    const endAngle = startAngle + segmentAngle;
                    const startRad = (startAngle * Math.PI) / 180;
                    const endRad = (endAngle * Math.PI) / 180;
                    const midRad = ((startAngle + segmentAngle / 2) * Math.PI) / 180;

                    const outerR = 100;
                    const innerR = 38;
                    const textR = 73;

                    const x1 = 100 + outerR * Math.cos(startRad);
                    const y1 = 100 + outerR * Math.sin(startRad);
                    const x2 = 100 + outerR * Math.cos(endRad);
                    const y2 = 100 + outerR * Math.sin(endRad);
                    const x3 = 100 + innerR * Math.cos(endRad);
                    const y3 = 100 + innerR * Math.sin(endRad);
                    const x4 = 100 + innerR * Math.cos(startRad);
                    const y4 = 100 + innerR * Math.sin(startRad);
                    const textX = 100 + textR * Math.cos(midRad);
                    const textY = 100 + textR * Math.sin(midRad);

                    const color = getNumberColor(num);
                    const fillColor = color === "green" ? "#15803d" : color === "red" ? "#991b1b" : "#18181b";
                    const highlightColor = color === "green" ? "#22c55e" : color === "red" ? "#dc2626" : "#3f3f46";

                    const fretX1 = 100 + (outerR - 1) * Math.cos(startRad);
                    const fretY1 = 100 + (outerR - 1) * Math.sin(startRad);
                    const fretX2 = 100 + (innerR + 1) * Math.cos(startRad);
                    const fretY2 = 100 + (innerR + 1) * Math.sin(startRad);

                    return (
                      <g key={num}>
                        <path d={`M ${x1} ${y1} A ${outerR} ${outerR} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 0 0 ${x4} ${y4} Z`}
                          fill={fillColor} stroke={highlightColor} strokeWidth="0.3" opacity="0.95" />
                        <path d={`M ${x1} ${y1} A ${outerR} ${outerR} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 0 0 ${x4} ${y4} Z`}
                          fill="url(#pocketDepth)" opacity="0.3" />
                        <line x1={fretX1} y1={fretY1} x2={fretX2} y2={fretY2} stroke="#D4AF37" strokeWidth="1.4" />
                        <line x1={fretX1} y1={fretY1} x2={fretX2} y2={fretY2} stroke="#F5E6A3" strokeWidth="0.4" opacity="0.5" />
                        <text x={textX} y={textY} fill="white" fontSize="8.5" fontWeight="bold"
                          fontFamily="'Arial Black', Arial, sans-serif" textAnchor="middle" dominantBaseline="middle"
                          transform={`rotate(${startAngle + segmentAngle / 2 + 90}, ${textX}, ${textY})`}
                          stroke="rgba(0,0,0,0.6)" strokeWidth="0.6" paintOrder="stroke" letterSpacing="0.5">
                          {num}
                        </text>
                      </g>
                    );
                  })}

                  <circle cx="100" cy="100" r="99" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />

                  {/* Center hub */}
                  <circle cx="100" cy="100" r="36" fill="url(#hubGrad)" stroke="#B8860B" strokeWidth="2.5" />
                  <circle cx="100" cy="100" r="27" fill="url(#innerHubGrad)" stroke="#D4AF37" strokeWidth="1.5" />
                  <circle cx="100" cy="100" r="14" fill="url(#centerGem)" stroke="#F5E6A3" strokeWidth="0.5" />

                  {[...Array(8)].map((_, i) => {
                    const ang = (i * 45 * Math.PI) / 180;
                    return (
                      <g key={`spoke-${i}`}>
                        <line x1={100 + 14 * Math.cos(ang)} y1={100 + 14 * Math.sin(ang)}
                          x2={100 + 26 * Math.cos(ang)} y2={100 + 26 * Math.sin(ang)}
                          stroke="#B8860B" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1={100 + 15 * Math.cos(ang)} y1={100 + 15 * Math.sin(ang)}
                          x2={100 + 25 * Math.cos(ang)} y2={100 + 25 * Math.sin(ang)}
                          stroke="#F5E6A3" strokeWidth="0.7" opacity="0.6" strokeLinecap="round" />
                      </g>
                    );
                  })}

                  <circle cx="100" cy="100" r="5" fill="#fef08a" opacity="0.8" />
                  <circle cx="98" cy="98" r="2" fill="white" opacity="0.4" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* ── Ball glow (soft ambient light around ball) ── */}
        {isMoving && (
          <div className="absolute pointer-events-none z-[18]"
            style={{ left: '50%', top: '50%', transform: `translate(calc(-50% + ${ballX}px), calc(-50% + ${ballY}px))` }}>
            <div className="rounded-full" style={{
              width: bSize + 16, height: bSize + 16,
              marginLeft: -(bSize + 16) / 2, marginTop: -(bSize + 16) / 2,
              background: `radial-gradient(circle, rgba(255,255,255,${0.12 + speedNorm * 0.15}) 0%, transparent 70%)`,
              filter: 'blur(4px)',
            }} />
          </div>
        )}

        {/* ── Ball shadow ── */}
        {isMoving && (
          <div className="absolute pointer-events-none z-[17]"
            style={{ left: '50%', top: '50%', transform: `translate(calc(-50% + ${ballX + 3}px), calc(-50% + ${ballY + 3}px))` }}>
            <div className="rounded-full bg-black/25" style={{
              width: bSize + 2, height: bSize + 2,
              marginLeft: -(bSize + 2) / 2, marginTop: -(bSize + 2) / 2,
              filter: 'blur(3px)',
            }} />
          </div>
        )}

        {/* ── Motion trail (only when spinning fast) ── */}
        {isMovingFast && speedNorm > 0.3 && (
          <>
            {[1, 2, 3].map(t => {
              const trailAng = ballAngle + t * 9;
              const trailRad = (trailAng * Math.PI) / 180;
              const tx = Math.sin(trailRad) * ballRadius;
              const ty = -Math.cos(trailRad) * ballRadius;
              return (
                <div key={`trail-${t}`} className="absolute pointer-events-none z-[16]"
                  style={{ left: '50%', top: '50%', transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px))` }}>
                  <div className="rounded-full bg-white" style={{
                    width: bSize - t * 2, height: bSize - t * 2,
                    marginLeft: -(bSize - t * 2) / 2, marginTop: -(bSize - t * 2) / 2,
                    opacity: (0.22 - t * 0.06) * speedNorm,
                    filter: `blur(${t * 1.5}px)`,
                  }} />
                </div>
              );
            })}
          </>
        )}

        {/* ── Main ball ── */}
        <div className="absolute pointer-events-none z-20"
          style={{
            left: '50%', top: '50%',
            transform: `translate(calc(-50% + ${ballX}px), calc(-50% + ${ballY}px))`,
            transition: ballPhase === 'settled' ? 'transform 0.15s ease-out' : 'none',
          }}>
          <div className="rounded-full" style={{
            width: bSize, height: bSize,
            marginLeft: -bSize / 2, marginTop: -bSize / 2,
            background: 'radial-gradient(ellipse at 35% 25%, #ffffff 0%, #f0f0f0 30%, #d4d4d4 60%, #a0a0a0 100%)',
            boxShadow: ballPhase === 'settled'
              ? '0 2px 6px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(0,0,0,0.15)'
              : `0 3px 10px rgba(0,0,0,0.6), inset 0 -3px 6px rgba(0,0,0,0.2), 0 0 ${8 + speedNorm * 12}px rgba(255,255,255,${0.2 + speedNorm * 0.3})`,
            filter: isMovingFast && speedNorm > 0.5 ? `blur(${speedNorm * 0.7}px)` : 'none',
          }} />
        </div>

        {/* ── Pointer / marker diamond ── */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-30">
          <div className="relative w-6 h-10">
            <div className="absolute inset-0 bg-gradient-to-b from-[#F5E6A3] via-[#D4AF37] to-[#8B6914] shadow-[0_4px_15px_rgba(0,0,0,0.5)]"
              style={{ clipPath: 'polygon(50% 100%, 0% 0%, 100% 0%)' }} />
            <div className="absolute inset-[2px] bg-gradient-to-b from-[#FCF3D1] via-[#E8C84A] to-[#A07D1C] opacity-70"
              style={{ clipPath: 'polygon(50% 100%, 0% 0%, 100% 0%)' }} />
          </div>
        </div>

        {/* Decorative outer studs */}
        {[...Array(36)].map((_, i) => {
          const ang = (i * 10 * Math.PI) / 180;
          const sx = Math.sin(ang) * 228;
          const sy = -Math.cos(ang) * 228;
          return (
            <div key={`stud-${i}`} className="absolute w-[5px] h-[5px] rounded-full"
              style={{
                left: `calc(50% + ${sx}px - 2.5px)`, top: `calc(50% + ${sy}px - 2.5px)`,
                background: i % 3 === 0 ? 'radial-gradient(circle at 30% 30%, #F5E6A3, #8B6914)' : 'radial-gradient(circle at 30% 30%, #D4AF37, #6B5210)',
                opacity: 0.6,
              }} />
          );
        })}
      </div>
    );
  };

  // Betting Table
  const BettingTable = () => (
    <div className="relative bg-gradient-to-br from-green-800 via-green-900 to-green-950 rounded-2xl p-4 border-4 border-amber-700/80 shadow-[inset_0_2px_20px_rgba(0,0,0,0.5),0_8px_32px_rgba(0,0,0,0.3)]">
      {/* Felt texture overlay */}
      <div className="absolute inset-0 opacity-20 rounded-xl" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />
      
      <div className="relative">
        {/* Main number grid */}
        <div className="flex gap-1">
          {/* Zero */}
          <button
            onClick={() => addBet("straight", 0)}
            className={`relative w-12 h-[156px] rounded-lg ${getColorClass(0)} hover:brightness-125 transition-all duration-200 flex items-center justify-center text-white font-bold text-xl border-2 border-green-400/30 shadow-lg ${result === 0 ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-gray-900 winning-number-glow' : ''}`}
          >
            0
            {getBetCount("straight", 0) > 0 && (
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-yellow-500 text-black text-xs font-bold flex items-center justify-center shadow-lg">
                {getBetCount("straight", 0)}
              </div>
            )}
          </button>

          {/* Numbers 1-36 in 3 rows */}
          <div className="grid grid-cols-12 gap-1 flex-1">
            {[3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36].map(num => (
              <NumberButton key={num} num={num} />
            ))}
            {[2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35].map(num => (
              <NumberButton key={num} num={num} />
            ))}
            {[1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34].map(num => (
              <NumberButton key={num} num={num} />
            ))}
          </div>

          {/* Column bets */}
          <div className="flex flex-col gap-1">
            {[3, 2, 1].map(col => (
              <button
                key={col}
                onClick={() => addBet("column", col)}
                className="relative w-10 h-[50px] rounded-lg bg-gradient-to-r from-emerald-700 to-emerald-800 hover:brightness-125 transition-all text-white text-xs font-bold border border-emerald-500/30"
              >
                2:1
                {getBetCount("column", col) > 0 && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-yellow-500 text-black text-[10px] font-bold flex items-center justify-center">
                    {getBetCount("column", col)}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Dozen bets */}
        <div className="flex gap-1 mt-1 ml-[52px]">
          {[1, 2, 3].map(dozen => (
            <button
              key={dozen}
              onClick={() => addBet("dozen", dozen)}
              className="relative flex-1 h-10 rounded-lg bg-gradient-to-r from-emerald-700 to-emerald-800 hover:brightness-125 transition-all text-white text-sm font-bold border border-emerald-500/30"
            >
              {dozen === 1 ? "1st 12" : dozen === 2 ? "2nd 12" : "3rd 12"}
              {getBetCount("dozen", dozen) > 0 && (
                <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-yellow-500 text-black text-[10px] font-bold flex items-center justify-center">
                  {getBetCount("dozen", dozen)}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Outside bets */}
        <div className="flex gap-1 mt-1 ml-[52px]">
          <OutsideBet type="low" label="1-18" />
          <OutsideBet type="even" label="EVEN" />
          <button
            onClick={() => addBet("red")}
            className={`relative flex-1 h-12 rounded-lg bg-gradient-to-br from-red-500 to-red-700 hover:brightness-125 transition-all text-white font-bold border border-red-400/30 shadow-inner`}
          >
            <div className="w-6 h-6 mx-auto rounded-sm bg-red-400" />
            {getBetCount("red") > 0 && (
              <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-yellow-500 text-black text-[10px] font-bold flex items-center justify-center">
                {getBetCount("red")}
              </div>
            )}
          </button>
          <button
            onClick={() => addBet("black")}
            className={`relative flex-1 h-12 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 hover:brightness-125 transition-all text-white font-bold border border-gray-500/30 shadow-inner`}
          >
            <div className="w-6 h-6 mx-auto rounded-sm bg-gray-800 border border-gray-600" />
            {getBetCount("black") > 0 && (
              <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-yellow-500 text-black text-[10px] font-bold flex items-center justify-center">
                {getBetCount("black")}
              </div>
            )}
          </button>
          <OutsideBet type="odd" label="ODD" />
          <OutsideBet type="high" label="19-36" />
        </div>
      </div>
    </div>
  );

  const NumberButton = ({ num }: { num: number }) => (
    <button
      onClick={() => addBet("straight", num)}
      className={`relative h-[50px] rounded-lg ${getColorClass(num)} hover:brightness-125 hover:scale-105 transition-all duration-200 flex items-center justify-center text-white font-bold text-sm border border-white/10 shadow-md ${result === num ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-gray-900 winning-number-glow z-10' : ''}`}
    >
      {num}
      {getBetCount("straight", num) > 0 && (
        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-yellow-500 text-black text-[10px] font-bold flex items-center justify-center shadow-lg z-20">
          {getBetCount("straight", num)}
        </div>
      )}
    </button>
  );

  const OutsideBet = ({ type, label }: { type: BetType; label: string }) => (
    <button
      onClick={() => addBet(type)}
      className="relative flex-1 h-12 rounded-lg bg-gradient-to-r from-emerald-700 to-emerald-800 hover:brightness-125 transition-all text-white text-sm font-bold border border-emerald-500/30"
    >
      {label}
      {getBetCount(type) > 0 && (
        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-yellow-500 text-black text-[10px] font-bold flex items-center justify-center">
          {getBetCount(type)}
        </div>
      )}
    </button>
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,#1a1a2e_0%,#0d0d0d_50%,#000000_100%)] pb-20">
      {/* Win animation overlay */}
      {showWinAnimation && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="animate-ping absolute w-96 h-96 rounded-full bg-yellow-500/20" />
          <div className="animate-pulse text-7xl font-black text-yellow-400 drop-shadow-[0_0_40px_rgba(234,179,8,0.9)]">
            +{lastWin.toLocaleString()}
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="hover:bg-white/10 rounded-xl">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 via-green-600 to-green-800 flex items-center justify-center shadow-lg shadow-green-500/25 border border-green-400/20">
                <span className="text-2xl">🎰</span>
              </div>
              <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent tracking-tight">
                  European Roulette
                </h1>
                <p className="text-sm text-gray-500 font-medium">Single Zero &bull; 97.3% RTP</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="hover:bg-white/10 rounded-xl"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
            <div className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-yellow-600/15 to-yellow-500/15 border border-yellow-500/25 shadow-lg shadow-yellow-500/5">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-500" />
                <span className="font-bold text-yellow-400 text-lg">{balance.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left Panel - Wheel & Result */}
          <div className="xl:col-span-1 space-y-5">
            {/* Roulette Wheel */}
            <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/60 rounded-3xl p-6 border border-gray-700/40 backdrop-blur-sm shadow-2xl overflow-hidden">
              <div className="flex items-center justify-center min-h-[500px]">
                <RouletteWheel />
              </div>

              {/* Result Display */}
              <div className="mt-6 text-center">
                {result !== null && !isSpinning && (
                  <div className="space-y-3">
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest">Result</p>
                    <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${getColorClass(result)} text-white text-3xl font-black shadow-xl ${showWinAnimation ? 'animate-bounce' : ''} ring-4 ring-white/10`}>
                      {result}
                    </div>
                    {lastWin > 0 && (
                      <p className="text-green-400 font-black text-xl drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]">+{lastWin.toLocaleString()}</p>
                    )}
                  </div>
                )}
                {isSpinning && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                    <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                    <p className="text-yellow-400 text-sm font-semibold">Ball in play...</p>
                  </div>
                )}
                {result === null && !isSpinning && (
                  <p className="text-gray-600 text-sm">Place your bets</p>
                )}
              </div>
            </div>

            {/* Spin History */}
            <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/60 rounded-2xl p-4 border border-gray-700/40 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">History</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {spinHistory.length === 0 ? (
                  <p className="text-xs text-gray-600">No spins yet</p>
                ) : (
                  spinHistory.map((item, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white transition-all ${
                        item.color === "green" ? "bg-green-700" : item.color === "red" ? "bg-red-700" : "bg-gray-800"
                      } ${i === 0 ? 'ring-2 ring-yellow-400 scale-110' : 'opacity-80'}`}
                    >
                      {item.number}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/60 rounded-2xl p-4 border border-gray-700/40 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Statistics</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-red-600/15 rounded-xl p-3 border border-red-500/10">
                  <p className="text-red-400 text-xl font-black">
                    {spinHistory.filter(h => h.color === "red").length}
                  </p>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase">Red</p>
                </div>
                <div className="bg-gray-600/15 rounded-xl p-3 border border-gray-500/10">
                  <p className="text-gray-300 text-xl font-black">
                    {spinHistory.filter(h => h.color === "black").length}
                  </p>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase">Black</p>
                </div>
                <div className="bg-green-600/15 rounded-xl p-3 border border-green-500/10">
                  <p className="text-green-400 text-xl font-black">
                    {spinHistory.filter(h => h.color === "green").length}
                  </p>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase">Zero</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Panel - Betting Table */}
          <div className="xl:col-span-3 space-y-5">
            <BettingTable />

            {/* Chip Selection & Controls */}
            <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/60 rounded-2xl p-5 border border-gray-700/40 backdrop-blur-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Chip Selection */}
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-gray-500 mr-1 font-semibold uppercase tracking-wider">Chip</span>
                  {CHIP_VALUES.map(value => (
                    <button
                      key={value}
                      onClick={() => setSelectedChip(value)}
                      disabled={isSpinning}
                      className={`relative w-12 h-12 rounded-full transition-all duration-200 ${
                        selectedChip === value
                          ? 'scale-110 ring-2 ring-yellow-400 shadow-lg shadow-yellow-500/30'
                          : 'hover:scale-105 opacity-60 hover:opacity-100'
                      } ${
                        value === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                        value === 5 ? 'bg-gradient-to-br from-red-400 to-red-600' :
                        value === 10 ? 'bg-gradient-to-br from-blue-400 to-blue-600' :
                        value === 25 ? 'bg-gradient-to-br from-green-400 to-green-600' :
                        value === 100 ? 'bg-gradient-to-br from-purple-400 to-purple-600' :
                        'bg-gradient-to-br from-yellow-400 to-yellow-600'
                      } border-[3px] border-white/25 shadow-md flex items-center justify-center`}
                    >
                      <span className="text-white font-bold text-xs drop-shadow-md">{value}</span>
                      <div className="absolute inset-[3px] rounded-full border-2 border-dashed border-white/15" />
                    </button>
                  ))}
                </div>

                {/* Current Bet Info */}
                <div className="flex items-center gap-4">
                  {bets.length > 0 && (
                    <div className="text-right px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-[10px] text-gray-500 font-semibold uppercase">Total Bet</p>
                      <p className="text-lg font-black text-white">{getTotalBet().toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={undoLastBet} disabled={isSpinning || bets.length === 0}
                    className="border-gray-700 hover:bg-gray-800 rounded-xl text-xs font-semibold">
                    Undo
                  </Button>
                  <Button variant="outline" size="sm" onClick={doubleBets} disabled={isSpinning || bets.length === 0}
                    className="border-gray-700 hover:bg-gray-800 rounded-xl text-xs font-semibold">
                    2x
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearBets} disabled={isSpinning}
                    className="border-gray-700 hover:bg-gray-800 rounded-xl">
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={spin}
                    disabled={isSpinning || bets.length === 0}
                    className="px-10 py-5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-black text-base shadow-xl shadow-green-500/25 disabled:opacity-50 rounded-xl tracking-wide"
                  >
                    {isSpinning ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Spinning
                      </span>
                    ) : (
                      "SPIN"
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Current Bets Summary */}
            {bets.length > 0 && (
              <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/60 rounded-2xl p-4 border border-gray-700/40 backdrop-blur-sm">
                <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Active Bets ({bets.length})</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(
                    bets.reduce((acc, bet) => {
                      const key = bet.type + (bet.value !== undefined ? `-${bet.value}` : '');
                      acc[key] = (acc[key] || 0) + bet.amount;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([key, amount]) => (
                    <div
                      key={key}
                      className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm flex items-center gap-2"
                    >
                      <span className="text-gray-400">{key.replace('-', ' #')}</span>
                      <span className="text-yellow-400 font-bold">{amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
