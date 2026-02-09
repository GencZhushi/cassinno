"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  ArrowLeft, 
  Loader2, 
  Volume2, 
  VolumeX,
  RotateCcw,
  Sparkles,
  Trophy,
  Heart,
  Maximize2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CardData {
  suit: string;
  rank: string;
  value: number;
}

interface HandData {
  cards: CardData[];
  value: number;
  isSoft: boolean;
  isBlackjack: boolean;
  isBusted: boolean;
  bet: number;
}

interface GameState {
  playerHands: HandData[];
  currentHandIndex: number;
  dealerHand: CardData[];
  dealerValue: number;
  dealerHidden: boolean;
  status: "betting" | "playing" | "dealer_turn" | "finished";
  result?: "win" | "lose" | "push" | "blackjack";
  results?: Array<{ result: string; payout: number }>;
  canHit: boolean;
  canStand: boolean;
  canDouble: boolean;
  canSplit: boolean;
  canInsurance: boolean;
  insuranceTaken: boolean;
  totalPayout: number;
}

const CHIP_VALUES = [1, 5, 10, 25, 50, 100];
const CARD_DEAL_DELAY = 400;
const DEALER_DRAW_DELAY = 700;

const getSuitSymbol = (suit: string) => {
  const symbols: Record<string, string> = { 
    hearts: "♥", 
    diamonds: "♦", 
    clubs: "♣", 
    spades: "♠" 
  };
  return symbols[suit] || suit;
};

const getSuitColor = (suit: string) => {
  return suit === "hearts" || suit === "diamonds" ? "text-red-700" : "text-gray-900";
};

/* ── Classic Blackjack Gold Card ── */
const PlayingCard = ({ 
  card, 
  hidden,
  isNew = false,
  isWinning = false,
  isRevealing = false,
  visible = true
}: { 
  card: CardData; 
  hidden?: boolean; 
  index?: number;
  isNew?: boolean;
  isWinning?: boolean;
  isRevealing?: boolean;
  visible?: boolean;
}) => {
  if (!visible) {
    return <div className="w-[60px] h-[84px] sm:w-[72px] sm:h-[100px]" />;
  }
  
  return (
    <div 
      className={`
        relative w-[60px] h-[84px] sm:w-[72px] sm:h-[100px] rounded-md shadow-lg
        transform transition-all duration-500 ease-out
        ${isNew ? 'animate-deal-card' : ''}
        ${isRevealing ? 'animate-flip-card' : ''}
        ${isWinning ? 'animate-winning-glow' : ''}
        ${hidden ? '' : 'bg-white'}
      `}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {hidden ? (
        <div className="absolute inset-0 rounded-md overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #8B0000 0%, #A52A2A 30%, #8B0000 50%, #A52A2A 70%, #8B0000 100%)',
          }}>
          <div className="absolute inset-[3px] rounded-sm border border-yellow-600/40"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(139,0,0,0.3) 3px, rgba(139,0,0,0.3) 4px),
                repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(139,0,0,0.3) 3px, rgba(139,0,0,0.3) 4px)`,
              backgroundColor: '#B22222',
            }}
          />
        </div>
      ) : (
        <div className="absolute inset-0 p-1 flex flex-col bg-white rounded-md border border-gray-300">
          <div className={`flex items-start ${getSuitColor(card.suit)}`}>
            <div className="flex flex-col items-center leading-none">
              <span className="text-xs sm:text-sm font-bold">{card.rank}</span>
              <span className="text-xs sm:text-sm">{getSuitSymbol(card.suit)}</span>
            </div>
          </div>
          <div className={`flex-1 flex items-center justify-center ${getSuitColor(card.suit)}`}>
            <span className="text-2xl sm:text-3xl">{getSuitSymbol(card.suit)}</span>
          </div>
          <div className={`flex items-end justify-end ${getSuitColor(card.suit)} rotate-180`}>
            <div className="flex flex-col items-center leading-none">
              <span className="text-xs sm:text-sm font-bold">{card.rank}</span>
              <span className="text-xs sm:text-sm">{getSuitSymbol(card.suit)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Classic Casino Chip ── */
const Chip = ({ 
  value, 
  selected, 
  onClick,
  disabled 
}: { 
  value: number; 
  selected: boolean; 
  onClick: () => void;
  disabled?: boolean;
}) => {
  const chipStyles: Record<number, { bg: string; border: string; inner: string }> = {
    1: { bg: '#FFFFFF', border: '#CCCCCC', inner: '#4169E1' },
    5: { bg: '#E53E3E', border: '#C53030', inner: '#FEB2B2' },
    10: { bg: '#3182CE', border: '#2B6CB0', inner: '#BEE3F8' },
    25: { bg: '#38A169', border: '#2F855A', inner: '#C6F6D5' },
    50: { bg: '#DD6B20', border: '#C05621', inner: '#FEEBC8' },
    100: { bg: '#1A202C', border: '#2D3748', inner: '#A0AEC0' },
  };
  const s = chipStyles[value] || chipStyles[1];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-12 h-12 sm:w-14 sm:h-14 rounded-full 
        shadow-lg transform transition-all duration-200
        ${selected ? 'scale-115 -translate-y-2 z-10' : 'hover:scale-105 hover:-translate-y-1'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        flex items-center justify-center
      `}
      style={{
        background: s.bg,
        border: `3px dashed ${s.border}`,
        boxShadow: selected ? `0 0 12px 3px rgba(255,215,0,0.7), 0 4px 12px rgba(0,0,0,0.4)` : `0 2px 8px rgba(0,0,0,0.3)`,
      }}
    >
      <div className="absolute inset-[5px] rounded-full" 
        style={{ border: `2px solid ${s.inner}`, opacity: 0.5 }} />
      <span className="font-bold text-xs sm:text-sm drop-shadow"
        style={{ color: value === 1 ? '#1A202C' : '#FFFFFF' }}
      >{value}</span>
    </button>
  );
};

