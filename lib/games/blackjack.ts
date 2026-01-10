/**
 * Blackjack Game Logic
 * - Standard rules with 1-6 deck shoe
 * - Dealer stands on 17
 * - Blackjack pays 3:2
 * - Double on first two cards
 * - Split once (configurable)
 */

import { fisherYatesShuffle } from "../rng";

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number; // Primary value (Ace = 11)
}

export interface Hand {
  cards: Card[];
  bet: bigint;
  isDoubled: boolean;
  isSplit: boolean;
  isStanding: boolean;
  isBusted: boolean;
  isBlackjack: boolean;
}

export interface BlackjackState {
  shoe: Card[];
  playerHands: Hand[];
  dealerHand: Hand;
  currentHandIndex: number;
  phase: "betting" | "playing" | "dealer" | "complete";
  deckCount: number;
  penetration: number; // Cards dealt before reshuffle (0-1)
}

export interface BlackjackResult {
  playerHands: {
    hand: Hand;
    result: "win" | "lose" | "push" | "blackjack";
    payout: bigint;
  }[];
  dealerHand: Hand;
  dealerTotal: number;
}

const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      let value: number;
      if (rank === "A") value = 11;
      else if (["K", "Q", "J"].includes(rank)) value = 10;
      else value = parseInt(rank, 10);

      deck.push({ suit, rank, value });
    }
  }
  return deck;
}

export function createShoe(deckCount: number = 6): Card[] {
  const shoe: Card[] = [];
  for (let i = 0; i < deckCount; i++) {
    shoe.push(...createDeck());
  }
  return fisherYatesShuffle(shoe);
}

export function calculateHandValue(cards: Card[]): { value: number; isSoft: boolean } {
  let value = 0;
  let aces = 0;

  for (const card of cards) {
    if (card.rank === "A") {
      aces++;
      value += 11;
    } else {
      value += card.value;
    }
  }

  // Convert aces from 11 to 1 as needed
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }

  return { value, isSoft: aces > 0 };
}

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && calculateHandValue(cards).value === 21;
}

export function isBusted(cards: Card[]): boolean {
  return calculateHandValue(cards).value > 21;
}

export function canSplit(hand: Hand, alreadySplit: boolean, allowResplit: boolean = false): boolean {
  if (hand.cards.length !== 2) return false;
  if (alreadySplit && !allowResplit) return false;
  return hand.cards[0].rank === hand.cards[1].rank;
}

export function canDouble(hand: Hand): boolean {
  return hand.cards.length === 2 && !hand.isDoubled;
}

export function initializeGame(betAmount: bigint, deckCount: number = 6): BlackjackState {
  const shoe = createShoe(deckCount);
  
  // Deal initial cards
  const playerCards = [shoe.pop()!, shoe.pop()!];
  const dealerCards = [shoe.pop()!, shoe.pop()!];

  const playerHand: Hand = {
    cards: playerCards,
    bet: betAmount,
    isDoubled: false,
    isSplit: false,
    isStanding: false,
    isBusted: false,
    isBlackjack: isBlackjack(playerCards),
  };

  const dealerHand: Hand = {
    cards: dealerCards,
    bet: BigInt(0),
    isDoubled: false,
    isSplit: false,
    isStanding: false,
    isBusted: false,
    isBlackjack: isBlackjack(dealerCards),
  };

  // Check for immediate blackjacks
  let phase: BlackjackState["phase"] = "playing";
  if (playerHand.isBlackjack || dealerHand.isBlackjack) {
    phase = "complete";
  }

  return {
    shoe,
    playerHands: [playerHand],
    dealerHand,
    currentHandIndex: 0,
    phase,
    deckCount,
    penetration: 0.75, // Reshuffle at 75% penetration
  };
}

export function hit(state: BlackjackState): BlackjackState {
  if (state.phase !== "playing") return state;

  const currentHand = state.playerHands[state.currentHandIndex];
  if (currentHand.isStanding || currentHand.isBusted) {
    return moveToNextHand(state);
  }

  const newCard = state.shoe.pop()!;
  const newCards = [...currentHand.cards, newCard];
  const busted = isBusted(newCards);

  const updatedHands = [...state.playerHands];
  updatedHands[state.currentHandIndex] = {
    ...currentHand,
    cards: newCards,
    isBusted: busted,
  };

  const newState = { ...state, playerHands: updatedHands, shoe: [...state.shoe] };

  if (busted) {
    return moveToNextHand(newState);
  }

  return newState;
}

export function stand(state: BlackjackState): BlackjackState {
  if (state.phase !== "playing") return state;

  const currentHand = state.playerHands[state.currentHandIndex];
  const updatedHands = [...state.playerHands];
  updatedHands[state.currentHandIndex] = {
    ...currentHand,
    isStanding: true,
  };

  return moveToNextHand({ ...state, playerHands: updatedHands });
}

