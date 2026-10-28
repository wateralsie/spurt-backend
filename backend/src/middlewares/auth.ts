import type { Context, MiddlewareHandler } from "hono";
import { verifyAccessToken } from "../lib/jwt.js";
import { ApiError } from "../lib/api-error.js";

function extractToken(c: Context): string | null {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

function enforceTeamBoundary(c: Context, tokenTeamId: string): void {
  const pathTeamId = c.req.param("teamId");
  if (pathTeamId && pathTeamId !== tokenTeamId) {
    throw new ApiError(403, "Token does not belong to this team", "TEAM_MISMATCH");
  }
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const token = extractToken(c);
  if (!token) throw new ApiError(401, "Authentication required", "TOKEN_INVALID");

  try {
    const payload = await verifyAccessToken(token);
    enforceTeamBoundary(c, payload.teamId);
    c.set("userId", payload.userId);
    c.set("teamId", payload.teamId);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(401, "Invalid or expired token", "TOKEN_INVALID");
  }

  await next();
};