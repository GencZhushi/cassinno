import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { placeBet, creditWinnings, getBalance } from "@/lib/wallet";
import { getOrCreateFairnessSeed } from "@/lib/fairness";
import prisma from "@/lib/prisma";
import { createHmac } from "crypto";
import {
  playStarburstFull,
  SYMBOL_EMOJIS,
  StarburstSymbol,
} from "@/lib/games/starburst";

const MIN_BET = 1;
const MAX_BET = 500;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { amount } = body;

    // Validate bet amount
    if (!amount || amount < MIN_BET || amount > MAX_BET) {
      return NextResponse.json(
        { error: `Bet must be between ${MIN_BET} and ${MAX_BET}` },
        { status: 400 }
      );
    }

    const betAmount = BigInt(amount);

    // Check game config
    const gameConfig = await prisma.gameConfig.findUnique({
      where: { gameType: "STARBURST" },
    });

    if (gameConfig && !gameConfig.isEnabled) {
      return NextResponse.json(
        { error: "Game is currently disabled" },
        { status: 403 }
      );
    }

    // Place bet
    const betResult = await placeBet(session.userId, betAmount, "STARBURST");
    if (!betResult.success) {
      return NextResponse.json({ error: betResult.error }, { status: 400 });
    }

    // Get fairness seed for provably fair gameplay
    const fairnessSeed = await getOrCreateFairnessSeed(session.userId, "STARBURST");

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

    // Play Starburst with all respins included
    const result = playStarburstFull(betAmount, randomFn);

    // Credit winnings
    if (result.totalWin > BigInt(0)) {
      await creditWinnings(session.userId, result.totalWin, "STARBURST");
    }

    const newBalance = await getBalance(session.userId);

    // Convert reels to emojis for frontend - use the last spin's display reels
    const finalSpin = result.spins[result.spins.length - 1];
    const emojiReels = finalSpin.displayReels.map((reel: StarburstSymbol[]) =>
      reel.map((symbol: StarburstSymbol) => SYMBOL_EMOJIS[symbol])
    );

    // Convert all spins for animation purposes
    const allSpins = result.spins.map((spin) => ({
      reels: spin.reels.map((reel: StarburstSymbol[]) =>
        reel.map((symbol: StarburstSymbol) => SYMBOL_EMOJIS[symbol])
      ),
      displayReels: spin.displayReels.map((reel: StarburstSymbol[]) =>
        reel.map((symbol: StarburstSymbol) => SYMBOL_EMOJIS[symbol])
      ),
      winningLines: spin.winningLines.map((line) => ({
        ...line,
        symbol: SYMBOL_EMOJIS[line.symbol],
        win: line.win.toString(),
      })),
      win: spin.totalWin.toString(),
      expandedWildReels: spin.expandedWildReels,
      respinTriggered: spin.respinTriggered,
      isRespin: spin.isRespin,
    }));

    // Combine all winning positions from all spins
    const allWinningLines = result.spins.flatMap((spin) =>
      spin.winningLines.map((line) => ({
        ...line,
        symbol: SYMBOL_EMOJIS[line.symbol],
        win: line.win.toString(),
      }))
    );

    // Get all expanded wild reels across all spins
    const allExpandedWildReels = result.spins.flatMap((spin) => spin.expandedWildReels);
    const uniqueExpandedWildReels = allExpandedWildReels.filter((v, i, a) => a.indexOf(v) === i);

    // Increment nonce for next game
    await prisma.provablyFair.update({
      where: { id: fairnessSeed.id },
      data: { nonce: { increment: 1 } },
    });

    return NextResponse.json({
      success: true,
      reels: emojiReels,
      displayReels: emojiReels,
      winningLines: allWinningLines,
      totalWin: result.totalWin.toString(),
      totalRespins: result.totalRespins,
      expandedWildReels: uniqueExpandedWildReels,
      allSpins,
      newBalance: newBalance.toString(),
    });
  } catch (error) {
    console.error("Starburst error:", error);
    return NextResponse.json({ error: "Game error" }, { status: 500 });
  }
}
