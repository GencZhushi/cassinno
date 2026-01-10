/**
 * Hi/Lo Dice Game
 * 
 * Player picks a target number and chooses "over" or "under"
 * Roll generates 0.00 - 99.99
 * 
 * Win probability and payout calculated with house edge formula:
 * payoutMultiplier = (100 / winChance) * (1 - houseEdge)
 */

export interface DiceBet {
  target: number; // 1-98
  isOver: boolean;
  amount: bigint;
}

export interface DiceResult {
  roll: number; // 0.00 - 99.99
  target: number;
  isOver: boolean;
  won: boolean;
  winChance: number;
  multiplier: number;
  payout: bigint;
}

// House edge for dice (default 1%)
export const DICE_HOUSE_EDGE = 0.01;

/**
 * Calculate win probability based on target and direction
 */
export function calculateWinChance(target: number, isOver: boolean): number {
  if (isOver) {
    // Win if roll > target
    // Roll range: 0.00 to 99.99 (10000 possible values)
    // Win if roll > target, so win values are from target+0.01 to 99.99
    return (99.99 - target) / 100;
  } else {
    // Win if roll < target
    // Win if roll < target, so win values are from 0.00 to target-0.01
    return target / 100;
  }
}

/**
 * Calculate payout multiplier including house edge
 */
export function calculateMultiplier(
  winChance: number,
  houseEdge: number = DICE_HOUSE_EDGE
): number {
  if (winChance <= 0 || winChance >= 1) return 0;
  
  // Payout = (1 / probability) * (1 - houseEdge)
  const rawMultiplier = 1 / winChance;
  const adjustedMultiplier = rawMultiplier * (1 - houseEdge);
  
  // Round to 4 decimal places
  return Math.floor(adjustedMultiplier * 10000) / 10000;
}

/**
 * Check if roll is a winning roll
 */
export function isWinningRoll(roll: number, target: number, isOver: boolean): boolean {
  if (isOver) {
    return roll > target;
  } else {
    return roll < target;
  }
}

/**
 * Calculate dice result
 */
export function calculateDiceResult(
  roll: number,
  bet: DiceBet,
  houseEdge: number = DICE_HOUSE_EDGE
): DiceResult {
  const winChance = calculateWinChance(bet.target, bet.isOver);
  const multiplier = calculateMultiplier(winChance, houseEdge);
  const won = isWinningRoll(roll, bet.target, bet.isOver);
  
  // Payout includes original bet
  const payout = won
    ? BigInt(Math.floor(Number(bet.amount) * multiplier))
    : BigInt(0);

  return {
    roll,
    target: bet.target,
    isOver: bet.isOver,
    won,
    winChance: Math.round(winChance * 10000) / 100, // Display as percentage
    multiplier,
    payout,
  };
}

/**
 * Validate dice bet parameters
 */
export function validateDiceBet(target: number, isOver: boolean): {
  valid: boolean;
  error?: string;
  winChance?: number;
  multiplier?: number;
} {
  // Target must be between 1 and 98
  if (target < 1 || target > 98) {
    return { valid: false, error: "Target must be between 1 and 98" };
  }

  // Check that win chance is reasonable
  const winChance = calculateWinChance(target, isOver);
  if (winChance < 0.01 || winChance > 0.98) {
    return { valid: false, error: "Win chance must be between 1% and 98%" };
  }

  const multiplier = calculateMultiplier(winChance);

  return { valid: true, winChance, multiplier };
}

/**
 * Get target suggestions for common win chances
 */
export function getTargetSuggestions(): { chance: number; target: number; isOver: boolean; multiplier: number }[] {
  return [
    { chance: 10, target: 90, isOver: true, multiplier: calculateMultiplier(0.10) },
    { chance: 25, target: 75, isOver: true, multiplier: calculateMultiplier(0.25) },
    { chance: 49.5, target: 50, isOver: true, multiplier: calculateMultiplier(0.495) },
    { chance: 49.5, target: 50, isOver: false, multiplier: calculateMultiplier(0.495) },
    { chance: 75, target: 25, isOver: true, multiplier: calculateMultiplier(0.75) },
    { chance: 90, target: 10, isOver: true, multiplier: calculateMultiplier(0.90) },
  ];
}

// RTP for Dice: 99% (1% house edge default)
export const DICE_RTP = 0.99;
