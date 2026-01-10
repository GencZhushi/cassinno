import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, ArrowLeft } from "lucide-react";

async function getAuditLogs(page: number = 1, limit: number = 50) {
  const skip = (page - 1) * limit;
  
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        actor: { select: { username: true, email: true } },
        target: { select: { username: true, email: true } },
      },
    }),
    prisma.auditLog.count(),
  ]);

  return { logs, total, pages: Math.ceil(total / limit) };
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = await getSession();
  
  if (!session || session.role !== "ADMIN") {
    redirect("/auth/login");
  }

  const page = parseInt(searchParams.page || "1");
  const { logs, total, pages } = await getAuditLogs(page);

  return (
    <main className="min-h-screen pb-20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Audit Logs</h1>
            <p className="text-muted-foreground">{total} total entries (immutable)</p>
          </div>
        </div>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Time</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Action</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Actor</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Target</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">IP</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-border/50 hover:bg-white/5">
                      <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          log.action.includes("CREDIT") ? "bg-green-500/20 text-green-400" :
                          log.action.includes("DEBIT") ? "bg-red-500/20 text-red-400" :
                          log.action.includes("LOGIN") ? "bg-blue-500/20 text-blue-400" :
                          "bg-gray-500/20 text-gray-400"
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-sm">{log.actor?.username || "System"}</td>
                      <td className="p-3 text-sm text-muted-foreground">{log.target?.username || "-"}</td>
                      <td className="p-3 text-xs text-muted-foreground font-mono">{log.ip || "-"}</td>
                      <td className="p-3 text-xs text-muted-foreground max-w-xs truncate">
                        {log.metaJson ? JSON.stringify(log.metaJson) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-2 mt-6">
              {page > 1 && (
                <Link href={`/admin/audit?page=${page - 1}`}>
                  <Button variant="outline" size="sm">Previous</Button>
                </Link>
              )}
              <span className="px-4 py-2 text-sm text-muted-foreground">
                Page {page} of {pages}
              </span>
              {page < pages && (
                <Link href={`/admin/audit?page=${page + 1}`}>
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
