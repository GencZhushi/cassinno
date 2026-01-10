import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { placeBet, getBalance } from "@/lib/wallet";
import prisma from "@/lib/prisma";

interface Card {
  suit: string;
  rank: string;
}

const SUITS = ["hearts", "diamonds", "clubs", "spades"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { amount } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid bet amount" }, { status: 400 });
    }

    // Place bet
    const betResult = await placeBet(session.userId, BigInt(amount), "VIDEO_POKER");
    if (!betResult.success) {
      return NextResponse.json({ error: betResult.error }, { status: 400 });
    }

    // Create and shuffle deck
    const deck = shuffleDeck(createDeck());
    const cards = deck.splice(0, 5);

    // Create game session
    const gameSession = await prisma.gameSession.create({
      data: {
        userId: session.userId,
        gameType: "VIDEO_POKER",
        betAmount: BigInt(amount),
        status: "ACTIVE",
        stateJson: JSON.stringify({
          deck,
          cards,
          betAmount: amount,
        }),
      },
    });

    const newBalance = await getBalance(session.userId);

    return NextResponse.json({
      sessionId: gameSession.id,
      cards,
      newBalance: newBalance.toString(),
    });
  } catch (error) {
    console.error("Video poker deal error:", error);
    return NextResponse.json({ error: "Game error" }, { status: 500 });
  }
}
