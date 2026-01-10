import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { placeBet, creditWinnings, getBalance } from "@/lib/wallet";
import { getOrCreateFairnessSeed } from "@/lib/fairness";
import prisma from "@/lib/prisma";
import { createHmac } from "crypto";
import { 
  playWolfGold,
  playMoonRespin,
  SYMBOL_EMOJIS,
} from "@/lib/games/wolf-gold";

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
      isMoonRespin = false,
      initialMoonPositions = [],
      initialMoonValues = [],
    } = body;

    // Validate bet amount (skip for free spins and moon respin continuation)
    if (!isFreeSpinMode && !isMoonRespin) {
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
      where: { gameType: "WOLF_GOLD" },
    });

    if (gameConfig && !gameConfig.isEnabled) {
      return NextResponse.json(
        { error: "Game is currently disabled" },
        { status: 403 }
      );
    }

    // Place bet (only if not free spin mode or moon respin)
    if (!isFreeSpinMode && !isMoonRespin && betAmount > 0) {
      const betResult = await placeBet(session.userId, betAmount, "WOLF_GOLD");
      if (!betResult.success) {
        return NextResponse.json({ error: betResult.error }, { status: 400 });
      }
    }

    // Get fairness seed for provably fair gameplay
    const fairnessSeed = await getOrCreateFairnessSeed(session.userId, "WOLF_GOLD");
    
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

    let responseData: Record<string, unknown>;

    if (isMoonRespin) {
      // Moon Respin Feature
      const respinResult = playMoonRespin(
        betAmount,
        randomFn,
        initialMoonPositions,
        initialMoonValues
      );

      // Credit winnings from respin
      if (respinResult.totalValue > 0) {
        await creditWinnings(session.userId, respinResult.totalValue, "WOLF_GOLD");
      }

      const newBalance = await getBalance(session.userId);

      responseData = {
        success: true,
        isMoonRespin: true,
        moonPositions: respinResult.moonPositions,
        moonValues: respinResult.moonValues,
        totalValue: respinResult.totalValue.toString(),
        jackpotWon: respinResult.jackpotWon,
        isComplete: respinResult.isComplete,
        newBalance: newBalance.toString(),
      };
    } else {
      // Regular spin or free spin
      const result = playWolfGold(
        betAmount,
        randomFn,
        isFreeSpinMode
      );

      // Credit winnings (not from moon respin trigger - that's handled separately)
      if (result.totalWin > 0 && !result.moonRespinTriggered) {
        await creditWinnings(session.userId, result.totalWin, "WOLF_GOLD");
      }

      const newBalance = await getBalance(session.userId);

      // Convert reels to emojis for frontend
      const emojiReels = result.reels.map(reel => 
        reel.map(symbol => SYMBOL_EMOJIS[symbol])
      );

      const emojiWinningLines = result.winningLines.map(line => ({
        ...line,
        symbol: SYMBOL_EMOJIS[line.symbol],
        win: line.win.toString(),
      }));

      responseData = {
        success: true,
        reels: emojiReels,
        displayReels: emojiReels,
        winningLines: emojiWinningLines,
        totalWin: result.totalWin.toString(),
        freeSpinsWon: result.freeSpinsWon,
        scatterCount: result.scatterCount,
        scatterPositions: result.scatterPositions,
        moonPositions: result.moonPositions,
        moonValues: result.moonValues,
        moonRespinTriggered: result.moonRespinTriggered,
        stackedWildReels: result.stackedWildReels,
        newBalance: newBalance.toString(),
      };
    }

    // Increment nonce for next game
    await prisma.provablyFair.update({
      where: { id: fairnessSeed.id },
      data: { nonce: { increment: 1 } },
    });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Wolf Gold error:", error);
    return NextResponse.json({ error: "Game error" }, { status: 500 });
  }
}