/* ── Hand Value Badge (gold style) ── */
const HandValueBadge = ({ value, isSoft, isBlackjack, isBusted }: { 
  value: number; 
  isSoft: boolean; 
  isBlackjack: boolean;
  isBusted: boolean;
}) => (
  <div className={`
    inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border
    ${isBlackjack ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black border-yellow-300 animate-pulse' : 
      isBusted ? 'bg-red-700 text-white border-red-500' : 
      'bg-black/70 text-yellow-200 border-yellow-600/50'}
  `}>
    {isBlackjack && <Sparkles className="w-3 h-3" />}
    {isBusted ? 'BUST' : (isSoft && value <= 21 ? `Soft ${value}` : value)}
    {isBlackjack && <span className="ml-1">BLACKJACK!</span>}
  </div>
);

/* ── Result Overlay (classic gold style) ── */
const ResultOverlay = ({ 
  result, 
  payout,
  onNewGame 
}: { 
  result: string; 
  payout: number;
  onNewGame: () => void;
}) => {
  const resultConfig: Record<string, { text: string; bg: string; icon: React.ReactNode }> = {
    blackjack: { 
      text: "BLACKJACK!", 
      bg: "linear-gradient(135deg, #B8860B, #FFD700, #B8860B)",
      icon: <Sparkles className="w-10 h-10 text-yellow-900" />
    },
    win: { 
      text: "YOU WIN!", 
      bg: "linear-gradient(135deg, #2F855A, #48BB78, #2F855A)",
      icon: <Trophy className="w-10 h-10 text-yellow-300" />
    },
    lose: { 
      text: "DEALER WINS", 
      bg: "linear-gradient(135deg, #9B2C2C, #E53E3E, #9B2C2C)",
      icon: <span className="text-4xl">�</span>
    },
    push: { 
      text: "PUSH", 
      bg: "linear-gradient(135deg, #4A5568, #718096, #4A5568)",
      icon: <span className="text-4xl">🤝</span>
    },
  };

  const config = resultConfig[result] || resultConfig.lose;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg animate-fade-in">
      <div className="text-center space-y-4">
        <div className="inline-flex flex-col items-center gap-3 px-10 py-6 rounded-xl shadow-2xl animate-bounce-in border-2 border-yellow-600/50"
          style={{ background: config.bg }}>
          {config.icon}
          <span className="text-2xl sm:text-3xl font-black text-white drop-shadow-lg tracking-wide">
            {config.text}
          </span>
          {payout > 0 && (
            <span className="text-lg sm:text-xl font-bold text-white/90">
              +{payout.toLocaleString()} tokens
            </span>
          )}
        </div>
        <Button 
          onClick={onNewGame}
          className="bg-gradient-to-b from-yellow-600 to-yellow-800 hover:from-yellow-500 hover:to-yellow-700 text-white font-bold px-8 py-3 text-base rounded-lg shadow-xl border border-yellow-500/50"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          New Hand
        </Button>
      </div>
    </div>
  );
};

