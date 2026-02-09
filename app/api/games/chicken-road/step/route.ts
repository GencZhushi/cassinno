import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { creditWinnings, getBalance } from "@/lib/wallet";
import prisma from "@/lib/prisma";
import {
  Difficulty,
  DIFFICULTY_CONFIG,
  TILES_PER_COLUMN,
  ROAD_COLUMNS,
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
    const { sessionId, row } = body;

    if (!sessionId || row === undefined || row < 0 || row >= TILES_PER_COLUMN) {
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

    const nextColumn = (state.currentColumn as number) + 1;

    if (nextColumn >= ROAD_COLUMNS) {
      return NextResponse.json({ error: "No more columns" }, { status: 400 });
    }

    const isBone = bonePositions[nextColumn].includes(row);
    chosenRows.push(row);

    let gameOver = false;
    let won = false;
    let multiplier = 1;
    let currentWin = 0;

    if (isBone) {
      gameOver = true;
      won = false;

      await prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          status: "COMPLETED",
          winAmount: BigInt(0),
          stateJson: JSON.stringify({
            ...state,
            currentColumn: nextColumn,
            chosenRows,
            gameOver: true,
            hitBone: true,
          }),
        },
      });
    } else {
      const stepsCompleted = nextColumn + 1;
      multiplier = calculateMultiplier(difficulty as Difficulty, stepsCompleted);
      currentWin = Math.floor(betAmount * multiplier);

      // Auto cash out at end of road
      if (nextColumn === ROAD_COLUMNS - 1) {
        gameOver = true;
        won = true;

        await creditWinnings(session.userId, BigInt(currentWin), "CHICKEN_ROAD");

        await prisma.gameSession.update({
          where: { id: sessionId },
          data: {
            status: "COMPLETED",
            winAmount: BigInt(currentWin),
            stateJson: JSON.stringify({
              ...state,
              currentColumn: nextColumn,
              chosenRows,
              gameOver: true,
              cashedOut: true,
            }),
          },
        });
      } else {
        await prisma.gameSession.update({
          where: { id: sessionId },
          data: {
            stateJson: JSON.stringify({
              ...state,
              currentColumn: nextColumn,
              chosenRows,
            }),
          },
        });
      }
    }

    const newBalance = await getBalance(session.userId);

    return NextResponse.json({
      column: nextColumn,
      row,
      isBone,
      multiplier,
      currentWin,
      gameOver,
      won,
      bonePositions: gameOver ? bonePositions : undefined,
      newBalance: newBalance.toString(),
    });
  } catch (error) {
    console.error("Chicken Road step error:", error);
    return NextResponse.json({ error: "Game error" }, { status: 500 });
  }
}
