import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users, ArrowLeft, Search } from "lucide-react";

async function getUsers(page: number = 1, limit: number = 20) {
  const skip = (page - 1) * limit;
  
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isLocked: true,
        createdAt: true,
        lastLoginAt: true,
        wallet: { select: { balance: true } },
      },
    }),
    prisma.user.count(),
  ]);

  return { users, total, pages: Math.ceil(total / limit) };
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = await getSession();
  
  if (!session || session.role !== "ADMIN") {
    redirect("/auth/login");
  }

  const page = parseInt(searchParams.page || "1");
  const { users, total, pages } = await getUsers(page);

  return (
    <main className="min-h-screen pb-20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground">{total} total users</p>
          </div>
        </div>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Username</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Email</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Role</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Balance</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border/50 hover:bg-white/5">
                      <td className="p-3 font-medium">{user.username}</td>
                      <td className="p-3 text-muted-foreground">{user.email}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${user.role === "ADMIN" ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-3 text-yellow-400">{parseInt(user.wallet?.balance?.toString() || "0").toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${user.isLocked ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
                          {user.isLocked ? "Locked" : "Active"}
                        </span>
                      </td>
                      <td className="p-3">
                        <Link href={`/admin/users/${user.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-2 mt-6">
              {page > 1 && (
                <Link href={`/admin/users?page=${page - 1}`}>
                  <Button variant="outline" size="sm">Previous</Button>
                </Link>
              )}
              <span className="px-4 py-2 text-sm text-muted-foreground">
                Page {page} of {pages}
              </span>
              {page < pages && (
                <Link href={`/admin/users?page=${page + 1}`}>
                  <Button variant="outline" size="sm">Next</Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
