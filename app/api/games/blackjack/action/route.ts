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

interface GameStateData {
  deck: Card[];
  playerHands: HandState[];
  currentHandIndex: number;
  dealerHand: Card[];
  betAmount: number;
  insuranceBet: number;
  insuranceTaken: boolean;
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

function canSplitHand(hand: HandState): boolean {
  if (hand.cards.length !== 2 || hand.isSplit) return false;
  return hand.cards[0].rank === hand.cards[1].rank;
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
  const dealerBlackjack = isBlackjack(dealerHand);
  const dealerBusted = dealerValue > 21;
  
  let totalPayout = 0;
  const results: Array<{ result: string; payout: number }> = [];
  
  // Insurance payout
  if (insuranceBet > 0 && dealerBlackjack) {
    totalPayout += insuranceBet * 3; // 2:1 plus original bet
  }
  
  for (const hand of playerHands) {
    const playerValue = calculateHandValue(hand.cards).value;
    let result: string;
    let payout = 0;
    
    if (hand.isBusted) {
      result = "lose";
    } else if (hand.isBlackjack && !dealerBlackjack) {
      result = "blackjack";
      payout = Math.floor(hand.bet * 2.5);
    } else if (hand.isBlackjack && dealerBlackjack) {
      result = "push";
      payout = hand.bet;
    } else if (dealerBlackjack) {
      result = "lose";
    } else if (dealerBusted) {
      result = "win";
      payout = hand.bet * 2;
    } else if (playerValue > dealerValue) {
      result = "win";
      payout = hand.bet * 2;
    } else if (playerValue < dealerValue) {
      result = "lose";
    } else {
      result = "push";
      payout = hand.bet;
    }
    
    totalPayout += payout;
    results.push({ result, payout });
  }
  
  return { results, totalPayout, dealerValue };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, action } = body;

    if (!sessionId || !action) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Get game session
    const gameSession = await prisma.gameSession.findUnique({
      where: { id: sessionId },
    });

    if (!gameSession || gameSession.userId !== session.userId) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    if (gameSession.status !== "ACTIVE") {
      return NextResponse.json({ error: "Game already finished" }, { status: 400 });
    }

    const state: GameStateData = JSON.parse(gameSession.stateJson);
    const { deck, playerHands } = state;
    let { currentHandIndex, dealerHand, insuranceBet, insuranceTaken } = state;
    
    let currentHand = playerHands[currentHandIndex];
    let status = "playing";
    let moveToNextHand = false;

    // Handle actions
    if (action === "hit") {
      currentHand.cards.push(deck.pop()!);
      const handValue = calculateHandValue(currentHand.cards).value;
      
      if (handValue > 21) {
        currentHand.isBusted = true;
        moveToNextHand = true;
      } else if (handValue === 21) {
        currentHand.isStanding = true;
        moveToNextHand = true;
      }
    } else if (action === "stand") {
      currentHand.isStanding = true;
      moveToNextHand = true;
    } else if (action === "double") {
      // Double the bet
      const doubleResult = await placeBet(session.userId, BigInt(currentHand.bet), "BLACKJACK");
      if (!doubleResult.success) {
        return NextResponse.json({ error: "Insufficient balance to double" }, { status: 400 });
      }
      
      currentHand.bet *= 2;
      currentHand.isDoubled = true;
      currentHand.cards.push(deck.pop()!);
      
      const handValue = calculateHandValue(currentHand.cards).value;
      if (handValue > 21) {
        currentHand.isBusted = true;
      } else {
        currentHand.isStanding = true;
      }
      moveToNextHand = true;
    } else if (action === "split") {
      if (!canSplitHand(currentHand)) {
        return NextResponse.json({ error: "Cannot split this hand" }, { status: 400 });
      }
      
      // Place additional bet for split hand
      const splitResult = await placeBet(session.userId, BigInt(currentHand.bet), "BLACKJACK");
      if (!splitResult.success) {
        return NextResponse.json({ error: "Insufficient balance to split" }, { status: 400 });
      }
      
      const card1 = currentHand.cards[0];
      const card2 = currentHand.cards[1];
      
      // Create two new hands
      const hand1: HandState = {
        cards: [card1, deck.pop()!],
        bet: currentHand.bet,
        isDoubled: false,
        isSplit: true,
        isStanding: card1.rank === "A", // Split Aces stand immediately
        isBusted: false,
        isBlackjack: false,
      };
      
      const hand2: HandState = {
        cards: [card2, deck.pop()!],
        bet: currentHand.bet,
        isDoubled: false,
        isSplit: true,
        isStanding: card2.rank === "A", // Split Aces stand immediately
        isBusted: false,
        isBlackjack: false,
      };
      
      // Check for busts
      if (calculateHandValue(hand1.cards).value > 21) hand1.isBusted = true;
      if (calculateHandValue(hand2.cards).value > 21) hand2.isBusted = true;
      
      // Replace current hand with split hands
      playerHands.splice(currentHandIndex, 1, hand1, hand2);
      currentHand = playerHands[currentHandIndex];
      
      // If first split hand is busted, move to next
      if (hand1.isBusted) {
        moveToNextHand = true;
      }
    } else if (action === "insurance") {
      if (insuranceTaken || dealerHand[0].rank !== "A") {
        return NextResponse.json({ error: "Insurance not available" }, { status: 400 });
      }
      
      const insuranceAmount = Math.floor(state.betAmount / 2);
      const insuranceResult = await placeBet(session.userId, BigInt(insuranceAmount), "BLACKJACK");
      if (!insuranceResult.success) {
        return NextResponse.json({ error: "Insufficient balance for insurance" }, { status: 400 });
      }
      
      insuranceBet = insuranceAmount;
      insuranceTaken = true;
    }

