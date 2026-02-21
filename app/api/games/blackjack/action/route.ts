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

interface MultiSpotState {
  deck: Card[];
  spotOrder: string[];
  spotHands: Record<string, HandState[]>;
  currentSpotHandIndex: Record<string, number>;
  dealerHand: Card[];
  spotBets: Record<string, number>;
  totalBetAmount: number;
  insuranceBets: Record<string, number>;
  insuranceTaken: Record<string, boolean>;
  currentSpotIndex: number;
}

function calculateHandValue(hand: Card[]): { value: number; isSoft: boolean } {
  let value = 0;
  let aces = 0;
  for (const card of hand) {
    if (card.rank === "A") { aces++; value += 11; } else { value += card.value; }
  }
  const originalAces = aces;
  while (value > 21 && aces > 0) { value -= 10; aces--; }
  return { value, isSoft: aces > 0 && originalAces > 0 };
}

function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && calculateHandValue(cards).value === 21;
}

function canSplitHand(hand: HandState): boolean {
  if (hand.cards.length !== 2 || hand.isSplit) return false;
  return hand.cards[0].rank === hand.cards[1].rank;
}

function formatHandForClient(hand: HandState) {
  const { value, isSoft } = calculateHandValue(hand.cards);
  return { cards: hand.cards, value, isSoft, isBlackjack: hand.isBlackjack, isBusted: hand.isBusted, isDoubled: hand.isDoubled, isSplit: hand.isSplit, bet: hand.bet };
}

function playDealerHand(deck: Card[], dealerHand: Card[]): Card[] {
  const h = [...dealerHand];
  while (calculateHandValue(h).value < 17) h.push(deck.pop()!);
  return h;
}

function calculateResults(playerHands: HandState[], dealerHand: Card[], insuranceBet: number) {
  const dv = calculateHandValue(dealerHand).value;
  const dBJ = isBlackjack(dealerHand);
  const dBust = dv > 21;
  let totalPayout = 0;
  const results: Array<{ result: string; payout: number }> = [];
  if (insuranceBet > 0 && dBJ) totalPayout += insuranceBet * 3;
  for (const hand of playerHands) {
    const pv = calculateHandValue(hand.cards).value;
    let result: string; let payout = 0;
    if (hand.isBusted) result = "lose";
    else if (hand.isBlackjack && !dBJ) { result = "blackjack"; payout = Math.floor(hand.bet * 2.5); }
    else if (hand.isBlackjack && dBJ) { result = "push"; payout = hand.bet; }
    else if (dBJ) result = "lose";
    else if (dBust) { result = "win"; payout = hand.bet * 2; }
    else if (pv > dv) { result = "win"; payout = hand.bet * 2; }
    else if (pv < dv) result = "lose";
    else { result = "push"; payout = hand.bet; }
    totalPayout += payout;
    results.push({ result, payout });
  }
  return { results, totalPayout, dealerValue: dv };
}

