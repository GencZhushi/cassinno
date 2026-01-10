import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { placeBet, creditWinnings, getBalance } from "@/lib/wallet";
import { getOrCreateFairnessSeed, generateFairFloat } from "@/lib/fairness";
import prisma from "@/lib/prisma";

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

interface Bet {
  type: string;
  value?: number;
  amount: number;
}

function calculatePayout(bet: Bet, result: number): number {
  const isRed = RED_NUMBERS.includes(result);
  const isBlack = result > 0 && !isRed;
  const isOdd = result > 0 && result % 2 === 1;
  const isEven = result > 0 && result % 2 === 0;
  const isLow = result >= 1 && result <= 18;
  const isHigh = result >= 19 && result <= 36;

  // Dozen checks (1-12, 13-24, 25-36)
  const dozen1 = result >= 1 && result <= 12;
  const dozen2 = result >= 13 && result <= 24;
  const dozen3 = result >= 25 && result <= 36;

  // Column checks (column 1: 1,4,7..34, column 2: 2,5,8..35, column 3: 3,6,9..36)
  const column1 = result > 0 && result % 3 === 1;
  const column2 = result > 0 && result % 3 === 2;
  const column3 = result > 0 && result % 3 === 0;

  switch (bet.type) {
    case "straight":
      return bet.value === result ? bet.amount * 36 : 0;
    case "red":
      return isRed ? bet.amount * 2 : 0;
    case "black":
      return isBlack ? bet.amount * 2 : 0;
    case "odd":
      return isOdd ? bet.amount * 2 : 0;
    case "even":
      return isEven ? bet.amount * 2 : 0;
    case "low":
      return isLow ? bet.amount * 2 : 0;
    case "high":
      return isHigh ? bet.amount * 2 : 0;
    case "dozen":
      if (bet.value === 1 && dozen1) return bet.amount * 3;
      if (bet.value === 2 && dozen2) return bet.amount * 3;
      if (bet.value === 3 && dozen3) return bet.amount * 3;
      return 0;
    case "column":
      if (bet.value === 1 && column1) return bet.amount * 3;
      if (bet.value === 2 && column2) return bet.amount * 3;
      if (bet.value === 3 && column3) return bet.amount * 3;
      return 0;
    default:
      return 0;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bets } = body as { bets: Bet[] };

    if (!bets || bets.length === 0) {
      return NextResponse.json({ error: "No bets placed" }, { status: 400 });
    }

    const totalBetAmount = bets.reduce((sum, bet) => sum + bet.amount, 0);
    
    if (totalBetAmount <= 0) {
      return NextResponse.json({ error: "Invalid bet amount" }, { status: 400 });
    }

    // Check game config
    const gameConfig = await prisma.gameConfig.findUnique({
      where: { gameType: "ROULETTE" },
    });

    if (gameConfig && !gameConfig.isEnabled) {
      return NextResponse.json({ error: "Game is currently disabled" }, { status: 403 });
    }

    // Place bet
    const betResult = await placeBet(session.userId, BigInt(totalBetAmount), "ROULETTE");

    if (!betResult.success) {
      return NextResponse.json({ error: betResult.error }, { status: 400 });
    }

    // Generate result
    const fairnessSeed = await getOrCreateFairnessSeed(session.userId, "ROULETTE");
    const { float, nonce } = await generateFairFloat(fairnessSeed.id);
    const result = Math.floor(float * 37); // 0-36

    // Calculate winnings
    let totalWin = 0;
    for (const bet of bets) {
      totalWin += calculatePayout(bet, result);
    }

    // Credit winnings
    if (totalWin > 0) {
      await creditWinnings(session.userId, BigInt(totalWin), "ROULETTE", undefined, {
        result,
        bets,
        nonce,
      });
    }

    const newBalance = await getBalance(session.userId);

    return NextResponse.json({
      success: true,
      result,
      totalWin: totalWin.toString(),
      newBalance: newBalance.toString(),
    });
  } catch (error) {
    console.error("Roulette error:", error);
    return NextResponse.json({ error: "Game error" }, { status: 500 });
  }
}
