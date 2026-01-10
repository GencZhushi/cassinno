"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Coins, ArrowLeft, Plus, Minus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminTokensPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    userId: "",
    amount: "",
    reason: "",
  });

  const handleSubmit = async (action: "credit" | "debit") => {
    if (!formData.userId || !formData.amount || !formData.reason) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }

    const amount = parseInt(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${formData.userId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, reason: formData.reason }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `${action} failed`);
      }

      toast({
        title: `Tokens ${action}ed successfully`,
        description: `${amount.toLocaleString()} tokens ${action}ed. New balance: ${parseInt(data.newBalance).toLocaleString()}`,
        variant: "success",
      });

      setFormData({ userId: "", amount: "", reason: "" });
      router.refresh();
    } catch (error) {
      toast({
        title: `${action} failed`,
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen pb-20">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center">
            <Coins className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Token Controls</h1>
            <p className="text-muted-foreground">Credit or debit user tokens</p>
          </div>
        </div>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Adjust User Balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                placeholder="Enter user ID (from user management)"
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter token amount"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                min="1"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason (required for audit log)</Label>
              <Input
                id="reason"
                placeholder="e.g., Compensation for issue, Bonus reward, etc."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => handleSubmit("credit")}
                disabled={isLoading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Credit Tokens
                  </>
                )}
              </Button>

              <Button
                onClick={() => handleSubmit("debit")}
                disabled={isLoading}
                variant="destructive"
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Minus className="w-4 h-4 mr-2" />
                    Debit Tokens
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              ⚠️ All token adjustments are logged and cannot be deleted.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
