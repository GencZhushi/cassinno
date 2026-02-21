"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Volume2,
  VolumeX,
  Heart,
  Maximize2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import useBlackjackGame from "@/hooks/useBlackjackGame";

import ImageAnchoredTableLayout, {
  getAnchor,
  anchorStyle,
} from "@/components/blackjack/ImageAnchoredTableLayout";
import {
  BLACKJACK_ANCHORS,
  TABLE_IMAGE_SRC,
  TABLE_ASPECT_RATIO,
  BETTING_SPOT_IDS,
} from "@/components/blackjack/BlackjackTableAnchors";
import DealerHand from "@/components/blackjack/DealerHand";
import BettingSpot from "@/components/blackjack/BettingSpot";
import ChipSelector from "@/components/blackjack/ChipSelector";
import ActionBar from "@/components/blackjack/ActionBar";
import ResultOverlay from "@/components/blackjack/ResultOverlay";

export default function BlackjackPage() {
  const { toast } = useToast();
  const game = useBlackjackGame();

  /* Surface errors as toasts */
  useEffect(() => {
    if (game.error) {
      toast({ title: game.error, variant: "destructive" });
    }
  }, [game.error, toast]);

  const isBetting = game.roundPhase === "betting";
  const isPlaying = game.roundPhase === "playing" && !game.isDealing;
  const isFinished = game.roundPhase === "settled" && game.allSettled;
  const hasAnyBet = game.betAmount > 0;

  /* Active spot's state for dealer display + action bar */
  const activeSpotState = game.activeSpot ? game.spotStates[game.activeSpot] : null;
  const activeGameState = activeSpotState?.gameState ?? null;

  return (
    <main className="min-h-screen flex flex-col bg-[#111]">
      {/* ═══ TOP HEADER BAR ═══ */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ background: "linear-gradient(180deg, #3a3a3a 0%, #222 100%)" }}
      >
        <Link href="/">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-300 hover:text-white hover:bg-white/10 h-8 w-8"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm sm:text-base tracking-wide">
            Classic Blackjack Gold
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => game.setSoundEnabled(!game.soundEnabled)}
            className="p-1.5 text-gray-400 hover:text-white transition-colors"
          >
            {game.soundEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>
          <button className="p-1.5 text-gray-400 hover:text-white transition-colors">
            <Heart className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-gray-400 hover:text-white transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ═══ TABLE BOARD — image-driven layout ═══ */}
      <div className="flex-1 flex items-center justify-center p-2 sm:p-4 bg-[#0a0a0a]">
        <div className="w-full max-w-[960px]">
          <ImageAnchoredTableLayout
            imageSrc={TABLE_IMAGE_SRC}
            aspectRatio={TABLE_ASPECT_RATIO}
            anchors={BLACKJACK_ANCHORS}
            debug={false}
          >
            {(anchors) => {
              const a = (id: string) => getAnchor(anchors, id)!;
              const s = (id: string) => anchorStyle(a(id));

              return (
                <>
                  {/* ── Min / Max panel (top-left, over image panel) ── */}
                  <div
                    className="absolute flex flex-col items-center justify-center pointer-events-none"
                    style={s("minmax")}
                  >
                    <div
                      className="text-[8px] sm:text-[10px] font-mono border border-gray-500/40 rounded-sm overflow-hidden w-full"
                      style={{ background: "rgba(26,26,26,0.85)" }}
                    >
                      <div className="flex justify-between px-2 py-0.5 border-b border-gray-600/30">
                        <span className="text-gray-300">Min</span>
                        <span className="text-white font-bold">1</span>
                      </div>
                      <div className="flex justify-between px-2 py-0.5">
                        <span className="text-gray-300">Max</span>
                        <span className="text-white font-bold">200</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Dealer hand (from currently active spot) ── */}
                  {activeGameState && activeSpotState && (
                    <DealerHand
                      cards={activeGameState.dealerHand}
                      dealerValue={activeGameState.dealerValue}
                      dealerHidden={activeGameState.dealerHidden}
                      visibleCards={activeSpotState.visibleDealerCards}
                      isDealing={game.isDealing}
                      isRevealing={activeSpotState.revealingDealer}
                      isFinished={activeSpotState.phase === "settled"}
                      style={s("dealerCards")}
                    />
                  )}

                  {/* ── 5 Betting spots (all interactive) ── */}
                  {BETTING_SPOT_IDS.map((spotId) => {
                    const anchor = a(spotId);
                    const ss = game.spotStates[spotId];
                    const gs = ss?.gameState ?? null;
                    const hand = gs
                      ? gs.playerHands[gs.currentHandIndex]
                      : null;
                    const bet = game.spotBets[spotId] || 0;
                    const spotResult =
                      ss?.showResult && gs?.results?.[0]
                        ? gs.results[0].result
                        : null;

                    return (
                      <BettingSpot
                        key={spotId}
                        id={spotId}
                        hand={hand}
                        betAmount={bet}
                        isActive={spotId === game.activeSpot && gs?.status === "playing"}
                        isMainSpot={spotId === "center"}
                        enabled={isBetting}
                        visibleCards={ss?.visiblePlayerCards ?? 0}
                        showResult={spotResult}
                        isDealing={game.isDealing && spotId === game.activeSpot}
                        onClick={() => game.placeBetOnSpot(spotId)}
                        style={anchorStyle(anchor)}
                      />
                    );
                  })}

                  {/* ── Action bar (Hit/Stand/Double/Split during play) ── */}
                  {activeGameState && activeGameState.status === "playing" && !game.isDealing && (
                    <ActionBar
                      canHit={activeGameState.canHit}
                      canStand={activeGameState.canStand}
                      canDouble={activeGameState.canDouble}
                      canSplit={activeGameState.canSplit}
                      canInsurance={activeGameState.canInsurance}
                      insuranceTaken={activeGameState.insuranceTaken}
                      disabled={game.actionsDisabled}
                      onAction={game.handleAction}
                      style={s("actionBar")}
                    />
                  )}

                  {/* ── Chip selector (bottom-left area) ── */}
                  <ChipSelector
                    selectedChip={game.selectedChip}
                    onSelectChip={game.setSelectedChip}
                    balance={game.balance}
                    disabled={!isBetting}
                    style={s("chipSelect")}
                  />

                  {/* ── Balance + Bet panel (bottom-left overlay) ── */}
                  <div className="absolute z-[35]" style={s("balanceArea")}>
                    <div className="flex items-center gap-2 sm:gap-3 h-full">
                      <div className="bg-black/70 px-2 py-1 rounded border border-yellow-700/50">
                        <div className="text-[7px] sm:text-[9px] text-yellow-500/80 uppercase font-bold tracking-wider">
                          Balance
                        </div>
                        <div className="font-bold text-white text-[10px] sm:text-sm leading-tight">
                          {game.balance.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-black/70 px-2 py-1 rounded border border-yellow-700/50">
                        <div className="text-[7px] sm:text-[9px] text-yellow-500/80 uppercase font-bold tracking-wider">
                          Bet
                        </div>
                        <div className="font-bold text-white text-[10px] sm:text-sm leading-tight">
                          {game.betAmount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Deal / Rebet / Clear buttons (bottom-right) ── */}
                  <div className="absolute right-[3%] bottom-[3%] z-[35] flex items-center gap-1.5 sm:gap-2">
                    {(isBetting || isFinished) && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={game.rebet}
                          disabled={
                            Object.values(game.lastSpotBets).reduce((s, v) => s + v, 0) > game.balance ||
                            Object.values(game.lastSpotBets).reduce((s, v) => s + v, 0) < 1
                          }
                          className="bg-black/60 border-gray-600 hover:bg-black/80 text-gray-200 h-7 sm:h-8 px-2 text-[10px] sm:text-xs"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Rebet
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={game.clearBets}
                          className="bg-black/60 border-gray-600 hover:bg-black/80 text-gray-200 h-7 sm:h-8 px-2 text-[10px] sm:text-xs"
                        >
                          Clear
                        </Button>
                        <button
                          onClick={
                            isFinished ? game.newGame : game.startGame
                          }
                          disabled={
                            game.isLoading ||
                            (!isFinished && (!hasAnyBet || game.betAmount > game.balance))
                          }
                          className="
                            bg-gradient-to-b from-yellow-500 to-yellow-700
                            hover:from-yellow-400 hover:to-yellow-600
                            text-white font-bold
                            px-4 sm:px-6 py-2 sm:py-2.5
                            text-xs sm:text-sm rounded-full
                            shadow-[0_0_15px_rgba(202,138,4,0.3)]
                            border-2 border-yellow-400/50
                            transition-all hover:scale-105 active:scale-95
                            disabled:opacity-40 disabled:cursor-not-allowed
                          "
                        >
                          {game.isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : isFinished ? (
                            "NEW HAND"
                          ) : (
                            "DEAL"
                          )}
                        </button>
                      </>
                    )}

                    {/* Status indicator during play */}
                    {!isBetting && !isFinished && game.activeSpot && (
                        <div className="text-yellow-400 font-bold text-[10px] sm:text-xs px-3 py-1.5 bg-black/50 rounded-full border border-yellow-600/30">
                          {game.isDealing ? "Dealing..." : game.roundPhase === "playing" ? "Your Turn" : ""}
                        </div>
                      )}
                  </div>

                  {/* ── Result overlay (all spots settled) ── */}
                  {isFinished && game.overallResult && (
                      <ResultOverlay
                        result={game.overallResult}
                        payout={game.totalPayout}
                        onNewGame={game.newGame}
                      />
                    )}
                </>
              );
            }}
          </ImageAnchoredTableLayout>
        </div>
      </div>

      {/* ═══ BLACKJACK GOLD ANIMATIONS (scoped keyframes) ═══ */}
      <style jsx global>{`
        @keyframes bj-deal {
          0% {
            opacity: 0;
            transform: translate(120px, -80px) rotate(-12deg) scale(0.3);
          }
          60% {
            opacity: 1;
            transform: translate(2px, 2px) rotate(1deg) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translate(0, 0) rotate(0) scale(1);
          }
        }
        @keyframes bj-flip {
          0% {
            transform: rotateY(0deg);
          }
          50% {
            transform: rotateY(90deg);
          }
          100% {
            transform: rotateY(0deg);
          }
        }
        @keyframes bj-win-glow {
          0%,
          100% {
            box-shadow: 0 0 6px rgba(255, 215, 0, 0.4),
              0 0 12px rgba(255, 215, 0, 0.2);
          }
          50% {
            box-shadow: 0 0 12px rgba(255, 215, 0, 0.7),
              0 0 24px rgba(255, 215, 0, 0.4);
          }
        }
        @keyframes bj-chip-place {
          0% {
            transform: translateY(-30px) scale(0.5);
            opacity: 0;
          }
          60% {
            transform: translateY(3px) scale(1.08);
            opacity: 1;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes bj-spot-glow {
          0%,
          100% {
            box-shadow: 0 0 8px rgba(250, 204, 21, 0.3);
          }
          50% {
            box-shadow: 0 0 18px rgba(250, 204, 21, 0.6);
          }
        }
        @keyframes bj-fade-in {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        @keyframes bj-bounce-in {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            transform: scale(1.06);
          }
          70% {
            transform: scale(0.95);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .bj-animate-deal {
          animation: bj-deal 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .bj-animate-flip {
          animation: bj-flip 0.5s ease-in-out forwards;
        }
        .bj-animate-win-glow {
          animation: bj-win-glow 1.5s ease-in-out infinite;
        }
        .bj-animate-chip-place {
          animation: bj-chip-place 0.35s ease-out forwards;
        }
        .bj-animate-spot-glow {
          animation: bj-spot-glow 1.5s ease-in-out infinite;
        }
        .bj-animate-fade-in {
          animation: bj-fade-in 0.3s ease-out forwards;
        }
        .bj-animate-bounce-in {
          animation: bj-bounce-in 0.5s ease-out forwards;
        }
      `}</style>
    </main>
  );
}
