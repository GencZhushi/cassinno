import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { placeBet, creditWinnings, getBalance } from "@/lib/wallet";
import { getOrCreateFairnessSeed } from "@/lib/fairness";
import prisma from "@/lib/prisma";
import { createHmac } from "crypto";
import { 
  playBookOfDead, 
  SYMBOL_EMOJIS,
  BookOfDeadSymbol,
} from "@/lib/games/book-of-dead";

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
      expandingSymbol = null 
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
      where: { gameType: "BOOK_OF_DEAD" },
    });

    if (gameConfig && !gameConfig.isEnabled) {
      return NextResponse.json(
        { error: "Game is currently disabled" },
        { status: 403 }
      );
    }

    // Place bet (only if not free spin mode)
    if (!isFreeSpinMode && betAmount > 0) {
      const betResult = await placeBet(session.userId, betAmount, "BOOK_OF_DEAD");
      if (!betResult.success) {
        return NextResponse.json({ error: betResult.error }, { status: 400 });
      }
    }

    // Get fairness seed for provably fair gameplay
    const fairnessSeed = await getOrCreateFairnessSeed(session.userId, "BOOK_OF_DEAD");
    
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
    const result = playBookOfDead(
      betAmount,
      randomFn,
      isFreeSpinMode,
      expandingSymbol as BookOfDeadSymbol | null
    );

    // Increment nonce for next game
    await prisma.provablyFair.update({
      where: { id: fairnessSeed.id },
      data: { nonce: { increment: 1 } },
    });

    // Credit winnings
    if (result.totalWin > 0) {
      await creditWinnings(session.userId, result.totalWin, "BOOK_OF_DEAD");
    }

    const newBalance = await getBalance(session.userId);

    // Convert reels to emojis for frontend
    const emojiReels = result.reels.map(reel => 
      reel.map(symbol => SYMBOL_EMOJIS[symbol])
    );

    const emojiDisplayReels = result.displayReels.map(reel =>
      reel.map(symbol => SYMBOL_EMOJIS[symbol])
    );

    const emojiWinningLines = result.winningLines.map(line => ({
      ...line,
      symbol: SYMBOL_EMOJIS[line.symbol],
      win: line.win.toString(),
    }));

    return NextResponse.json({
      success: true,
      reels: emojiReels,
      displayReels: emojiDisplayReels,
      winningLines: emojiWinningLines,
      totalWin: result.totalWin.toString(),
      freeSpinsWon: result.freeSpinsWon,
      scatterCount: result.scatterCount,
      scatterPositions: result.scatterPositions,
      expandingSymbol: result.expandingSymbol ? SYMBOL_EMOJIS[result.expandingSymbol] : null,
      expandingSymbolKey: result.expandingSymbol,
      expandedReels: result.expandedReels,
      newBalance: newBalance.toString(),
    });
  } catch (error) {
    console.error("Book of Dead error:", error);
    return NextResponse.json({ error: "Game error" }, { status: 500 });
  }
}
