import { AnchorZone } from "./ImageAnchoredTableLayout";

/**
 * Anchor map derived from the Classic Blackjack Gold table image (877 × 638).
 * All values are percentages relative to the image dimensions.
 * Fine-tune these visually if the image changes.
 */
export const BLACKJACK_ANCHORS: AnchorZone[] = [
  /* ── Info panels ── */
  { id: "minmax",      label: "Min/Max Panel",    x: 18.0,  y: 3.1,   w: 14.3,  h: 11.0 },
  { id: "chipRack",    label: "Chip Rack",        x: 35.9,  y: 0.0,   w: 31.9,  h: 10.3 },
  { id: "deckShoe",    label: "Deck Shoe",        x: 83.8,  y: 2.4,   w: 15.7,  h: 16.5 },

  /* ── Dealer ── */
  { id: "dealerCards", label: "Dealer Cards",      x: 30.0,  y: 12.0,  w: 40.0,  h: 22.0 },

  /* ── Player betting spots (5 rectangles from the felt) ── */
  { id: "spotLeftUp",  label: "Left Upper Spot",   x: 2.9,   y: 34.1,  w: 12.5,  h: 12.5 },
  { id: "spotLeftLo",  label: "Left Lower Spot",   x: 10.8,  y: 50.1,  w: 14.8,  h: 14.9 },
  { id: "center",      label: "Center Main Spot",  x: 43.3,  y: 51.7,  w: 13.7,  h: 20.4 },
  { id: "spotRightUp", label: "Right Upper Spot",  x: 84.6,  y: 32.1,  w: 12.5,  h: 12.9 },
  { id: "spotRightLo", label: "Right Lower Spot",  x: 74.7,  y: 50.2,  w: 14.8,  h: 14.9 },

  /* ── Controls ── */
  { id: "chipSelect",  label: "Chip Selector",     x: 3.0,   y: 80.0,  w: 50.0,  h: 18.0 },
  { id: "balanceArea", label: "Balance Panel",      x: 0.0,   y: 92.0,  w: 30.0,  h: 8.0  },
  { id: "actionBar",   label: "Action Buttons",     x: 25.0,  y: 44.0,  w: 50.0,  h: 8.0  },
];

export const TABLE_IMAGE_SRC = "/games/blackjack-table.png";
export const TABLE_ASPECT_RATIO = "877 / 638";

/** Spot IDs that correspond to the 5 player betting rectangles */
export const BETTING_SPOT_IDS = [
  "spotLeftUp",
  "spotLeftLo",
  "center",
  "spotRightUp",
  "spotRightLo",
] as const;
