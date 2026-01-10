/**
 * Video Poker - Jacks or Better
 * 
 * Standard 52-card deck
 * Player dealt 5 cards, chooses holds, draws replacements
 * Payouts based on final hand rank
 */

import { fisherYatesShuffle } from "../rng";

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number;
}

export type HandRank =
  | "royal_flush"
  | "straight_flush"
  | "four_of_a_kind"
  | "full_house"
  | "flush"
  | "straight"
  | "three_of_a_kind"
  | "two_pair"
  | "jacks_or_better"
  | "nothing";

export interface VideoPokerState {
  deck: Card[];
  hand: Card[];
  phase: "deal" | "draw" | "complete";
  betAmount: bigint;
}

export interface VideoPokerResult {
  hand: Card[];
  handRank: HandRank;
  handName: string;
  multiplier: number;
  payout: bigint;
}

const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
const RANKS: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

// Payout table (multipliers) for Jacks or Better
export const PAYOUT_TABLE: Record<HandRank, { name: string; multiplier: number }> = {
  royal_flush: { name: "Royal Flush", multiplier: 800 },
  straight_flush: { name: "Straight Flush", multiplier: 50 },
  four_of_a_kind: { name: "Four of a Kind", multiplier: 25 },
  full_house: { name: "Full House", multiplier: 9 },
  flush: { name: "Flush", multiplier: 6 },
  straight: { name: "Straight", multiplier: 4 },
  three_of_a_kind: { name: "Three of a Kind", multiplier: 3 },
  two_pair: { name: "Two Pair", multiplier: 2 },
  jacks_or_better: { name: "Jacks or Better", multiplier: 1 },
  nothing: { name: "Nothing", multiplier: 0 },
};

/**
 * Create a standard 52-card deck
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let i = 0; i < RANKS.length; i++) {
      deck.push({
        suit,
        rank: RANKS[i],
        value: i + 2, // 2 = 2, A = 14
      });
    }
  }
  return deck;
}

/**
 * Get rank value for sorting/comparison
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getRankValue(rank: Rank): number {
  return RANKS.indexOf(rank) + 2;
}

/**
 * Check if cards form a straight
 */
function isStraight(cards: Card[]): boolean {
  const values = cards.map((c) => c.value).sort((a, b) => a - b);
  
  // Check for regular straight
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== values[i - 1] + 1) {
      // Check for A-2-3-4-5 (wheel)
      if (i === 4 && values[4] === 14 && values[0] === 2) {
        return values.toString() === "2,3,4,5,14";
      }
      return false;
    }
  }
  return true;
}

/**
 * Check if cards form a flush
 */
function isFlush(cards: Card[]): boolean {
  return cards.every((c) => c.suit === cards[0].suit);
}

/**
 * Count occurrences of each rank
 */
function countRanks(cards: Card[]): Map<Rank, number> {
  const counts = new Map<Rank, number>();
  for (const card of cards) {
    counts.set(card.rank, (counts.get(card.rank) || 0) + 1);
  }
  return counts;
}

/**
 * Evaluate hand rank
 */
export function evaluateHand(cards: Card[]): HandRank {
  if (cards.length !== 5) {
    throw new Error("Hand must have exactly 5 cards");
  }

  const flush = isFlush(cards);
  const straight = isStraight(cards);
  const rankCounts = countRanks(cards);
  const counts = Array.from(rankCounts.values()).sort((a, b) => b - a);
  
  // Check for royal flush
  if (flush && straight) {
    const values = cards.map((c) => c.value).sort((a, b) => a - b);
    if (values[0] === 10 && values[4] === 14) {
      return "royal_flush";
    }
    return "straight_flush";
  }
  
  // Four of a kind
  if (counts[0] === 4) {
    return "four_of_a_kind";
  }
  
  // Full house
  if (counts[0] === 3 && counts[1] === 2) {
    return "full_house";
  }
  
  // Flush
  if (flush) {
    return "flush";
  }
  
  // Straight
  if (straight) {
    return "straight";
  }
  
  // Three of a kind
  if (counts[0] === 3) {
    return "three_of_a_kind";
  }
  
  // Two pair
  if (counts[0] === 2 && counts[1] === 2) {
    return "two_pair";
  }
  
  // Jacks or better (pair of J, Q, K, or A)
  if (counts[0] === 2) {
    for (const [rank, count] of Array.from(rankCounts)) {
      if (count === 2 && ["J", "Q", "K", "A"].includes(rank)) {
        return "jacks_or_better";
      }
    }
  }
  
  return "nothing";
}

