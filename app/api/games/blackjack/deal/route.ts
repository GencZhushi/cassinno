import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { placeBet, creditWinnings, getBalance } from "@/lib/wallet";
import prisma from "@/lib/prisma";

interface Card {
  suit: string;
  rank: string;
  value: number;
}

interface HandState {
  cards: Card[];
  bet: number;
  isDoubled: boolean;
  isSplit: boolean;
  isStanding: boolean;
  isBusted: boolean;
  isBlackjack: boolean;
}

const SUITS = ["hearts", "diamonds", "clubs", "spades"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      let value = parseInt(rank);
      if (["J", "Q", "K"].includes(rank)) value = 10;
      if (rank === "A") value = 11;
      deck.push({ suit, rank, value });
    }
  }
  return deck;
}

function createShoe(deckCount: number = 6): Card[] {
  const shoe: Card[] = [];
  for (let i = 0; i < deckCount; i++) {
    shoe.push(...createDeck());
  }
  return shuffleDeck(shoe);
}

function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function calculateHandValue(hand: Card[]): { value: number; isSoft: boolean } {
  let value = 0;
  let aces = 0;
  for (const card of hand) {
    if (card.rank === "A") {
      aces++;
      value += 11;
    } else {
      value += card.value;
    }
  }
  const originalAces = aces;
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  return { value, isSoft: aces > 0 && originalAces > 0 };
}

function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && calculateHandValue(cards).value === 21;
}

function canSplit(hand: HandState): boolean {
  if (hand.cards.length !== 2 || hand.isSplit) return false;
  return hand.cards[0].rank === hand.cards[1].rank;
}

function formatHandForClient(hand: HandState) {
  const { value, isSoft } = calculateHandValue(hand.cards);
  return {
    cards: hand.cards,
    value,
    isSoft,
    isBlackjack: hand.isBlackjack,
    isBusted: hand.isBusted,
    bet: hand.bet,
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { amount } = body;

    if (!amount || amount < 5) {
      return NextResponse.json({ error: "Minimum bet is 5 tokens" }, { status: 400 });
    }

    // Place bet
    const betResult = await placeBet(session.userId, BigInt(amount), "BLACKJACK");
    if (!betResult.success) {
      return NextResponse.json({ error: betResult.error }, { status: 400 });
    }

    // Create 6-deck shoe
    const deck = createShoe(6);
    
    // Deal cards
    const playerCards = [deck.pop()!, deck.pop()!];
    const dealerCards = [deck.pop()!, deck.pop()!];
    
    calculateHandValue(playerCards);
    const dealerHandValue = calculateHandValue(dealerCards);

    const playerHand: HandState = {
      cards: playerCards,
      bet: amount,
      isDoubled: false,
      isSplit: false,
      isStanding: false,
      isBusted: false,
      isBlackjack: isBlackjack(playerCards),
    };

    let status: string = "playing";
    let result: string | undefined;
    let totalPayout = 0;

    // Check for blackjack
    const dealerHasBlackjack = isBlackjack(dealerCards);
    
    if (playerHand.isBlackjack) {
      status = "finished";
      if (dealerHasBlackjack) {
        result = "push";
        totalPayout = amount;
        await creditWinnings(session.userId, BigInt(amount), "BLACKJACK");
      } else {
        result = "blackjack";
        totalPayout = Math.floor(amount * 2.5);
        await creditWinnings(session.userId, BigInt(totalPayout), "BLACKJACK");
      }
    } else if (dealerHasBlackjack) {
      status = "finished";
      result = "lose";
      totalPayout = 0;
    }

    // Check if dealer shows Ace (insurance opportunity)
    const dealerShowsAce = dealerCards[0].rank === "A";
    const canInsurance = status === "playing" && dealerShowsAce;

    // Save game state
    const gameSession = await prisma.gameSession.create({
      data: {
        userId: session.userId,
        gameType: "BLACKJACK",
        betAmount: BigInt(amount),
        status: status === "finished" ? "COMPLETED" : "ACTIVE",
        stateJson: JSON.stringify({
          deck,
          playerHands: [playerHand],
          currentHandIndex: 0,
          dealerHand: dealerCards,
          betAmount: amount,
          insuranceBet: 0,
          insuranceTaken: false,
        }),
        winAmount: status === "finished" ? BigInt(totalPayout) : null,
      },
    });

    const newBalance = await getBalance(session.userId);

    return NextResponse.json({
      sessionId: gameSession.id,
      gameState: {
        playerHands: [formatHandForClient(playerHand)],
        currentHandIndex: 0,
        dealerHand: dealerCards,
        dealerValue: status === "finished" ? dealerHandValue.value : calculateHandValue([dealerCards[0]]).value,
        dealerHidden: status !== "finished",
        status,
        result,
        results: status === "finished" ? [{ result: result || "lose", payout: totalPayout }] : undefined,
        canHit: status === "playing",
        canStand: status === "playing",
        canDouble: status === "playing" && playerCards.length === 2,
        canSplit: status === "playing" && canSplit(playerHand),
        canInsurance,
        insuranceTaken: false,
        totalPayout,
      },
      newBalance: newBalance.toString(),
    });
  } catch (error) {
    console.error("Blackjack deal error:", error);
    return NextResponse.json({ error: "Game error" }, { status: 500 });
  }
}