export function double(state: BlackjackState): BlackjackState {
  if (state.phase !== "playing") return state;

  const currentHand = state.playerHands[state.currentHandIndex];
  if (!canDouble(currentHand)) return state;

  const newCard = state.shoe.pop()!;
  const newCards = [...currentHand.cards, newCard];
  const busted = isBusted(newCards);

  const updatedHands = [...state.playerHands];
  updatedHands[state.currentHandIndex] = {
    ...currentHand,
    cards: newCards,
    bet: currentHand.bet * BigInt(2),
    isDoubled: true,
    isStanding: !busted,
    isBusted: busted,
  };

  return moveToNextHand({ ...state, playerHands: updatedHands, shoe: [...state.shoe] });
}

export function split(state: BlackjackState): BlackjackState {
  if (state.phase !== "playing") return state;

  const currentHand = state.playerHands[state.currentHandIndex];
  const hasSplit = state.playerHands.some((h) => h.isSplit);
  
  if (!canSplit(currentHand, hasSplit)) return state;

  // Create two new hands from split
  const card1 = currentHand.cards[0];
  const card2 = currentHand.cards[1];
  const newCard1 = state.shoe.pop()!;
  const newCard2 = state.shoe.pop()!;

  const hand1: Hand = {
    cards: [card1, newCard1],
    bet: currentHand.bet,
    isDoubled: false,
    isSplit: true,
    isStanding: false,
    isBusted: isBusted([card1, newCard1]),
    isBlackjack: false, // Split hands can't be blackjack
  };

  const hand2: Hand = {
    cards: [card2, newCard2],
    bet: currentHand.bet,
    isDoubled: false,
    isSplit: true,
    isStanding: false,
    isBusted: isBusted([card2, newCard2]),
    isBlackjack: false,
  };

  const updatedHands = [...state.playerHands];
  updatedHands.splice(state.currentHandIndex, 1, hand1, hand2);

  return { ...state, playerHands: updatedHands, shoe: [...state.shoe] };
}

function moveToNextHand(state: BlackjackState): BlackjackState {
  const nextIndex = state.currentHandIndex + 1;
  
  if (nextIndex >= state.playerHands.length) {
    // All player hands done, move to dealer phase
    return playDealerHand({ ...state, phase: "dealer" });
  }

  return { ...state, currentHandIndex: nextIndex };
}

export function playDealerHand(state: BlackjackState): BlackjackState {
  if (state.phase !== "dealer") return state;

  // Check if all player hands busted
  const allBusted = state.playerHands.every((h) => h.isBusted);
  if (allBusted) {
    return { ...state, phase: "complete" };
  }

  const dealerCards = [...state.dealerHand.cards];
  const shoe = [...state.shoe];

  // Dealer draws until 17 or higher
  while (calculateHandValue(dealerCards).value < 17) {
    dealerCards.push(shoe.pop()!);
  }

  const dealerValue = calculateHandValue(dealerCards).value;
  const dealerBusted = dealerValue > 21;

  return {
    ...state,
    shoe,
    dealerHand: {
      ...state.dealerHand,
      cards: dealerCards,
      isBusted: dealerBusted,
      isStanding: true,
    },
    phase: "complete",
  };
}

export function calculateResults(state: BlackjackState): BlackjackResult {
  const dealerValue = calculateHandValue(state.dealerHand.cards).value;
  const dealerBlackjack = state.dealerHand.isBlackjack;
  const dealerBusted = state.dealerHand.isBusted;

  const playerResults = state.playerHands.map((hand) => {
    const playerValue = calculateHandValue(hand.cards).value;

    let result: "win" | "lose" | "push" | "blackjack";
    let payout: bigint;

    if (hand.isBusted) {
      result = "lose";
      payout = BigInt(0);
    } else if (hand.isBlackjack && !dealerBlackjack) {
      result = "blackjack";
      // Blackjack pays 3:2
      payout = hand.bet + (hand.bet * BigInt(3)) / BigInt(2);
    } else if (hand.isBlackjack && dealerBlackjack) {
      result = "push";
      payout = hand.bet;
    } else if (dealerBlackjack) {
      result = "lose";
      payout = BigInt(0);
    } else if (dealerBusted) {
      result = "win";
      payout = hand.bet * BigInt(2);
    } else if (playerValue > dealerValue) {
      result = "win";
      payout = hand.bet * BigInt(2);
    } else if (playerValue < dealerValue) {
      result = "lose";
      payout = BigInt(0);
    } else {
      result = "push";
      payout = hand.bet;
    }

    return { hand, result, payout };
  });

  return {
    playerHands: playerResults,
    dealerHand: state.dealerHand,
    dealerTotal: dealerValue,
  };
}

export function serializeState(state: BlackjackState): string {
  return JSON.stringify(state, (_, value) =>
    typeof value === "bigint" ? value.toString() + "n" : value
  );
}

export function deserializeState(json: string): BlackjackState {
  return JSON.parse(json, (_, value) => {
    if (typeof value === "string" && /^\d+n$/.test(value)) {
      return BigInt(value.slice(0, -1));
    }
    return value;
  });
}

// RTP for Blackjack: ~99.5% with optimal strategy
export const BLACKJACK_RTP = 0.995;
export const BLACKJACK_HOUSE_EDGE = 0.005;
