import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { creditWinnings, getBalance } from "@/lib/wallet";
import prisma from "@/lib/prisma";

function calculateMultiplier(revealed: number, mineCount: number): number {
  if (revealed === 0) return 1;
  
  const n = 25;
  const m = mineCount;
  const safeTiles = n - m;
  
  // Probability of surviving k reveals = product of (safeTiles-i)/(n-i) for i=0 to k-1
  let probability = 1;
  for (let i = 0; i < revealed; i++) {
    probability *= (safeTiles - i) / (n - i);
  }
  
  // Multiplier = 1/probability * (1 - houseEdge)
  const multiplier = (1 / probability) * 0.99;
  return Math.floor(multiplier * 100) / 100;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
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
    const { minePositions, mineCount, revealed, betAmount } = state;

    const gemsRevealed = revealed.filter((i: number) => !minePositions.includes(i)).length;
    
    if (gemsRevealed === 0) {
      return NextResponse.json({ error: "Reveal at least one gem first" }, { status: 400 });
    }

    const multiplier = calculateMultiplier(gemsRevealed, mineCount);
    const payout = Math.floor(betAmount * multiplier);

    // Credit winnings
    await creditWinnings(session.userId, BigInt(payout), "MINES");

    await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        winAmount: BigInt(payout),
        stateJson: JSON.stringify({ ...state, cashedOut: true }),
      },
    });

    const newBalance = await getBalance(session.userId);

    return NextResponse.json({
      payout: payout.toString(),
      multiplier,
      minePositions,
      newBalance: newBalance.toString(),
    });
  } catch (error) {
    console.error("Mines cashout error:", error);
    return NextResponse.json({ error: "Game error" }, { status: 500 });
  }
}
