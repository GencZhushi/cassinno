import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { placeBet, creditWinnings, getBalance } from "@/lib/wallet";
import { getOrCreateFairnessSeed, generateFairFloat } from "@/lib/fairness";
import prisma from "@/lib/prisma";

const ROWS = 12;
const MULTIPLIERS: Record<string, number[]> = {
  low: [5.6, 2.1, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 2.1, 5.6],
  medium: [13, 3, 1.3, 0.7, 0.4, 0.3, 0.4, 0.7, 1.3, 3, 13],
  high: [110, 41, 10, 5, 2, 0.2, 2, 5, 10, 41, 110],
};

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, risk } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid bet amount" }, { status: 400 });
    }

    if (!["low", "medium", "high"].includes(risk)) {
      return NextResponse.json({ error: "Invalid risk level" }, { status: 400 });
    }

    // Check game config
    const gameConfig = await prisma.gameConfig.findUnique({
      where: { gameType: "PLINKO" },
    });

    if (gameConfig && !gameConfig.isEnabled) {
      return NextResponse.json({ error: "Game is currently disabled" }, { status: 403 });
    }

    // Place bet
    const betResult = await placeBet(session.userId, BigInt(amount), "PLINKO");
    if (!betResult.success) {
      return NextResponse.json({ error: betResult.error }, { status: 400 });
    }

    // Generate outcome using provably fair
    const fairnessSeed = await getOrCreateFairnessSeed(session.userId, "PLINKO");
    const { float, nonce } = await generateFairFloat(fairnessSeed.id);

    // Simulate ball drop - binomial distribution
    const multipliers = MULTIPLIERS[risk];
    const numSlots = multipliers.length;
    
    // Use float to determine position (weighted towards center naturally via binomial distribution)
    let position = 0;
    for (let i = 0; i < ROWS; i++) {
      const stepFloat = (float * 1000 + i * 137) % 1; // Deterministic variation per row
      if (stepFloat > 0.5) position++;
    }
    // Normalize to bucket count (ROWS+1 possible positions maps to numSlots buckets)
    position = Math.min(Math.round(position * (numSlots - 1) / ROWS), numSlots - 1);

    const multiplier = multipliers[position];
    const payout = Math.floor(amount * multiplier);

    // Credit winnings
    if (payout > 0) {
      await creditWinnings(session.userId, BigInt(payout), "PLINKO", undefined, {
        position,
        multiplier,
        risk,
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
    console.error("Plinko error:", error);
    return NextResponse.json({ error: "Game error" }, { status: 500 });
  }
}
