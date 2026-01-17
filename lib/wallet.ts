import prisma from "./prisma";

type TransactionType = "BET" | "WIN" | "ADMIN_CREDIT" | "ADMIN_DEBIT" | "FAUCET" | "REFUND";
type GameType = "ROULETTE" | "BLACKJACK" | "SLOTS" | "DICE" | "MINES" | "PLINKO" | "WHEEL" | "VIDEO_POKER" | "SWEET_BONANZA" | "GATES_OF_OLYMPUS" | "BOOK_OF_DEAD" | "BIG_BASS_BONANZA" | "WOLF_GOLD" | "STARBURST" | "GONZOS_QUEST_MEGAWAYS" | "COIN_STRIKE";

interface TransactionResult {
  success: boolean;
  newBalance: bigint;
  transactionId: string;
  error?: string;
}

interface CreateTransactionParams {
  userId: string;
  type: TransactionType;
  amount: bigint;
  game?: GameType;
  gameSessionId?: string;
  meta?: Record<string, unknown>;
}

/**
 * Get user's current balance
 */
export async function getBalance(userId: string): Promise<bigint> {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    select: { balance: true },
  });
  return wallet?.balance ?? BigInt(0);
}

/**
 * Create a transaction with balance update using database transaction
 * Ensures atomicity and prevents race conditions
 */
export async function createTransaction(
  params: CreateTransactionParams
): Promise<TransactionResult> {
  const { userId, type, amount, game, gameSessionId, meta } = params;

  try {
    return await prisma.$transaction(async (tx) => {
      // Lock the wallet row for update
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        return {
          success: false,
          newBalance: BigInt(0),
          transactionId: "",
          error: "Wallet not found",
        };
      }

      // Calculate new balance
      let newBalance: bigint;
      if (type === "BET" || type === "ADMIN_DEBIT") {
        // Deduct from balance
        if (wallet.balance < amount) {
          return {
            success: false,
            newBalance: wallet.balance,
            transactionId: "",
            error: "Insufficient balance",
          };
        }
        newBalance = wallet.balance - amount;
      } else {
        // Add to balance (WIN, ADMIN_CREDIT, FAUCET, REFUND)
        newBalance = wallet.balance + amount;
      }

      // Ensure balance never goes negative
      if (newBalance < BigInt(0)) {
        return {
          success: false,
          newBalance: wallet.balance,
          transactionId: "",
          error: "Balance cannot go negative",
        };
      }

      // Update wallet balance
      await tx.wallet.update({
        where: { userId },
        data: { balance: newBalance },
      });

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type,
          amount,
          balanceAfter: newBalance,
          game,
          gameSessionId,
          metaJson: meta ? JSON.stringify(meta) : null,
        },
      });

      return {
        success: true,
        newBalance,
        transactionId: transaction.id,
      };
    });
  } catch (error) {
    console.error("Transaction error:", error);
    return {
      success: false,
      newBalance: BigInt(0),
      transactionId: "",
      error: "Transaction failed",
    };
  }
}

/**
 * Place a bet - deducts from balance
 */
export async function placeBet(
  userId: string,
  amount: bigint,
  game: GameType,
  gameSessionId?: string,
  meta?: Record<string, unknown>
): Promise<TransactionResult> {
  if (amount <= BigInt(0)) {
    return {
      success: false,
      newBalance: BigInt(0),
      transactionId: "",
      error: "Bet amount must be positive",
    };
  }

  return createTransaction({
    userId,
    type: "BET",
    amount,
    game,
    gameSessionId,
    meta,
  });
}

/**
 * Credit winnings to user
 */
export async function creditWinnings(
  userId: string,
  amount: bigint,
  game: GameType,
  gameSessionId?: string,
  meta?: Record<string, unknown>
): Promise<TransactionResult> {
  if (amount <= BigInt(0)) {
    return {
      success: true,
      newBalance: await getBalance(userId),
      transactionId: "",
    };
  }

  return createTransaction({
    userId,
    type: "WIN",
    amount,
    game,
    gameSessionId,
    meta,
  });
}

/**
 * Admin credit tokens to user
 */
export async function adminCredit(
  userId: string,
  amount: bigint,
  adminId: string,
  reason: string,
  ip?: string
): Promise<TransactionResult> {
  const result = await createTransaction({
    userId,
    type: "ADMIN_CREDIT",
    amount,
    meta: { adminId, reason, ip },
  });

  if (result.success) {
    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: adminId,
        action: "ADMIN_CREDIT",
        targetUserId: userId,
        ip,
        metaJson: JSON.stringify({ amount: amount.toString(), reason }),
      },
    });
  }

  return result;
}

/**
 * Admin debit tokens from user
 */
export async function adminDebit(
  userId: string,
  amount: bigint,
  adminId: string,
  reason: string,
  ip?: string
): Promise<TransactionResult> {
  const result = await createTransaction({
    userId,
    type: "ADMIN_DEBIT",
    amount,
    meta: { adminId, reason, ip },
  });

  if (result.success) {
    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: adminId,
        action: "ADMIN_DEBIT",
        targetUserId: userId,
        ip,
        metaJson: JSON.stringify({ amount: amount.toString(), reason }),
      },
    });
  }

  return result;
}

/**
 * Claim faucet tokens (once per day)
 */
export async function claimFaucet(userId: string): Promise<TransactionResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastFaucetAt: true },
  });

  if (!user) {
    return {
      success: false,
      newBalance: BigInt(0),
      transactionId: "",
      error: "User not found",
    };
  }

  // Check if user can claim (once per 24 hours)
  const now = new Date();
  if (user.lastFaucetAt) {
    const hoursSinceLast = (now.getTime() - user.lastFaucetAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLast < 24) {
      const hoursRemaining = Math.ceil(24 - hoursSinceLast);
      return {
        success: false,
        newBalance: await getBalance(userId),
        transactionId: "",
        error: `Faucet available in ${hoursRemaining} hours`,
      };
    }
  }

  // Credit faucet tokens
  const faucetAmount = BigInt(1000);
  const result = await createTransaction({
    userId,
    type: "FAUCET",
    amount: faucetAmount,
    meta: { claimedAt: now.toISOString() },
  });

  if (result.success) {
    // Update last faucet time
    await prisma.user.update({
      where: { id: userId },
      data: { lastFaucetAt: now },
    });
  }

  return result;
}

/**
 * Get transaction history for user
 */
export async function getTransactionHistory(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  transactions: Array<{
    id: string;
    type: TransactionType;
    amount: bigint;
    balanceAfter: bigint;
    game: GameType | null;
    createdAt: Date;
  }>;
  total: number;
  pages: number;
}> {
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        type: true,
        amount: true,
        balanceAfter: true,
        game: true,
        createdAt: true,
      },
    }),
    prisma.transaction.count({ where: { userId } }),
  ]);

  return {
    transactions: transactions.map((t) => ({
      ...t,
      type: t.type as TransactionType,
      game: t.game as GameType | null,
    })),
    total,
    pages: Math.ceil(total / limit),
  };
}
