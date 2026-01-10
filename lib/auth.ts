import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcrypt";
import prisma from "./prisma";
type Role = "USER" | "ADMIN";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-do-not-use-in-production-min32chars"
);

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "casino_session";

export interface SessionPayload {
  userId: string;
  email: string;
  username: string;
  role: Role;
  sessionId: string;
  exp: number;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(
  userId: string,
  ip?: string,
  userAgent?: string
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, username: true, role: true },
  });

  if (!user) throw new Error("User not found");

  const expiresAt = new Date(Date.now() + SESSION_DURATION);
  
  // Create session in database
  const session = await prisma.session.create({
    data: {
      userId,
      token: crypto.randomUUID(),
      expiresAt,
      ip,
      userAgent,
    },
  });

  // Create JWT
  const token = await new SignJWT({
    userId,
    email: user.email,
    username: user.username,
    role: user.role,
    sessionId: session.id,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(JWT_SECRET);

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const sessionPayload = payload as unknown as SessionPayload;

    // Verify session exists in database
    const dbSession = await prisma.session.findUnique({
      where: { id: sessionPayload.sessionId },
      include: { user: { select: { isLocked: true } } },
    });

    if (!dbSession || dbSession.expiresAt < new Date() || dbSession.user.isLocked) {
      await destroySession();
      return null;
    }

    return sessionPayload;
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (token) {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const sessionPayload = payload as unknown as SessionPayload;
      
      // Delete session from database
      await prisma.session.delete({
        where: { id: sessionPayload.sessionId },
      }).catch(() => {}); // Ignore if already deleted
    }

    cookieStore.delete(COOKIE_NAME);
  } catch {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
  }
}

export async function destroyAllUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId },
  });
}

export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireAuth();
  if (session.role !== "ADMIN") {
    throw new Error("Forbidden: Admin access required");
  }
  return session;
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  return usernameRegex.test(username);
}

export function isValidPassword(password: string): boolean {
  // At least 8 characters, one uppercase, one lowercase, one number
  return (
    password.length >= 8 &&
    password.length <= 100 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}
