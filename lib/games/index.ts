export * as roulette from "./roulette";
export * as blackjack from "./blackjack";
export * as slots from "./slots";
export * as dice from "./dice";
export * as mines from "./mines";
export * as plinko from "./plinko";
export * as wheel from "./wheel";
export * as videoPoker from "./video-poker";
export * as sweetBonanza from "./sweet-bonanza";
export * as gatesOfOlympus from "./gates-of-olympus";
export * as bookOfDead from "./book-of-dead";
export * as bigBassBonanza from "./big-bass-bonanza";
export * as wolfGold from "./wolf-gold";
export * as starburst from "./starburst";
export * as gonzosQuestMegaways from "./gonzos-quest-megaways";
export * as chickenRoad from "./chicken-road";

export const GAME_INFO = {
  ROULETTE: {
    name: "Roulette",
    description: "Classic European single-zero roulette",
    rtp: 0.973,
    minBet: 10,
    maxBet: 10000,
    category: "table",
  },
  BLACKJACK: {
    name: "Blackjack",
    description: "Beat the dealer with 21",
    rtp: 0.995,
    minBet: 10,
    maxBet: 5000,
    category: "table",
  },
  SLOTS: {
    name: "Slots",
    description: "5-reel slot machine with 20 paylines",
    rtp: 0.96,
    minBet: 1,
    maxBet: 100,
    category: "slots",
  },
  DICE: {
    name: "Dice",
    description: "Predict if the roll goes high or low",
    rtp: 0.99,
    minBet: 1,
    maxBet: 10000,
    category: "instant",
  },
  MINES: {
    name: "Mines",
    description: "Reveal tiles and avoid the mines",
    rtp: 0.99,
    minBet: 10,
    maxBet: 5000,
    category: "instant",
  },
  PLINKO: {
    name: "Plinko",
    description: "Drop the ball and win multipliers",
    rtp: 0.99,
    minBet: 1,
    maxBet: 1000,
    category: "instant",
  },
  WHEEL: {
    name: "Wheel",
    description: "Spin the wheel of fortune",
    rtp: 0.98,
    minBet: 10,
    maxBet: 5000,
    category: "instant",
  },
  VIDEO_POKER: {
    name: "Video Poker",
    description: "Jacks or Better video poker",
    rtp: 0.9954,
    minBet: 5,
    maxBet: 500,
    category: "table",
  },
  SWEET_BONANZA: {
    name: "Sweet Bonanza",
    description: "6×5 candy slot with tumbling wins & multipliers",
    rtp: 0.965,
    minBet: 1,
    maxBet: 500,
    category: "slots",
  },
  GATES_OF_OLYMPUS: {
    name: "Gates of Olympus",
    description: "Zeus-themed 6×5 slot with cluster pays & 500x multipliers",
    rtp: 0.965,
    minBet: 1,
    maxBet: 500,
    category: "slots",
  },
  BOOK_OF_DEAD: {
    name: "Book of Dead",
    description: "Egyptian adventure slot with expanding wilds & free spins",
    rtp: 0.9621,
    minBet: 1,
    maxBet: 500,
    category: "slots",
  },
  BIG_BASS_BONANZA: {
    name: "Big Bass Bonanza",
    description: "Fishing-themed 5×3 slot with Fisherman wilds & money fish collection",
    rtp: 0.9671,
    minBet: 1,
    maxBet: 500,
    category: "slots",
  },
  WOLF_GOLD: {
    name: "Wolf Gold",
    description: "Desert wildlife slot with stacked wilds, free spins & Moon Money Respin jackpots",
    rtp: 0.9601,
    minBet: 1,
    maxBet: 500,
    category: "slots",
  },
  STARBURST: {
    name: "Starburst",
    description: "Classic space gem slot with expanding wilds, respins & both-ways pay",
    rtp: 0.9609,
    minBet: 1,
    maxBet: 500,
    category: "slots",
  },
  GONZOS_QUEST_MEGAWAYS: {
    name: "Gonzo's Quest Megaways",
    description: "Mayan adventure with 117,649 ways, avalanche multipliers & unbreakable wilds",
    rtp: 0.96,
    minBet: 1,
    maxBet: 500,
    category: "slots",
  },
  CHICKEN_ROAD: {
    name: "Chicken Road",
    description: "Guide the chicken across the road, avoid bones & cash out multipliers",
    rtp: 0.98,
    minBet: 10,
    maxBet: 5000,
    category: "instant",
  },
} as const;

export type GameKey = keyof typeof GAME_INFO;
