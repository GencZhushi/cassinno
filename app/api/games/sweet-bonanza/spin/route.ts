import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { placeBet, creditWinnings, getBalance } from "@/lib/wallet";
import { getOrCreateFairnessSeed } from "@/lib/fairness";
import prisma from "@/lib/prisma";
import { createHmac } from "crypto";
import { 
  playSweetBonanza, 
  SYMBOL_EMOJIS,
} from "@/lib/games/sweet-bonanza";

const MIN_BET = 1;
const MAX_BET = 500;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, isFreeSpinMode = false, currentMultiplier = 1 } = body;

    // Validate bet amount (skip for free spins)
    if (!isFreeSpinMode) {
      if (!amount || amount < MIN_BET || amount > MAX_BET) {
        return NextResponse.json(
          { error: `Bet must be between ${MIN_BET} and ${MAX_BET}` },
          { status: 400 }
        );
      }
    }

    const betAmount = BigInt(amount || 0);

    // Check game config
    const gameConfig = await prisma.gameConfig.findUnique({
      where: { gameType: "SWEET_BONANZA" },
    });

    if (gameConfig && !gameConfig.isEnabled) {
      return NextResponse.json(
        { error: "Game is currently disabled" },
        { status: 403 }
      );
    }

    // Place bet (only if not free spin mode)
    if (!isFreeSpinMode && betAmount > 0) {
      const betResult = await placeBet(session.userId, betAmount, "SWEET_BONANZA");
      if (!betResult.success) {
        return NextResponse.json({ error: betResult.error }, { status: 400 });
      }
    }

    // Get fairness seed for provably fair gameplay
    const fairnessSeed = await getOrCreateFairnessSeed(session.userId, "SWEET_BONANZA");
    
    // Get server seed from database for random generation
    const fairnessRecord = await prisma.provablyFair.findUnique({
      where: { id: fairnessSeed.id },
    });

    if (!fairnessRecord) {
      return NextResponse.json({ error: "Fairness error" }, { status: 500 });
    }

    // Create random counter for this spin session
    let randomCounter = 0;
    const baseNonce = fairnessRecord.nonce;
    
    // Create a random function using provably fair HMAC
    const randomFn = (): number => {
      const message = `${fairnessRecord.clientSeed}:${baseNonce}:${randomCounter++}`;
      const hmac = createHmac("sha256", fairnessRecord.serverSeed).update(message).digest("hex");
      const int = parseInt(hmac.slice(0, 8), 16);
      return int / 0x100000000;
    };

    // Play the game
    const result = playSweetBonanza(
      betAmount,
      randomFn,
      isFreeSpinMode,
      currentMultiplier
    );

    // Increment nonce for next game
    await prisma.provablyFair.update({
      where: { id: fairnessSeed.id },
      data: { nonce: { increment: 1 } },
    });

    // Credit winnings
    if (result.totalWin > 0) {
      await creditWinnings(session.userId, result.totalWin, "SWEET_BONANZA");
    }

    const newBalance = await getBalance(session.userId);

    // Convert grid to emojis for frontend
    const emojiGrid = result.grid.map(col => 
      col.map(symbol => SYMBOL_EMOJIS[symbol])
    );

    const emojiTumbles = result.tumbles.map(tumble => ({
      ...tumble,
      grid: tumble.grid.map(col => col.map(symbol => SYMBOL_EMOJIS[symbol])),
      win: tumble.win.toString(),
    }));

    return NextResponse.json({
      success: true,
      grid: emojiGrid,
      tumbles: emojiTumbles,
      totalWin: result.totalWin.toString(),
      freeSpinsWon: result.freeSpinsWon,
      scatterCount: result.scatterCount,
      totalMultiplier: result.totalMultiplier,
      newBalance: newBalance.toString(),
    });
  } catch (error) {
    console.error("Sweet Bonanza error:", error);
    return NextResponse.json({ error: "Game error" }, { status: 500 });
  }
}
