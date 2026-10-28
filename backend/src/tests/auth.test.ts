import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  request,
  cleanupDB,
  createTestUser,
  setMockOAuth,
  clearMockOAuth,
  prisma,
  TEAM_ID,
} from "./helpers";

describe("Auth", () => {
  beforeEach(async () => {
    await cleanupDB();
  });

  afterEach(() => {
    clearMockOAuth();
  });

  // ─── POST /{teamId}/auth/signup ───

  describe("POST /signup", () => {
    test("회원가입 성공 — 201, accessToken + refreshToken + user", async () => {
      const { status, data } = await request("POST", `/${TEAM_ID}/auth/signup`, {
        json: { email: "new@test.com", name: "New User", password: "password123" },
      });
      expect(status).toBe(201);
      expect(data.accessToken).toBeString();
      expect(data.refreshToken).toBeString();
      expect(data.user.email).toBe("new@test.com");
      expect(data.user.name).toBe("New User");
      expect(data.user.image).toBeNull();
    });

    test("DB에 유저 생성 + password 해싱 확인", async () => {
      await request("POST", `/${TEAM_ID}/auth/signup`, {
        json: { email: "hash@test.com", name: "Hash", password: "password123" },
      });
      const user = await prisma.user.findFirst({ where: { email: "hash@test.com" } });
      expect(user).not.toBeNull();
      expect(user!.password).not.toBe("password123");
      expect(user!.password!.startsWith("$2")).toBe(true);
    });

    test("refreshToken DB에 해시로 저장 확인", async () => {
      const { data } = await request("POST", `/${TEAM_ID}/auth/signup`, {
        json: { email: "rt@test.com", name: "RT", password: "password123" },
      });
      const user = await prisma.user.findFirst({ where: { email: "rt@test.com", teamId: TEAM_ID } });
      const tokens = await prisma.refreshToken.findMany({ where: { userId: user!.id } });
      expect(tokens).toHaveLength(1);
      expect(tokens[0].tokenHash).not.toBe(data.refreshToken);
    });

    test("이메일 중복 — 409 DUPLICATE_EMAIL", async () => {
      await request("POST", `/${TEAM_ID}/auth/signup`, {
        json: { email: "dup@test.com", name: "First", password: "password123" },
      });
      const { status, data } = await request("POST", `/${TEAM_ID}/auth/signup`, {
        json: { email: "dup@test.com", name: "Second", password: "password123" },
      });
      expect(status).toBe(409);
      expect(data.code).toBe("DUPLICATE_EMAIL");
    });

    test("이메일 형식 오류 — 400", async () => {
      const { status } = await request("POST", `/${TEAM_ID}/auth/signup`, {
        json: { email: "not-an-email", name: "Bad", password: "password123" },
      });
      expect(status).toBe(400);
    });

    test("비밀번호 8자 미만 — 400", async () => {
      const { status } = await request("POST", `/${TEAM_ID}/auth/signup`, {
        json: { email: "short@test.com", name: "Short", password: "1234567" },
      });
      expect(status).toBe(400);
    });

    test("이름 누락 — 400", async () => {
      const { status } = await request("POST", `/${TEAM_ID}/auth/signup`, {
        json: { email: "noname@test.com", password: "password123" },
      });
      expect(status).toBe(400);
    });
  });

  // ─── POST /{teamId}/auth/login ───

  describe("POST /login", () => {
    test("로그인 성공 — 200", async () => {
      const { email, password } = await createTestUser();
      const { status, data } = await request("POST", `/${TEAM_ID}/auth/login`, {
        json: { email, password },
      });
      expect(status).toBe(200);
      expect(data.accessToken).toBeString();
      expect(data.refreshToken).toBeString();
      expect(data.user.email).toBe(email);
    });

    test("존재하지 않는 이메일 — 401 INVALID_CREDENTIALS", async () => {
      const { status, data } = await request("POST", `/${TEAM_ID}/auth/login`, {
        json: { email: "none@test.com", password: "password123" },
      });
      expect(status).toBe(401);
      expect(data.code).toBe("INVALID_CREDENTIALS");
    });

    test("비밀번호 불일치 — 401", async () => {
      const { email } = await createTestUser();
      const { status, data } = await request("POST", `/${TEAM_ID}/auth/login`, {
        json: { email, password: "wrongpassword" },
      });
      expect(status).toBe(401);
      expect(data.code).toBe("INVALID_CREDENTIALS");
    });

    test("OAuth 계정으로 이메일 로그인 시도 — 401", async () => {
      await prisma.user.create({
        data: {
          teamId: TEAM_ID,
          email: "oauth@test.com",
          name: "OAuth User",
          provider: "google",
          providerId: "google-123",
        },
      });
      const { status, data } = await request("POST", `/${TEAM_ID}/auth/login`, {
        json: { email: "oauth@test.com", password: "password123" },
      });
      expect(status).toBe(401);
      expect(data.code).toBe("INVALID_CREDENTIALS");
    });
  });

  // ─── POST /{teamId}/auth/refresh ───

  describe("POST /refresh", () => {
    test("토큰 재발급 성공 — 200, 새 토큰 쌍", async () => {
      const signup = await request("POST", `/${TEAM_ID}/auth/signup`, {
        json: { email: "ref@test.com", name: "Ref", password: "password123" },
      });
      // JWT exp is second-precision — wait to ensure new token differs
      await Bun.sleep(1100);
      const { status, data } = await request("POST", `/${TEAM_ID}/auth/refresh`, {
        json: { refreshToken: signup.data.refreshToken },
      });
      expect(status).toBe(200);
      expect(data.accessToken).toBeString();
      expect(data.refreshToken).toBeString();
      expect(data.refreshToken).not.toBe(signup.data.refreshToken);
    });

    test("기존 refreshToken 폐기 확인 (토큰 로테이션)", async () => {
      const signup = await request("POST", `/${TEAM_ID}/auth/signup`, {
        json: { email: "rot@test.com", name: "Rot", password: "password123" },
      });
      const oldToken = signup.data.refreshToken;
      await Bun.sleep(1100);
      // Use the token → old one should be deleted
      await request("POST", `/${TEAM_ID}/auth/refresh`, {
        json: { refreshToken: oldToken },
      });
      // Re-use old token → reuse detection
      const { status, data } = await request("POST", `/${TEAM_ID}/auth/refresh`, {
        json: { refreshToken: oldToken },
      });
      expect(status).toBe(401);
      expect(data.code).toBe("TOKEN_REUSE");
    });

    test("사용된 refreshToken 재사용 → 모든 세션 폐기 — 401 TOKEN_REUSE", async () => {
      const signup = await request("POST", `/${TEAM_ID}/auth/signup`, {
        json: { email: "reuse@test.com", name: "Reuse", password: "password123" },
      });
      const firstToken = signup.data.refreshToken;
      await Bun.sleep(1100);
      const refreshRes = await request("POST", `/${TEAM_ID}/auth/refresh`, {
        json: { refreshToken: firstToken },
      });
      expect(refreshRes.status).toBe(200);
      // Re-use old token → all sessions revoked
      const { status, data } = await request("POST", `/${TEAM_ID}/auth/refresh`, {
        json: { refreshToken: firstToken },
      });
      expect(status).toBe(401);
      expect(data.code).toBe("TOKEN_REUSE");
      // New token should also be revoked
      const { status: s2 } = await request("POST", `/${TEAM_ID}/auth/refresh`, {
        json: { refreshToken: refreshRes.data.refreshToken },
      });
      expect(s2).toBe(401);
    });

    test("유효하지 않은 토큰 — 401", async () => {
      const { status } = await request("POST", `/${TEAM_ID}/auth/refresh`, {
        json: { refreshToken: "invalid-token" },
      });
      expect(status).toBe(401);
    });

    test("다른 팀의 refreshToken — 401", async () => {
      const signup = await request("POST", "/test-team-a/auth/signup", {
        json: { email: "cross@test.com", name: "Cross", password: "password123" },
      });
      const { status } = await request("POST", "/test-team-b/auth/refresh", {
        json: { refreshToken: signup.data.refreshToken },
      });
      expect(status).toBe(401);
    });
  });

  // ─── POST /{teamId}/auth/logout ───

  describe("POST /logout", () => {
    test("로그아웃 성공 — 200, refreshToken DB에서 삭제", async () => {
      const signup = await request("POST", `/${TEAM_ID}/auth/signup`, {
        json: { email: "logout@test.com", name: "Logout", password: "password123" },
      });
      const user = await prisma.user.findFirst({ where: { email: "logout@test.com", teamId: TEAM_ID } });
      const { status } = await request("POST", `/${TEAM_ID}/auth/logout`, {
        json: { refreshToken: signup.data.refreshToken },
      });
      expect(status).toBe(200);
      const tokens = await prisma.refreshToken.findMany({ where: { userId: user!.id } });
      expect(tokens).toHaveLength(0);
    });

    test("유효하지 않은 토큰도 200", async () => {
      const { status } = await request("POST", `/${TEAM_ID}/auth/logout`, {
        json: { refreshToken: "invalid-token" },
      });
      expect(status).toBe(200);
    });
  });

  // ─── POST /{teamId}/oauth/{provider} ───

  describe("POST /oauth/:provider", () => {
    test("Google OAuth 첫 로그인 — 200, 계정 자동 생성", async () => {
      setMockOAuth({
        email: "google@test.com",
        name: "Google User",
        image: "https://example.com/avatar.png",
        providerId: "g-123",
      });
      const { status, data } = await request("POST", `/${TEAM_ID}/oauth/google`, {
        json: { token: "mock-google-token" },
      });
      expect(status).toBe(200);
      expect(data.accessToken).toBeString();
      expect(data.user.email).toBe("google@test.com");
      expect(data.user.name).toBe("Google User");
    });

    test("Kakao OAuth 첫 로그인 — 200", async () => {
      setMockOAuth({
        email: "kakao@test.com",
        name: "카카오 유저",
        providerId: "k-456",
      });
      const { status, data } = await request("POST", `/${TEAM_ID}/oauth/kakao`, {
        json: { token: "mock-kakao-token" },
      });
      expect(status).toBe(200);
      expect(data.user.email).toBe("kakao@test.com");
    });

    test("OAuth 재로그인 — 프로필 업데이트 확인", async () => {
      setMockOAuth({
        email: "relogin@test.com",
        name: "Original",
        providerId: "g-789",
      });
      await request("POST", `/${TEAM_ID}/oauth/google`, {
        json: { token: "mock-token" },
      });
      await Bun.sleep(1100);
      setMockOAuth({
        email: "relogin@test.com",
        name: "Updated Name",
        providerId: "g-789",
      });
      const { data } = await request("POST", `/${TEAM_ID}/oauth/google`, {
        json: { token: "mock-token" },
      });
      expect(data.user.name).toBe("Updated Name");
    });

    test("이메일 가입 계정과 충돌 — 409", async () => {
      await request("POST", `/${TEAM_ID}/auth/signup`, {
        json: { email: "conflict@test.com", name: "Email User", password: "password123" },
      });
      setMockOAuth({
        email: "conflict@test.com",
        name: "OAuth User",
        providerId: "g-conflict",
      });
      const { status, data } = await request("POST", `/${TEAM_ID}/oauth/google`, {
        json: { token: "mock-token" },
      });
      expect(status).toBe(409);
      expect(data.code).toBe("DUPLICATE_EMAIL");
    });

    test("지원하지 않는 provider — 400", async () => {
      const { status } = await request("POST", `/${TEAM_ID}/oauth/github`, {
        json: { token: "mock-token" },
      });
      expect(status).toBe(400);
    });
  });
});
