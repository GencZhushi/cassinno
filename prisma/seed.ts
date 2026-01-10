import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Get admin password from environment or use default for development
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || "Prishtina123";
  
  if (process.env.NODE_ENV === "production" && adminPassword === "Prishtina123") {
    console.warn("⚠️  WARNING: Using default admin password in production!");
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  // Create or update admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@local" },
    update: {},
    create: {
      email: "admin@local",
      username: "admin",
      passwordHash,
      role: "ADMIN",
      mustChangePassword: true,
      wallet: {
        create: {
          balance: BigInt(1000000), // 1 million tokens for admin
        },
      },
    },
  });

  console.log("✅ Admin user created/updated:", admin.email);

  // Seed game configurations
  const games = [
    { gameType: "ROULETTE" as const, minBet: 10, maxBet: 10000, houseEdge: 0.027 },
    { gameType: "BLACKJACK" as const, minBet: 10, maxBet: 5000, houseEdge: 0.005 },
    { gameType: "SLOTS" as const, minBet: 1, maxBet: 100, houseEdge: 0.04 },
    { gameType: "DICE" as const, minBet: 1, maxBet: 10000, houseEdge: 0.01 },
    { gameType: "MINES" as const, minBet: 10, maxBet: 5000, houseEdge: 0.01 },
    { gameType: "PLINKO" as const, minBet: 1, maxBet: 1000, houseEdge: 0.01 },
    { gameType: "WHEEL" as const, minBet: 10, maxBet: 5000, houseEdge: 0.02 },
    { gameType: "VIDEO_POKER" as const, minBet: 5, maxBet: 500, houseEdge: 0.0046 },
  ];

  for (const game of games) {
    await prisma.gameConfig.upsert({
      where: { gameType: game.gameType },
      update: {
        minBet: BigInt(game.minBet),
        maxBet: BigInt(game.maxBet),
        houseEdge: game.houseEdge,
      },
      create: {
        gameType: game.gameType,
        isEnabled: true,
        minBet: BigInt(game.minBet),
        maxBet: BigInt(game.maxBet),
        houseEdge: game.houseEdge,
      },
    });
    console.log(`✅ Game config created/updated: ${game.gameType}`);
  }

  // Create initial audit log
  await prisma.auditLog.create({
    data: {
      actorUserId: admin.id,
      action: "SYSTEM_SEED",
      metaJson: JSON.stringify({
        message: "Initial database seed completed",
        gamesConfigured: games.length,
      }),
    },
  });

  console.log("✅ Audit log created");
  console.log("🎉 Seed completed successfully!");
  console.log("");
  console.log("📧 Admin email: admin@local");
  console.log("🔑 Admin password: " + (process.env.NODE_ENV === "production" ? "[from ADMIN_DEFAULT_PASSWORD env]" : adminPassword));
  console.log("⚠️  Admin must change password on first login");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