    // Update current hand in array
    playerHands[currentHandIndex] = currentHand;

    // Move to next hand if needed
    if (moveToNextHand) {
      currentHandIndex++;
      while (currentHandIndex < playerHands.length) {
        const hand = playerHands[currentHandIndex];
        if (!hand.isBusted && !hand.isStanding) break;
        currentHandIndex++;
      }
    }

    // Check if all hands are done
    let allHandsDone = currentHandIndex >= playerHands.length;
    if (!allHandsDone) {
      allHandsDone = playerHands.every(h => h.isBusted || h.isStanding);
    }

    let result: string | undefined;
    let results: Array<{ result: string; payout: number }> | undefined;
    let totalPayout = 0;
    let dealerValue = calculateHandValue([dealerHand[0]]).value;

    if (allHandsDone) {
      status = "finished";
      
      // Play dealer hand if any player hand is not busted
      const anyPlayerAlive = playerHands.some(h => !h.isBusted);
      if (anyPlayerAlive) {
        dealerHand = playDealerHand(deck, dealerHand);
      }
      
      // Calculate results
      const calcResults = calculateResults(playerHands, dealerHand, insuranceBet);
      results = calcResults.results;
      totalPayout = calcResults.totalPayout;
      dealerValue = calcResults.dealerValue;
      
      // Determine primary result for display
      if (results.length === 1) {
        result = results[0].result;
      } else {
        const wins = results.filter(r => r.result === "win" || r.result === "blackjack").length;
        const losses = results.filter(r => r.result === "lose").length;
        if (wins > losses) result = "win";
        else if (losses > wins) result = "lose";
        else result = "push";
      }
      
      // Credit winnings
      if (totalPayout > 0) {
        await creditWinnings(session.userId, BigInt(totalPayout), "BLACKJACK");
      }

      await prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          status: "COMPLETED",
          winAmount: BigInt(totalPayout),
          stateJson: JSON.stringify({ 
            deck, playerHands, currentHandIndex, dealerHand, 
            betAmount: state.betAmount, insuranceBet, insuranceTaken 
          }),
        },
      });
    } else {
      // Update current hand index
      if (currentHandIndex >= playerHands.length) {
        currentHandIndex = playerHands.length - 1;
      }
      
      await prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          stateJson: JSON.stringify({ 
            deck, playerHands, currentHandIndex, dealerHand, 
            betAmount: state.betAmount, insuranceBet, insuranceTaken 
          }),
        },
      });
    }

    const newBalance = await getBalance(session.userId);
    const activeHand = playerHands[Math.min(currentHandIndex, playerHands.length - 1)];
    const activeHandValueData = calculateHandValue(activeHand.cards);
    const activeHandValue = activeHandValueData.value;
    const canDouble = status === "playing" && activeHand.cards.length === 2 && !activeHand.isDoubled && !activeHand.isSplit && !activeHandValueData.isSoft && (activeHandValue >= 9 && activeHandValue <= 11);

    return NextResponse.json({
      gameState: {
        playerHands: playerHands.map(formatHandForClient),
        currentHandIndex: Math.min(currentHandIndex, playerHands.length - 1),
        dealerHand,
        dealerValue: status === "finished" ? dealerValue : calculateHandValue([dealerHand[0]]).value,
        dealerHidden: status !== "finished",
        status,
        result,
        results,
        canHit: status === "playing" && !activeHand.isBusted && !activeHand.isStanding,
        canStand: status === "playing" && !activeHand.isBusted && !activeHand.isStanding,
        canDouble,
        canSplit: status === "playing" && canSplitHand(activeHand),
        canInsurance: status === "playing" && dealerHand[0].rank === "A" && !insuranceTaken,
        insuranceTaken,
        totalPayout,
      },
      newBalance: newBalance.toString(),
    });
  } catch (error) {
    console.error("Blackjack action error:", error);
    return NextResponse.json({ error: "Game error" }, { status: 500 });
  }
}
