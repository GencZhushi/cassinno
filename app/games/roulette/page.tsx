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
  const [ballRadius, setBallRadius] = useState(172);
  const [spinHistory, setSpinHistory] = useState<SpinHistoryItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const [ballPhase, setBallPhase] = useState<'idle' | 'spinning' | 'dropping' | 'bouncing' | 'settled'>('idle');
  const [visualWheelRotation, setVisualWheelRotation] = useState(0);
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


  // Professional physics-based ball and wheel simulation
  // Both the wheel and ball spin, with the ball landing in the pocket at the pointer
  const animateBallPhysics = (
    _winningNumberIndex: number, 
    wheelStartRotation: number,
    wheelEndRotation: number, 
    onComplete: () => void
  ) => {
    const DEGREES_PER_SLOT = 360 / 37;
    // Ball should land at the center of a pocket, offset by half a slot
    const pocketCenterOffset = DEGREES_PER_SLOT / 2;
    // Physics constants - scaled for 420px wheel
    const TRACK_RADIUS = 172;           // Ball track (outer rim)
    const POCKET_RADIUS = 108;          // Where pockets are on the wheel
    
    // Ball state - starts at random position on the track
    let ballScreenAngle = Math.random() * 360;
    let radius = TRACK_RADIUS;
    let ballVelocity = 600 + Math.random() * 300; // Ball spins fast
    let radialVelocity = 0;
    
    // Timing
    const startTime = Date.now();
    const SPIN_DURATION = 3000;      // Ball spins on outer track
    const DROP_DURATION = 1500;      // Ball drops to pockets
    const SETTLE_DURATION = 2000;    // Ball bounces and settles
    const TOTAL_DURATION = SPIN_DURATION + DROP_DURATION + SETTLE_DURATION;
    
    let lastTime = startTime;
    let phase: 'spinning' | 'dropping' | 'bouncing' | 'settled' = 'spinning';
    let bounceCount = 0;
    const maxBounces = 3 + Math.floor(Math.random() * 3);
    
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const dt = Math.min((now - lastTime) / 16.67, 2); // Normalize to ~60fps
      lastTime = now;
      
      // Calculate wheel's current rotation using same easing as CSS
      const wheelProgress = Math.min(elapsed / 6500, 1);
      const wheelEase = 1 - Math.pow(1 - wheelProgress, 3);
      const currentWheelRotation = wheelStartRotation + (wheelEndRotation - wheelStartRotation) * wheelEase;
      wheelRotationRef.current = currentWheelRotation;
      
      // Phase transitions
      if (elapsed < SPIN_DURATION) {
        phase = 'spinning';
      } else if (elapsed < SPIN_DURATION + DROP_DURATION) {
        phase = 'dropping';
      } else if (elapsed < TOTAL_DURATION) {
        phase = 'bouncing';
      } else {
        phase = 'settled';
      }
      
      setBallPhase(phase);
      
      if (phase === 'spinning') {
        // Ball spins on outer track, slowing down gradually
        const spinProgress = elapsed / SPIN_DURATION;
        const friction = 0.994 - spinProgress * 0.003;
        ballVelocity *= Math.pow(friction, dt);
        ballScreenAngle += ballVelocity * dt * 0.016;
        radius = TRACK_RADIUS;
        
      } else if (phase === 'dropping') {
        // Ball drops from track toward pockets
        const dropProgress = (elapsed - SPIN_DURATION) / DROP_DURATION;
        const dropEase = 1 - Math.pow(1 - dropProgress, 2);
        
        // Continue slowing rotation
        ballVelocity *= Math.pow(0.985, dt);
        ballScreenAngle += ballVelocity * dt * 0.016;
        
        // Spiral inward
        radius = TRACK_RADIUS - (TRACK_RADIUS - POCKET_RADIUS - 5) * dropEase;
        
        // Add some wobble for realism
        radius += Math.sin(elapsed * 0.02) * 3 * (1 - dropProgress);
        
      } else if (phase === 'bouncing') {
        // Ball settles smoothly at the pointer (top = 0 degrees)
        const bounceProgress = (elapsed - SPIN_DURATION - DROP_DURATION) / SETTLE_DURATION;
        
        // Normalize current angle to 0-360 range
        const normalizedAngle = ((ballScreenAngle % 360) + 360) % 360;
        
        // Target is 0 degrees (top) - find shortest path
        let angleDiff = -normalizedAngle;
        if (angleDiff < -180) angleDiff += 360;
        if (angleDiff > 180) angleDiff -= 360;
        
        // Early bounces for realism
        if (bounceCount < maxBounces && bounceProgress < 0.4) {
          if (Math.random() < 0.025 * dt) {
            bounceCount++;
            ballVelocity += (Math.random() - 0.5) * 25;
            radialVelocity = (Math.random() - 0.5) * 4;
          }
        }
        
        // Smooth easing toward pocket center
        const targetAngleEase = pocketCenterOffset;
        const currentNormEase = ((ballScreenAngle % 360) + 360) % 360;
        let targetDiff = targetAngleEase - currentNormEase;
        if (targetDiff < -180) targetDiff += 360;
        if (targetDiff > 180) targetDiff -= 360;
        const easeStrength = Math.pow(bounceProgress, 0.5) * 0.15;
        ballScreenAngle += targetDiff * easeStrength;
        
        // Apply remaining velocity with heavy damping
        ballVelocity *= Math.pow(0.88, dt);
        ballScreenAngle += ballVelocity * dt * 0.008;
        
        // Radial settling - smooth approach to pocket
        radialVelocity *= 0.8;
        radialVelocity += (POCKET_RADIUS - radius) * 0.12;
        radius += radialVelocity * dt * 0.3;
        radius = Math.max(POCKET_RADIUS - 4, Math.min(POCKET_RADIUS + 4, radius));
        
        // Near the end, ensure we're very close to target (pocket center)
        if (bounceProgress > 0.9) {
          const finalTargetAngle = pocketCenterOffset;
          const finalCurrentNorm = ((ballScreenAngle % 360) + 360) % 360;
          let toDiff = finalTargetAngle - finalCurrentNorm;
          if (toDiff < -180) toDiff += 360;
          if (toDiff > 180) toDiff -= 360;
          ballScreenAngle += toDiff * 0.3;
          radius += (POCKET_RADIUS - radius) * 0.3;
        }
        
      } else {
        // Settled - ball lands at center of pocket (half slot offset from divider)
        setBallAngle(pocketCenterOffset);
        setBallRadius(POCKET_RADIUS);
        setBallPhase('settled');
        onComplete();
        return;
      }
      
      // Update state - both ball angle and wheel visual rotation
      setBallAngle(ballScreenAngle);
      setBallRadius(radius);
      setVisualWheelRotation(currentWheelRotation);
      
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

  // Roulette Wheel Component with professional ball animation
  const RouletteWheel = () => {
    const segmentAngle = 360 / 37;
    
    // Calculate ball position - the ball moves independently of the wheel
    // ballAngle is the screen angle (0 = top, clockwise positive)
    const ballAngleRad = (ballAngle * Math.PI) / 180;
    const ballX = Math.sin(ballAngleRad) * ballRadius;
    const ballY = -Math.cos(ballAngleRad) * ballRadius;
    
    // Ball visual effects based on phase - larger ball for bigger wheel
    const getBallStyles = () => {
      const baseStyles = "rounded-full bg-gradient-to-br from-gray-100 via-white to-gray-300 border border-gray-200";
      const shadowBase = "shadow-[0_3px_10px_rgba(0,0,0,0.7),inset_0_-3px_6px_rgba(0,0,0,0.2),0_0_15px_rgba(255,255,255,0.4)]";
      
      switch (ballPhase) {
        case 'spinning':
          return `${baseStyles} ${shadowBase} w-5 h-5`;
        case 'dropping':
          return `${baseStyles} ${shadowBase} w-5 h-5`;
        case 'bouncing':
          return `${baseStyles} ${shadowBase} w-[18px] h-[18px]`;
        case 'settled':
          return `${baseStyles} shadow-[0_2px_6px_rgba(0,0,0,0.6),inset_0_-2px_4px_rgba(0,0,0,0.2)] w-[18px] h-[18px]`;
        default:
          return `${baseStyles} ${shadowBase} w-5 h-5`;
      }
    };
    
    return (
      <div className="relative w-[460px] h-[460px] mx-auto" style={{ aspectRatio: '1 / 1' }}>
        {/* Outer decorative ring with metallic effect - centered in the larger container */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-700 p-1 shadow-[0_0_40px_rgba(234,179,8,0.5)]">
          {/* Ball track ring - the brown wooden track where ball spins */}
          <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-900 via-amber-800 to-amber-900 p-2 relative">
            {/* Ball track groove - visible ring where ball travels */}
            <div className="absolute inset-2 rounded-full border-[3px] border-amber-950/60 shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]" />
            
            {/* Deflectors/diamonds on the track - scaled for 420px wheel */}
            {[...Array(8)].map((_, i) => {
              const angle = (i * 45 * Math.PI) / 180;
              const x = Math.sin(angle) * 165;
              const y = -Math.cos(angle) * 165;
              return (
                <div
                  key={`deflector-${i}`}
                  className="absolute w-3 h-4 bg-gradient-to-b from-yellow-400 to-yellow-600 z-[5]"
                  style={{
                    left: `calc(50% + ${x}px - 6px)`,
                    top: `calc(50% + ${y}px - 8px)`,
                    transform: `rotate(${i * 45}deg)`,
                    clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
                  }}
                />
              );
            })}
            
            {/* Spinning wheel - uses visualWheelRotation for smooth animation */}
            <div 
              className="w-full h-full rounded-full relative overflow-hidden shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]"
              style={{ 
                transform: `rotate(${isSpinning ? visualWheelRotation : wheelRotation}deg)`,
              }}
            >
              {/* SVG Wheel segments - improved design */}
              <svg viewBox="0 0 200 200" className="w-full h-full">
                <defs>
                  {/* Gradient for pocket depth effect */}
                  <radialGradient id="pocketShadow" cx="50%" cy="50%" r="50%">
                    <stop offset="70%" stopColor="transparent" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
                  </radialGradient>
                </defs>
                
                {WHEEL_NUMBERS.map((num, i) => {
                  const startAngle = i * segmentAngle - 90;
                  const endAngle = startAngle + segmentAngle;
                  const startRad = (startAngle * Math.PI) / 180;
                  const endRad = (endAngle * Math.PI) / 180;
                  const midRad = ((startAngle + segmentAngle / 2) * Math.PI) / 180;
                  
                  const outerRadius = 100;
                  const innerRadius = 38;
                  const textRadius = 72;
                  
                  const x1 = 100 + outerRadius * Math.cos(startRad);
                  const y1 = 100 + outerRadius * Math.sin(startRad);
                  const x2 = 100 + outerRadius * Math.cos(endRad);
                  const y2 = 100 + outerRadius * Math.sin(endRad);
                  const x3 = 100 + innerRadius * Math.cos(endRad);
                  const y3 = 100 + innerRadius * Math.sin(endRad);
                  const x4 = 100 + innerRadius * Math.cos(startRad);
                  const y4 = 100 + innerRadius * Math.sin(startRad);
                  
                  const textX = 100 + textRadius * Math.cos(midRad);
                  const textY = 100 + textRadius * Math.sin(midRad);
                  
                  const color = getNumberColor(num);
                  const fillColor = color === "green" ? "#15803d" : color === "red" ? "#b91c1c" : "#18181b";
                  const highlightColor = color === "green" ? "#22c55e" : color === "red" ? "#ef4444" : "#3f3f46";
                  
                  // Pocket dividers - golden separators
                  const dividerX1 = 100 + (outerRadius - 1) * Math.cos(startRad);
                  const dividerY1 = 100 + (outerRadius - 1) * Math.sin(startRad);
                  const dividerX2 = 100 + (innerRadius + 2) * Math.cos(startRad);
                  const dividerY2 = 100 + (innerRadius + 2) * Math.sin(startRad);
                  
                  return (
                    <g key={num}>
                      {/* Main pocket segment */}
                      <path
                        d={`M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 0 0 ${x4} ${y4} Z`}
                        fill={fillColor}
                        stroke={highlightColor}
                        strokeWidth="0.5"
                      />
                      {/* Golden pocket divider */}
                      <line
                        x1={dividerX1}
                        y1={dividerY1}
                        x2={dividerX2}
                        y2={dividerY2}
                        stroke="#eab308"
                        strokeWidth="1.2"
                      />
                      {/* Number with better visibility */}
                      <text
                        x={textX}
                        y={textY}
                        fill="white"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="Arial, sans-serif"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${startAngle + segmentAngle / 2 + 90}, ${textX}, ${textY})`}
                        stroke="rgba(0,0,0,0.5)"
                        strokeWidth="0.5"
                        paintOrder="stroke"
                      >
                        {num}
                      </text>
                    </g>
                  );
                })}
                
                {/* Center hub */}
                <circle cx="100" cy="100" r="35" fill="url(#hubGradient)" stroke="#ca8a04" strokeWidth="2" />
                <circle cx="100" cy="100" r="25" fill="url(#innerHubGradient)" stroke="#eab308" strokeWidth="1" />
                <circle cx="100" cy="100" r="12" fill="#fbbf24" />
                
                {/* Spokes on center hub */}
                {[...Array(8)].map((_, i) => {
                  const angle = (i * 45 * Math.PI) / 180;
                  return (
                    <line
                      key={`spoke-${i}`}
                      x1={100 + 12 * Math.cos(angle)}
                      y1={100 + 12 * Math.sin(angle)}
                      x2={100 + 24 * Math.cos(angle)}
                      y2={100 + 24 * Math.sin(angle)}
                      stroke="#ca8a04"
                      strokeWidth="2"
                    />
                  );
                })}
                
                {/* Gradients */}
                <defs>
                  <radialGradient id="hubGradient" cx="30%" cy="30%">
                    <stop offset="0%" stopColor="#92400e" />
                    <stop offset="100%" stopColor="#451a03" />
                  </radialGradient>
                  <radialGradient id="innerHubGradient" cx="30%" cy="30%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#b45309" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>
        
        {/* Ball - positioned absolutely in screen space, OUTSIDE the spinning wheel */}
        <div 
          className="absolute pointer-events-none z-20"
          style={{
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% + ${ballX}px), calc(-50% + ${ballY}px))`,
            transition: ballPhase === 'settled' ? 'transform 0.1s ease-out' : 'none',
          }}
        >
          <div className={getBallStyles()} />
        </div>

        {/* Pointer/Diamond marker at top - larger for 420px wheel */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20">
          <div className="w-5 h-8 bg-gradient-to-b from-yellow-400 to-yellow-600 shadow-lg border-x border-yellow-300" 
               style={{ clipPath: 'polygon(50% 100%, 0% 0%, 100% 0%)' }} />
        </div>
        
        {/* Decorative outer dots - scaled for 420px wheel */}
        {[...Array(24)].map((_, i) => {
          const angle = (i * 15 * Math.PI) / 180;
          const x = Math.sin(angle) * 216;
          const y = -Math.cos(angle) * 216;
          return (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-yellow-500/70"
              style={{
                left: `calc(50% + ${x}px - 4px)`,
                top: `calc(50% + ${y}px - 4px)`,
              }}
            />
          );
        })}
      </div>
    );
  };

  // Betting Table
  const BettingTable = () => (
    <div className="relative bg-gradient-to-br from-green-800 via-green-900 to-green-950 rounded-2xl p-4 border-4 border-amber-700 shadow-[inset_0_2px_20px_rgba(0,0,0,0.5)]">
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
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black pb-20">
      {/* Win animation overlay */}
      {showWinAnimation && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="animate-ping absolute w-96 h-96 rounded-full bg-yellow-500/20" />
          <div className="animate-pulse text-6xl font-bold text-yellow-400 drop-shadow-[0_0_30px_rgba(234,179,8,0.8)]">
            +{lastWin.toLocaleString()}
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/lobby">
              <Button variant="ghost" size="icon" className="hover:bg-white/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-lg shadow-green-500/30">
                <span className="text-2xl">🎰</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  European Roulette
                </h1>
                <p className="text-sm text-gray-400">Single Zero • 97.3% RTP</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="hover:bg-white/10"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
            <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-600/20 to-yellow-500/20 border border-yellow-500/30">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-500" />
                <span className="font-bold text-yellow-400">{balance.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left Panel - Wheel & Result */}
          <div className="xl:col-span-1 space-y-4">
            {/* Roulette Wheel */}
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-6 border border-gray-700/50 backdrop-blur overflow-hidden">
              <div className="flex items-center justify-center min-h-[480px]">
                <RouletteWheel />
              </div>
              
              {/* Result Display */}
              <div className="mt-6 text-center">
                {result !== null && !isSpinning && (
                  <div className="space-y-2">
                    <p className="text-gray-400 text-sm">Result</p>
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${getColorClass(result)} text-white text-2xl font-bold shadow-lg ${showWinAnimation ? 'animate-bounce' : ''}`}>
                      {result}
                    </div>
                    {lastWin > 0 && (
                      <p className="text-green-400 font-bold text-lg">+{lastWin.toLocaleString()}</p>
                    )}
                  </div>
                )}
                {isSpinning && (
                  <p className="text-yellow-400 animate-pulse text-lg font-medium">Spinning...</p>
                )}
                {result === null && !isSpinning && (
                  <p className="text-gray-500">Place your bets</p>
                )}
              </div>
            </div>

            {/* Spin History */}
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-4 border border-gray-700/50 backdrop-blur">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">History</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {spinHistory.length === 0 ? (
                  <p className="text-xs text-gray-500">No spins yet</p>
                ) : (
                  spinHistory.map((item, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        item.color === "green" ? "bg-green-600" : item.color === "red" ? "bg-red-600" : "bg-gray-800"
                      } ${i === 0 ? 'ring-2 ring-yellow-400' : ''}`}
                    >
                      {item.number}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-4 border border-gray-700/50 backdrop-blur">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">Statistics</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-red-600/20 rounded-lg p-2">
                  <p className="text-red-400 text-lg font-bold">
                    {spinHistory.filter(h => h.color === "red").length}
                  </p>
                  <p className="text-xs text-gray-400">Red</p>
                </div>
                <div className="bg-gray-600/20 rounded-lg p-2">
                  <p className="text-gray-300 text-lg font-bold">
                    {spinHistory.filter(h => h.color === "black").length}
                  </p>
                  <p className="text-xs text-gray-400">Black</p>
                </div>
                <div className="bg-green-600/20 rounded-lg p-2">
                  <p className="text-green-400 text-lg font-bold">
                    {spinHistory.filter(h => h.color === "green").length}
                  </p>
                  <p className="text-xs text-gray-400">Zero</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Panel - Betting Table */}
          <div className="xl:col-span-3 space-y-4">
            <BettingTable />

            {/* Chip Selection & Controls */}
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-4 border border-gray-700/50 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Chip Selection */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400 mr-2">Chip:</span>
                  {CHIP_VALUES.map(value => (
                    <button
                      key={value}
                      onClick={() => setSelectedChip(value)}
                      disabled={isSpinning}
                      className={`relative w-12 h-12 rounded-full transition-all duration-200 ${
                        selectedChip === value
                          ? 'scale-110 ring-2 ring-yellow-400 shadow-lg shadow-yellow-500/30'
                          : 'hover:scale-105 opacity-70 hover:opacity-100'
                      } ${
                        value === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600' :
                        value === 5 ? 'bg-gradient-to-br from-red-400 to-red-600' :
                        value === 10 ? 'bg-gradient-to-br from-blue-400 to-blue-600' :
                        value === 25 ? 'bg-gradient-to-br from-green-400 to-green-600' :
                        value === 100 ? 'bg-gradient-to-br from-purple-400 to-purple-600' :
                        'bg-gradient-to-br from-yellow-400 to-yellow-600'
                      } border-4 border-white/30 shadow-md flex items-center justify-center`}
                    >
                      <span className="text-white font-bold text-xs drop-shadow">{value}</span>
                      {/* Chip edge pattern */}
                      <div className="absolute inset-1 rounded-full border-2 border-dashed border-white/20" />
                    </button>
                  ))}
                </div>

                {/* Current Bet Info */}
                <div className="flex items-center gap-4">
                  {bets.length > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Total Bet</p>
                      <p className="text-lg font-bold text-white">{getTotalBet().toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={undoLastBet}
                    disabled={isSpinning || bets.length === 0}
                    className="border-gray-600 hover:bg-gray-700"
                  >
                    Undo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={doubleBets}
                    disabled={isSpinning || bets.length === 0}
                    className="border-gray-600 hover:bg-gray-700"
                  >
                    2x
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearBets}
                    disabled={isSpinning}
                    className="border-gray-600 hover:bg-gray-700"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={spin}
                    disabled={isSpinning || bets.length === 0}
                    className="px-8 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold shadow-lg shadow-green-500/30 disabled:opacity-50"
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
              <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-4 border border-gray-700/50 backdrop-blur">
                <p className="text-sm font-medium text-gray-300 mb-3">Current Bets ({bets.length})</p>
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
                      className="px-3 py-1 rounded-full bg-white/10 text-sm flex items-center gap-2"
                    >
                      <span className="text-gray-300">{key.replace('-', ' #')}</span>
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
