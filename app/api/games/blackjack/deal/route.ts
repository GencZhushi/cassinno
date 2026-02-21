import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { placeBet, creditWinnings, getBalance } from "@/lib/wallet";
import prisma from "@/lib/prisma";

interface Card {
  suit: string;
  rank: string;
  value: number;
}

interface HandState {
  cards: Card[];
  bet: number;
  isDoubled: boolean;
  isSplit: boolean;
  isStanding: boolean;
  isBusted: boolean;
  isBlackjack: boolean;
}

const SUITS = ["hearts", "diamonds", "clubs", "spades"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      let value = parseInt(rank);
      if (["J", "Q", "K"].includes(rank)) value = 10;
      if (rank === "A") value = 11;
      deck.push({ suit, rank, value });
    }
  }
  return deck;
}

function createShoe(deckCount: number = 6): Card[] {
  const shoe: Card[] = [];
  for (let i = 0; i < deckCount; i++) {
    shoe.push(...createDeck());
  }
  return shuffleDeck(shoe);
}

function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function calculateHandValue(hand: Card[]): { value: number; isSoft: boolean } {
  let value = 0;
  let aces = 0;
  for (const card of hand) {
    if (card.rank === "A") {
      aces++;
      value += 11;
    } else {
      value += card.value;
    }
  }
  const originalAces = aces;
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  return { value, isSoft: aces > 0 && originalAces > 0 };
}

function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && calculateHandValue(cards).value === 21;
}

function formatHandForClient(hand: HandState) {
  const { value, isSoft } = calculateHandValue(hand.cards);
  return {
    cards: hand.cards,
    value,
    isSoft,
    isBlackjack: hand.isBlackjack,
    isBusted: hand.isBusted,
    isDoubled: hand.isDoubled,
    isSplit: hand.isSplit,
    bet: hand.bet,
  };
}

function playDealerHand(deck: Card[], dealerHand: Card[]): Card[] {
  const newDealerHand = [...dealerHand];
  let dealerValue = calculateHandValue(newDealerHand).value;
  while (dealerValue < 17) {
    newDealerHand.push(deck.pop()!);
    dealerValue = calculateHandValue(newDealerHand).value;
  }
  return newDealerHand;
}

function calculateResults(playerHands: HandState[], dealerHand: Card[], insuranceBet: number) {
  const dealerValue = calculateHandValue(dealerHand).value;
  const dealerBJ = isBlackjack(dealerHand);
  const dealerBusted = dealerValue > 21;
  let totalPayout = 0;
  const results: Array<{ result: string; payout: number }> = [];
  if (insuranceBet > 0 && dealerBJ) totalPayout += insuranceBet * 3;
  for (const hand of playerHands) {
    const pv = calculateHandValue(hand.cards).value;
    let result: string;
    let payout = 0;
    if (hand.isBusted) { result = "lose"; }
    else if (hand.isBlackjack && !dealerBJ) { result = "blackjack"; payout = Math.floor(hand.bet * 2.5); }
    else if (hand.isBlackjack && dealerBJ) { result = "push"; payout = hand.bet; }
    else if (dealerBJ) { result = "lose"; }
    else if (dealerBusted) { result = "win"; payout = hand.bet * 2; }
    else if (pv > dealerValue) { result = "win"; payout = hand.bet * 2; }
    else if (pv < dealerValue) { result = "lose"; }
    else { result = "push"; payout = hand.bet; }
    totalPayout += payout;
    results.push({ result, payout });
  }
  return { results, totalPayout, dealerValue };
}

