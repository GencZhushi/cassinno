/**
 * Plinko Game
 * 
 * Ball drops through pegs, lands in buckets with multipliers
 * Uses binomial distribution for bucket probabilities
 * 
 * Rows: 8-16 (configurable)
 * Risk levels: low, medium, high (different multiplier sets)
 */

import { generateSecureRandomInt } from "../rng";

export type RiskLevel = "low" | "medium" | "high";

export interface PlinkoConfig {
  rows: number;
  riskLevel: RiskLevel;
  multipliers: number[];
}

export interface PlinkoResult {
  path: ("L" | "R")[]; // Direction at each peg
  bucket: number; // 0-indexed from left
  multiplier: number;
  payout: bigint;
}

// Multipliers for different risk levels and row counts
// Index = bucket position (center to edge, mirrored)
const MULTIPLIERS: Record<RiskLevel, Record<number, number[]>> = {
  low: {
    8: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
    12: [8.4, 3, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 3, 8.4],
    16: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
  },
  medium: {
    8: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    12: [25, 8, 3, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 3, 8, 25],
    16: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
  },
  high: {
    8: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
    12: [141, 25, 8.1, 4, 2, 0.5, 0.2, 0.5, 2, 4, 8.1, 25, 141],
    16: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
  },
};

export const PLINKO_HOUSE_EDGE = 0.01; // 1% house edge

/**
 * Get multipliers for given configuration
 */
export function getMultipliers(rows: number, riskLevel: RiskLevel): number[] {
  const rowMultipliers = MULTIPLIERS[riskLevel];
  
  // Find closest supported row count
  const supportedRows = Object.keys(rowMultipliers).map(Number).sort((a, b) => a - b);
  let closestRow = supportedRows[0];
  for (const r of supportedRows) {
    if (r <= rows) closestRow = r;
  }
  
  return rowMultipliers[closestRow] || rowMultipliers[8];
}

/**
 * Simulate ball drop through pegs
 * At each row, ball goes left or right with 50% probability
 */
export function dropBall(rows: number): { path: ("L" | "R")[]; bucket: number } {
  const path: ("L" | "R")[] = [];
  let position = 0; // Track position (0 = leftmost possible)
  
  for (let i = 0; i < rows; i++) {
    const goRight = generateSecureRandomInt(0, 1) === 1;
    path.push(goRight ? "R" : "L");
    if (goRight) position++;
  }
  
  return { path, bucket: position };
}

/**
 * Calculate plinko result
 */
export function calculatePlinkoResult(
  betAmount: bigint,
  rows: number = 8,
  riskLevel: RiskLevel = "medium"
): PlinkoResult {
  const { path, bucket } = dropBall(rows);
  const multipliers = getMultipliers(rows, riskLevel);
  const multiplier = multipliers[bucket] || 0;
  const payout = BigInt(Math.floor(Number(betAmount) * multiplier));
  
  return {
    path,
    bucket,
    multiplier,
    payout,
  };
}

/**
 * Get bucket probabilities (binomial distribution)
 */
export function getBucketProbabilities(rows: number): number[] {
  const probabilities: number[] = [];
  const total = Math.pow(2, rows);
  
  for (let k = 0; k <= rows; k++) {
    // Binomial coefficient
    let coef = 1;
    for (let i = 0; i < k; i++) {
      coef = (coef * (rows - i)) / (i + 1);
    }
    probabilities.push(coef / total);
  }
  
  return probabilities;
}

/**
 * Calculate theoretical RTP for given configuration
 */
export function calculateTheoreticalRTP(rows: number, riskLevel: RiskLevel): number {
  const multipliers = getMultipliers(rows, riskLevel);
  const probabilities = getBucketProbabilities(rows);
  
  let expectedValue = 0;
  for (let i = 0; i < multipliers.length; i++) {
    expectedValue += (probabilities[i] || 0) * multipliers[i];
  }
  
  return expectedValue;
}

/**
 * Get plinko configuration
 */
export function getPlinkoConfig(
  rows: number = 8,
  riskLevel: RiskLevel = "medium"
): PlinkoConfig {
  return {
    rows: Math.min(Math.max(rows, 8), 16),
    riskLevel,
    multipliers: getMultipliers(rows, riskLevel),
  };
}

/**
 * Validate plinko bet parameters
 */
export function validatePlinkoBet(
  rows: number,
  riskLevel: RiskLevel
): { valid: boolean; error?: string } {
  if (rows < 8 || rows > 16) {
    return { valid: false, error: "Rows must be between 8 and 16" };
  }
  
  if (!["low", "medium", "high"].includes(riskLevel)) {
    return { valid: false, error: "Invalid risk level" };
  }
  
  return { valid: true };
}

// Average RTP across configurations: ~99%
export const PLINKO_RTP = 0.99;
