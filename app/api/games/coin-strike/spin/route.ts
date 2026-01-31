import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { placeBet, creditWinnings, getBalance } from "@/lib/wallet";
import { getOrCreateFairnessSeed } from "@/lib/fairness";
import prisma from "@/lib/prisma";
import { createHmac, randomBytes } from "crypto";
import { 
  playCoinStrike,
  playHoldAndWin,
  SYMBOL_EMOJIS,
} from "@/lib/games/coin-strike";

const MIN_BET = 1;
const MAX_BET = 500;
const GUEST_FREE_ROUNDS = 5;
const GUEST_DEMO_BALANCE = 10000; // Demo balance for guests

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    const body = await request.json();
    const { 
      amount, 
      isHoldAndWin = false,
      initialCoinPositions = [],
      initialCoinValues = [],
      guestFreeRoundsUsed = 0, // Track guest free rounds from client
    } = body;

    // Guest mode - allow 5 free rounds without login
    const isGuest = !session;
    
    if (isGuest) {
      // Check if guest has used all free rounds
      if (guestFreeRoundsUsed >= GUEST_FREE_ROUNDS && !isHoldAndWin) {
        return NextResponse.json({ 
          error: "Free rounds exhausted. Please login to continue playing!",
          requiresLogin: true 
        }, { status: 401 });
      }
    }

    // Validate bet amount (skip for Hold & Win continuation)
    if (!isHoldAndWin) {
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
      where: { gameType: "COIN_STRIKE" },
    });

    if (gameConfig && !gameConfig.isEnabled) {
      return NextResponse.json(
        { error: "Game is currently disabled" },
        { status: 403 }
      );
    }

    // Place bet (only if not Hold & Win continuation and not guest)
    if (!isHoldAndWin && betAmount > 0 && !isGuest) {
      const betResult = await placeBet(session.userId, betAmount, "COIN_STRIKE");
      if (!betResult.success) {
        return NextResponse.json({ error: betResult.error }, { status: 400 });
      }
    }

    let randomFn: () => number;
    let fairnessSeedId: string | null = null;

    if (isGuest) {
      // For guests, use crypto random (not provably fair, but fair enough for demo)
      randomFn = (): number => {
        const bytes = randomBytes(4);
        const int = bytes.readUInt32BE(0);
        return int / 0x100000000;
      };
    } else {
      // Get fairness seed for provably fair gameplay
      const fairnessSeed = await getOrCreateFairnessSeed(session.userId, "COIN_STRIKE");
      fairnessSeedId = fairnessSeed.id;
      
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
      randomFn = (): number => {
        const message = `${fairnessRecord.clientSeed}:${baseNonce}:${randomCounter++}`;
        const hmac = createHmac("sha256", fairnessRecord.serverSeed).update(message).digest("hex");
        const int = parseInt(hmac.slice(0, 8), 16);
        return int / 0x100000000;
      };
    }

    let responseData: Record<string, unknown>;

    if (isHoldAndWin) {
      // Hold and Win Feature
      const holdWinResult = playHoldAndWin(
        betAmount,
        randomFn,
        initialCoinPositions,
        initialCoinValues
      );

      // Credit winnings from Hold & Win (only for logged-in users)
      if (holdWinResult.totalValue > 0 && session) {
        await creditWinnings(session.userId, holdWinResult.totalValue, "COIN_STRIKE");
      }

      // Get balance (demo balance for guests)
      const newBalance = isGuest ? BigInt(GUEST_DEMO_BALANCE) : await getBalance(session!.userId);

      responseData = {
        success: true,
        isHoldAndWin: true,
        coinPositions: holdWinResult.coinPositions,
        coinValues: holdWinResult.coinValues,
        totalValue: holdWinResult.totalValue.toString(),
        jackpotWon: holdWinResult.jackpotWon,
        isComplete: holdWinResult.isComplete,
        newBalance: newBalance.toString(),
        isGuest,
      };
    } else {
      // Regular spin
      const result = playCoinStrike(betAmount, randomFn);

      // Credit winnings (not from Hold & Win trigger - that's handled separately, only for logged-in users)
      if (result.totalWin > 0 && !result.holdAndWinTriggered && session) {
        await creditWinnings(session.userId, result.totalWin, "COIN_STRIKE");
      }

      // Get balance (demo balance for guests)
      const newBalance = isGuest ? BigInt(GUEST_DEMO_BALANCE) : await getBalance(session!.userId);

      // Convert reels to emojis for frontend
      const emojiReels = result.reels.map(reel => 
        reel.map(symbol => SYMBOL_EMOJIS[symbol])
      );

      responseData = {
        success: true,
        reels: emojiReels,
        winningPositions: result.winningPositions,
        totalWin: result.totalWin.toString(),
        coinPositions: result.coinPositions,
        coinValues: result.coinValues,
        holdAndWinTriggered: result.holdAndWinTriggered,
        jackpotWon: result.jackpotWon,
        winType: result.winType,
        newBalance: newBalance.toString(),
        isGuest,
      };
    }

    // Increment nonce for next game (only for logged-in users)
    if (fairnessSeedId) {
      await prisma.provablyFair.update({
        where: { id: fairnessSeedId },
        data: { nonce: { increment: 1 } },
      });
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Coin Strike error:", error);
    return NextResponse.json({ error: "Game error" }, { status: 500 });
  }
}
