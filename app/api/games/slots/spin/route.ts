import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { placeBet, creditWinnings, getBalance } from "@/lib/wallet";
import { getOrCreateFairnessSeed, generateFairFloat } from "@/lib/fairness";
import prisma from "@/lib/prisma";

const SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "⭐", "💎", "7️⃣", "🎰"];
const SYMBOL_WEIGHTS = [30, 25, 20, 15, 6, 2, 1, 1]; // Higher = more common

const PAYOUTS: Record<string, number> = {
  "🍒": 2,
  "🍋": 3,
  "🍊": 4,
  "🍇": 5,
  "⭐": 10,
  "💎": 25,
  "7️⃣": 50,
  "🎰": 100,
};

function weightedRandomSymbol(random: number): string {
  const totalWeight = SYMBOL_WEIGHTS.reduce((a, b) => a + b, 0);
  let threshold = random * totalWeight;
  
  for (let i = 0; i < SYMBOLS.length; i++) {
    threshold -= SYMBOL_WEIGHTS[i];
    if (threshold <= 0) return SYMBOLS[i];
  }
  return SYMBOLS[0];
}

function checkPayline(symbols: string[]): { symbol: string; count: number } | null {
  const first = symbols[0];
  let count = 1;
  
  for (let i = 1; i < symbols.length; i++) {
    if (symbols[i] === first) count++;
    else break;
  }
  
  if (count >= 3) return { symbol: first, count };
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { amount } = body;

    if (!amount || amount <= 0 || amount > 100) {
      return NextResponse.json({ error: "Bet must be 1-100" }, { status: 400 });
    }

    const totalBet = amount * 20; // 20 paylines

    // Check game config
    const gameConfig = await prisma.gameConfig.findUnique({
      where: { gameType: "SLOTS" },
    });

    if (gameConfig && !gameConfig.isEnabled) {
      return NextResponse.json({ error: "Game is currently disabled" }, { status: 403 });
    }

    // Place bet
    const betResult = await placeBet(session.userId, BigInt(totalBet), "SLOTS");
    if (!betResult.success) {
      return NextResponse.json({ error: betResult.error }, { status: 400 });
    }

    // Generate reels using provably fair
    const fairnessSeed = await getOrCreateFairnessSeed(session.userId, "SLOTS");
    
    const reels: string[][] = [];
    for (let i = 0; i < 5; i++) {
      const reel: string[] = [];
      for (let j = 0; j < 3; j++) {
        const { float } = await generateFairFloat(fairnessSeed.id);
        reel.push(weightedRandomSymbol(float));
      }
      reels.push(reel);
    }

    // Check middle row (main payline)
    const middleRow = reels.map(r => r[1]);
    const paylineResult = checkPayline(middleRow);
    
    let totalWin = 0;
    const winningLines: number[] = [];

    if (paylineResult) {
      const multiplier = PAYOUTS[paylineResult.symbol] || 1;
      const countMultiplier = paylineResult.count === 3 ? 1 : paylineResult.count === 4 ? 3 : 10;
      totalWin = amount * multiplier * countMultiplier;
      winningLines.push(1); // Middle line
    }

    // Check other rows
    const topRow = reels.map(r => r[0]);
    const topResult = checkPayline(topRow);
    if (topResult) {
      const multiplier = PAYOUTS[topResult.symbol] || 1;
      totalWin += amount * multiplier;
      winningLines.push(0);
    }

    const bottomRow = reels.map(r => r[2]);
    const bottomResult = checkPayline(bottomRow);
    if (bottomResult) {
      const multiplier = PAYOUTS[bottomResult.symbol] || 1;
      totalWin += amount * multiplier;
      winningLines.push(2);
    }

    // Credit winnings
    if (totalWin > 0) {
      await creditWinnings(session.userId, BigInt(totalWin), "SLOTS");
    }

    const newBalance = await getBalance(session.userId);

    return NextResponse.json({
      success: true,
      reels,
      totalWin: totalWin.toString(),
      winningLines,
      newBalance: newBalance.toString(),
    });
  } catch (error) {
    console.error("Slots error:", error);
    return NextResponse.json({ error: "Game error" }, { status: 500 });
  }
}
