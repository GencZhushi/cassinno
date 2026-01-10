import prisma from "./prisma";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

const DEFAULT_LIMITS = {
  login: { max: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  register: { max: 3, windowMs: 60 * 60 * 1000 }, // 3 registrations per hour
  bet: { max: 100, windowMs: 60 * 1000 }, // 100 bets per minute
  faucet: { max: 1, windowMs: 24 * 60 * 60 * 1000 }, // 1 claim per day
} as const;

type RateLimitAction = keyof typeof DEFAULT_LIMITS;

/**
 * Check and update rate limit for an identifier and action
 */
export async function checkRateLimit(
  identifier: string,
  action: RateLimitAction
): Promise<RateLimitResult> {
  const limit = DEFAULT_LIMITS[action];
  const now = new Date();
  const windowStart = new Date(now.getTime() - limit.windowMs);

  try {
    // Clean up expired entries
    await prisma.rateLimitEntry.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    // Find or create rate limit entry
    const existing = await prisma.rateLimitEntry.findUnique({
      where: {
        identifier_action: {
          identifier,
          action,
        },
      },
    });

    if (!existing || existing.windowStart < windowStart) {
      // Create or reset entry
      const entry = await prisma.rateLimitEntry.upsert({
        where: {
          identifier_action: {
            identifier,
            action,
          },
        },
        create: {
          identifier,
          action,
          count: 1,
          windowStart: now,
          expiresAt: new Date(now.getTime() + limit.windowMs),
        },
        update: {
          count: 1,
          windowStart: now,
          expiresAt: new Date(now.getTime() + limit.windowMs),
        },
      });

      return {
        allowed: true,
        remaining: limit.max - 1,
        resetAt: entry.expiresAt,
      };
    }

    // Check if limit exceeded
    if (existing.count >= limit.max) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: existing.expiresAt,
      };
    }

    // Increment count
    const updated = await prisma.rateLimitEntry.update({
      where: {
        identifier_action: {
          identifier,
          action,
        },
      },
      data: { count: { increment: 1 } },
    });

    return {
      allowed: true,
      remaining: limit.max - updated.count,
      resetAt: updated.expiresAt,
    };
  } catch (error) {
    console.error("Rate limit check error:", error);
    // On error, allow the request but log it
    return {
      allowed: true,
      remaining: limit.max,
      resetAt: new Date(now.getTime() + limit.windowMs),
    };
  }
}

/**
 * Get rate limit status without incrementing
 */
export async function getRateLimitStatus(
  identifier: string,
  action: RateLimitAction
): Promise<RateLimitResult> {
  const limit = DEFAULT_LIMITS[action];
  const now = new Date();

  try {
    const existing = await prisma.rateLimitEntry.findUnique({
      where: {
        identifier_action: {
          identifier,
          action,
        },
      },
    });

    if (!existing || existing.expiresAt < now) {
      return {
        allowed: true,
        remaining: limit.max,
        resetAt: new Date(now.getTime() + limit.windowMs),
      };
    }

    return {
      allowed: existing.count < limit.max,
      remaining: Math.max(0, limit.max - existing.count),
      resetAt: existing.expiresAt,
    };
  } catch {
    return {
      allowed: true,
      remaining: limit.max,
      resetAt: new Date(now.getTime() + limit.windowMs),
    };
  }
}

/**
 * Reset rate limit for an identifier and action
 * Used after successful login, etc.
 */
export async function resetRateLimit(
  identifier: string,
  action: RateLimitAction
): Promise<void> {
  try {
    await prisma.rateLimitEntry.delete({
      where: {
        identifier_action: {
          identifier,
          action,
        },
      },
    });
  } catch {
    // Ignore if entry doesn't exist
  }
}
