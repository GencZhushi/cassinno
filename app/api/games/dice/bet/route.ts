import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { placeBet, creditWinnings, getBalance } from "@/lib/wallet";
import { getOrCreateFairnessSeed, generateFairFloat } from "@/lib/fairness";
import { diceBetSchema } from "@/lib/validations";
import { calculateWinChance, calculateMultiplier, isWinningRoll, DICE_HOUSE_EDGE } from "@/lib/games/dice";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = diceBetSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { amount, target, isOver } = validationResult.data;

    // Check game config
    const gameConfig = await prisma.gameConfig.findUnique({
      where: { gameType: "DICE" },
    });

    if (gameConfig && !gameConfig.isEnabled) {
      return NextResponse.json({ error: "Game is currently disabled" }, { status: 403 });
    }

    const minBet = gameConfig ? Number(gameConfig.minBet) : 1;
    const maxBet = gameConfig ? Number(gameConfig.maxBet) : 10000;
    const houseEdge = gameConfig?.houseEdge ?? DICE_HOUSE_EDGE;

    if (amount < minBet || amount > maxBet) {
      return NextResponse.json(
        { error: `Bet must be between ${minBet} and ${maxBet}` },
        { status: 400 }
      );
    }

    // Place bet
    const betResult = await placeBet(
      session.userId,
      BigInt(amount),
      "DICE",
      undefined,
      { target, isOver }
    );

    if (!betResult.success) {
      return NextResponse.json({ error: betResult.error }, { status: 400 });
    }

    // Get fairness seed and generate outcome
    const fairnessSeed = await getOrCreateFairnessSeed(session.userId, "DICE");
    const { float, nonce } = await generateFairFloat(fairnessSeed.id);
    
    // Convert float to dice roll (0.00 - 99.99)
    const roll = Math.floor(float * 10000) / 100;

    // Determine win
    const won = isWinningRoll(roll, target, isOver);
    const winChance = calculateWinChance(target, isOver);
    const multiplier = calculateMultiplier(winChance, houseEdge);

    let payout = BigInt(0);
    if (won) {
      payout = BigInt(Math.floor(amount * multiplier));
      await creditWinnings(session.userId, payout, "DICE", undefined, {
        roll,
        target,
        isOver,
        multiplier,
        nonce,
      });
    }

    const newBalance = await getBalance(session.userId);

    return NextResponse.json({
      success: true,
      roll,
      target,
      isOver,
      won,
      winChance: winChance * 100,
      multiplier,
      payout: payout.toString(),
      newBalance: newBalance.toString(),
      fairness: {
        serverSeedHash: fairnessSeed.serverSeedHash,
        clientSeed: fairnessSeed.clientSeed,
        nonce,
      },
    });
  } catch (error) {
    console.error("Dice bet error:", error);
    return NextResponse.json(
      { error: "Bet failed. Please try again." },
      { status: 500 }
    );
  }
}
