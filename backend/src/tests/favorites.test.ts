import { describe, test, expect, beforeEach } from "bun:test";
import { request, cleanupDB, createTestUser, prisma, TEAM_ID } from "./helpers";

describe("Favorites", () => {
  beforeEach(async () => {
    await cleanupDB();
  });

  // ─── POST /{teamId}/todos/{todoId}/favorites ───

  describe("POST /todos/:todoId/favorites", () => {
    test("찜 성공 — 201, todo + goal 포함", async () => {
      const { user, accessToken } = await createTestUser();
      const goal = await prisma.goal.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "G" },
      });
      const todo = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user.id, goalId: goal.id, title: "T" },
      });
      const { status, data } = await request(
        "POST",
        `/${TEAM_ID}/todos/${todo.id}/favorites`,
        { token: accessToken },
      );
      expect(status).toBe(201);
      expect(data.todoId).toBe(todo.id);
      expect(data.todo).not.toBeNull();
      expect(data.todo.goal).not.toBeNull();
      expect(data.todo.goal.id).toBe(goal.id);
    });

    test("중복 찜 — 409 DUPLICATE_ENTRY", async () => {
      const { user, accessToken } = await createTestUser();
      const todo = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "T" },
      });
      await request("POST", `/${TEAM_ID}/todos/${todo.id}/favorites`, {
        token: accessToken,
      });
      const { status, data } = await request(
        "POST",
        `/${TEAM_ID}/todos/${todo.id}/favorites`,
        { token: accessToken },
      );
      expect(status).toBe(409);
      expect(data.code).toBe("DUPLICATE_ENTRY");
    });

    test("다른 유저 todo — 403", async () => {
      const owner = await createTestUser();
      const other = await createTestUser();
      const todo = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: owner.user.id, title: "T" },
      });
      const { status } = await request(
        "POST",
        `/${TEAM_ID}/todos/${todo.id}/favorites`,
        { token: other.accessToken },
      );
      expect(status).toBe(403);
    });

    test("존재하지 않는 todoId — 404", async () => {
      const { accessToken } = await createTestUser();
      const { status } = await request("POST", `/${TEAM_ID}/todos/99999/favorites`, {
        token: accessToken,
      });
      expect(status).toBe(404);
    });

    test("인증 없이 — 401", async () => {
      const { status } = await request("POST", `/${TEAM_ID}/todos/1/favorites`);
      expect(status).toBe(401);
    });
  });

  // ─── DELETE /{teamId}/todos/{todoId}/favorites ───

  describe("DELETE /todos/:todoId/favorites", () => {
    test("찜 해제 — 204", async () => {
      const { user, accessToken } = await createTestUser();
      const todo = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "T" },
      });
      await prisma.favorite.create({
        data: { teamId: TEAM_ID, userId: user.id, todoId: todo.id },
      });
      const { status } = await request(
        "DELETE",
        `/${TEAM_ID}/todos/${todo.id}/favorites`,
        { token: accessToken },
      );
      expect(status).toBe(204);
    });

    test("찜하지 않은 todo — 404", async () => {
      const { user, accessToken } = await createTestUser();
      const todo = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "T" },
      });
      const { status } = await request(
        "DELETE",
        `/${TEAM_ID}/todos/${todo.id}/favorites`,
        { token: accessToken },
      );
      expect(status).toBe(404);
    });
  });

  // ─── GET /{teamId}/todos/favorites ───

  describe("GET /todos/favorites", () => {
    test("목록 조회 — todo + goal 포함", async () => {
      const { user, accessToken } = await createTestUser();
      const goal = await prisma.goal.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "G" },
      });
      const todo = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user.id, goalId: goal.id, title: "T" },
      });
      await prisma.favorite.create({
        data: { teamId: TEAM_ID, userId: user.id, todoId: todo.id },
      });
      const { status, data } = await request("GET", `/${TEAM_ID}/todos/favorites`, {
        token: accessToken,
      });
      expect(status).toBe(200);
      expect(data.favorites).toHaveLength(1);
      expect(data.favorites[0].todo).not.toBeNull();
      expect(data.favorites[0].todo.goal).not.toBeNull();
    });

    test("커서 페이지네이션", async () => {
      const { user, accessToken } = await createTestUser();
      for (let i = 1; i <= 3; i++) {
        const todo = await prisma.todo.create({
          data: { teamId: TEAM_ID, userId: user.id, title: `T${i}` },
        });
        await prisma.favorite.create({
          data: { teamId: TEAM_ID, userId: user.id, todoId: todo.id },
        });
      }
      const page1 = await request("GET", `/${TEAM_ID}/todos/favorites?limit=2`, {
        token: accessToken,
      });
      expect(page1.data.favorites).toHaveLength(2);
      expect(page1.data.nextCursor).not.toBeNull();
      expect(page1.data.totalCount).toBe(3);

      const page2 = await request(
        "GET",
        `/${TEAM_ID}/todos/favorites?limit=2&cursor=${page1.data.nextCursor}`,
        { token: accessToken },
      );
      expect(page2.data.favorites).toHaveLength(1);
      expect(page2.data.nextCursor).toBeNull();
    });

    test("빈 목록 — favorites: [], totalCount: 0", async () => {
      const { accessToken } = await createTestUser();
      const { status, data } = await request("GET", `/${TEAM_ID}/todos/favorites`, {
        token: accessToken,
      });
      expect(status).toBe(200);
      expect(data.favorites).toHaveLength(0);
      expect(data.totalCount).toBe(0);
    });
  });
});
