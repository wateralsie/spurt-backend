import { describe, test, expect, beforeEach } from "bun:test";
import { request, cleanupDB, createTestUser, TEAM_ID } from "./helpers";

describe("Uploads", () => {
  beforeEach(async () => {
    await cleanupDB();
  });

  // ─── POST /{teamId}/images ───

  describe("POST /images", () => {
    test("png presigned URL 발급 — 200, uploadUrl + url", async () => {
      const { accessToken } = await createTestUser();
      const { status, data } = await request("POST", `/${TEAM_ID}/images`, {
        token: accessToken,
        json: { fileName: "avatar.png" },
      });
      expect(status).toBe(200);
      expect(data.uploadUrl).toBeString();
      expect(data.url).toBeString();
      expect(data.url).toContain(".png");
    });

    test("전체 허용 확장자 (jpg, jpeg, gif, webp, svg) — 200", async () => {
      const { accessToken } = await createTestUser();
      for (const ext of ["jpg", "jpeg", "gif", "webp", "svg"]) {
        const { status } = await request("POST", `/${TEAM_ID}/images`, {
          token: accessToken,
          json: { fileName: `test.${ext}` },
        });
        expect(status).toBe(200);
      }
    });

    test("불허 확장자 (exe) — 400", async () => {
      const { accessToken } = await createTestUser();
      const { status } = await request("POST", `/${TEAM_ID}/images`, {
        token: accessToken,
        json: { fileName: "malware.exe" },
      });
      expect(status).toBe(400);
    });

    test("확장자 없는 파일명 — 400", async () => {
      const { accessToken } = await createTestUser();
      const { status } = await request("POST", `/${TEAM_ID}/images`, {
        token: accessToken,
        json: { fileName: "noextension" },
      });
      expect(status).toBe(400);
    });

    test("인증 없이 — 401", async () => {
      const { status } = await request("POST", `/${TEAM_ID}/images`, {
        json: { fileName: "test.png" },
      });
      expect(status).toBe(401);
    });
  });

  // ─── POST /{teamId}/files ───

  describe("POST /files", () => {
    test("pdf presigned URL 발급 — 200", async () => {
      const { accessToken } = await createTestUser();
      const { status, data } = await request("POST", `/${TEAM_ID}/files`, {
        token: accessToken,
        json: { fileName: "report.pdf" },
      });
      expect(status).toBe(200);
      expect(data.uploadUrl).toBeString();
      expect(data.url).toBeString();
    });

    test("확장자 없는 파일명도 허용 — 200", async () => {
      const { accessToken } = await createTestUser();
      const { status } = await request("POST", `/${TEAM_ID}/files`, {
        token: accessToken,
        json: { fileName: "Makefile" },
      });
      expect(status).toBe(200);
    });

    test("인증 없이 — 401", async () => {
      const { status } = await request("POST", `/${TEAM_ID}/files`, {
        json: { fileName: "test.pdf" },
      });
      expect(status).toBe(401);
    });
  });
});
