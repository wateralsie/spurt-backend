import { describe, test, expect, beforeEach } from "bun:test";
import { request, cleanupDB, createTestUser, prisma, TEAM_ID } from "./helpers";

describe("Goals", () => {
  beforeEach(async () => {
    await cleanupDB();
  });

  // ─── POST /{teamId}/goals ───

  describe("POST /goals", () => {
    test("목표 생성 — 201", async () => {
      const { accessToken } = await createTestUser();
      const { status, data } = await request("POST", `/${TEAM_ID}/goals`, {
        token: accessToken,
        json: { title: "New Goal" },
      });
      expect(status).toBe(201);
      expect(data.title).toBe("New Goal");
      expect(data.teamId).toBe(TEAM_ID);
    });

    test("인증 없이 — 401", async () => {
      const { status } = await request("POST", `/${TEAM_ID}/goals`, {
        json: { title: "No Auth" },
      });
      expect(status).toBe(401);
    });

    test("빈 제목 — 400", async () => {
      const { accessToken } = await createTestUser();
      const { status } = await request("POST", `/${TEAM_ID}/goals`, {
        token: accessToken,
        json: { title: "" },
      });
      expect(status).toBe(400);
    });
  });

  // ─── GET /{teamId}/goals ───

  describe("GET /goals", () => {
    test("목록 조회 — todoCount, completedCount 포함", async () => {
      const { user, accessToken } = await createTestUser();
      const goal = await prisma.goal.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Goal 1" },
      });
      await prisma.todo.createMany({
        data: [
          { teamId: TEAM_ID, userId: user.id, goalId: goal.id, title: "Todo 1", done: true },
          { teamId: TEAM_ID, userId: user.id, goalId: goal.id, title: "Todo 2", done: false },
        ],
      });
      const { status, data } = await request("GET", `/${TEAM_ID}/goals`, {
        token: accessToken,
      });
      expect(status).toBe(200);
      expect(data.goals).toHaveLength(1);
      expect(data.goals[0].todoCount).toBe(2);
      expect(data.goals[0].completedCount).toBe(1);
    });

    test("커서 페이지네이션 (limit=2, nextCursor, totalCount)", async () => {
      const { user, accessToken } = await createTestUser();
      for (let i = 1; i <= 3; i++) {
        await prisma.goal.create({
          data: { teamId: TEAM_ID, userId: user.id, title: `Goal ${i}` },
        });
      }
      const page1 = await request("GET", `/${TEAM_ID}/goals?limit=2`, {
        token: accessToken,
      });
      expect(page1.data.goals).toHaveLength(2);
      expect(page1.data.nextCursor).not.toBeNull();
      expect(page1.data.totalCount).toBe(3);

      const page2 = await request(
        "GET",
        `/${TEAM_ID}/goals?limit=2&cursor=${page1.data.nextCursor}`,
        { token: accessToken },
      );
      expect(page2.data.goals).toHaveLength(1);
      expect(page2.data.nextCursor).toBeNull();
    });

    test("마지막 페이지 — nextCursor null", async () => {
      const { user, accessToken } = await createTestUser();
      await prisma.goal.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Only" },
      });
      const { data } = await request("GET", `/${TEAM_ID}/goals`, { token: accessToken });
      expect(data.nextCursor).toBeNull();
    });

    test("다른 유저 목표 미노출", async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      await prisma.goal.create({
        data: { teamId: TEAM_ID, userId: user1.user.id, title: "User1 Goal" },
      });
      const { data } = await request("GET", `/${TEAM_ID}/goals`, {
        token: user2.accessToken,
      });
      expect(data.goals).toHaveLength(0);
    });
  });

  // ─── GET /{teamId}/goals/{goalId} ───

  describe("GET /goals/:goalId", () => {
    test("상세 조회 — todos 포함", async () => {
      const { user, accessToken } = await createTestUser();
      const goal = await prisma.goal.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Detail" },
      });
      await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user.id, goalId: goal.id, title: "Child Todo" },
      });
      const { status, data } = await request("GET", `/${TEAM_ID}/goals/${goal.id}`, {
        token: accessToken,
      });
      expect(status).toBe(200);
      expect(data.title).toBe("Detail");
      expect(data.todos).toHaveLength(1);
      expect(data.todos[0].title).toBe("Child Todo");
    });

    test("존재하지 않는 goalId — 404", async () => {
      const { accessToken } = await createTestUser();
      const { status } = await request("GET", `/${TEAM_ID}/goals/99999`, {
        token: accessToken,
      });
      expect(status).toBe(404);
    });

    test("다른 유저 목표 — 403", async () => {
      const owner = await createTestUser();
      const other = await createTestUser();
      const goal = await prisma.goal.create({
        data: { teamId: TEAM_ID, userId: owner.user.id, title: "Private" },
      });
      const { status } = await request("GET", `/${TEAM_ID}/goals/${goal.id}`, {
        token: other.accessToken,
      });
      expect(status).toBe(403);
    });
  });

  // ─── PATCH /{teamId}/goals/{goalId} ───

  describe("PATCH /goals/:goalId", () => {
    test("제목 수정 — 200", async () => {
      const { user, accessToken } = await createTestUser();
      const goal = await prisma.goal.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Old" },
      });
      const { status, data } = await request("PATCH", `/${TEAM_ID}/goals/${goal.id}`, {
        token: accessToken,
        json: { title: "New" },
      });
      expect(status).toBe(200);
      expect(data.title).toBe("New");
    });

    test("다른 유저 목표 — 403", async () => {
      const owner = await createTestUser();
      const other = await createTestUser();
      const goal = await prisma.goal.create({
        data: { teamId: TEAM_ID, userId: owner.user.id, title: "Owner's" },
      });
      const { status } = await request("PATCH", `/${TEAM_ID}/goals/${goal.id}`, {
        token: other.accessToken,
        json: { title: "Hacked" },
      });
      expect(status).toBe(403);
    });

    test("빈 body (title 없음) — 400", async () => {
      const { user, accessToken } = await createTestUser();
      const goal = await prisma.goal.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Keep" },
      });
      const { status } = await request("PATCH", `/${TEAM_ID}/goals/${goal.id}`, {
        token: accessToken,
        json: {},
      });
      expect(status).toBe(400);
    });

    test("존재하지 않는 goalId — 404", async () => {
      const { accessToken } = await createTestUser();
      const { status } = await request("PATCH", `/${TEAM_ID}/goals/99999`, {
        token: accessToken,
        json: { title: "Nope" },
      });
      expect(status).toBe(404);
    });
  });

  // ─── DELETE /{teamId}/goals/{goalId} ───

  describe("DELETE /goals/:goalId", () => {
    test("삭제 — 204", async () => {
      const { user, accessToken } = await createTestUser();
      const goal = await prisma.goal.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Delete Me" },
      });
      const { status } = await request("DELETE", `/${TEAM_ID}/goals/${goal.id}`, {
        token: accessToken,
      });
      expect(status).toBe(204);
    });

    test("삭제 후 연결 todo도 함께 삭제 (onDelete: Cascade)", async () => {
      const { user, accessToken } = await createTestUser();
      const goal = await prisma.goal.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "With Todo" },
      });
      const todo = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user.id, goalId: goal.id, title: "Linked" },
      });
      await request("DELETE", `/${TEAM_ID}/goals/${goal.id}`, { token: accessToken });
      const deleted = await prisma.todo.findUnique({ where: { id: todo.id } });
      expect(deleted).toBeNull();
    });

    test("다른 유저 목표 — 403", async () => {
      const owner = await createTestUser();
      const other = await createTestUser();
      const goal = await prisma.goal.create({
        data: { teamId: TEAM_ID, userId: owner.user.id, title: "Not Yours" },
      });
      const { status } = await request("DELETE", `/${TEAM_ID}/goals/${goal.id}`, {
        token: other.accessToken,
      });
      expect(status).toBe(403);
    });

    test("존재하지 않는 goalId — 404", async () => {
      const { accessToken } = await createTestUser();
      const { status } = await request("DELETE", `/${TEAM_ID}/goals/99999`, {
        token: accessToken,
      });
      expect(status).toBe(404);
    });
  });
});
