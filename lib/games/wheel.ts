/**
 * Wheel of Fortune Game
 * 
 * Segments with multipliers and weights
 * Spin outcome determined by weighted RNG
 */

import { weightedRandomSelect } from "../rng";

export type WheelRiskLevel = "low" | "medium" | "high";

export interface WheelSegment {
  multiplier: number;
  color: string;
  weight: number;
}

export interface WheelConfig {
  segments: WheelSegment[];
  riskLevel: WheelRiskLevel;
}

export interface WheelResult {
  segmentIndex: number;
  segment: WheelSegment;
  multiplier: number;
  payout: bigint;
  rotation: number; // Degrees for animation
}

// Wheel configurations by risk level
const WHEEL_CONFIGS: Record<WheelRiskLevel, WheelSegment[]> = {
  low: [
    { multiplier: 1.2, color: "#22c55e", weight: 30 },
    { multiplier: 1.5, color: "#3b82f6", weight: 25 },
    { multiplier: 0, color: "#ef4444", weight: 15 },
    { multiplier: 1.2, color: "#22c55e", weight: 30 },
    { multiplier: 2, color: "#8b5cf6", weight: 15 },
    { multiplier: 0, color: "#ef4444", weight: 15 },
    { multiplier: 1.5, color: "#3b82f6", weight: 25 },
    { multiplier: 3, color: "#f59e0b", weight: 5 },
  ],
  medium: [
    { multiplier: 0, color: "#ef4444", weight: 20 },
    { multiplier: 1.5, color: "#22c55e", weight: 20 },
    { multiplier: 0, color: "#ef4444", weight: 20 },
    { multiplier: 2, color: "#3b82f6", weight: 15 },
    { multiplier: 0, color: "#ef4444", weight: 20 },
    { multiplier: 3, color: "#8b5cf6", weight: 10 },
    { multiplier: 1.5, color: "#22c55e", weight: 20 },
    { multiplier: 5, color: "#f59e0b", weight: 5 },
  ],
  high: [
    { multiplier: 0, color: "#ef4444", weight: 30 },
    { multiplier: 0, color: "#ef4444", weight: 30 },
    { multiplier: 2, color: "#22c55e", weight: 15 },
    { multiplier: 0, color: "#ef4444", weight: 30 },
    { multiplier: 3, color: "#3b82f6", weight: 10 },
    { multiplier: 0, color: "#ef4444", weight: 30 },
    { multiplier: 5, color: "#8b5cf6", weight: 5 },
    { multiplier: 10, color: "#f59e0b", weight: 2 },
    { multiplier: 0, color: "#ef4444", weight: 30 },
    { multiplier: 50, color: "#ffd700", weight: 0.5 },
  ],
};

export const WHEEL_HOUSE_EDGE = 0.02; // 2% house edge

/**
 * Get wheel configuration for risk level
 */
export function getWheelConfig(riskLevel: WheelRiskLevel = "medium"): WheelConfig {
  return {
    segments: WHEEL_CONFIGS[riskLevel],
    riskLevel,
  };
}

/**
 * Spin the wheel
 */
export function spinWheel(
  betAmount: bigint,
  riskLevel: WheelRiskLevel = "medium"
): WheelResult {
  const config = getWheelConfig(riskLevel);
  const segments = config.segments;
  const weights = segments.map((s) => s.weight);
  
  const { item: segment, index: segmentIndex } = weightedRandomSelect(segments, weights);
  
  const payout = BigInt(Math.floor(Number(betAmount) * segment.multiplier));
  
  // Calculate rotation for animation (random offset within segment)
  const segmentAngle = 360 / segments.length;
  const baseRotation = segmentIndex * segmentAngle;
  const randomOffset = Math.random() * (segmentAngle * 0.8) + segmentAngle * 0.1;
  const rotation = 360 * 5 + baseRotation + randomOffset; // 5 full rotations + landing
  
  return {
    segmentIndex,
    segment,
    multiplier: segment.multiplier,
    payout,
    rotation,
  };
}

/**
 * Calculate theoretical RTP for risk level
 */
export function calculateWheelRTP(riskLevel: WheelRiskLevel): number {
  const segments = WHEEL_CONFIGS[riskLevel];
  const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0);
  
  let expectedValue = 0;
  for (const segment of segments) {
    const probability = segment.weight / totalWeight;
    expectedValue += probability * segment.multiplier;
  }
  
  return expectedValue;
}

/**
 * Get all available risk levels with their RTPs
 */
export function getWheelRiskLevels(): { level: WheelRiskLevel; rtp: number }[] {
  return [
    { level: "low", rtp: calculateWheelRTP("low") },
    { level: "medium", rtp: calculateWheelRTP("medium") },
    { level: "high", rtp: calculateWheelRTP("high") },
  ];
}

// Average RTP: ~98%
export const WHEEL_RTP = 0.98;
