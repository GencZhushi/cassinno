"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { BETTING_SPOT_IDS } from "@/components/blackjack/BlackjackTableAnchors";

/* ── Types ── */
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
  isDoubled?: boolean;
  isSplit?: boolean;
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

/** Per-spot state for multi-hand play */
interface SpotState {
  sessionId: string | null;
  gameState: GameState | null;
  visiblePlayerCards: number;
  visibleDealerCards: number;
  showResult: boolean;
  revealingDealer: boolean;
  phase: "waiting" | "dealing" | "playing" | "dealer_turn" | "settled";
}

const emptySpotState = (): SpotState => ({
  sessionId: null,
  gameState: null,
  visiblePlayerCards: 0,
  visibleDealerCards: 0,
  showResult: false,
  revealingDealer: false,
  phase: "waiting",
});

type RoundPhase = "betting" | "dealing" | "playing" | "dealer_turn" | "settled";

const CARD_DEAL_DELAY = 400;
const DEALER_DRAW_DELAY = 700;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function useBlackjackGame() {
  /* ── Core state ── */
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState(0);
  const [selectedChip, setSelectedChip] = useState(10);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastSpotBets, setLastSpotBets] = useState<Record<string, number>>({});

  /* ── Multi-spot bets: map of spotId → bet amount ── */
  const [spotBets, setSpotBets] = useState<Record<string, number>>({});
  const [activeSpot, setActiveSpot] = useState<string | null>(null);

  /* ── Per-spot game states ── */
  const [spotStates, setSpotStates] = useState<Record<string, SpotState>>({});

  /* ── Global round state ── */
  const [roundPhase, setRoundPhase] = useState<RoundPhase>("betting");
  const [isLoading, setIsLoading] = useState(false);
  const [isDealing, setIsDealing] = useState(false);
  const [actionsDisabled, setActionsDisabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allSettled, setAllSettled] = useState(false);

  /* Ref to avoid stale closures in sequential play */
  const spotStatesRef = useRef(spotStates);
  spotStatesRef.current = spotStates;

  /* ── Derived: ordered list of spots that have bets ── */
  const activeSpotsOrdered = BETTING_SPOT_IDS.filter(
    (id) => (spotBets[id] || 0) > 0
  );

  /* ── Fetch balance on mount ── */
  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setBalance(parseInt(data.balance));
      }
    } catch {
      /* silent */
    }
  };

  /* ── Current active spot's game state (for action bar / keyboard) ── */
  const currentSpotState = activeSpot ? spotStates[activeSpot] : null;
  const currentGameState = currentSpotState?.gameState ?? null;

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!currentGameState || currentGameState.status !== "playing" || isLoading || actionsDisabled || isDealing) return;
      switch (e.key.toLowerCase()) {
        case "h": handleAction("hit"); break;
        case "s": handleAction("stand"); break;
        case "d": if (currentGameState.canDouble) handleAction("double"); break;
        case "p": if (currentGameState.canSplit) handleAction("split"); break;
        case "i": if (currentGameState.canInsurance) handleAction("insurance"); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGameState, isLoading, actionsDisabled, isDealing, activeSpot]);

  /* ── Place / adjust bet on a spot ── */
  const placeBetOnSpot = useCallback(
    (spotId: string) => {
      if (roundPhase !== "betting") return;
      const chip = selectedChip;
      setSpotBets((prev) => ({
        ...prev,
        [spotId]: (prev[spotId] || 0) + chip,
      }));
      setBetAmount((prev) => prev + chip);
      setActiveSpot(spotId);
    },
    [roundPhase, selectedChip]
  );

  const clearBets = useCallback(() => {
    setSpotBets({});
    setBetAmount(0);
    setActiveSpot(null);
  }, []);

  const rebet = useCallback(() => {
    const total = Object.values(lastSpotBets).reduce((s, v) => s + v, 0);
    if (total > balance || total < 1) return;
    setSpotBets({ ...lastSpotBets });
    setBetAmount(total);
  }, [lastSpotBets, balance]);

  /* ── Helper: update a single spot's state ── */
  const updateSpot = (spotId: string, patch: Partial<SpotState>) => {
    setSpotStates((prev) => ({
      ...prev,
      [spotId]: { ...(prev[spotId] || emptySpotState()), ...patch },
    }));
  };

  /* ── Animate initial deal for one spot ── */
  const animateInitialDeal = async (spotId: string, data: GameState) => {
    updateSpot(spotId, { phase: "dealing", visiblePlayerCards: 0, visibleDealerCards: 0, showResult: false });
    setIsDealing(true);

    await sleep(CARD_DEAL_DELAY);
    updateSpot(spotId, { visiblePlayerCards: 1 });
    await sleep(CARD_DEAL_DELAY);
    updateSpot(spotId, { visibleDealerCards: 1 });
    await sleep(CARD_DEAL_DELAY);
    updateSpot(spotId, { visiblePlayerCards: 2 });
    await sleep(CARD_DEAL_DELAY);
    updateSpot(spotId, { visibleDealerCards: 2 });
    await sleep(CARD_DEAL_DELAY);

    setIsDealing(false);

    if (data.status === "finished") {
      await animateDealerRevealAndResult(spotId, data);
    } else {
      updateSpot(spotId, { phase: "playing" });
      setActionsDisabled(false);
    }
  };

  const animateDealerRevealAndResult = async (spotId: string, data: GameState) => {
    setActionsDisabled(true);
    updateSpot(spotId, { phase: "dealer_turn", revealingDealer: true });
    await sleep(600);
    updateSpot(spotId, { revealingDealer: false });

    for (let i = 2; i < data.dealerHand.length; i++) {
      await sleep(DEALER_DRAW_DELAY);
      updateSpot(spotId, { visibleDealerCards: i + 1 });
    }

    await sleep(600);
    updateSpot(spotId, { showResult: true, phase: "settled" });
  };

  /* ── Start game: deal each spot sequentially ── */
  const startGame = async () => {
    const spots = BETTING_SPOT_IDS.filter((id) => (spotBets[id] || 0) > 0);
    if (spots.length === 0) { setError("Place a bet first"); return; }

    const totalBet = Object.values(spotBets).reduce((s, v) => s + v, 0);
    if (totalBet > balance) { setError("Insufficient balance"); return; }

    setIsLoading(true);
    setLastSpotBets({ ...spotBets });
    setError(null);
    setAllSettled(false);
    setRoundPhase("dealing");

    // Initialize all spot states
    const init: Record<string, SpotState> = {};
    for (const sid of spots) init[sid] = emptySpotState();
    setSpotStates(init);

    try {
      for (let idx = 0; idx < spots.length; idx++) {
        const spotId = spots[idx];
        const bet = spotBets[spotId];
        setActiveSpot(spotId);

        // Deal for this spot
        const res = await fetch("/api/games/blackjack/deal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: bet }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setBalance(parseInt(data.newBalance));
        updateSpot(spotId, {
          sessionId: data.sessionId,
          gameState: data.gameState,
        });

        setRoundPhase("dealing");
        setIsLoading(false);
        await animateInitialDeal(spotId, data.gameState);

        // If the hand needs player input, wait for it to finish
        if (data.gameState.status === "playing") {
          setRoundPhase("playing");
          // Wait until this spot is settled before moving to next
          await waitForSpotSettled(spotId);
        }
      }

      // All spots done
      setAllSettled(true);
      setRoundPhase("settled");
      setActiveSpot(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start game");
      setIsLoading(false);
    }
  };

  /* ── Wait for a spot to be settled (resolved via ref polling) ── */
  const waitForSpotSettled = (spotId: string): Promise<void> => {
    return new Promise((resolve) => {
      const check = () => {
        const st = spotStatesRef.current[spotId];
        if (st && st.phase === "settled") {
          resolve();
        } else {
          setTimeout(check, 200);
        }
      };
      check();
    });
  };

  /* ── Player action on the currently active spot ── */
  const handleAction = async (action: "hit" | "stand" | "double" | "split" | "insurance") => {
    if (!activeSpot || actionsDisabled) return;
    const spot = spotStatesRef.current[activeSpot];
    if (!spot?.sessionId) return;

    setActionsDisabled(true);
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/games/blackjack/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: spot.sessionId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const prevCount = spot.gameState?.playerHands[spot.gameState.currentHandIndex]?.cards.length || 0;
      const newCount = data.gameState.playerHands[data.gameState.currentHandIndex]?.cards.length || 0;

      updateSpot(activeSpot, { gameState: data.gameState });
      setBalance(parseInt(data.newBalance));
      setIsLoading(false);

      // Animate new card
      if ((action === "hit" || action === "double") && newCount > prevCount) {
        await sleep(100);
        updateSpot(activeSpot, { visiblePlayerCards: newCount });
        await sleep(CARD_DEAL_DELAY);
      }

      if (action === "split") {
        updateSpot(activeSpot, { visiblePlayerCards: 2 });
        await sleep(CARD_DEAL_DELAY * 2);
      }

      if (data.gameState.status === "finished") {
        updateSpot(activeSpot, { visibleDealerCards: 2 });
        await animateDealerRevealAndResult(activeSpot, data.gameState);
        // phase is now "settled" → the waitForSpotSettled promise resolves
      } else {
        setActionsDisabled(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
      setIsLoading(false);
      setActionsDisabled(false);
    }
  };

  /* ── New game / reset ── */
  const newGame = useCallback(() => {
    setSpotStates({});
    setActiveSpot(null);
    setIsDealing(false);
    setActionsDisabled(false);
    setRoundPhase("betting");
    setSpotBets({});
    setBetAmount(0);
    setError(null);
    setAllSettled(false);
    fetchBalance();
  }, []);

  /* ── Computed total payout across all spots ── */
  const totalPayout = Object.values(spotStates).reduce((sum, s) => {
    return sum + (s.gameState?.totalPayout || 0);
  }, 0);

  /* ── Aggregate result for the overlay ── */
  const overallResult = (() => {
    if (!allSettled) return null;
    const results = Object.values(spotStates).map((s) => s.gameState?.result).filter(Boolean);
    if (results.length === 0) return null;
    if (results.includes("blackjack")) return "blackjack";
    if (results.includes("win")) return "win";
    if (results.every((r) => r === "push")) return "push";
    if (results.some((r) => r === "win" || r === "push")) return "win";
    return "lose";
  })();

  return {
    /* State */
    balance,
    betAmount,
    selectedChip,
    roundPhase,
    isLoading,
    isDealing,
    actionsDisabled,
    soundEnabled,
    error,
    spotBets,
    activeSpot,
    lastSpotBets,
    allSettled,
    totalPayout,
    overallResult,

    /* Per-spot states */
    spotStates,
    currentGameState,
    activeSpotsOrdered,

    /* Actions */
    setSelectedChip,
    setBetAmount,
    setSoundEnabled,
    placeBetOnSpot,
    clearBets,
    rebet,
    startGame,
    handleAction,
    newGame,
  };
}

export type { CardData, HandData, GameState, RoundPhase, SpotState };
