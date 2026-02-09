import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { creditWinnings, getBalance } from "@/lib/wallet";
import prisma from "@/lib/prisma";
import {
  Difficulty,
  DIFFICULTY_CONFIG,
  TILES_PER_COLUMN,
} from "@/lib/games/chicken-road";

function calculateMultiplier(difficulty: Difficulty, steps: number): number {
  if (steps <= 0) return 1;
  const bones = DIFFICULTY_CONFIG[difficulty].bones;
  const safeTiles = TILES_PER_COLUMN - bones;
  const raw = Math.pow(TILES_PER_COLUMN / safeTiles, steps);
  return Math.floor(raw * 0.98 * 100) / 100;
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
    const { bonePositions, difficulty, chosenRows, betAmount } = state;

    const stepsCompleted = chosenRows.length;

    if (stepsCompleted === 0) {
      return NextResponse.json({ error: "Complete at least one step first" }, { status: 400 });
    }

    const multiplier = calculateMultiplier(difficulty as Difficulty, stepsCompleted);
    const payout = Math.floor(betAmount * multiplier);

    // Credit winnings
    await creditWinnings(session.userId, BigInt(payout), "CHICKEN_ROAD");

    await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        winAmount: BigInt(payout),
        stateJson: JSON.stringify({
          ...state,
          gameOver: true,
          cashedOut: true,
        }),
      },
    });

    const newBalance = await getBalance(session.userId);

    return NextResponse.json({
      payout: payout.toString(),
      multiplier,
      bonePositions,
      newBalance: newBalance.toString(),
    });
  } catch (error) {
    console.error("Chicken Road cashout error:", error);
    return NextResponse.json({ error: "Game error" }, { status: 500 });
  }
}
