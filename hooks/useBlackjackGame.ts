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

/** Per-spot game data from the server */
interface SpotGameData {
  playerHands: HandData[];
  currentHandIndex: number;
  status: string;
  result?: string;
  results?: Array<{ result: string; payout: number }>;
  canHit: boolean;
  canStand: boolean;
  canDouble: boolean;
  canSplit: boolean;
  canInsurance: boolean;
  insuranceTaken: boolean;
  totalPayout: number;
}

/** Per-spot local UI state */
interface SpotState {
  gameData: SpotGameData | null;
  visiblePlayerCards: number;
  showResult: boolean;
  phase: "waiting" | "dealing" | "playing" | "done" | "settled";
}

/** Shared dealer state */
interface DealerState {
  cards: CardData[];
  value: number;
  hidden: boolean;
  visibleCards: number;
  revealing: boolean;
}

const emptySpotState = (): SpotState => ({
  gameData: null,
  visiblePlayerCards: 0,
  showResult: false,
  phase: "waiting",
});

const emptyDealerState = (): DealerState => ({
  cards: [],
  value: 0,
  hidden: true,
  visibleCards: 0,
  revealing: false,
});

type RoundPhase = "betting" | "dealing" | "playing" | "dealer_turn" | "settled";

const CARD_DEAL_DELAY = 400;
const DEALER_DRAW_DELAY = 700;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const GUEST_BALANCE = 1000;
const GUEST_MAX_GAMES = 3;
const GUEST_GAMES_KEY = "blackjack_guest_games";

function getGuestGamesPlayed(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(GUEST_GAMES_KEY) || "0", 10);
}

function incrementGuestGames(): number {
  const count = getGuestGamesPlayed() + 1;
  localStorage.setItem(GUEST_GAMES_KEY, count.toString());
  return count;
}

