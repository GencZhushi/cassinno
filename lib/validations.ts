import { z } from "zod";

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
  email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email must be at most 255 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be at most 100 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be at most 100 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens")
    .optional(),
  email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email must be at most 255 characters")
    .optional(),
});

export const betSchema = z.object({
  amount: z
    .number()
    .int("Bet amount must be a whole number")
    .positive("Bet amount must be positive"),
  gameType: z.enum([
    "ROULETTE",
    "BLACKJACK",
    "SLOTS",
    "DICE",
    "MINES",
    "PLINKO",
    "WHEEL",
    "VIDEO_POKER",
    "SWEET_BONANZA",
    "GATES_OF_OLYMPUS",
    "BOOK_OF_DEAD",
    "BIG_BASS_BONANZA",
    "WOLF_GOLD",
  ]),
});

export const rouletteBetSchema = z.object({
  amount: z.number().int().positive(),
  betType: z.enum([
    "straight",
    "split",
    "street",
    "corner",
    "line",
    "dozen",
    "column",
    "red",
    "black",
    "even",
    "odd",
    "high",
    "low",
  ]),
  numbers: z.array(z.number().min(0).max(36)).optional(),
});

export const diceBetSchema = z.object({
  amount: z.number().int().positive(),
  target: z.number().min(1).max(98),
  isOver: z.boolean(),
});

export const minesBetSchema = z.object({
  amount: z.number().int().positive(),
  mineCount: z.number().int().min(1).max(24),
});

export const minesRevealSchema = z.object({
  gameSessionId: z.string(),
  tileIndex: z.number().int().min(0).max(24),
});

export const plinkoBetSchema = z.object({
  amount: z.number().int().positive(),
  riskLevel: z.enum(["low", "medium", "high"]),
  rows: z.number().int().min(8).max(16).optional(),
});

export const wheelBetSchema = z.object({
  amount: z.number().int().positive(),
  riskLevel: z.enum(["low", "medium", "high"]).optional(),
});

export const videoPokerBetSchema = z.object({
  amount: z.number().int().positive(),
});

export const videoPokerHoldSchema = z.object({
  gameSessionId: z.string(),
  holdPositions: z.array(z.number().int().min(0).max(4)),
});

export const blackjackBetSchema = z.object({
  amount: z.number().int().positive(),
});

export const blackjackActionSchema = z.object({
  gameSessionId: z.string(),
  action: z.enum(["hit", "stand", "double", "split"]),
});

export const adminCreditDebitSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().positive("Amount must be positive"),
  reason: z.string().min(1, "Reason is required").max(500),
});

export const adminUserSearchSchema = z.object({
  query: z.string().optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  isLocked: z.boolean().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export const adminGameConfigSchema = z.object({
  gameType: z.enum([
    "ROULETTE",
    "BLACKJACK",
    "SLOTS",
    "DICE",
    "MINES",
    "PLINKO",
    "WHEEL",
    "VIDEO_POKER",
    "SWEET_BONANZA",
    "GATES_OF_OLYMPUS",
    "BOOK_OF_DEAD",
    "BIG_BASS_BONANZA",
    "WOLF_GOLD",
  ]),
  isEnabled: z.boolean().optional(),
  minBet: z.number().int().positive().optional(),
  maxBet: z.number().int().positive().optional(),
  houseEdge: z.number().min(0).max(0.1).optional(),
});

export const clientSeedSchema = z.object({
  gameType: z.enum([
    "ROULETTE",
    "BLACKJACK",
    "SLOTS",
    "DICE",
    "MINES",
    "PLINKO",
    "WHEEL",
    "VIDEO_POKER",
    "SWEET_BONANZA",
    "GATES_OF_OLYMPUS",
    "BOOK_OF_DEAD",
    "BIG_BASS_BONANZA",
    "WOLF_GOLD",
  ]),
  clientSeed: z.string().min(8).max(64),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type RouletteBetInput = z.infer<typeof rouletteBetSchema>;
export type DiceBetInput = z.infer<typeof diceBetSchema>;
export type MinesBetInput = z.infer<typeof minesBetSchema>;
export type MinesRevealInput = z.infer<typeof minesRevealSchema>;
export type PlinkoBetInput = z.infer<typeof plinkoBetSchema>;
export type WheelBetInput = z.infer<typeof wheelBetSchema>;
export type VideoPokerBetInput = z.infer<typeof videoPokerBetSchema>;
export type VideoPokerHoldInput = z.infer<typeof videoPokerHoldSchema>;
export type BlackjackBetInput = z.infer<typeof blackjackBetSchema>;
export type BlackjackActionInput = z.infer<typeof blackjackActionSchema>;
export type AdminCreditDebitInput = z.infer<typeof adminCreditDebitSchema>;
export type AdminUserSearchInput = z.infer<typeof adminUserSearchSchema>;
export type AdminGameConfigInput = z.infer<typeof adminGameConfigSchema>;
