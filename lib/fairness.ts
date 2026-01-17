import prisma from "./prisma";
import {
  generateServerSeed,
  hashServerSeed,
  generateClientSeed,
  generateProvablyFairNumber,
  floatToRange,
} from "./rng";
type GameType = "ROULETTE" | "BLACKJACK" | "SLOTS" | "DICE" | "MINES" | "PLINKO" | "WHEEL" | "VIDEO_POKER" | "SWEET_BONANZA" | "GATES_OF_OLYMPUS" | "BOOK_OF_DEAD" | "BIG_BASS_BONANZA" | "WOLF_GOLD" | "GONZOS_QUEST_MEGAWAYS" | "STARBURST" | "COIN_STRIKE";

export interface FairnessData {
  id: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

export interface RevealedFairnessData extends FairnessData {
  serverSeed: string;
  isValid: boolean;
}

/**
 * Create a new provably fair seed pair for a user and game
 */
export async function createFairnessSeed(
  userId: string,
  gameType: GameType
): Promise<FairnessData> {
  const serverSeed = generateServerSeed();
  const serverSeedHash = hashServerSeed(serverSeed);
  const clientSeed = generateClientSeed();

  const record = await prisma.provablyFair.create({
    data: {
      userId,
      gameType,
      serverSeed,
      serverSeedHash,
      clientSeed,
      nonce: 0,
    },
  });

  return {
    id: record.id,
    serverSeedHash,
    clientSeed,
    nonce: 0,
  };
}

/**
 * Get or create active fairness seed for user and game
 */
export async function getOrCreateFairnessSeed(
  userId: string,
  gameType: GameType
): Promise<FairnessData> {
  // Find existing unrevealed seed
  const existing = await prisma.provablyFair.findFirst({
    where: {
      userId,
      gameType,
      serverSeedRevealed: false,
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return {
      id: existing.id,
      serverSeedHash: existing.serverSeedHash,
      clientSeed: existing.clientSeed,
      nonce: existing.nonce,
    };
  }

  return createFairnessSeed(userId, gameType);
}

/**
 * Generate a provably fair outcome and increment nonce
 */
export async function generateFairOutcome(
  fairnessId: string,
  min: number,
  max: number
): Promise<{ outcome: number; nonce: number; fairnessData: FairnessData }> {
  const record = await prisma.provablyFair.findUnique({
    where: { id: fairnessId },
  });

  if (!record) {
    throw new Error("Fairness record not found");
  }

  if (record.serverSeedRevealed) {
    throw new Error("Server seed already revealed, create new seed");
  }

  // Generate outcome
  const randomFloat = generateProvablyFairNumber(
    record.serverSeed,
    record.clientSeed,
    record.nonce
  );
  const outcome = floatToRange(randomFloat, min, max);

  // Increment nonce
  const updatedRecord = await prisma.provablyFair.update({
    where: { id: fairnessId },
    data: { nonce: { increment: 1 } },
  });

  return {
    outcome,
    nonce: record.nonce,
    fairnessData: {
      id: record.id,
      serverSeedHash: record.serverSeedHash,
      clientSeed: record.clientSeed,
      nonce: updatedRecord.nonce,
    },
  };
}

/**
 * Generate provably fair float (0-1) for games that need raw probability
 */
export async function generateFairFloat(
  fairnessId: string
): Promise<{ float: number; nonce: number }> {
  const record = await prisma.provablyFair.findUnique({
    where: { id: fairnessId },
  });

  if (!record) {
    throw new Error("Fairness record not found");
  }

  if (record.serverSeedRevealed) {
    throw new Error("Server seed already revealed, create new seed");
  }

  const float = generateProvablyFairNumber(
    record.serverSeed,
    record.clientSeed,
    record.nonce
  );

  await prisma.provablyFair.update({
    where: { id: fairnessId },
    data: { nonce: { increment: 1 } },
  });

  return { float, nonce: record.nonce };
}

/**
 * Reveal server seed and create new seed pair
 * Call this when user wants to verify past bets
 */
export async function revealServerSeed(
  userId: string,
  fairnessId: string
): Promise<RevealedFairnessData> {
  const record = await prisma.provablyFair.findUnique({
    where: { id: fairnessId },
  });

  if (!record) {
    throw new Error("Fairness record not found");
  }

  if (record.userId !== userId) {
    throw new Error("Unauthorized");
  }

  if (record.serverSeedRevealed) {
    return {
      id: record.id,
      serverSeed: record.serverSeed,
      serverSeedHash: record.serverSeedHash,
      clientSeed: record.clientSeed,
      nonce: record.nonce,
      isValid: true,
    };
  }

  // Mark as revealed
  await prisma.provablyFair.update({
    where: { id: fairnessId },
    data: {
      serverSeedRevealed: true,
      revealedAt: new Date(),
    },
  });

  // Verify hash matches
  const computedHash = hashServerSeed(record.serverSeed);
  const isValid = computedHash === record.serverSeedHash;

  return {
    id: record.id,
    serverSeed: record.serverSeed,
    serverSeedHash: record.serverSeedHash,
    clientSeed: record.clientSeed,
    nonce: record.nonce,
    isValid,
  };
}

/**
 * Update client seed for user's active fairness record
 */
export async function updateClientSeed(
  userId: string,
  gameType: GameType,
  newClientSeed: string
): Promise<FairnessData> {
  // Validate client seed
  if (!newClientSeed || newClientSeed.length < 8 || newClientSeed.length > 64) {
    throw new Error("Client seed must be 8-64 characters");
  }

  // Find active unrevealed seed
  const existing = await prisma.provablyFair.findFirst({
    where: {
      userId,
      gameType,
      serverSeedRevealed: false,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!existing) {
    // Create new seed with provided client seed
    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);

    const record = await prisma.provablyFair.create({
      data: {
        userId,
        gameType,
        serverSeed,
        serverSeedHash,
        clientSeed: newClientSeed,
        nonce: 0,
      },
    });

    return {
      id: record.id,
      serverSeedHash,
      clientSeed: newClientSeed,
      nonce: 0,
    };
  }

  // Update existing seed
  const updated = await prisma.provablyFair.update({
    where: { id: existing.id },
    data: { clientSeed: newClientSeed },
  });

  return {
    id: updated.id,
    serverSeedHash: updated.serverSeedHash,
    clientSeed: updated.clientSeed,
    nonce: updated.nonce,
  };
}

/**
 * Get fairness history for user
 */
export async function getFairnessHistory(
  userId: string,
  gameType?: GameType,
  page: number = 1,
  limit: number = 20
): Promise<{
  records: Array<{
    id: string;
    gameType: GameType;
    serverSeedHash: string;
    serverSeed: string | null;
    clientSeed: string;
    nonce: number;
    revealed: boolean;
    createdAt: Date;
  }>;
  total: number;
  pages: number;
}> {
  const where = {
    userId,
    ...(gameType && { gameType }),
  };

  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    prisma.provablyFair.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.provablyFair.count({ where }),
  ]);

  return {
    records: records.map((r) => ({
      id: r.id,
      gameType: r.gameType as GameType,
      serverSeedHash: r.serverSeedHash,
      serverSeed: r.serverSeedRevealed ? r.serverSeed : null,
      clientSeed: r.clientSeed,
      nonce: r.nonce,
      revealed: r.serverSeedRevealed,
      createdAt: r.createdAt,
    })),
    total,
    pages: Math.ceil(total / limit),
  };
}
