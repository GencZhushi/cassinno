import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ user: null });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        avatarUrl: true,
        mustChangePassword: true,
        createdAt: true,
        wallet: {
          select: {
            balance: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        ...user,
        balance: user.wallet?.balance?.toString() || "0",
      },
    });
  } catch (error) {
    console.error("Get me error:", error);
    return NextResponse.json({ user: null });
  }
}
