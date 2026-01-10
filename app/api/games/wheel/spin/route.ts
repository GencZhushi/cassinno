import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { placeBet, creditWinnings, getBalance } from "@/lib/wallet";
import { getOrCreateFairnessSeed, generateFairFloat } from "@/lib/fairness";
import prisma from "@/lib/prisma";

const SEGMENTS = [
  { multiplier: 0, weight: 20 },
  { multiplier: 1.2, weight: 25 },
  { multiplier: 1.5, weight: 20 },
  { multiplier: 2, weight: 15 },
  { multiplier: 0, weight: 20 },
  { multiplier: 1.2, weight: 25 },
  { multiplier: 3, weight: 10 },
  { multiplier: 0, weight: 20 },
  { multiplier: 1.5, weight: 20 },
  { multiplier: 5, weight: 5 },
  { multiplier: 1.2, weight: 25 },
  { multiplier: 10, weight: 2 },
];

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

    // Check game config
    const gameConfig = await prisma.gameConfig.findUnique({
      where: { gameType: "WHEEL" },
    });

    if (gameConfig && !gameConfig.isEnabled) {
      return NextResponse.json({ error: "Game is currently disabled" }, { status: 403 });
    }

    // Place bet
    const betResult = await placeBet(session.userId, BigInt(amount), "WHEEL");
    if (!betResult.success) {
      return NextResponse.json({ error: betResult.error }, { status: 400 });
    }

    // Generate outcome
    const fairnessSeed = await getOrCreateFairnessSeed(session.userId, "WHEEL");
    const { float, nonce } = await generateFairFloat(fairnessSeed.id);

    // Weighted random selection
    const totalWeight = SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
    let threshold = float * totalWeight;
    let position = 0;

    for (let i = 0; i < SEGMENTS.length; i++) {
      threshold -= SEGMENTS[i].weight;
      if (threshold <= 0) {
        position = i;
        break;
      }
    }

    const multiplier = SEGMENTS[position].multiplier;
    const payout = Math.floor(amount * multiplier);

    // Credit winnings
    if (payout > 0) {
      await creditWinnings(session.userId, BigInt(payout), "WHEEL", undefined, {
        position,
        multiplier,
        nonce,
      });
    }

    const newBalance = await getBalance(session.userId);

    return NextResponse.json({
      success: true,
      position,
      multiplier,
      payout: payout.toString(),
      newBalance: newBalance.toString(),
    });
  } catch (error) {
    console.error("Wheel error:", error);
    return NextResponse.json({ error: "Game error" }, { status: 500 });
  }
}