/**
 * Multi-spot deal: accepts { spots: Record<string, number>, guest?, guestBalance? }
 * All spots share ONE shoe and ONE dealer hand.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { spots, guest, guestBalance } = body;
    const isGuest = guest === true;

    if (!spots || typeof spots !== "object" || Object.keys(spots).length === 0) {
      return NextResponse.json({ error: "No bets placed" }, { status: 400 });
    }

    const spotOrder: string[] = Object.keys(spots);
    const totalBet: number = Object.values(spots).reduce((s: number, v) => s + (v as number), 0);

    if (totalBet < 1) {
      return NextResponse.json({ error: "Minimum bet is 1 token" }, { status: 400 });
    }

    let userId: string | null = null;

    if (!isGuest) {
      const session = await getSession();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = session.userId;
      const betResult = await placeBet(userId, BigInt(totalBet), "BLACKJACK");
      if (!betResult.success) {
        return NextResponse.json({ error: betResult.error }, { status: 400 });
      }
    } else {
      if (typeof guestBalance !== "number" || totalBet > guestBalance) {
        return NextResponse.json({ error: "Insufficient guest balance" }, { status: 400 });
      }
    }

    // One shared shoe (use more decks for multi-spot)
    const deckCount = spotOrder.length >= 3 ? 2 : 1;
    const deck = createShoe(deckCount);

    // Deal 2 cards to each spot, then 2 to dealer (like a real table)
    const spotHands: Record<string, HandState[]> = {};
    for (const spotId of spotOrder) {
      const cards = [deck.pop()!, deck.pop()!];
      spotHands[spotId] = [{
        cards,
        bet: spots[spotId] as number,
        isDoubled: false,
        isSplit: false,
        isStanding: false,
        isBusted: false,
        isBlackjack: isBlackjack(cards),
      }];
    }

    const dealerCards = [deck.pop()!, deck.pop()!];
    const dealerHasBJ = isBlackjack(dealerCards);
    const dealerShowsAce = dealerCards[0].rank === "A";

    // Check for immediate finishes (blackjacks)
    let allFinished = true;
    const spotResults: Record<string, Array<{ result: string; payout: number }>> = {};
    let totalPayout = 0;

    for (const spotId of spotOrder) {
      const hand = spotHands[spotId][0];
      if (hand.isBlackjack || dealerHasBJ) {
        let result: string;
        let payout = 0;
        if (hand.isBlackjack && !dealerHasBJ) {
          result = "blackjack";
          payout = Math.floor((spots[spotId] as number) * 2.5);
        } else if (hand.isBlackjack && dealerHasBJ) {
          result = "push";
          payout = spots[spotId] as number;
        } else {
          result = "lose";
        }
        totalPayout += payout;
        spotResults[spotId] = [{ result, payout }];
        hand.isStanding = true;
      } else {
        allFinished = false;
      }
    }

    if (dealerHasBJ) allFinished = true;

    // If all finished immediately, play dealer
    let finalDealerCards = dealerCards;
    if (allFinished) {
      const anyAlive = spotOrder.some(sid => spotHands[sid].some(h => !h.isBusted));
      if (anyAlive && !dealerHasBJ) {
        finalDealerCards = playDealerHand(deck, dealerCards);
      }
      // Recalculate results for non-BJ spots if needed
      if (!dealerHasBJ) {
        totalPayout = 0;
        for (const sid of spotOrder) {
          const r = calculateResults(spotHands[sid], finalDealerCards, 0);
          spotResults[sid] = r.results;
          totalPayout += r.totalPayout;
        }
      }
    }

    const overallStatus = allFinished ? "finished" : "playing";
    const currentSpotId = allFinished ? null : spotOrder.find(sid => !spotHands[sid][0].isBlackjack) || null;
    const currentSpotIndex = currentSpotId ? spotOrder.indexOf(currentSpotId) : spotOrder.length;

    // Credit winnings
    if (!isGuest && userId && totalPayout > 0) {
      await creditWinnings(userId, BigInt(totalPayout), "BLACKJACK");
    }

    // Build persistent state
    const gameStateData = {
      deck,
      spotOrder,
      spotHands,
      currentSpotHandIndex: Object.fromEntries(spotOrder.map(id => [id, 0])),
      dealerHand: finalDealerCards,
      spotBets: spots,
      totalBetAmount: totalBet,
      insuranceBets: {} as Record<string, number>,
      insuranceTaken: {} as Record<string, boolean>,
      currentSpotIndex,
    };

    let sessionId: string;
    let newBalance: string;

    if (!isGuest && userId) {
      const gameSession = await prisma.gameSession.create({
        data: {
          userId,
          gameType: "BLACKJACK",
          betAmount: BigInt(totalBet),
          status: overallStatus === "finished" ? "COMPLETED" : "ACTIVE",
          stateJson: JSON.stringify(gameStateData),
          winAmount: overallStatus === "finished" ? BigInt(totalPayout) : null,
        },
      });
      sessionId = gameSession.id;
      newBalance = (await getBalance(userId)).toString();
    } else {
      sessionId = "guest:" + Buffer.from(JSON.stringify(gameStateData)).toString("base64");
      newBalance = ((guestBalance || 1000) - totalBet + totalPayout).toString();
    }

    // Build per-spot response
    const dealerHandValue = calculateHandValue(finalDealerCards);
    const responseSpots: Record<string, object> = {};

    for (const sid of spotOrder) {
      const hand = spotHands[sid][0];
      const hv = calculateHandValue(hand.cards);
      const isSpotDone = hand.isStanding || hand.isBusted || hand.isBlackjack;
      const isActive = sid === currentSpotId;

      responseSpots[sid] = {
        playerHands: spotHands[sid].map(formatHandForClient),
        currentHandIndex: 0,
        status: allFinished ? "finished" : (isSpotDone ? "done" : "playing"),
        result: spotResults[sid]?.[0]?.result,
        results: spotResults[sid] || null,
        canHit: !allFinished && isActive && !hand.isBusted && !hand.isStanding,
        canStand: !allFinished && isActive && !hand.isBusted && !hand.isStanding,
        canDouble: !allFinished && isActive && hand.cards.length === 2 && !hv.isSoft && hv.value >= 9 && hv.value <= 11,
        canSplit: !allFinished && isActive && hand.cards.length === 2 && hand.cards[0].rank === hand.cards[1].rank,
        canInsurance: !allFinished && isActive && dealerShowsAce,
        insuranceTaken: false,
        totalPayout: spotResults[sid]?.[0]?.payout || 0,
      };
    }

    return NextResponse.json({
      sessionId,
      dealerHand: finalDealerCards,
      dealerValue: overallStatus === "finished" ? dealerHandValue.value : calculateHandValue([finalDealerCards[0]]).value,
      dealerHidden: overallStatus !== "finished",
      spots: responseSpots,
      spotOrder,
      currentSpotId,
      overallStatus,
      totalPayout,
      newBalance,
    });
  } catch (error) {
    console.error("Blackjack deal error:", error);
    return NextResponse.json({ error: "Game error" }, { status: 500 });
  }
}