/**
 * Initialize video poker game
 */
export function initializeGame(betAmount: bigint): VideoPokerState {
  const deck = fisherYatesShuffle(createDeck());
  const hand = deck.splice(0, 5);
  
  return {
    deck,
    hand,
    phase: "deal",
    betAmount,
  };
}

/**
 * Draw new cards for non-held positions
 */
export function drawCards(
  state: VideoPokerState,
  holdPositions: number[]
): VideoPokerResult {
  if (state.phase !== "deal") {
    throw new Error("Can only draw in deal phase");
  }
  
  // Validate hold positions
  if (holdPositions.some((p) => p < 0 || p > 4)) {
    throw new Error("Hold positions must be 0-4");
  }
  
  // Create new hand with held cards and draws
  const newHand = [...state.hand];
  let deckIndex = 0;
  
  for (let i = 0; i < 5; i++) {
    if (!holdPositions.includes(i)) {
      if (deckIndex >= state.deck.length) {
        throw new Error("Not enough cards in deck");
      }
      newHand[i] = state.deck[deckIndex];
      deckIndex++;
    }
  }
  
  // Evaluate final hand
  const handRank = evaluateHand(newHand);
  const payoutInfo = PAYOUT_TABLE[handRank];
  const payout = BigInt(Math.floor(Number(state.betAmount) * payoutInfo.multiplier));
  
  return {
    hand: newHand,
    handRank,
    handName: payoutInfo.name,
    multiplier: payoutInfo.multiplier,
    payout,
  };
}

/**
 * Serialize state for database storage
 */
export function serializeState(state: VideoPokerState): string {
  return JSON.stringify(state, (_, value) =>
    typeof value === "bigint" ? value.toString() + "n" : value
  );
}

/**
 * Deserialize state from database
 */
export function deserializeState(json: string): VideoPokerState {
  return JSON.parse(json, (_, value) => {
    if (typeof value === "string" && /^\d+n$/.test(value)) {
      return BigInt(value.slice(0, -1));
    }
    return value;
  });
}

/**
 * Get optimal hold strategy hint
 */
export function getOptimalHolds(cards: Card[]): number[] {
  // Simplified optimal strategy - not full optimal but reasonable
  const rankCounts = countRanks(cards);
  const holds: number[] = [];
  
  // Find pairs/trips/quads
  for (const [rank, count] of Array.from(rankCounts)) {
    if (count >= 2) {
      cards.forEach((c, i) => {
        if (c.rank === rank && !holds.includes(i)) {
          holds.push(i);
        }
      });
    }
  }
  
  // If we have 4 to a flush, hold those
  const suitCounts = new Map<Suit, number[]>();
  cards.forEach((c, i) => {
    const indices = suitCounts.get(c.suit) || [];
    indices.push(i);
    suitCounts.set(c.suit, indices);
  });
  
  for (const [, indices] of Array.from(suitCounts)) {
    if (indices.length >= 4) {
      return indices;
    }
  }
  
  // If nothing interesting, hold high cards (J, Q, K, A)
  if (holds.length === 0) {
    cards.forEach((c, i) => {
      if (["J", "Q", "K", "A"].includes(c.rank)) {
        holds.push(i);
      }
    });
  }
  
  return holds.sort((a, b) => a - b);
}

// Jacks or Better RTP: ~99.54% with optimal play
export const VIDEO_POKER_RTP = 0.9954;
export const VIDEO_POKER_HOUSE_EDGE = 0.0046;
