import { createHmac, randomBytes, createHash } from "crypto";

/**
 * Cryptographically secure RNG utilities for casino games.
 * NEVER use Math.random() for game outcomes.
 */

export function generateSecureBytes(length: number): Buffer {
  return randomBytes(length);
}

export function generateServerSeed(): string {
  return randomBytes(32).toString("hex");
}

export function hashServerSeed(serverSeed: string): string {
  return createHash("sha256").update(serverSeed).digest("hex");
}

export function generateClientSeed(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Generate a provably fair random number using HMAC-SHA256
 * @param serverSeed - Server's secret seed
 * @param clientSeed - Client's seed
 * @param nonce - Incrementing nonce for each bet
 * @returns A number between 0 and 1 (exclusive of 1)
 */
export function generateProvablyFairNumber(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): number {
  const message = `${clientSeed}:${nonce}`;
  const hmac = createHmac("sha256", serverSeed).update(message).digest("hex");
  
  // Use first 8 characters (32 bits) for the random number
  const int = parseInt(hmac.slice(0, 8), 16);
  return int / 0x100000000; // Divide by 2^32 to get 0-1
}

/**
 * Generate a random integer in range [min, max] inclusive
 */
export function generateSecureRandomInt(min: number, max: number): number {
  const range = max - min + 1;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8) || 1;
  const maxValid = Math.floor(256 ** bytesNeeded / range) * range - 1;
  
  let randomValue: number;
  do {
    const bytes = randomBytes(bytesNeeded);
    randomValue = bytes.reduce((acc, byte, i) => acc + byte * (256 ** i), 0);
  } while (randomValue > maxValid);
  
  return min + (randomValue % range);
}

/**
 * Generate a random float in range [0, max) with precision
 * Used for dice games with 0.00 to 99.99 range
 */
export function generateSecureRandomFloat(max: number, precision: number = 2): number {
  const multiplier = 10 ** precision;
  const intMax = Math.floor(max * multiplier);
  const randomInt = generateSecureRandomInt(0, intMax - 1);
  return randomInt / multiplier;
}

/**
 * Fisher-Yates shuffle using crypto RNG
 * Used for card games (Blackjack, Video Poker)
 */
export function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = generateSecureRandomInt(0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Weighted random selection
 * Used for slots, wheel, and other weighted outcomes
 */
export function weightedRandomSelect<T>(
  items: T[],
  weights: number[]
): { item: T; index: number } {
  if (items.length !== weights.length) {
    throw new Error("Items and weights arrays must have same length");
  }
  
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const randomValue = generateSecureRandomInt(0, totalWeight - 1);
  
  let cumulativeWeight = 0;
  for (let i = 0; i < items.length; i++) {
    cumulativeWeight += weights[i];
    if (randomValue < cumulativeWeight) {
      return { item: items[i], index: i };
    }
  }
  
  // Fallback (should never reach)
  return { item: items[items.length - 1], index: items.length - 1 };
}

/**
 * Verify a provably fair outcome
 * Client can use this to verify server didn't cheat
 */
export function verifyProvablyFairOutcome(
  serverSeed: string,
  serverSeedHash: string,
  clientSeed: string,
  nonce: number
): { isValid: boolean; randomNumber: number } {
  const computedHash = hashServerSeed(serverSeed);
  const isValid = computedHash === serverSeedHash;
  const randomNumber = generateProvablyFairNumber(serverSeed, clientSeed, nonce);
  
  return { isValid, randomNumber };
}

/**
 * Convert a random float (0-1) to a game outcome
 * Used for roulette, dice, etc.
 */
export function floatToRange(float: number, min: number, max: number): number {
  return Math.floor(float * (max - min + 1)) + min;
}

/**
 * Generate multiple secure random integers
 * Used for mine placement, card dealing, etc.
 */
export function generateUniqueRandomInts(
  min: number,
  max: number,
  count: number
): number[] {
  if (count > max - min + 1) {
    throw new Error("Count exceeds available range");
  }
  
  const result: Set<number> = new Set();
  while (result.size < count) {
    result.add(generateSecureRandomInt(min, max));
  }
  
  return Array.from(result);
}
