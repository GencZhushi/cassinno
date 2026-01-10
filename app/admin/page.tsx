import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Users, Coins, Activity, Settings, FileText, Shield } from "lucide-react";

async function getAdminStats() {
  const [userCount, totalTokens, recentTransactions, activeSessions] = await Promise.all([
    prisma.user.count(),
    prisma.wallet.aggregate({ _sum: { balance: true } }),
    prisma.transaction.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    prisma.session.count({ where: { expiresAt: { gt: new Date() } } }),
  ]);

  return {
    userCount,
    totalTokens: totalTokens._sum.balance?.toString() || "0",
    recentTransactions,
    activeSessions,
  };
}

export default async function AdminDashboard() {
  const session = await getSession();
  
  if (!session || session.role !== "ADMIN") {
    redirect("/auth/login");
  }

  const stats = await getAdminStats();

  const adminLinks = [
    { name: "User Management", href: "/admin/users", icon: Users, description: "Search, view, and manage user accounts" },
    { name: "Token Controls", href: "/admin/tokens", icon: Coins, description: "Credit or debit tokens to users" },
    { name: "Game Config", href: "/admin/games", icon: Settings, description: "Enable/disable games, set betting limits" },
    { name: "Audit Logs", href: "/admin/audit", icon: FileText, description: "View all admin actions and transactions" },
  ];

  return (
    <main className="min-h-screen pb-20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your casino platform</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gradient">{stats.userCount.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Active Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">{stats.activeSessions.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Tokens in Circulation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-400">{parseInt(stats.totalTokens).toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">24h Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">{stats.recentTransactions.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {adminLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="glass hover:border-yellow-500/50 transition-all cursor-pointer h-full">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                    <link.icon className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{link.name}</h3>
                    <p className="text-sm text-muted-foreground">{link.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Recent Activity */}
        <Card className="glass mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              View detailed activity in the <Link href="/admin/audit" className="text-yellow-500 hover:underline">Audit Logs</Link> section.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
