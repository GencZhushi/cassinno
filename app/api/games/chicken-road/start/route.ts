import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { placeBet, getBalance } from "@/lib/wallet";
import prisma from "@/lib/prisma";
import { Difficulty, DIFFICULTY_CONFIG, TILES_PER_COLUMN, ROAD_COLUMNS } from "@/lib/games/chicken-road";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, difficulty } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid bet amount" }, { status: 400 });
    }

    if (!difficulty || !DIFFICULTY_CONFIG[difficulty as Difficulty]) {
      return NextResponse.json({ error: "Invalid difficulty" }, { status: 400 });
    }

    const diff = difficulty as Difficulty;
    const bones = DIFFICULTY_CONFIG[diff].bones;

    // Place bet
    const betResult = await placeBet(session.userId, BigInt(amount), "CHICKEN_ROAD");
    if (!betResult.success) {
      return NextResponse.json({ error: betResult.error }, { status: 400 });
    }

    // Generate bone positions for each column
    const bonePositions: number[][] = [];
    for (let col = 0; col < ROAD_COLUMNS; col++) {
      const rows = Array.from({ length: TILES_PER_COLUMN }, (_, i) => i);
      const columnBones: number[] = [];
      for (let b = 0; b < bones; b++) {
        const idx = Math.floor(Math.random() * rows.length);
        columnBones.push(rows.splice(idx, 1)[0]);
      }
      bonePositions.push(columnBones.sort((a, b) => a - b));
    }

    // Create game session
    const gameSession = await prisma.gameSession.create({
      data: {
        userId: session.userId,
        gameType: "CHICKEN_ROAD",
        betAmount: BigInt(amount),
        status: "ACTIVE",
        stateJson: JSON.stringify({
          bonePositions,
          difficulty: diff,
          currentColumn: -1,
          chosenRows: [],
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
    console.error("Chicken Road start error:", error);
    return NextResponse.json({ error: "Game error" }, { status: 500 });
  }
}
