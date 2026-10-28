import { describe, test, expect, beforeEach } from "bun:test";
import { request, cleanupDB, createTestUser, TEAM_ID } from "./helpers";

describe("Users/Me", () => {
  beforeEach(async () => {
    await cleanupDB();
  });

  // ─── GET /{teamId}/users/me ───

  describe("GET /users/me", () => {
    test("프로필 조회 성공 — 200", async () => {
      const { user, accessToken } = await createTestUser();
      const { status, data } = await request("GET", `/${TEAM_ID}/users/me`, {
        token: accessToken,
      });
      expect(status).toBe(200);
      expect(data.id).toBe(user.id);
      expect(data.email).toBe(user.email);
      expect(data.name).toBe(user.name);
      expect(data.teamId).toBe(TEAM_ID);
    });

    test("인증 없이 요청 — 401", async () => {
      const { status } = await request("GET", `/${TEAM_ID}/users/me`);
      expect(status).toBe(401);
    });

    test("다른 팀 토큰 — 403 TEAM_MISMATCH", async () => {
      const { accessToken } = await createTestUser("test-team-a");
      const { status, data } = await request("GET", "/test-team-b/users/me", {
        token: accessToken,
      });
      expect(status).toBe(403);
      expect(data.code).toBe("TEAM_MISMATCH");
    });
  });

  // ─── PATCH /{teamId}/users/me ───

  describe("PATCH /users/me", () => {
    test("이름 수정 — 200", async () => {
      const { accessToken } = await createTestUser();
      const { status, data } = await request("PATCH", `/${TEAM_ID}/users/me`, {
        token: accessToken,
        json: { name: "Updated Name" },
      });
      expect(status).toBe(200);
      expect(data.name).toBe("Updated Name");
    });

    test("이미지 수정 — 200", async () => {
      const { accessToken } = await createTestUser();
      const { status, data } = await request("PATCH", `/${TEAM_ID}/users/me`, {
        token: accessToken,
        json: { image: "https://example.com/new-avatar.png" },
      });
      expect(status).toBe(200);
      expect(data.image).toBe("https://example.com/new-avatar.png");
    });

    test("이미지 null로 제거 — 200", async () => {
      const { accessToken } = await createTestUser();
      // Set image first
      await request("PATCH", `/${TEAM_ID}/users/me`, {
        token: accessToken,
        json: { image: "https://example.com/avatar.png" },
      });
      // Remove it
      const { status, data } = await request("PATCH", `/${TEAM_ID}/users/me`, {
        token: accessToken,
        json: { image: null },
      });
      expect(status).toBe(200);
      expect(data.image).toBeNull();
    });

    test("이름 + 이미지 동시 수정 — 200", async () => {
      const { accessToken } = await createTestUser();
      const { status, data } = await request("PATCH", `/${TEAM_ID}/users/me`, {
        token: accessToken,
        json: { name: "Both", image: "https://example.com/both.png" },
      });
      expect(status).toBe(200);
      expect(data.name).toBe("Both");
      expect(data.image).toBe("https://example.com/both.png");
    });

    test("빈 body — 400", async () => {
      const { accessToken } = await createTestUser();
      const { status } = await request("PATCH", `/${TEAM_ID}/users/me`, {
        token: accessToken,
        json: {},
      });
      expect(status).toBe(400);
    });
  });
});
