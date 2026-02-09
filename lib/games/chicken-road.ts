/**
 * Chicken Road Game
 * 
 * Road: 10 columns × 5 rows
 * Player guides a chicken across the road by picking tiles in each column.
 * Each column has hidden bones (dangers) - hitting one ends the game.
 * Multiplier grows with each safe step. Cash out anytime.
 * 
 * Difficulty modes control bones per column:
 * - Easy: 1 bone (80% safe per step)
 * - Medium: 2 bones (60% safe per step)
 * - Hard: 3 bones (40% safe per step)
 * - Hardcore: 4 bones (20% safe per step)
 * 
 * Multiplier = (totalTiles / safeTiles)^steps * (1 - houseEdge)
 */

export const ROAD_COLUMNS = 10;
export const TILES_PER_COLUMN = 5;
export const CHICKEN_ROAD_HOUSE_EDGE = 0.02; // 2% house edge

export type Difficulty = "easy" | "medium" | "hard" | "hardcore";

export const DIFFICULTY_CONFIG: Record<Difficulty, { bones: number; label: string }> = {
  easy: { bones: 1, label: "Easy" },
  medium: { bones: 2, label: "Medium" },
  hard: { bones: 3, label: "Hard" },
  hardcore: { bones: 4, label: "Hardcore" },
};

export interface ChickenRoadState {
  difficulty: Difficulty;
  bonePositions: number[][]; // bonePositions[column] = array of row indices with bones
  currentColumn: number; // 0-based, -1 means not started yet
  chosenRows: number[]; // row chosen for each completed column
  betAmount: number;
  gameOver: boolean;
  cashedOut: boolean;
  hitBone: boolean;
}

export interface StepResult {
  column: number;
  row: number;
  isBone: boolean;
  gameOver: boolean;
  multiplier: number;
  payout: number;
  bonePositions?: number[][]; // Revealed on game over
}

/**
 * Calculate multiplier after k safe steps for a given difficulty
 */
export function calculateMultiplier(
  difficulty: Difficulty,
  steps: number,
  houseEdge: number = CHICKEN_ROAD_HOUSE_EDGE
): number {
  if (steps <= 0) return 1;

  const bones = DIFFICULTY_CONFIG[difficulty].bones;
  const safeTiles = TILES_PER_COLUMN - bones;

  // Multiplier = (total/safe)^steps * (1 - houseEdge)
  const rawMultiplier = Math.pow(TILES_PER_COLUMN / safeTiles, steps);
  const adjusted = rawMultiplier * (1 - houseEdge);

  return Math.floor(adjusted * 100) / 100;
}

/**
 * Get collision chance as a percentage for a difficulty
 */
export function getCollisionChance(difficulty: Difficulty): number {
  const bones = DIFFICULTY_CONFIG[difficulty].bones;
  return Math.round((bones / TILES_PER_COLUMN) * 100);
}

/**
 * Generate bone positions for all columns
 */
export function generateBonePositions(difficulty: Difficulty): number[][] {
  const bones = DIFFICULTY_CONFIG[difficulty].bones;
  const positions: number[][] = [];

  for (let col = 0; col < ROAD_COLUMNS; col++) {
    const rows = Array.from({ length: TILES_PER_COLUMN }, (_, i) => i);
    const columnBones: number[] = [];

    for (let b = 0; b < bones; b++) {
      const idx = Math.floor(Math.random() * rows.length);
      columnBones.push(rows.splice(idx, 1)[0]);
    }

    positions.push(columnBones.sort((a, b) => a - b));
  }

  return positions;
}

/**
 * Initialize a new Chicken Road game
 */
export function initializeGame(
  difficulty: Difficulty,
  betAmount: number
): ChickenRoadState {
  return {
    difficulty,
    bonePositions: generateBonePositions(difficulty),
    currentColumn: -1,
    chosenRows: [],
    betAmount,
    gameOver: false,
    cashedOut: false,
    hitBone: false,
  };
}

/**
 * Take a step: pick a row in the next column
 */
export function takeStep(
  state: ChickenRoadState,
  row: number
): StepResult {
  if (state.gameOver) {
    throw new Error("Game is already over");
  }

  const nextColumn = state.currentColumn + 1;

  if (nextColumn >= ROAD_COLUMNS) {
    throw new Error("No more columns to cross");
  }

  if (row < 0 || row >= TILES_PER_COLUMN) {
    throw new Error("Invalid row index");
  }

  const isBone = state.bonePositions[nextColumn].includes(row);

  if (isBone) {
    return {
      column: nextColumn,
      row,
      isBone: true,
      gameOver: true,
      multiplier: 0,
      payout: 0,
      bonePositions: state.bonePositions,
    };
  }

  const stepsCompleted = nextColumn + 1;
  const multiplier = calculateMultiplier(state.difficulty, stepsCompleted);
  const isLastColumn = nextColumn === ROAD_COLUMNS - 1;

  if (isLastColumn) {
    // Auto cash out at end of road
    const payout = Math.floor(state.betAmount * multiplier);
    return {
      column: nextColumn,
      row,
      isBone: false,
      gameOver: true,
      multiplier,
      payout,
      bonePositions: state.bonePositions,
    };
  }

  return {
    column: nextColumn,
    row,
    isBone: false,
    gameOver: false,
    multiplier,
    payout: 0,
  };
}

/**
 * Cash out current winnings
 */
export function cashOut(state: ChickenRoadState): {
  payout: number;
  multiplier: number;
  bonePositions: number[][];
} {
  if (state.gameOver) {
    throw new Error("Game is already over");
  }

  const stepsCompleted = state.chosenRows.length;
  if (stepsCompleted === 0) {
    throw new Error("Must complete at least one step before cashing out");
  }

  const multiplier = calculateMultiplier(state.difficulty, stepsCompleted);
  const payout = Math.floor(state.betAmount * multiplier);

  return {
    payout,
    multiplier,
    bonePositions: state.bonePositions,
  };
}

/**
 * Get all multipliers for a difficulty (for display table)
 */
export function getMultiplierTable(difficulty: Difficulty): number[] {
  return Array.from({ length: ROAD_COLUMNS }, (_, i) =>
    calculateMultiplier(difficulty, i + 1)
  );
}

// RTP for Chicken Road: 98% (2% house edge)
export const CHICKEN_ROAD_RTP = 0.98;
