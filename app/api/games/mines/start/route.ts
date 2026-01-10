import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { placeBet, getBalance } from "@/lib/wallet";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, mineCount } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid bet amount" }, { status: 400 });
    }

    if (!mineCount || mineCount < 1 || mineCount > 24) {
      return NextResponse.json({ error: "Mine count must be 1-24" }, { status: 400 });
    }

    // Place bet
    const betResult = await placeBet(session.userId, BigInt(amount), "MINES");
    if (!betResult.success) {
      return NextResponse.json({ error: betResult.error }, { status: 400 });
    }

    // Generate mine positions
    const positions = Array.from({ length: 25 }, (_, i) => i);
    const minePositions: number[] = [];
    
    for (let i = 0; i < mineCount; i++) {
      const randomIndex = Math.floor(Math.random() * positions.length);
      minePositions.push(positions.splice(randomIndex, 1)[0]);
    }

    // Create game session
    const gameSession = await prisma.gameSession.create({
      data: {
        userId: session.userId,
        gameType: "MINES",
        betAmount: BigInt(amount),
        status: "ACTIVE",
        stateJson: JSON.stringify({
          minePositions,
          mineCount,
          revealed: [],
          betAmount: amount,
        }),
      },
    });

    const newBalance = await getBalance(session.userId);

    return NextResponse.json({
      sessionId: gameSession.id,
      newBalance: newBalance.toString(),
    });
  } catch (error) {
    console.error("Mines start error:", error);
    return NextResponse.json({ error: "Game error" }, { status: 500 });
  }
}
