import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { creditWinnings, getBalance } from "@/lib/wallet";
import prisma from "@/lib/prisma";

interface Card {
  suit: string;
  rank: string;
}

const RANK_VALUES: Record<string, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
  "J": 11, "Q": 12, "K": 13, "A": 14,
};

function evaluateHand(cards: Card[]): { hand: string; multiplier: number } {
  const ranks = cards.map(c => RANK_VALUES[c.rank]).sort((a, b) => a - b);
  const suits = cards.map(c => c.suit);
  
  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = ranks.every((r, i) => i === 0 || r === ranks[i - 1] + 1) ||
    (ranks[0] === 2 && ranks[1] === 3 && ranks[2] === 4 && ranks[3] === 5 && ranks[4] === 14); // A-2-3-4-5
  
  const rankCounts: Record<number, number> = {};
  ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  
  // Royal Flush
  if (isFlush && isStraight && ranks[0] === 10) {
    return { hand: "Royal Flush", multiplier: 800 };
  }
  
  // Straight Flush
  if (isFlush && isStraight) {
    return { hand: "Straight Flush", multiplier: 50 };
  }
  
  // Four of a Kind
  if (counts[0] === 4) {
    return { hand: "Four of a Kind", multiplier: 25 };
  }
  
  // Full House
  if (counts[0] === 3 && counts[1] === 2) {
    return { hand: "Full House", multiplier: 9 };
  }
  
  // Flush
  if (isFlush) {
    return { hand: "Flush", multiplier: 6 };
  }
  
  // Straight
  if (isStraight) {
    return { hand: "Straight", multiplier: 4 };
  }
  
  // Three of a Kind
  if (counts[0] === 3) {
    return { hand: "Three of a Kind", multiplier: 3 };
  }
  
  // Two Pair
  if (counts[0] === 2 && counts[1] === 2) {
    return { hand: "Two Pair", multiplier: 2 };
  }
  
  // Jacks or Better (pair of J, Q, K, or A)
  if (counts[0] === 2) {
    const pairRank = Object.entries(rankCounts).find(([, count]) => count === 2)?.[0];
    if (pairRank && parseInt(pairRank) >= 11) {
      return { hand: "Jacks or Better", multiplier: 1 };
    }
  }
  
  return { hand: "No Win", multiplier: 0 };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, held } = body;

    if (!sessionId || !held || held.length !== 5) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const gameSession = await prisma.gameSession.findUnique({
      where: { id: sessionId },
    });

    if (!gameSession || gameSession.userId !== session.userId) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    if (gameSession.status !== "ACTIVE") {
      return NextResponse.json({ error: "Game already finished" }, { status: 400 });
    }

    const state = JSON.parse(gameSession.stateJson);
    const { deck, cards, betAmount } = state;

    // Replace non-held cards
    for (let i = 0; i < 5; i++) {
      if (!held[i] && deck.length > 0) {
        cards[i] = deck.pop();
      }
    }

    // Evaluate hand
    const { hand, multiplier } = evaluateHand(cards);
    const payout = betAmount * multiplier;

    // Credit winnings
    if (payout > 0) {
      await creditWinnings(session.userId, BigInt(payout), "VIDEO_POKER", undefined, {
        hand,
        multiplier,
      });
    }

    await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        winAmount: BigInt(payout),
        stateJson: JSON.stringify({ ...state, cards, finalHand: hand }),
      },
    });

    const newBalance = await getBalance(session.userId);

    return NextResponse.json({
      cards,
      hand,
      multiplier,
      payout: payout.toString(),
      newBalance: newBalance.toString(),
    });
  } catch (error) {
    console.error("Video poker draw error:", error);
    return NextResponse.json({ error: "Game error" }, { status: 500 });
  }
}