export default function BlackjackPage() {
  const { toast } = useToast();
  const [balance, setBalance] = useState<number>(0);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [selectedChip, setSelectedChip] = useState<number>(10);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastBet, setLastBet] = useState<number>(10);
  
  // Animation states
  const [isDealing, setIsDealing] = useState(false);
  const [, setIsDealerTurn] = useState(false);
  const [visiblePlayerCards, setVisiblePlayerCards] = useState<number>(0);
  const [visibleDealerCards, setVisibleDealerCards] = useState<number>(0);
  const [showResult, setShowResult] = useState(false);
  const [revealingDealer, setRevealingDealer] = useState(false);
  const [actionsDisabled, setActionsDisabled] = useState(false);

  useEffect(() => {
    fetchBalance();
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameState?.status !== "playing" || isLoading || actionsDisabled || isDealing) return;
      
      switch (e.key.toLowerCase()) {
        case 'h': handleAction("hit"); break;
        case 's': handleAction("stand"); break;
        case 'd': if (gameState.canDouble) handleAction("double"); break;
        case 'p': if (gameState.canSplit) handleAction("split"); break;
        case 'i': if (gameState.canInsurance) handleAction("insurance"); break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, isLoading, actionsDisabled, isDealing]);

  const fetchBalance = async () => {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const data = await res.json();
      setBalance(parseInt(data.balance));
    }
  };

  const adjustBet = (amount: number) => {
    const newBet = Math.max(5, Math.min(balance, betAmount + amount));
    setBetAmount(newBet);
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const animateInitialDeal = async (gameData: GameState) => {
    setIsDealing(true);
    setActionsDisabled(true);
    setVisiblePlayerCards(0);
    setVisibleDealerCards(0);
    setShowResult(false);
    
    // Deal cards one by one: Player, Dealer, Player, Dealer
    await sleep(CARD_DEAL_DELAY);
    setVisiblePlayerCards(1); // Player card 1
    
    await sleep(CARD_DEAL_DELAY);
    setVisibleDealerCards(1); // Dealer card 1
    
    await sleep(CARD_DEAL_DELAY);
    setVisiblePlayerCards(2); // Player card 2
    
    await sleep(CARD_DEAL_DELAY);
    setVisibleDealerCards(2); // Dealer card 2 (hidden)
    
    await sleep(CARD_DEAL_DELAY);
    setIsDealing(false);
    
    // Check if game is already finished (blackjack)
    if (gameData.status === "finished") {
      await animateDealerRevealAndResult(gameData);
    } else {
      setActionsDisabled(false);
    }
  };

  const animateDealerRevealAndResult = async (gameData: GameState) => {
    setActionsDisabled(true);
    setRevealingDealer(true);
    
    // Reveal dealer's hidden card
    await sleep(600);
    setRevealingDealer(false);
    
    // Show any additional dealer cards one by one
    const currentDealerCards = visibleDealerCards;
    for (let i = currentDealerCards; i < gameData.dealerHand.length; i++) {
      await sleep(DEALER_DRAW_DELAY);
      setVisibleDealerCards(i + 1);
    }
    
    // Show result after a brief pause
    await sleep(800);
    setShowResult(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const animateNewCard = async (isPlayerCard: boolean, gameData: GameState) => {
    if (isPlayerCard) {
      const newCount = gameData.playerHands[gameData.currentHandIndex].cards.length;
      setVisiblePlayerCards(newCount);
    }
  };

  const startGame = async () => {
    if (betAmount < 5) {
      toast({ title: "Minimum bet is 5 tokens", variant: "destructive" });
      return;
    }
    if (betAmount > balance) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setLastBet(betAmount);
    setShowResult(false);
    
    try {
      const res = await fetch("/api/games/blackjack/deal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: betAmount }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSessionId(data.sessionId);
      setGameState(data.gameState);
      setBalance(parseInt(data.newBalance));
      setIsLoading(false);
      
      // Start dealing animation
      await animateInitialDeal(data.gameState);
    } catch (error) {
      toast({ 
        title: error instanceof Error ? error.message : "Failed to start game", 
        variant: "destructive" 
      });
      setIsLoading(false);
    }
  };

  const handleAction = async (actionType: "hit" | "stand" | "double" | "split" | "insurance") => {
    if (!sessionId || actionsDisabled) return;

    setActionsDisabled(true);
    setIsLoading(true);
    
    try {
      const res = await fetch("/api/games/blackjack/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action: actionType }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const prevCardCount = gameState?.playerHands[gameState.currentHandIndex]?.cards.length || 0;
      const newCardCount = data.gameState.playerHands[data.gameState.currentHandIndex]?.cards.length || 0;
      
      setGameState(data.gameState);
      setBalance(parseInt(data.newBalance));
      setIsLoading(false);

      // Animate new card if hit or double
      if ((actionType === "hit" || actionType === "double") && newCardCount > prevCardCount) {
        await sleep(100);
        setVisiblePlayerCards(newCardCount);
        await sleep(CARD_DEAL_DELAY);
      }

      // Handle split - show new hands
      if (actionType === "split") {
        setVisiblePlayerCards(2);
        await sleep(CARD_DEAL_DELAY * 2);
      }

      // Check if game is finished
      if (data.gameState.status === "finished") {
        setVisibleDealerCards(2); // Ensure both dealer cards are tracked
        await animateDealerRevealAndResult(data.gameState);
      } else {
        setActionsDisabled(false);
      }
    } catch (error) {
      toast({ 
        title: error instanceof Error ? error.message : "Action failed", 
        variant: "destructive" 
      });
      setIsLoading(false);
      setActionsDisabled(false);
    }
  };

  const newGame = () => {
    setGameState(null);
    setSessionId(null);
    setVisiblePlayerCards(0);
    setVisibleDealerCards(0);
    setShowResult(false);
    setIsDealing(false);
    setIsDealerTurn(false);
    setRevealingDealer(false);
    setActionsDisabled(false);
    fetchBalance();
  };

  const quickBet = (multiplier: number) => {
    if (multiplier === 0) {
      setBetAmount(5);
    } else if (multiplier === -1) {
      setBetAmount(balance);
    } else {
      setBetAmount(Math.min(balance, Math.max(5, Math.floor(betAmount * multiplier))));
    }
  };

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#1a1a1a' }}>
      {/* ═══ TOP HEADER BAR ═══ */}
      <div className="flex items-center justify-between px-3 py-2" style={{ background: 'linear-gradient(180deg, #3a3a3a 0%, #222 100%)' }}>
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white hover:bg-white/10 h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm sm:text-base tracking-wide">Classic Blackjack Gold</span>
          <span className="text-gray-400 text-xs">ⓘ</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-1.5 text-gray-400 hover:text-white transition-colors">
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button className="p-1.5 text-gray-400 hover:text-white transition-colors">
            <Heart className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-gray-400 hover:text-white transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ═══ SUB HEADER ═══ */}
      <div className="text-center py-1" style={{ background: 'linear-gradient(180deg, #4a6741 0%, #3d5a35 100%)', borderBottom: '1px solid #2a4022' }}>
        <span className="text-yellow-300/90 text-xs font-medium tracking-wider">Classic Blackjack Gold</span>
      </div>

      {/* ═══ MAIN TABLE AREA ═══ */}
      <div className="flex-1 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #2d5a1e 0%, #306020 20%, #357030 50%, #2a5518 80%, #1e4010 100%)' }}>
        {/* Felt texture overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='1' height='1' fill='%23000'/%3E%3C/svg%3E")`,
            backgroundSize: '4px 4px',
          }}
        />

        {/* ── Min / Max limits box ── */}
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10">
          <div className="text-[10px] sm:text-xs font-mono border border-gray-500/40 rounded-sm overflow-hidden" style={{ background: '#1a1a1a' }}>
            <div className="flex justify-between gap-4 px-2 py-0.5 border-b border-gray-600/30">
              <span className="text-gray-300">Min</span>
              <span className="text-white font-bold">1</span>
            </div>
            <div className="flex justify-between gap-4 px-2 py-0.5">
              <span className="text-gray-300">Max</span>
              <span className="text-white font-bold">200</span>
            </div>
          </div>
        </div>

        {/* ── Chip Rack (top center) ── */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-[25%] z-10 hidden sm:flex">
          <div className="flex gap-0.5 px-3 py-1 rounded-b-lg" style={{ background: 'linear-gradient(180deg, #5a3a1a, #8B5E3C, #6a4422)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
            {['#E53E3E','#3182CE','#38A169','#DD6B20','#1A202C','#805AD5','#D69E2E'].map((c, i) => (
              <div key={i} className="w-2 h-6 sm:w-3 sm:h-8 rounded-b-sm" style={{ background: c, boxShadow: `inset 0 -2px 4px rgba(0,0,0,0.3)` }} />
            ))}
          </div>
        </div>

        {/* ── Card Shoe (top right) ── */}
        <div className="absolute top-2 right-3 sm:top-3 sm:right-4 z-10">
          <div className="w-10 h-14 sm:w-14 sm:h-20 rounded-sm relative" 
            style={{ 
              background: 'linear-gradient(135deg, #8B6914 0%, #A0792C 30%, #6B5210 70%, #8B6914 100%)',
              boxShadow: '2px 3px 8px rgba(0,0,0,0.5)',
              border: '1px solid #A0792C'
            }}>
            <div className="absolute inset-1 rounded-sm flex items-center justify-center"
              style={{ background: 'repeating-linear-gradient(45deg, #8B0000, #8B0000 2px, #A52A2A 2px, #A52A2A 4px)' }}>
              <div className="w-5 h-7 sm:w-7 sm:h-10 border border-yellow-600/40 rounded-sm" style={{ background: '#B22222' }} />
            </div>
          </div>
        </div>

        {/* ═══ TABLE FELT CONTENT ═══ */}
        <div className="relative z-[5] flex flex-col items-center pt-10 sm:pt-14 pb-4">
          
          {/* ── Decorative Table Text ── */}
          <div className="text-center mb-2 sm:mb-4 pointer-events-none select-none">
            <div className="text-xl sm:text-3xl font-serif italic text-green-300/25 tracking-[0.15em] leading-tight" style={{ fontFamily: "'Georgia', serif" }}>
              Classic
            </div>
            <div className="text-2xl sm:text-4xl font-bold text-green-300/20 tracking-[0.3em] -mt-1" style={{ fontFamily: "'Georgia', serif", fontVariant: 'small-caps' }}>
              BLACKJACK
            </div>
          </div>
          
          {/* ── Curved rules text ── */}
          <div className="text-center mb-4 sm:mb-6 pointer-events-none select-none space-y-0">
            <div className="text-[10px] sm:text-xs text-green-400/20 font-bold tracking-[0.2em] uppercase">
              Blackjack Pays 3 to 2
            </div>
            <div className="text-[9px] sm:text-[11px] text-green-400/18 tracking-[0.15em] uppercase">
              Dealer Must Stand on All 17
            </div>
            <div className="text-[9px] sm:text-[11px] text-green-400/15 tracking-[0.12em] uppercase">
              Insurance Pays 2 to 1
            </div>
          </div>

          {/* ═══ DEALER AREA ═══ */}
          {gameState && (
            <div className="text-center mb-2 sm:mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-green-200/60 text-[10px] sm:text-xs uppercase tracking-widest font-medium">Dealer</span>
                {!isDealing && (gameState.status === "finished" || !gameState.dealerHidden) && (
                  <HandValueBadge 
                    value={gameState.dealerValue} 
                    isSoft={false}
                    isBlackjack={gameState.dealerHand.length === 2 && gameState.dealerValue === 21}
                    isBusted={gameState.dealerValue > 21}
                  />
                )}
                {isDealing && (
                  <span className="text-yellow-400/80 text-[10px] font-medium animate-pulse">Dealing...</span>
                )}
              </div>
              <div className="flex justify-center gap-1.5 sm:gap-2 min-h-[90px] sm:min-h-[106px] items-center">
                {gameState.dealerHand.map((card, i) => (
                  <PlayingCard 
                    key={i} 
                    card={card} 
                    index={i}
                    visible={i < visibleDealerCards}
                    isNew={i === visibleDealerCards - 1 && (isDealing || i >= 2)}
                    hidden={i === 1 && gameState.dealerHidden && !revealingDealer}
                    isRevealing={i === 1 && revealingDealer}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Card outline spots (when no game) ── */}
          {!gameState && (
            <div className="flex justify-center gap-4 mb-6">
              {[0,1].map(i => (
                <div key={i} className="w-[60px] h-[84px] sm:w-[72px] sm:h-[100px] rounded-md border-2 border-green-500/15" />
              ))}
            </div>
          )}

          {/* ── Bet display / betting circle ── */}
          <div className="flex justify-center mb-3 sm:mb-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 flex flex-col items-center justify-center"
              style={{ 
                borderColor: 'rgba(255,255,255,0.12)',
                background: gameState ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.15)',
              }}>
              {betAmount > 0 && (
                <>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-0.5"
                    style={{
                      background: betAmount >= 100 ? '#1A202C' : betAmount >= 50 ? '#DD6B20' : betAmount >= 25 ? '#38A169' : betAmount >= 10 ? '#3182CE' : betAmount >= 5 ? '#E53E3E' : '#FFFFFF',
                      border: '3px dashed rgba(255,255,255,0.3)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    }}>
                    <span className="font-bold text-xs text-white drop-shadow">{betAmount}</span>
                  </div>
                  <span className="text-white text-[9px] sm:text-[10px] font-medium">{betAmount.toLocaleString()} tokens</span>
                </>
              )}
            </div>
          </div>

          {/* ── Player card outline spots (when no game) ── */}
          {!gameState && (
            <div className="flex justify-center gap-4 mb-4">
              {[0,1].map(i => (
                <div key={i} className="w-[60px] h-[84px] sm:w-[72px] sm:h-[100px] rounded-md border-2 border-green-500/15" />
              ))}
            </div>
          )}

          {/* ═══ PLAYER AREA ═══ */}
          {gameState && (
            <div className="text-center mb-2">
              {gameState.playerHands.map((hand, handIndex) => (
                <div key={handIndex} className={`mb-2 ${
                  gameState.playerHands.length > 1 && handIndex === gameState.currentHandIndex 
                    ? 'ring-1 ring-yellow-400/60 rounded-lg p-2 bg-black/10' 
                    : gameState.playerHands.length > 1 ? 'opacity-50' : ''
                }`}>
                  <div className="flex items-center justify-center gap-2 mb-1.5">
                    <span className="text-green-200/60 text-[10px] sm:text-xs uppercase tracking-widest font-medium">
                      {gameState.playerHands.length > 1 ? `Hand ${handIndex + 1}` : 'Player'}
                    </span>
                    {(!isDealing || visiblePlayerCards >= 2) && (
                      <HandValueBadge 
                        value={hand.value} 
                        isSoft={hand.isSoft}
                        isBlackjack={hand.isBlackjack}
                        isBusted={hand.isBusted}
                      />
                    )}
                  </div>
                  <div className="flex justify-center gap-1.5 sm:gap-2 min-h-[90px] sm:min-h-[106px] items-center">
                    {hand.cards.map((card, i) => (
                      <PlayingCard 
                        key={i} 
                        card={card} 
                        index={i}
                        visible={handIndex === 0 ? i < visiblePlayerCards : true}
                        isNew={handIndex === 0 && i === visiblePlayerCards - 1}
                        isWinning={showResult && gameState.results?.[handIndex]?.result === "win"}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ ACTION BUTTONS (during play) ═══ */}
          {gameState && gameState.status === "playing" && !isDealing && (
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-2">
              <button
                onClick={() => handleAction("hit")}
                disabled={actionsDisabled || !gameState.canHit}
                className="px-5 py-2 sm:px-6 sm:py-2.5 rounded-lg font-bold text-sm sm:text-base text-white shadow-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-95"
                style={{ background: 'linear-gradient(180deg, #3B82F6, #1D4ED8)' }}
              >
                Hit <span className="text-[10px] opacity-60 ml-1">[H]</span>
              </button>
              <button
                onClick={() => handleAction("stand")}
                disabled={actionsDisabled || !gameState.canStand}
                className="px-5 py-2 sm:px-6 sm:py-2.5 rounded-lg font-bold text-sm sm:text-base text-white shadow-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-95"
                style={{ background: 'linear-gradient(180deg, #D97706, #B45309)' }}
              >
                Stand <span className="text-[10px] opacity-60 ml-1">[S]</span>
              </button>
              {gameState.canDouble && (
                <button
                  onClick={() => handleAction("double")}
                  disabled={actionsDisabled}
                  className="px-5 py-2 sm:px-6 sm:py-2.5 rounded-lg font-bold text-sm sm:text-base text-white shadow-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-95"
                  style={{ background: 'linear-gradient(180deg, #059669, #047857)' }}
                >
                  Double <span className="text-[10px] opacity-60 ml-1">[D]</span>
                </button>
              )}
              {gameState.canSplit && (
                <button
                  onClick={() => handleAction("split")}
                  disabled={actionsDisabled}
                  className="px-5 py-2 sm:px-6 sm:py-2.5 rounded-lg font-bold text-sm sm:text-base text-white shadow-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-95"
                  style={{ background: 'linear-gradient(180deg, #6B7280, #4B5563)' }}
                >
                  Split <span className="text-[10px] opacity-60 ml-1">[P]</span>
                </button>
              )}
              {gameState.canInsurance && !gameState.insuranceTaken && (
                <button
                  onClick={() => handleAction("insurance")}
                  disabled={actionsDisabled}
                  className="px-5 py-2 sm:px-6 sm:py-2.5 rounded-lg font-bold text-sm sm:text-base text-white shadow-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-95"
                  style={{ background: 'linear-gradient(180deg, #DC2626, #B91C1C)' }}
                >
                  Insurance <span className="text-[10px] opacity-60 ml-1">[I]</span>
                </button>
              )}
            </div>
          )}

          {/* Result Overlay */}
          {showResult && gameState && gameState.status === "finished" && gameState.result && (
            <ResultOverlay 
              result={gameState.result} 
              payout={gameState.totalPayout || 0}
              onNewGame={newGame}
            />
          )}
        </div>
      </div>

      {/* ═══ BOTTOM WOOD PANEL ═══ */}
      <div className="relative" style={{ 
        background: 'linear-gradient(180deg, #6B3A1F 0%, #8B5E3C 15%, #A0704D 30%, #7a4a2a 60%, #5a3218 100%)',
        borderTop: '3px solid #3a2010',
        minHeight: '120px',
      }}>
        {/* Wood grain texture */}
        <div className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(0,0,0,0.15) 20px, rgba(0,0,0,0.15) 22px)`,
          }}
        />

        <div className="relative z-10 px-4 py-3">
          {/* ── Chips Row ── */}
          {(!gameState || gameState.status === "betting") && (
            <div className="flex justify-center gap-2 sm:gap-3 mb-3">
              {CHIP_VALUES.map((value) => (
                <Chip
                  key={value}
                  value={value}
                  selected={selectedChip === value}
                  onClick={() => {
                    setSelectedChip(value);
                    adjustBet(value);
                  }}
                  disabled={value > balance}
                />
              ))}
            </div>
          )}

          {/* ── Bottom Controls Row ── */}
          <div className="flex items-center justify-between">
            {/* Left: Balance */}
            <div className="flex items-center gap-2">
              {gameState && (
                <Chip value={selectedChip} selected={false} onClick={() => {}} disabled />
              )}
              <div>
                <span className="text-yellow-100/70 text-[10px] sm:text-xs block leading-tight">Balance:</span>
                <span className="text-white font-bold text-sm sm:text-base">{balance.toLocaleString()} tokens</span>
              </div>
            </div>

            {/* Center: Clear Bets / Quick Bets */}
            <div className="flex items-center gap-2">
              {!gameState && (
                <>
                  <button
                    onClick={() => quickBet(0.5)}
                    className="px-3 py-1 text-[10px] sm:text-xs rounded border text-yellow-100/80 hover:bg-white/10 transition-colors"
                    style={{ borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)' }}
                  >
                    ½
                  </button>
                  <button
                    onClick={() => quickBet(2)}
                    className="px-3 py-1 text-[10px] sm:text-xs rounded border text-yellow-100/80 hover:bg-white/10 transition-colors"
                    style={{ borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)' }}
                  >
                    2×
                  </button>
                  <button
                    onClick={() => setBetAmount(0)}
                    className="px-4 py-1.5 text-[10px] sm:text-xs rounded border text-yellow-100/80 hover:bg-white/10 transition-colors font-medium"
                    style={{ borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.25)' }}
                  >
                    Clear Bets
                  </button>
                </>
              )}
              {gameState && gameState.status === "finished" && (
                <button
                  onClick={() => { newGame(); setBetAmount(lastBet); }}
                  className="px-4 py-1.5 text-xs rounded border text-yellow-100/80 hover:bg-white/10 transition-colors font-medium"
                  style={{ borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.25)' }}
                >
                  <RotateCcw className="w-3 h-3 inline mr-1" />
                  Rebet
                </button>
              )}
            </div>

            {/* Right: Deal Button */}
            <div>
              {!gameState && (
                <button
                  onClick={startGame}
                  disabled={isLoading || betAmount < 1 || betAmount > balance}
                  className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ 
                    background: 'linear-gradient(180deg, #5a6b4a 0%, #4a5a3a 50%, #3a4a2a 100%)',
                    border: '3px solid #6a7b5a',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.1)',
                  }}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                  ) : (
                    <>
                      <span className="text-white text-lg">🃏</span>
                      <span className="text-white text-[9px] sm:text-[10px] font-bold -mt-0.5">Deal</span>
                    </>
                  )}
                </button>
              )}
              {gameState && gameState.status === "finished" && (
                <button
                  onClick={newGame}
                  className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{ 
                    background: 'linear-gradient(180deg, #5a6b4a 0%, #4a5a3a 50%, #3a4a2a 100%)',
                    border: '3px solid #6a7b5a',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.1)',
                  }}
                >
                  <span className="text-white text-lg">🃏</span>
                  <span className="text-white text-[9px] sm:text-[10px] font-bold -mt-0.5">Deal</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes deal-card {
          0% {
            opacity: 0;
            transform: translateY(-60px) translateX(-20px) rotate(-8deg) scale(0.4);
          }
          60% {
            opacity: 1;
            transform: translateY(3px) translateX(0) rotate(1deg) scale(1.01);
          }
          100% {
            opacity: 1;
            transform: translateY(0) translateX(0) rotate(0) scale(1);
          }
        }
        
        @keyframes flip-card {
          0% { transform: rotateY(0deg); }
          50% { transform: rotateY(90deg); }
          100% { transform: rotateY(0deg); }
        }
        
        @keyframes winning-glow {
          0%, 100% {
            box-shadow: 0 0 8px rgba(255, 215, 0, 0.5), 0 0 16px rgba(255, 215, 0, 0.3);
          }
          50% {
            box-shadow: 0 0 16px rgba(255, 215, 0, 0.8), 0 0 32px rgba(255, 215, 0, 0.5);
          }
        }
        
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        
        @keyframes bounce-in {
          0% { opacity: 0; transform: scale(0.3); }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        
        .animate-deal-card {
          animation: deal-card 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-flip-card {
          animation: flip-card 0.5s ease-in-out forwards;
        }
        .animate-winning-glow {
          animation: winning-glow 1.5s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out forwards;
        }
      `}</style>
    </main>
  );
}
