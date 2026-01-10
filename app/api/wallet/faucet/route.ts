import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

const FAUCET_AMOUNT = BigInt(1000);
const FAUCET_COOLDOWN = 60 * 60 * 1000; // 1 hour in milliseconds

export async function POST() {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { lastFaucetAt: true },
    });

    // Check cooldown
    if (user?.lastFaucetAt) {
      const timeSinceLastClaim = Date.now() - user.lastFaucetAt.getTime();
      if (timeSinceLastClaim < FAUCET_COOLDOWN) {
        const remainingTime = Math.ceil((FAUCET_COOLDOWN - timeSinceLastClaim) / 60000);
        return NextResponse.json(
          { error: `Please wait ${remainingTime} minutes before claiming again` },
          { status: 429 }
        );
      }
    }

    // Perform faucet claim in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update user's last faucet time
      await tx.user.update({
        where: { id: session.userId },
        data: { lastFaucetAt: new Date() },
      });

      // Get current wallet
      const wallet = await tx.wallet.findUnique({
        where: { userId: session.userId },
      });

      if (!wallet) {
        throw new Error("Wallet not found");
      }

      const newBalance = wallet.balance + FAUCET_AMOUNT;

      // Update wallet
      await tx.wallet.update({
        where: { userId: session.userId },
        data: { balance: newBalance },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId: session.userId,
          type: "FAUCET",
          amount: FAUCET_AMOUNT,
          balanceAfter: newBalance,
        },
      });

      return { newBalance, amount: FAUCET_AMOUNT };
    });

    return NextResponse.json({
      success: true,
      amount: result.amount.toString(),
      newBalance: result.newBalance.toString(),
    });
  } catch (error) {
    console.error("Faucet error:", error);
    return NextResponse.json(
      { error: "Failed to claim faucet" },
      { status: 500 }
    );
  }
}
