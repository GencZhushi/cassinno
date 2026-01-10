import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { placeBet, creditWinnings, getBalance } from "@/lib/wallet";
import { getOrCreateFairnessSeed } from "@/lib/fairness";
import prisma from "@/lib/prisma";
import { createHmac } from "crypto";
import {
  playGonzosQuestMegaways,
  SYMBOL_EMOJIS,
  GonzoSymbol,
} from "@/lib/games/gonzos-quest-megaways";

const MIN_BET = 1;
const MAX_BET = 500;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      amount,
      isFreeSpinMode = false,
      existingMultiplierIndex = 0,
    } = body;

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
      where: { gameType: "GONZOS_QUEST_MEGAWAYS" },
    });

    if (gameConfig && !gameConfig.isEnabled) {
      return NextResponse.json(
        { error: "Game is currently disabled" },
        { status: 403 }
      );
    }

    // Place bet (only if not free spin mode)
    if (!isFreeSpinMode && betAmount > 0) {
      const betResult = await placeBet(session.userId, betAmount, "GONZOS_QUEST_MEGAWAYS");
      if (!betResult.success) {
        return NextResponse.json({ error: betResult.error }, { status: 400 });
      }
    }

    // Get fairness seed for provably fair gameplay
    const fairnessSeed = await getOrCreateFairnessSeed(session.userId, "GONZOS_QUEST_MEGAWAYS");

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

    // Play Gonzo's Quest Megaways
    const result = playGonzosQuestMegaways(
      betAmount,
      randomFn,
      isFreeSpinMode,
      existingMultiplierIndex
    );

    // Credit winnings
    if (result.totalWin > BigInt(0)) {
      await creditWinnings(session.userId, result.totalWin, "GONZOS_QUEST_MEGAWAYS");
    }

    const newBalance = await getBalance(session.userId);

    // Convert reels to emojis for frontend
    const emojiReels = result.reels.map((reel: GonzoSymbol[]) =>
      reel.map((symbol: GonzoSymbol) => SYMBOL_EMOJIS[symbol])
    );

    // Convert all avalanches for animation
    const avalanchesData = result.avalanches.map((av) => ({
      reels: av.reels.map((reel: GonzoSymbol[]) =>
        reel.map((symbol: GonzoSymbol) => SYMBOL_EMOJIS[symbol])
      ),
      reelHeights: av.reelHeights,
      winningPositions: av.winningPositions,
      winningSymbol: av.winningSymbol ? SYMBOL_EMOJIS[av.winningSymbol] : null,
      symbolCount: av.symbolCount,
      waysWon: av.waysWon,
      multiplier: av.multiplier,
      win: av.win.toString(),
      unbreakableWildPositions: av.unbreakableWildPositions,
    }));

    // Increment nonce for next game
    await prisma.provablyFair.update({
      where: { id: fairnessSeed.id },
      data: { nonce: { increment: 1 } },
    });

    return NextResponse.json({
      success: true,
      reels: emojiReels,
      reelHeights: result.reelHeights,
      totalWays: result.totalWays,
      avalanches: avalanchesData,
      totalWin: result.totalWin.toString(),
      freeSpinsWon: result.freeSpinsWon,
      scatterCount: result.scatterCount,
      scatterPositions: result.scatterPositions,
      earthquakeTriggered: result.earthquakeTriggered,
      finalMultiplier: result.finalMultiplier,
      avalancheCount: result.avalanches.length,
      newBalance: newBalance.toString(),
    });
  } catch (error) {
    console.error("Gonzo's Quest Megaways error:", error);
    return NextResponse.json({ error: "Game error" }, { status: 500 });
  }
}
