"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Wallet, ArrowUpRight, ArrowDownLeft, Gift, RefreshCw, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  type: string;
  amount: string;
  balanceAfter: string;
  game: string | null;
  createdAt: string;
}

interface WalletData {
  balance: string;
  transactions: Transaction[];
}

export default function WalletPage() {
  const { toast } = useToast();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaimingFaucet, setIsClaimingFaucet] = useState(false);

  const fetchWalletData = async () => {
    try {
      const res = await fetch("/api/wallet");
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/auth/login";
          return;
        }
        throw new Error("Failed to fetch wallet data");
      }
      const data = await res.json();
      setWalletData(data);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load wallet data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const claimFaucet = async () => {
    setIsClaimingFaucet(true);
    try {
      const res = await fetch("/api/wallet/faucet", { method: "POST" });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to claim faucet");
      }

      toast({
        title: "Faucet Claimed!",
        description: `You received ${parseInt(data.amount).toLocaleString()} tokens!`,
        variant: "success",
      });
      
      fetchWalletData();
    } catch (error) {
      toast({
        title: "Faucet Error",
        description: error instanceof Error ? error.message : "Failed to claim faucet",
        variant: "destructive",
      });
    } finally {
      setIsClaimingFaucet(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "WIN":
      case "ADMIN_CREDIT":
      case "FAUCET":
        return <ArrowDownLeft className="w-4 h-4 text-green-400" />;
      case "BET":
      case "ADMIN_DEBIT":
        return <ArrowUpRight className="w-4 h-4 text-red-400" />;
      default:
        return <RefreshCw className="w-4 h-4 text-blue-400" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "WIN":
      case "ADMIN_CREDIT":
      case "FAUCET":
        return "text-green-400";
      case "BET":
      case "ADMIN_DEBIT":
        return "text-red-400";
      default:
        return "text-blue-400";
    }
  };

  const formatAmount = (type: string, amount: string) => {
    const value = parseInt(amount);
    const isPositive = ["WIN", "ADMIN_CREDIT", "FAUCET", "REFUND"].includes(type);
    return `${isPositive ? "+" : "-"}${Math.abs(value).toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">My Wallet</h1>
            <p className="text-muted-foreground">Manage your tokens</p>
          </div>
        </div>

        {/* Balance Card */}
        <Card className="glass mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-8">
            <p className="text-sm text-muted-foreground mb-2">Current Balance</p>
            <p className="text-5xl font-bold text-gradient mb-4">
              {walletData ? parseInt(walletData.balance).toLocaleString() : "0"}
              <span className="text-2xl ml-2 text-yellow-500">tokens</span>
            </p>
            <div className="flex gap-4 mt-6">
              <Button onClick={claimFaucet} disabled={isClaimingFaucet} className="bg-green-600 hover:bg-green-700">
                {isClaimingFaucet ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Gift className="w-4 h-4 mr-2" />
                )}
                Claim Free Tokens
              </Button>
              <Link href="/">
                <Button variant="outline">Play Games</Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="glass">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-400">
                {walletData?.transactions.filter(t => t.type === "WIN").length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Total Wins</p>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-400">
                {walletData?.transactions.filter(t => t.type === "BET").length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Total Bets</p>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-400">
                {walletData?.transactions.length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Transactions</p>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Transaction History</span>
              <Button variant="ghost" size="sm" onClick={fetchWalletData}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {walletData?.transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No transactions yet. Start playing to see your history!
              </p>
            ) : (
              <div className="space-y-3">
                {walletData?.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        {getTransactionIcon(tx.type)}
                      </div>
                      <div>
                        <p className="font-medium">
                          {tx.type.replace("_", " ")}
                          {tx.game && <span className="text-muted-foreground ml-2">• {tx.game}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${getTransactionColor(tx.type)}`}>
                        {formatAmount(tx.type, tx.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Balance: {parseInt(tx.balanceAfter).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          These are play-money tokens with no real monetary value.
          <Link href="/responsible-gaming" className="text-yellow-500 hover:underline ml-1">
            Learn more
          </Link>
        </p>
      </div>
    </main>
  );
}
