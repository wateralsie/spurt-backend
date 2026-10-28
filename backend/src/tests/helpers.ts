import app from "../app.js";
import { prisma } from "../lib/prisma.js";
import bcrypt from "bcrypt";
import { generateAccessToken } from "../lib/jwt.js";

export const TEAM_ID = "test-team";
export { prisma };

// ── HTTP request helper ──

export async function request(
  method: string,
  path: string,
  options?: { json?: unknown; token?: string },
) {
  const headers: Record<string, string> = {};
  if (options?.token) headers["Authorization"] = `Bearer ${options.token}`;

  let body: string | undefined;
  if (options?.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  }

  const res = await app.request(path, { method, headers, body });
  const ct = res.headers.get("content-type") ?? "";
  const data = ct.includes("json") ? await res.json() : null;

  return { status: res.status, data };
}

// ── DB cleanup (teamId-scoped, safe for shared DB) ──

export async function cleanupDB() {
  // Delete users whose teamId starts with "test-".
  // ON DELETE CASCADE handles all related rows (tokens, goals, todos, notes, etc.)
  await prisma.user.deleteMany({ where: { teamId: { startsWith: "test-" } } });
}

// ── Test user factory ──

let userCounter = 0;

export async function createTestUser(teamId = TEAM_ID) {
  userCounter++;
  const email = `user${userCounter}-${Date.now()}@test.com`;
  const password = "password123";
  const hashedPassword = await bcrypt.hash(password, 4);

  const user = await prisma.user.create({
    data: {
      teamId,
      email,
      name: `User ${userCounter}`,
      password: hashedPassword,
      provider: "email",
    },
  });

  const accessToken = await generateAccessToken(user.id, teamId);
  return { user, accessToken, email, password };
}

// ── OAuth mock control ──

export function setMockOAuth(info: {
  email: string;
  name: string;
  image?: string;
  providerId: string;
}) {
  (globalThis as any).__mockOAuthUserInfo = info;
}

export function clearMockOAuth() {
  (globalThis as any).__mockOAuthUserInfo = null;
}
