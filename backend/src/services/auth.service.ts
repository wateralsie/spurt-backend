import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../lib/api-error.js";
import { generateAccessToken, generateTokenPair, verifyRefreshToken, hashToken } from "../lib/jwt.js";
import { getOAuthUserInfo } from "../lib/oauth.js";

function userResponse(user: { id: number; email: string; name: string; image: string | null }) {
  return { id: user.id, email: user.email, name: user.name, image: user.image };
}

export async function signup(
  teamId: string,
  email: string,
  name: string,
  password: string,
) {
  const existing = await prisma.user.findUnique({
    where: { teamId_email: { teamId, email } },
  });
  if (existing) {
    throw new ApiError(409, "Email already exists", "DUPLICATE_EMAIL");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { teamId, email, name, password: hashedPassword, provider: "email" },
  });

  const tokens = await generateTokenPair(user.id, teamId);
  return { ...tokens, user: userResponse(user) };
}

export async function login(teamId: string, email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { teamId_email: { teamId, email } },
  });
  if (!user || user.provider !== "email" || !user.password) {
    throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  const tokens = await generateTokenPair(user.id, teamId);
  return { ...tokens, user: userResponse(user) };
}

export async function logout(teamId: string, refreshToken: string) {
  let payload;
  try {
    payload = await verifyRefreshToken(refreshToken);
  } catch {
    // invalid token — treat as already logged out
    return;
  }

  if (payload.teamId !== teamId) {
    throw new ApiError(401, "Token does not belong to this team", "TOKEN_INVALID");
  }

  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}

export async function refresh(teamId: string, refreshToken: string) {
  let payload;
  try {
    payload = await verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "Invalid refresh token", "TOKEN_INVALID");
  }

  if (payload.teamId !== teamId) {
    throw new ApiError(401, "Token does not belong to this team", "TOKEN_INVALID");
  }

  const tokenHash = hashToken(refreshToken);
  const GRACE_PERIOD_MS = 10_000; // 10 seconds

  return prisma.$transaction(async (tx) => {
    // SELECT FOR UPDATE: serialize concurrent requests on the same token row
    const rows = await tx.$queryRaw<
      Array<{
        id: number;
        userId: number;
        expiresAt: Date;
        replacedAt: Date | null;
      }>
    >`SELECT id, "userId", "expiresAt", "replacedAt"
      FROM "RefreshToken"
      WHERE "tokenHash" = ${tokenHash}
      FOR UPDATE`;

    const stored = rows[0] ?? null;

    if (!stored) {
      // Reuse detected: token was valid JWT but already consumed.
      // Possible theft — revoke all sessions for this user.
      await tx.refreshToken.deleteMany({
        where: { userId: payload.userId },
      });
      throw new ApiError(401, "Refresh token reuse detected, all sessions revoked", "TOKEN_REUSE");
    }

    if (stored.expiresAt < new Date()) {
      await tx.refreshToken.delete({ where: { id: stored.id } });
      throw new ApiError(401, "Refresh token expired", "TOKEN_EXPIRED");
    }

    // Grace period: already replaced but within window → return new AT only
    if (stored.replacedAt) {
      const elapsed = Date.now() - stored.replacedAt.getTime();
      if (elapsed <= GRACE_PERIOD_MS) {
        const accessToken = await generateAccessToken(payload.userId, teamId);
        return { accessToken, refreshToken: null };
      }
      // Grace period expired — reuse is theft
      await tx.refreshToken.deleteMany({
        where: { userId: payload.userId },
      });
      throw new ApiError(401, "Refresh token reuse detected, all sessions revoked", "TOKEN_REUSE");
    }

    // Rotation: mark old as replaced, clean up stale replaced tokens, issue new pair
    await tx.refreshToken.update({
      where: { id: stored.id },
      data: { replacedAt: new Date() },
    });
    // Clean up old replaced tokens past grace period
    await tx.refreshToken.deleteMany({
      where: {
        userId: payload.userId,
        replacedAt: { not: null, lt: new Date(Date.now() - GRACE_PERIOD_MS) },
      },
    });
    return generateTokenPair(payload.userId, teamId);
  });
}

export async function oauthLogin(
  teamId: string,
  provider: "google" | "kakao",
  providerAccessToken: string,
) {
  const info = await getOAuthUserInfo(provider, providerAccessToken);

  // Check if another account with same email already exists (e.g. local signup)
  const existingByEmail = await prisma.user.findUnique({
    where: { teamId_email: { teamId, email: info.email } },
  });

  if (existingByEmail && (existingByEmail.provider !== provider || existingByEmail.providerId !== info.providerId)) {
    throw new ApiError(409, "Email already registered with a different account", "DUPLICATE_EMAIL");
  }

  const user = await prisma.user.upsert({
    where: {
      teamId_provider_providerId: { teamId, provider, providerId: info.providerId },
    },
    update: { name: info.name, image: info.image, email: info.email },
    create: {
      teamId,
      email: info.email,
      name: info.name,
      image: info.image,
      provider,
      providerId: info.providerId,
    },
  });

  const tokens = await generateTokenPair(user.id, teamId);
  return { ...tokens, user: userResponse(user) };
}
