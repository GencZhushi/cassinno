import { NextRequest, NextResponse } from "next/server";
import { destroySession, getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    if (session) {
      // Create audit log before destroying session
      await prisma.auditLog.create({
        data: {
          actorUserId: session.userId,
          action: "USER_LOGOUT",
          ip,
          userAgent,
        },
      });
    }

    await destroySession();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    // Still try to destroy session even if audit log fails
    await destroySession();
    return NextResponse.json({ success: true });
  }
}