export default function useBlackjackGame() {
  /* ── Core state ── */
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState(0);
  const [selectedChip, setSelectedChip] = useState(10);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastSpotBets, setLastSpotBets] = useState<Record<string, number>>({});

  /* ── Guest mode ── */
  const [isGuest, setIsGuest] = useState(false);
  const [guestBalance, setGuestBalance] = useState(GUEST_BALANCE);
  const [guestGamesPlayed, setGuestGamesPlayed] = useState(0);
  const guestLimitReached = isGuest && guestGamesPlayed >= GUEST_MAX_GAMES;

  /* ── Multi-spot bets: map of spotId → bet amount ── */
  const [spotBets, setSpotBets] = useState<Record<string, number>>({});
  const [activeSpot, setActiveSpot] = useState<string | null>(null);

  /* ── Shared session ── */
  const [sessionId, setSessionId] = useState<string | null>(null);

  /* ── Per-spot UI states ── */
  const [spotStates, setSpotStates] = useState<Record<string, SpotState>>({});

  /* ── Shared dealer state ── */
  const [dealerState, setDealerState] = useState<DealerState>(emptyDealerState());

  /* ── Spot play order from server ── */
  const [spotOrder, setSpotOrder] = useState<string[]>([]);

  /* ── Global round state ── */
  const [roundPhase, setRoundPhase] = useState<RoundPhase>("betting");
  const [isLoading, setIsLoading] = useState(false);
  const [isDealing, setIsDealing] = useState(false);
  const [actionsDisabled, setActionsDisabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allSettled, setAllSettled] = useState(false);
  const [totalPayout, setTotalPayout] = useState(0);

  /* Refs to avoid stale closures */
  const sessionRef = useRef(sessionId);
  sessionRef.current = sessionId;
  const spotStatesRef = useRef(spotStates);
  spotStatesRef.current = spotStates;

  /* ── Derived: ordered list of spots that have bets ── */
  const activeSpotsOrdered = BETTING_SPOT_IDS.filter(
    (id) => (spotBets[id] || 0) > 0
  );

  /* ── Detect auth status + fetch balance on mount ── */
  useEffect(() => {
    checkAuthAndBalance();
    setGuestGamesPlayed(getGuestGamesPlayed());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuthAndBalance = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setBalance(parseInt(data.balance));
        setIsGuest(false);
      } else {
        setIsGuest(true);
        setBalance(GUEST_BALANCE);
      }
    } catch {
      setIsGuest(true);
      setBalance(GUEST_BALANCE);
    }
  };

  const fetchBalance = async () => {
    if (isGuest) {
      setBalance(guestBalance);
      return;
    }
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

  /* ── Current active spot's game data (for action bar / keyboard) ── */
  const currentSpotData = activeSpot ? spotStates[activeSpot]?.gameData ?? null : null;

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!currentSpotData || currentSpotData.status !== "playing" || isLoading || actionsDisabled || isDealing) return;
      switch (e.key.toLowerCase()) {
        case "h": handleAction("hit"); break;
        case "s": handleAction("stand"); break;
        case "d": if (currentSpotData.canDouble) handleAction("double"); break;
        case "p": if (currentSpotData.canSplit) handleAction("split"); break;
        case "i": if (currentSpotData.canInsurance) handleAction("insurance"); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSpotData, isLoading, actionsDisabled, isDealing, activeSpot]);

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

  /* ── Helper: update a single spot's UI state ── */
  const updateSpot = (spotId: string, patch: Partial<SpotState>) => {
    setSpotStates((prev) => ({
      ...prev,
      [spotId]: { ...(prev[spotId] || emptySpotState()), ...patch },
    }));
  };

  /* ── Apply server response to local state ── */
  const applyServerResponse = (data: {
    sessionId: string;
    dealerHand: CardData[];
    dealerValue: number;
    dealerHidden: boolean;
    spots: Record<string, SpotGameData>;
    spotOrder: string[];
    currentSpotId: string | null;
    overallStatus: string;
    totalPayout: number;
    newBalance: string;
  }) => {
    setSessionId(data.sessionId);
    sessionRef.current = data.sessionId;

    // Update balance
    const newBal = parseInt(data.newBalance);
    setBalance(newBal);
    if (isGuest) setGuestBalance(newBal);

    // Update dealer (cards and value, but NOT visibility — animations handle that)
    setDealerState((prev) => ({
      ...prev,
      cards: data.dealerHand,
      value: data.dealerValue,
      hidden: data.dealerHidden,
    }));

    // Update per-spot game data (preserve local animation state)
    setSpotStates((prev) => {
      const next = { ...prev };
      for (const sid of data.spotOrder) {
        const existing = prev[sid] || emptySpotState();
        next[sid] = { ...existing, gameData: data.spots[sid] };
      }
      return next;
    });

    setSpotOrder(data.spotOrder);
    setActiveSpot(data.currentSpotId);

    return data;
  };

  /* ── Animate initial deal for all spots at once ── */
  const animateInitialDeal = async (spots: string[], dealerCards: CardData[]) => {
    setIsDealing(true);

    // Deal first card to each spot
    for (const sid of spots) {
      updateSpot(sid, { phase: "dealing", visiblePlayerCards: 1 });
      await sleep(CARD_DEAL_DELAY / 2);
    }
    await sleep(CARD_DEAL_DELAY / 2);

    // Dealer first card
    setDealerState((prev) => ({ ...prev, visibleCards: 1 }));
    await sleep(CARD_DEAL_DELAY);

    // Deal second card to each spot
    for (const sid of spots) {
      updateSpot(sid, { visiblePlayerCards: 2 });
      await sleep(CARD_DEAL_DELAY / 2);
    }
    await sleep(CARD_DEAL_DELAY / 2);

    // Dealer second card
    setDealerState((prev) => ({ ...prev, visibleCards: 2 }));
    await sleep(CARD_DEAL_DELAY);

    setIsDealing(false);
  };

  /* ── Dealer reveal + draw animation ── */
  const animateDealerReveal = async (dealerCards: CardData[]) => {
    setRoundPhase("dealer_turn");
    setActionsDisabled(true);

    // Flip hidden card
    setDealerState((prev) => ({ ...prev, revealing: true, hidden: false }));
    await sleep(600);
    setDealerState((prev) => ({ ...prev, revealing: false }));

    // Draw additional cards
    for (let i = 2; i < dealerCards.length; i++) {
      await sleep(DEALER_DRAW_DELAY);
      setDealerState((prev) => ({ ...prev, visibleCards: i + 1 }));
    }
    await sleep(400);
  };

  /* ── Show results for all spots ── */
  const showAllResults = (spots: string[]) => {
    for (const sid of spots) {
      updateSpot(sid, { showResult: true, phase: "settled" });
    }
  };

  /* ── Start game: ONE deal call for all spots ── */
  const startGame = async () => {
    const spots = BETTING_SPOT_IDS.filter((id) => (spotBets[id] || 0) > 0);
    if (spots.length === 0) { setError("Place a bet first"); return; }

    const totalBet = Object.values(spotBets).reduce((s, v) => s + v, 0);
    if (totalBet > balance) { setError("Insufficient balance"); return; }

    setIsLoading(true);
    setLastSpotBets({ ...spotBets });
    setError(null);
    setAllSettled(false);
    setTotalPayout(0);
    setRoundPhase("dealing");
    setDealerState(emptyDealerState());

    // Initialize all spot states
    const init: Record<string, SpotState> = {};
    for (const sid of spots) init[sid] = emptySpotState();
    setSpotStates(init);

    try {
      // Build spot bets map (only spots with bets)
      const betsMap: Record<string, number> = {};
      for (const sid of spots) betsMap[sid] = spotBets[sid];

      const dealBody: Record<string, unknown> = { spots: betsMap };
      if (isGuest) {
        dealBody.guest = true;
        dealBody.guestBalance = guestBalance;
      }

      const res = await fetch("/api/games/blackjack/deal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dealBody),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Apply server state
      const resp = applyServerResponse(data);
      setIsLoading(false);

      // Animate dealing cards to all spots simultaneously
      await animateInitialDeal(resp.spotOrder, resp.dealerHand);

      // Check if game finished immediately (all blackjacks or dealer BJ)
      if (resp.overallStatus === "finished") {
        await animateDealerReveal(resp.dealerHand);
        showAllResults(resp.spotOrder);
        setTotalPayout(resp.totalPayout);
        setAllSettled(true);
        setRoundPhase("settled");
        setActiveSpot(null);
      } else {
        // Set first active spot for play
        setActiveSpot(resp.currentSpotId);
        setRoundPhase("playing");
        setActionsDisabled(false);

        // Mark spots that are already done (BJ) as settled
        for (const sid of resp.spotOrder) {
          if (resp.spots[sid].status === "done") {
            updateSpot(sid, { phase: "done" });
          } else {
            updateSpot(sid, { phase: "playing" });
          }
        }
      }

      // Increment guest game counter
      if (isGuest) {
        const count = incrementGuestGames();
        setGuestGamesPlayed(count);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start game");
      setIsLoading(false);
    }
  };

  /* ── Player action on the currently active spot ── */
  const handleAction = async (action: "hit" | "stand" | "double" | "split" | "insurance") => {
    if (!activeSpot || actionsDisabled || !sessionRef.current) return;
    const spot = spotStatesRef.current[activeSpot];
    if (!spot?.gameData) return;

    setActionsDisabled(true);
    setIsLoading(true);
    setError(null);

    try {
      const prevSpotId = activeSpot;
      const prevCount = spot.gameData.playerHands[spot.gameData.currentHandIndex]?.cards.length || 0;

      const actionBody: Record<string, unknown> = { sessionId: sessionRef.current, action };
      if (isGuest) actionBody.guestBalance = guestBalance;

      const res = await fetch("/api/games/blackjack/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(actionBody),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Apply server response
      const resp = applyServerResponse(data);
      setIsLoading(false);

      const newSpotData = resp.spots[prevSpotId];
      const newCount = newSpotData?.playerHands[newSpotData.currentHandIndex]?.cards.length || 0;

      // Animate new card on the spot we just acted on
      if ((action === "hit" || action === "double") && newCount > prevCount) {
        await sleep(100);
        updateSpot(prevSpotId, { visiblePlayerCards: newCount });
        await sleep(CARD_DEAL_DELAY);
      }

      if (action === "split") {
        updateSpot(prevSpotId, { visiblePlayerCards: 2 });
        await sleep(CARD_DEAL_DELAY * 2);
      }

      // Check if all spots finished
      if (resp.overallStatus === "finished") {
        // Dealer reveal + draw animation
        await animateDealerReveal(resp.dealerHand);
        showAllResults(resp.spotOrder);
        setTotalPayout(resp.totalPayout);
        setAllSettled(true);
        setRoundPhase("settled");
        setActiveSpot(null);
      } else {
        // Update spot phases
        for (const sid of resp.spotOrder) {
          const sd = resp.spots[sid];
          if (sd.status === "done" || sd.status === "finished") {
            updateSpot(sid, { phase: "done" });
          } else if (sid === resp.currentSpotId) {
            updateSpot(sid, { phase: "playing" });
          }
        }
        setActiveSpot(resp.currentSpotId);
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
    setSessionId(null);
    setDealerState(emptyDealerState());
    setSpotOrder([]);
    setIsDealing(false);
    setActionsDisabled(false);
    setRoundPhase("betting");
    setSpotBets({});
    setBetAmount(0);
    setError(null);
    setAllSettled(false);
    setTotalPayout(0);
    if (isGuest) {
      setBalance(guestBalance);
    } else {
      fetchBalance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest, guestBalance]);

  /* ── Aggregate result for the overlay ── */
  const overallResult = (() => {
    if (!allSettled) return null;
    const results = Object.values(spotStates)
      .map((s) => s.gameData?.result)
      .filter(Boolean);
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
    isGuest,
    guestGamesPlayed,
    guestLimitReached,

    /* Shared dealer */
    dealerState,

    /* Per-spot states */
    spotStates,
    currentSpotData,
    activeSpotsOrdered,
    spotOrder,

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

export type { CardData, HandData, SpotGameData, RoundPhase, SpotState, DealerState };