/**
 * Multi-spot action: works on the current spot's current hand.
 * Accepts { sessionId, action, guestBalance? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, action, guestBalance: clientGuestBalance } = body;
    const isGuest = typeof sessionId === "string" && sessionId.startsWith("guest:");

    if (!sessionId || !action) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    let userId: string | null = null;
    let state: MultiSpotState;

    if (!isGuest) {
      const session = await getSession();
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      userId = session.userId;
      const gameSession = await prisma.gameSession.findUnique({ where: { id: sessionId } });
      if (!gameSession || gameSession.userId !== userId) {
        return NextResponse.json({ error: "Game not found" }, { status: 404 });
      }
      if (gameSession.status !== "ACTIVE") {
        return NextResponse.json({ error: "Game already finished" }, { status: 400 });
      }
      state = JSON.parse(gameSession.stateJson);
    } else {
      try {
        state = JSON.parse(Buffer.from(sessionId.slice("guest:".length), "base64").toString("utf-8"));
      } catch {
        return NextResponse.json({ error: "Invalid guest session" }, { status: 400 });
      }
    }

    const { deck, spotOrder, spotHands, currentSpotHandIndex, spotBets } = state;
    let { currentSpotIndex, insuranceBets, insuranceTaken, dealerHand } = state;
    if (!insuranceBets) insuranceBets = {};
    if (!insuranceTaken) insuranceTaken = {};

    if (currentSpotIndex >= spotOrder.length) {
      return NextResponse.json({ error: "No active spot" }, { status: 400 });
    }

    const currentSpotId = spotOrder[currentSpotIndex];
    const hands = spotHands[currentSpotId];
    let handIdx = currentSpotHandIndex[currentSpotId] || 0;
    let currentHand = hands[handIdx];
    let moveToNextHand = false;

    // Apply action
    if (action === "hit") {
      currentHand.cards.push(deck.pop()!);
      const v = calculateHandValue(currentHand.cards).value;
      if (v > 21) { currentHand.isBusted = true; moveToNextHand = true; }
      else if (v === 21) { currentHand.isStanding = true; moveToNextHand = true; }
    } else if (action === "stand") {
      currentHand.isStanding = true;
      moveToNextHand = true;
    } else if (action === "double") {
      if (!isGuest && userId) {
        const r = await placeBet(userId, BigInt(currentHand.bet), "BLACKJACK");
        if (!r.success) return NextResponse.json({ error: "Insufficient balance to double" }, { status: 400 });
      }
      currentHand.bet *= 2;
      currentHand.isDoubled = true;
      currentHand.cards.push(deck.pop()!);
      const v = calculateHandValue(currentHand.cards).value;
      if (v > 21) currentHand.isBusted = true;
      else currentHand.isStanding = true;
      moveToNextHand = true;
    } else if (action === "split") {
      if (!canSplitHand(currentHand)) return NextResponse.json({ error: "Cannot split" }, { status: 400 });
      if (!isGuest && userId) {
        const r = await placeBet(userId, BigInt(currentHand.bet), "BLACKJACK");
        if (!r.success) return NextResponse.json({ error: "Insufficient balance to split" }, { status: 400 });
      }
      const c1 = currentHand.cards[0], c2 = currentHand.cards[1];
      const h1: HandState = { cards: [c1, deck.pop()!], bet: currentHand.bet, isDoubled: false, isSplit: true, isStanding: c1.rank === "A", isBusted: false, isBlackjack: false };
      const h2: HandState = { cards: [c2, deck.pop()!], bet: currentHand.bet, isDoubled: false, isSplit: true, isStanding: c2.rank === "A", isBusted: false, isBlackjack: false };
      if (calculateHandValue(h1.cards).value > 21) h1.isBusted = true;
      if (calculateHandValue(h2.cards).value > 21) h2.isBusted = true;
      hands.splice(handIdx, 1, h1, h2);
      currentHand = hands[handIdx];
      if (h1.isBusted || h1.isStanding) moveToNextHand = true;
    } else if (action === "insurance") {
      if (insuranceTaken[currentSpotId] || dealerHand[0].rank !== "A") {
        return NextResponse.json({ error: "Insurance not available" }, { status: 400 });
      }
      const amt = Math.floor(spotBets[currentSpotId] / 2);
      if (!isGuest && userId) {
        const r = await placeBet(userId, BigInt(amt), "BLACKJACK");
        if (!r.success) return NextResponse.json({ error: "Insufficient balance for insurance" }, { status: 400 });
      }
      insuranceBets[currentSpotId] = amt;
      insuranceTaken[currentSpotId] = true;
    }

    // Update hand in array
    hands[handIdx] = currentHand;
    spotHands[currentSpotId] = hands;

    // Move to next hand within spot or next spot
    if (moveToNextHand) {
      handIdx++;
      while (handIdx < hands.length && (hands[handIdx].isBusted || hands[handIdx].isStanding)) handIdx++;
      currentSpotHandIndex[currentSpotId] = Math.min(handIdx, hands.length - 1);

      const spotDone = handIdx >= hands.length || hands.every(h => h.isBusted || h.isStanding);
      if (spotDone) {
        currentSpotIndex++;
        while (currentSpotIndex < spotOrder.length) {
          const sid = spotOrder[currentSpotIndex];
          if (!spotHands[sid].every(h => h.isBusted || h.isStanding || h.isBlackjack)) break;
          currentSpotIndex++;
        }
      }
    } else {
      currentSpotHandIndex[currentSpotId] = handIdx;
    }

    // Check if ALL spots are done
    const allDone = currentSpotIndex >= spotOrder.length ||
      spotOrder.every(sid => spotHands[sid].every(h => h.isBusted || h.isStanding || h.isBlackjack));

    let overallStatus = allDone ? "finished" : "playing";
    let totalPayout = 0;
    const allSpotResults: Record<string, { results: Array<{ result: string; payout: number }>; totalPayout: number }> = {};

    if (allDone) {
      // Play shared dealer hand
      const anyAlive = spotOrder.some(sid => spotHands[sid].some(h => !h.isBusted));
      if (anyAlive) dealerHand = playDealerHand(deck, dealerHand);

      // Calculate results for each spot
      for (const sid of spotOrder) {
        const r = calculateResults(spotHands[sid], dealerHand, insuranceBets[sid] || 0);
        allSpotResults[sid] = { results: r.results, totalPayout: r.totalPayout };
        totalPayout += r.totalPayout;
      }

      if (!isGuest && userId) {
        if (totalPayout > 0) await creditWinnings(userId, BigInt(totalPayout), "BLACKJACK");
        await prisma.gameSession.update({
          where: { id: sessionId },
          data: {
            status: "COMPLETED",
            winAmount: BigInt(totalPayout),
            stateJson: JSON.stringify({ ...state, deck, spotHands, currentSpotHandIndex, dealerHand, currentSpotIndex, insuranceBets, insuranceTaken }),
          },
        });
      }
    } else {
      if (!isGuest && userId) {
        await prisma.gameSession.update({
          where: { id: sessionId },
          data: {
            stateJson: JSON.stringify({ ...state, deck, spotHands, currentSpotHandIndex, dealerHand, currentSpotIndex, insuranceBets, insuranceTaken }),
          },
        });
      }
    }

    // Balance
    let newBalance: string;
    if (!isGuest && userId) {
      newBalance = (await getBalance(userId)).toString();
    } else {
      const gb = typeof clientGuestBalance === "number" ? clientGuestBalance : 1000;
      newBalance = (gb + (allDone ? totalPayout : 0)).toString();
    }

    // Guest: re-encode state
    let returnSessionId = sessionId;
    if (isGuest) {
      const updated = { ...state, deck, spotHands, currentSpotHandIndex, dealerHand, currentSpotIndex, insuranceBets, insuranceTaken };
      returnSessionId = "guest:" + Buffer.from(JSON.stringify(updated)).toString("base64");
    }

    // Build per-spot response
    const nextSpotId = currentSpotIndex < spotOrder.length ? spotOrder[currentSpotIndex] : null;
    const responseSpots: Record<string, object> = {};

    for (const sid of spotOrder) {
      const sHands = spotHands[sid];
      const sIdx = currentSpotHandIndex[sid] || 0;
      const activeH = sHands[Math.min(sIdx, sHands.length - 1)];
      const spotDone = sHands.every(h => h.isBusted || h.isStanding || h.isBlackjack);
      const isActive = sid === nextSpotId && !allDone;
      const hv = calculateHandValue(activeH.cards);

      responseSpots[sid] = {
        playerHands: sHands.map(formatHandForClient),
        currentHandIndex: Math.min(sIdx, sHands.length - 1),
        status: allDone ? "finished" : (spotDone ? "done" : "playing"),
        result: allSpotResults[sid]?.results?.[0]?.result,
        results: allSpotResults[sid]?.results || null,
        canHit: isActive && !activeH.isBusted && !activeH.isStanding,
        canStand: isActive && !activeH.isBusted && !activeH.isStanding,
        canDouble: isActive && activeH.cards.length === 2 && !activeH.isDoubled && !activeH.isSplit,
        canSplit: isActive && canSplitHand(activeH),
        canInsurance: isActive && dealerHand[0].rank === "A" && !insuranceTaken[sid],
        insuranceTaken: !!(insuranceTaken[sid]),
        totalPayout: allSpotResults[sid]?.totalPayout || 0,
      };
    }

    const dv = calculateHandValue(dealerHand);

    return NextResponse.json({
      sessionId: returnSessionId,
      dealerHand,
      dealerValue: allDone ? dv.value : calculateHandValue([dealerHand[0]]).value,
      dealerHidden: !allDone,
      spots: responseSpots,
      spotOrder,
      currentSpotId: nextSpotId,
      overallStatus,
      totalPayout,
      newBalance,
    });
  } catch (error) {
    console.error("Blackjack action error:", error);
    return NextResponse.json({ error: "Game error" }, { status: 500 });
  }
}
