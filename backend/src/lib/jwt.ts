import { sign, verify } from "hono/jwt";
import { createHash } from "node:crypto";
import type { JWTPayload } from "hono/utils/jwt/types";
import { prisma } from "./prisma.js";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set in environment variables`);
  return value;
}

const JWT_SECRET = requiredEnv("JWT_SECRET");
const JWT_REFRESH_SECRET = requiredEnv("JWT_REFRESH_SECRET");
const ACCESS_TOKEN_EXPIRES_IN = 60 * 30; // 30 minutes
const REFRESH_TOKEN_EXPIRES_IN = 60 * 60 * 24 * 7; // 7 days

export interface TokenPayload {
  userId: number;
  teamId: string;
  exp: number;
}

function now() {
  return Math.floor(Date.now() / 1000);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function generateAccessToken(
  userId: number,
  teamId: string,
): Promise<string> {
  const payload: JWTPayload = {
    userId,
    teamId,
    exp: now() + ACCESS_TOKEN_EXPIRES_IN,
  };
  return sign(payload, JWT_SECRET);
}

export async function generateRefreshToken(
  userId: number,
  teamId: string,
): Promise<string> {
  const payload: JWTPayload = {
    userId,
    teamId,
    exp: now() + REFRESH_TOKEN_EXPIRES_IN,
  };
  const token = await sign(payload, JWT_REFRESH_SECRET);

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt: new Date((now() + REFRESH_TOKEN_EXPIRES_IN) * 1000),
    },
  });

  return token;
}

export async function generateTokenPair(
  userId: number,
  teamId: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(userId, teamId),
    generateRefreshToken(userId, teamId),
  ]);
  return { accessToken, refreshToken };
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const payload = await verify(token, JWT_SECRET, "HS256");
  return payload as unknown as TokenPayload;
}

export async function verifyRefreshToken(
  token: string,
): Promise<TokenPayload> {
  const payload = await verify(token, JWT_REFRESH_SECRET, "HS256");
  return payload as unknown as TokenPayload;
}
