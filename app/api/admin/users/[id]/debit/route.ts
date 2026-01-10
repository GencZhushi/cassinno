import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { adminDebit } from "@/lib/wallet";
import { adminCreditDebitSchema } from "@/lib/validations";
import prisma from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

    const body = await request.json();
    const validationResult = adminCreditDebitSchema.safeParse({
      ...body,
      userId: params.id,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { amount, reason } = validationResult.data;

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Debit tokens
    const result = await adminDebit(
      params.id,
      BigInt(amount),
      session.userId,
      reason,
      ip
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      newBalance: result.newBalance.toString(),
      transactionId: result.transactionId,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden: Admin access required") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Admin debit error:", error);
    return NextResponse.json(
      { error: "Debit failed. Please try again." },
      { status: 500 }
    );
  }
}
