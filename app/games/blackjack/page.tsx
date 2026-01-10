"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  ArrowLeft, 
  Loader2, 
  Info, 
  Volume2, 
  VolumeX,
  RotateCcw,
  Sparkles,
  Trophy,
  Shield,
  Scissors,
  Hand,
  Square,
  Layers,
  HelpCircle
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

const CHIP_VALUES = [5, 10, 25, 50, 100, 500];
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
  return suit === "hearts" || suit === "diamonds" ? "text-red-600" : "text-gray-900";
};

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
    return <div className="w-20 h-28 sm:w-24 sm:h-32" />;
  }
  
  return (
    <div 
      className={`
        relative w-20 h-28 sm:w-24 sm:h-32 rounded-xl shadow-xl
        transform transition-all duration-500 ease-out
        ${isNew ? 'animate-deal-card' : ''}
        ${isRevealing ? 'animate-flip-card' : ''}
        ${isWinning ? 'animate-winning-glow' : ''}
        ${hidden ? 'card-back' : 'bg-white'}
        hover:translate-y-[-4px] hover:shadow-2xl
      `}
      style={{ 
        transformStyle: 'preserve-3d'
      }}
    >
      {hidden ? (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-2 rounded-lg border-2 border-blue-400/30">
            <div className="absolute inset-0 opacity-20">
              <div className="grid grid-cols-4 gap-1 p-1 h-full">
                {Array(16).fill(0).map((_, i) => (
                  <div key={i} className="bg-blue-300 rounded-sm" />
                ))}
              </div>
            </div>
          </div>
          <span className="text-4xl sm:text-5xl text-blue-300/50 font-bold">?</span>
        </div>
      ) : (
        <div className="absolute inset-0 p-1.5 sm:p-2 flex flex-col bg-white rounded-xl">
          <div className={`flex items-start justify-between ${getSuitColor(card.suit)}`}>
            <div className="flex flex-col items-center leading-none">
              <span className="text-lg sm:text-xl font-bold">{card.rank}</span>
              <span className="text-lg sm:text-xl">{getSuitSymbol(card.suit)}</span>
            </div>
          </div>
          <div className={`flex-1 flex items-center justify-center ${getSuitColor(card.suit)}`}>
            <span className="text-4xl sm:text-5xl">{getSuitSymbol(card.suit)}</span>
          </div>
          <div className={`flex items-end justify-end ${getSuitColor(card.suit)} rotate-180`}>
            <div className="flex flex-col items-center leading-none">
              <span className="text-lg sm:text-xl font-bold">{card.rank}</span>
              <span className="text-lg sm:text-xl">{getSuitSymbol(card.suit)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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
  const colors: Record<number, string> = {
    5: "from-red-500 to-red-700 border-red-300",
    10: "from-blue-500 to-blue-700 border-blue-300",
    25: "from-green-500 to-green-700 border-green-300",
    50: "from-orange-500 to-orange-700 border-orange-300",
    100: "from-gray-800 to-black border-gray-400",
    500: "from-purple-500 to-purple-700 border-purple-300",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-14 h-14 sm:w-16 sm:h-16 rounded-full 
        bg-gradient-to-b ${colors[value]} 
        border-4 border-dashed
        shadow-lg transform transition-all duration-200
        ${selected ? 'scale-110 ring-4 ring-yellow-400 ring-offset-2 ring-offset-green-800' : 'hover:scale-105'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-xl'}
        flex items-center justify-center
      `}
    >
      <div className="absolute inset-2 rounded-full border-2 border-white/20" />
      <span className="text-white font-bold text-sm sm:text-base drop-shadow-lg">{value}</span>
    </button>
  );
};

const HandValueBadge = ({ value, isSoft, isBlackjack, isBusted }: { 
  value: number; 
  isSoft: boolean; 
  isBlackjack: boolean;
  isBusted: boolean;
}) => (
  <div className={`
    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold
    ${isBlackjack ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black animate-pulse' : 
      isBusted ? 'bg-red-600 text-white' : 
      'bg-black/60 text-white backdrop-blur-sm'}
  `}>
    {isBlackjack && <Sparkles className="w-4 h-4" />}
    {isBusted ? 'BUST' : (isSoft && value <= 21 ? `Soft ${value}` : value)}
    {isBlackjack && <span className="ml-1">BLACKJACK!</span>}
  </div>
);

const ActionButton = ({ 
  onClick, 
  disabled, 
  variant = 'default',
  children,
  icon: Icon,
  shortcut
}: { 
  onClick: () => void; 
  disabled: boolean;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
}) => {
  const variants = {
    default: 'bg-gray-700 hover:bg-gray-600 text-white',
    primary: 'bg-blue-600 hover:bg-blue-500 text-white',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    warning: 'bg-amber-600 hover:bg-amber-500 text-white',
    danger: 'bg-red-600 hover:bg-red-500 text-white',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative flex items-center justify-center gap-2 
        px-5 py-3 sm:px-6 sm:py-3.5 rounded-xl font-bold text-sm sm:text-base
        ${variants[variant]}
        transform transition-all duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-lg active:scale-95'}
        shadow-lg
      `}
    >
      {Icon && <Icon className="w-4 h-4 sm:w-5 sm:h-5" />}
      {children}
      {shortcut && (
        <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-black/80 rounded text-[10px] text-gray-300">
          {shortcut}
        </span>
      )}
    </button>
  );
};

const ResultOverlay = ({ 
  result, 
  payout,
  onNewGame 
}: { 
  result: string; 
  payout: number;
  onNewGame: () => void;
}) => {
  const resultConfig: Record<string, { text: string; color: string; icon: React.ReactNode }> = {
    blackjack: { 
      text: "BLACKJACK!", 
      color: "from-yellow-500 to-amber-600",
      icon: <Sparkles className="w-12 h-12" />
    },
    win: { 
      text: "YOU WIN!", 
      color: "from-emerald-500 to-green-600",
      icon: <Trophy className="w-12 h-12" />
    },
    lose: { 
      text: "DEALER WINS", 
      color: "from-red-500 to-red-700",
      icon: <span className="text-5xl">😔</span>
    },
    push: { 
      text: "PUSH", 
      color: "from-gray-500 to-gray-700",
      icon: <span className="text-5xl">🤝</span>
    },
  };

  const config = resultConfig[result] || resultConfig.lose;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-3xl animate-fade-in">
      <div className="text-center space-y-4">
        <div className={`
          inline-flex flex-col items-center gap-3 px-8 py-6 rounded-2xl
          bg-gradient-to-b ${config.color} shadow-2xl
          animate-bounce-in
        `}>
          {config.icon}
          <span className="text-3xl sm:text-4xl font-black text-white drop-shadow-lg">
            {config.text}
          </span>
          {payout > 0 && (
            <span className="text-xl sm:text-2xl font-bold text-white/90">
              +{payout.toLocaleString()} tokens
            </span>
          )}
        </div>
        <Button 
          onClick={onNewGame}
          className="bg-white text-black hover:bg-gray-100 font-bold px-8 py-3 text-lg rounded-xl shadow-xl"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          Play Again
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
  const [showRules, setShowRules] = useState(false);
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

  const currentHand = gameState?.playerHands?.[gameState.currentHandIndex];

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      {/* Casino Table Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-800/30 via-green-900/20 to-transparent" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+CjxyZWN0IHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgZmlsbD0ibm9uZSI+PC9yZWN0Pgo8Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiPjwvY2lyY2xlPgo8L3N2Zz4=')] opacity-50" />
      </div>

      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-5xl relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/lobby">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg">
                <span className="text-2xl sm:text-3xl">🃏</span>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Blackjack</h1>
                <p className="text-green-400 font-semibold text-sm sm:text-base">
                  {balance.toLocaleString()} tokens
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowRules(!showRules)}
              className="text-white hover:bg-white/10"
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-white hover:bg-white/10"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Rules Panel */}
        {showRules && (
          <div className="mb-6 p-4 bg-black/40 backdrop-blur-sm rounded-xl border border-white/10 text-white text-sm">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              <Info className="w-5 h-5" /> Game Rules
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-gray-300">
              <div>• Blackjack pays <span className="text-green-400 font-bold">3:2</span></div>
              <div>• Dealer stands on 17</div>
              <div>• Double down on any two cards</div>
              <div>• Split pairs (same rank)</div>
              <div>• Insurance pays <span className="text-yellow-400 font-bold">2:1</span></div>
              <div>• Keyboard: H=Hit, S=Stand, D=Double, P=Split</div>
            </div>
          </div>
        )}

        {/* Game Area */}
        <div className="relative">
          {/* Casino Table */}
          <div className="relative bg-gradient-to-b from-green-800 to-green-900 rounded-3xl p-4 sm:p-8 shadow-2xl border-8 border-amber-900/80 min-h-[500px] sm:min-h-[600px]">
            {/* Table Felt Pattern */}
            <div className="absolute inset-4 border-2 border-green-600/30 rounded-2xl pointer-events-none" />
            
            {!gameState ? (
              /* Betting Interface */
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] sm:min-h-[500px] space-y-8">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white">Place Your Bet</h2>
                  <p className="text-green-300 text-sm sm:text-base">Choose chips or enter amount</p>
                </div>

                {/* Bet Display */}
                <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-8 py-6 text-center border border-white/10">
                  <p className="text-green-300 text-sm mb-1">Current Bet</p>
                  <p className="text-4xl sm:text-5xl font-bold text-white">
                    {betAmount.toLocaleString()}
                  </p>
                  <p className="text-green-400 text-sm mt-1">tokens</p>
                </div>

                {/* Chips */}
                <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
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

                {/* Quick Bet Buttons */}
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => quickBet(0)}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    Min
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => quickBet(0.5)}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    ½
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => quickBet(2)}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    2×
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => quickBet(-1)}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    Max
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setBetAmount(lastBet)}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Last
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setBetAmount(0)}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    Clear
                  </Button>
                </div>

                {/* Deal Button */}
                <Button 
                  onClick={startGame} 
                  disabled={isLoading || betAmount < 5 || betAmount > balance}
                  className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-bold text-lg sm:text-xl px-10 sm:px-12 py-6 sm:py-7 rounded-xl shadow-2xl transform transition-all duration-200 hover:scale-105"
                >
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <Layers className="w-6 h-6 mr-2" />
                      DEAL
                    </>
                  )}
                </Button>
              </div>
            ) : (
              /* Game in Progress */
              <div className="space-y-6 sm:space-y-8 relative">
                {/* Dealer Section */}
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-white/60 text-sm uppercase tracking-wider">Dealer</span>
                    {!isDealing && (gameState.status === "finished" || !gameState.dealerHidden) && (
                      <HandValueBadge 
                        value={gameState.dealerValue} 
                        isSoft={false}
                        isBlackjack={gameState.dealerHand.length === 2 && gameState.dealerValue === 21}
                        isBusted={gameState.dealerValue > 21}
                      />
                    )}
                    {isDealing && (
                      <span className="text-yellow-400 text-sm font-medium animate-pulse">Dealing...</span>
                    )}
                  </div>
                  <div className="flex justify-center gap-2 sm:gap-3 min-h-[128px] items-center">
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

                {/* Divider */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-green-500/50 to-transparent" />
                  <div className="px-4 py-2 bg-black/40 rounded-full border border-green-500/30">
                    <span className="text-green-400 font-bold text-sm">
                      Bet: {currentHand?.bet?.toLocaleString() || betAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-green-500/50 to-transparent" />
                </div>

                {/* Player Section */}
                <div className="text-center space-y-4">
                  {gameState.playerHands.map((hand, handIndex) => (
                    <div 
                      key={handIndex} 
                      className={`space-y-3 ${
                        gameState.playerHands.length > 1 && handIndex === gameState.currentHandIndex 
                          ? 'ring-2 ring-yellow-400 rounded-xl p-3 bg-black/20' 
                          : gameState.playerHands.length > 1 ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-white/60 text-sm uppercase tracking-wider">
                          {gameState.playerHands.length > 1 ? `Hand ${handIndex + 1}` : 'Your Hand'}
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
                      <div className="flex justify-center gap-2 sm:gap-3 min-h-[128px] items-center">
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

                {/* Action Buttons */}
                {gameState.status === "playing" && !isDealing && (
                  <div className="flex flex-wrap justify-center gap-2 sm:gap-3 pt-4">
                    <ActionButton 
                      onClick={() => handleAction("hit")} 
                      disabled={actionsDisabled || !gameState.canHit}
                      variant="primary"
                      icon={Hand}
                      shortcut="H"
                    >
                      Hit
                    </ActionButton>
                    <ActionButton 
                      onClick={() => handleAction("stand")} 
                      disabled={actionsDisabled || !gameState.canStand}
                      variant="warning"
                      icon={Square}
                      shortcut="S"
                    >
                      Stand
                    </ActionButton>
                    {gameState.canDouble && (
                      <ActionButton 
                        onClick={() => handleAction("double")} 
                        disabled={actionsDisabled}
                        variant="success"
                        icon={Layers}
                        shortcut="D"
                      >
                        Double
                      </ActionButton>
                    )}
                    {gameState.canSplit && (
                      <ActionButton 
                        onClick={() => handleAction("split")} 
                        disabled={actionsDisabled}
                        variant="default"
                        icon={Scissors}
                        shortcut="P"
                      >
                        Split
                      </ActionButton>
                    )}
                    {gameState.canInsurance && !gameState.insuranceTaken && (
                      <ActionButton 
                        onClick={() => handleAction("insurance")} 
                        disabled={actionsDisabled}
                        variant="danger"
                        icon={Shield}
                        shortcut="I"
                      >
                        Insurance
                      </ActionButton>
                    )}
                  </div>
                )}

                {/* Result Overlay */}
                {showResult && gameState.status === "finished" && gameState.result && (
                  <ResultOverlay 
                    result={gameState.result} 
                    payout={gameState.totalPayout || 0}
                    onNewGame={newGame}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes deal-card {
          0% {
            opacity: 0;
            transform: translateY(-80px) translateX(-30px) rotate(-10deg) scale(0.3);
          }
          60% {
            opacity: 1;
            transform: translateY(5px) translateX(0) rotate(2deg) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translateY(0) translateX(0) rotate(0) scale(1);
          }
        }
        
        @keyframes flip-card {
          0% {
            transform: rotateY(0deg);
          }
          50% {
            transform: rotateY(90deg);
          }
          100% {
            transform: rotateY(0deg);
          }
        }
        
        @keyframes winning-glow {
          0%, 100% {
            box-shadow: 0 0 10px rgba(250, 204, 21, 0.5), 0 0 20px rgba(250, 204, 21, 0.3);
          }
          50% {
            box-shadow: 0 0 20px rgba(250, 204, 21, 0.8), 0 0 40px rgba(250, 204, 21, 0.5);
          }
        }
        
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        
        @keyframes bounce-in {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes slide-up {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-deal-card {
          animation: deal-card 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
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
        
        .animate-slide-up {
          animation: slide-up 0.4s ease-out forwards;
        }
      `}</style>
    </main>
  );
}
