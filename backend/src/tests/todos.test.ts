import { describe, test, expect, beforeEach } from "bun:test";
import { request, cleanupDB, createTestUser, prisma, TEAM_ID } from "./helpers";

describe("Todos", () => {
  beforeEach(async () => {
    await cleanupDB();
  });

  // ─── POST /{teamId}/todos ───

  describe("POST /todos", () => {
    test("생성 (title만) — 201, done: false, goalId: null", async () => {
      const { accessToken } = await createTestUser();
      const { status, data } = await request("POST", `/${TEAM_ID}/todos`, {
        token: accessToken,
        json: { title: "Simple Todo" },
      });
      expect(status).toBe(201);
      expect(data.title).toBe("Simple Todo");
      expect(data.done).toBe(false);
      expect(data.goalId).toBeNull();
      expect(data.goal).toBeNull();
      expect(data.noteIds).toEqual([]);
    });

    test("goalId 연결 — 201", async () => {
      const { user, accessToken } = await createTestUser();
      const goal = await prisma.goal.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Goal" },
      });
      const { status, data } = await request("POST", `/${TEAM_ID}/todos`, {
        token: accessToken,
        json: { title: "With Goal", goalId: goal.id },
      });
      expect(status).toBe(201);
      expect(data.goalId).toBe(goal.id);
      expect(data.goal).toEqual({ id: goal.id, title: "Goal" });
      expect(data.noteIds).toEqual([]);
    });

    test("fileUrl + linkUrl 포함 — 201", async () => {
      const { accessToken } = await createTestUser();
      const { status, data } = await request("POST", `/${TEAM_ID}/todos`, {
        token: accessToken,
        json: {
          title: "With URLs",
          fileUrl: "https://example.com/file.pdf",
          linkUrl: "https://example.com/link",
        },
      });
      expect(status).toBe(201);
      expect(data.fileUrl).toBe("https://example.com/file.pdf");
      expect(data.linkUrl).toBe("https://example.com/link");
    });

    test("다른 유저 소유 goalId — 403", async () => {
      const owner = await createTestUser();
      const other = await createTestUser();
      const goal = await prisma.goal.create({
        data: { teamId: TEAM_ID, userId: owner.user.id, title: "Owner Goal" },
      });
      const { status } = await request("POST", `/${TEAM_ID}/todos`, {
        token: other.accessToken,
        json: { title: "Steal Goal", goalId: goal.id },
      });
      expect(status).toBe(403);
    });

    test("존재하지 않는 goalId — 404", async () => {
      const { accessToken } = await createTestUser();
      const { status } = await request("POST", `/${TEAM_ID}/todos`, {
        token: accessToken,
        json: { title: "Bad Goal", goalId: 99999 },
      });
      expect(status).toBe(404);
    });

    test("인증 없이 — 401", async () => {
      const { status } = await request("POST", `/${TEAM_ID}/todos`, {
        json: { title: "No Auth" },
      });
      expect(status).toBe(401);
    });
  });

  // ─── GET /{teamId}/todos ───

  describe("GET /todos", () => {
    test("목록 조회 — goal + noteIds 포함", async () => {
      const { user, accessToken } = await createTestUser();
      const goal = await prisma.goal.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "G" },
      });
      const todo = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user.id, goalId: goal.id, title: "T" },
      });
      await prisma.note.create({
        data: { teamId: TEAM_ID, userId: user.id, todoId: todo.id, title: "N" },
      });
      const { status, data } = await request("GET", `/${TEAM_ID}/todos`, {
        token: accessToken,
      });
      expect(status).toBe(200);
      expect(data.todos).toHaveLength(1);
      expect(data.todos[0].goal).not.toBeNull();
      expect(data.todos[0].goal.id).toBe(goal.id);
      expect(data.todos[0].noteIds).toHaveLength(1);
    });

    test("goalId 필터", async () => {
      const { user, accessToken } = await createTestUser();
      const goal = await prisma.goal.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "G" },
      });
      await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user.id, goalId: goal.id, title: "In Goal" },
      });
      await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "No Goal" },
      });
      const { data } = await request("GET", `/${TEAM_ID}/todos?goalId=${goal.id}`, {
        token: accessToken,
      });
      expect(data.todos).toHaveLength(1);
      expect(data.todos[0].title).toBe("In Goal");
    });

    test("done=true 필터", async () => {
      const { user, accessToken } = await createTestUser();
      await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Done", done: true },
      });
      await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Not Done", done: false },
      });
      const { data } = await request("GET", `/${TEAM_ID}/todos?done=true`, {
        token: accessToken,
      });
      expect(data.todos).toHaveLength(1);
      expect(data.todos[0].title).toBe("Done");
    });

    test("done=false 필터", async () => {
      const { user, accessToken } = await createTestUser();
      await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Done", done: true },
      });
      await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Not Done", done: false },
      });
      const { data } = await request("GET", `/${TEAM_ID}/todos?done=false`, {
        token: accessToken,
      });
      expect(data.todos).toHaveLength(1);
      expect(data.todos[0].title).toBe("Not Done");
    });

    test("커서 페이지네이션", async () => {
      const { user, accessToken } = await createTestUser();
      for (let i = 1; i <= 3; i++) {
        await prisma.todo.create({
          data: { teamId: TEAM_ID, userId: user.id, title: `Todo ${i}` },
        });
      }
      const page1 = await request("GET", `/${TEAM_ID}/todos?limit=2`, {
        token: accessToken,
      });
      expect(page1.data.todos).toHaveLength(2);
      expect(page1.data.nextCursor).not.toBeNull();
      expect(page1.data.totalCount).toBe(3);

      const page2 = await request(
        "GET",
        `/${TEAM_ID}/todos?limit=2&cursor=${page1.data.nextCursor}`,
        { token: accessToken },
      );
      expect(page2.data.todos).toHaveLength(1);
      expect(page2.data.nextCursor).toBeNull();
    });

    test("다른 유저 todo 미노출", async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user1.user.id, title: "User1 Todo" },
      });
      const { data } = await request("GET", `/${TEAM_ID}/todos`, {
        token: user2.accessToken,
      });
      expect(data.todos).toHaveLength(0);
    });

    test("sort=dueSoon 정렬 (마감일 임박순, dueDate null은 뒤로)", async () => {
      const { user, accessToken } = await createTestUser();
      await prisma.todo.create({
        data: {
          teamId: TEAM_ID,
          userId: user.id,
          title: "No Due Date",
        },
      });
      await prisma.todo.create({
        data: {
          teamId: TEAM_ID,
          userId: user.id,
          title: "Later",
          dueDate: new Date("2026-06-20T00:00:00.000Z"),
        },
      });
      await prisma.todo.create({
        data: {
          teamId: TEAM_ID,
          userId: user.id,
          title: "Soon",
          dueDate: new Date("2026-05-20T00:00:00.000Z"),
        },
      });

      const { status, data } = await request("GET", `/${TEAM_ID}/todos?sort=dueSoon`, {
        token: accessToken,
      });
      expect(status).toBe(200);
      expect(data.todos).toHaveLength(3);
      expect(data.todos.map((todo: { title: string }) => todo.title)).toEqual([
        "Soon",
        "Later",
        "No Due Date",
      ]);
    });
  });

  // ─── GET /{teamId}/todos/{todoId} ───

  describe("GET /todos/:todoId", () => {
    test("상세 조회 — goal + noteIds", async () => {
      const { user, accessToken } = await createTestUser();
      const goal = await prisma.goal.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "G" },
      });
      const todo = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user.id, goalId: goal.id, title: "Detail" },
      });
      const { status, data } = await request("GET", `/${TEAM_ID}/todos/${todo.id}`, {
        token: accessToken,
      });
      expect(status).toBe(200);
      expect(data.title).toBe("Detail");
      expect(data.goal.id).toBe(goal.id);
      expect(data.noteIds).toBeArray();
    });

    test("존재하지 않는 todoId — 404", async () => {
      const { accessToken } = await createTestUser();
      const { status } = await request("GET", `/${TEAM_ID}/todos/99999`, {
        token: accessToken,
      });
      expect(status).toBe(404);
    });

    test("다른 유저 todo — 403", async () => {
      const owner = await createTestUser();
      const other = await createTestUser();
      const todo = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: owner.user.id, title: "Private" },
      });
      const { status } = await request("GET", `/${TEAM_ID}/todos/${todo.id}`, {
        token: other.accessToken,
      });
      expect(status).toBe(403);
    });
  });

  // ─── PATCH /{teamId}/todos/{todoId} ───

  describe("PATCH /todos/:todoId", () => {
    test("제목 수정 — 200", async () => {
      const { user, accessToken } = await createTestUser();
      const todo = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Old" },
      });
      const { status, data } = await request("PATCH", `/${TEAM_ID}/todos/${todo.id}`, {
        token: accessToken,
        json: { title: "New" },
      });
      expect(status).toBe(200);
      expect(data.title).toBe("New");
      expect(data.goal).toBeNull();
      expect(data.noteIds).toEqual([]);
    });

    test("완료 처리 (done: true) — 200", async () => {
      const { user, accessToken } = await createTestUser();
      const todo = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Complete Me" },
      });
      const { status, data } = await request("PATCH", `/${TEAM_ID}/todos/${todo.id}`, {
        token: accessToken,
        json: { done: true },
      });
      expect(status).toBe(200);
      expect(data.done).toBe(true);
    });

    test("goalId 변경 — 200", async () => {
      const { user, accessToken } = await createTestUser();
      const goal1 = await prisma.goal.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "G1" },
      });
      const goal2 = await prisma.goal.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "G2" },
      });
      const todo = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user.id, goalId: goal1.id, title: "Move" },
      });
      const { status, data } = await request("PATCH", `/${TEAM_ID}/todos/${todo.id}`, {
        token: accessToken,
        json: { goalId: goal2.id },
      });
      expect(status).toBe(200);
      expect(data.goalId).toBe(goal2.id);
      expect(data.goal).toEqual({ id: goal2.id, title: "G2" });
    });

    test("goalId null로 해제 — 200", async () => {
      const { user, accessToken } = await createTestUser();
      const goal = await prisma.goal.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "G" },
      });
      const todo = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user.id, goalId: goal.id, title: "Unlink" },
      });
      const { status, data } = await request("PATCH", `/${TEAM_ID}/todos/${todo.id}`, {
        token: accessToken,
        json: { goalId: null },
      });
      expect(status).toBe(200);
      expect(data.goalId).toBeNull();
    });

    test("linkUrl null로 해제 — 200", async () => {
      const { user, accessToken } = await createTestUser();
      const todo = await prisma.todo.create({
        data: {
          teamId: TEAM_ID,
          userId: user.id,
          title: "Has Link",
          linkUrl: "https://example.com",
        },
      });
      const { status, data } = await request("PATCH", `/${TEAM_ID}/todos/${todo.id}`, {
        token: accessToken,
        json: { linkUrl: null },
      });
      expect(status).toBe(200);
      expect(data.linkUrl).toBeNull();
    });

    test("다른 유저 todo — 403", async () => {
      const owner = await createTestUser();
      const other = await createTestUser();
      const todo = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: owner.user.id, title: "Not Yours" },
      });
      const { status } = await request("PATCH", `/${TEAM_ID}/todos/${todo.id}`, {
        token: other.accessToken,
        json: { title: "Hacked" },
      });
      expect(status).toBe(403);
    });

    test("존재하지 않는 todoId — 404", async () => {
      const { accessToken } = await createTestUser();
      const { status } = await request("PATCH", `/${TEAM_ID}/todos/99999`, {
        token: accessToken,
        json: { title: "Nope" },
      });
      expect(status).toBe(404);
    });

    test("다른 유저 소유 goalId로 변경 — 403", async () => {
      const owner = await createTestUser();
      const other = await createTestUser();
      const goal = await prisma.goal.create({
        data: { teamId: TEAM_ID, userId: other.user.id, title: "Other Goal" },
      });
      const todo = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: owner.user.id, title: "My Todo" },
      });
      const { status } = await request("PATCH", `/${TEAM_ID}/todos/${todo.id}`, {
        token: owner.accessToken,
        json: { goalId: goal.id },
      });
      expect(status).toBe(403);
    });

    test("완료 시 todo 알림 자동 생성", async () => {
      const { user, accessToken } = await createTestUser();
      const todo = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Notify Me" },
      });
      await request("PATCH", `/${TEAM_ID}/todos/${todo.id}`, {
        token: accessToken,
        json: { done: true },
      });
      await Bun.sleep(200);
      const notifications = await prisma.notification.findMany({
        where: { userId: user.id, type: "todo" },
      });
      expect(notifications).toHaveLength(1);
      expect(notifications[0].resourceId).toBe(todo.id);
    });

    test("목표 내 전체 완료 시 goal 알림 자동 생성", async () => {
      const { user, accessToken } = await createTestUser();
      const goal = await prisma.goal.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Complete Goal" },
      });
      const todo1 = await prisma.todo.create({
        data: {
          teamId: TEAM_ID,
          userId: user.id,
          goalId: goal.id,
          title: "T1",
          done: true,
        },
      });
      const todo2 = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user.id, goalId: goal.id, title: "T2" },
      });
      // Complete the last remaining todo
      await request("PATCH", `/${TEAM_ID}/todos/${todo2.id}`, {
        token: accessToken,
        json: { done: true },
      });
      await Bun.sleep(200);
      const goalNotifs = await prisma.notification.findMany({
        where: { userId: user.id, type: "goal" },
      });
      expect(goalNotifs).toHaveLength(1);
      expect(goalNotifs[0].resourceId).toBe(goal.id);
    });
  });

  // ─── DELETE /{teamId}/todos/{todoId} ───

  describe("DELETE /todos/:todoId", () => {
    test("삭제 — 204", async () => {
      const { user, accessToken } = await createTestUser();
      const todo = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Delete" },
      });
      const { status } = await request("DELETE", `/${TEAM_ID}/todos/${todo.id}`, {
        token: accessToken,
      });
      expect(status).toBe(204);
    });

    test("cascade 확인 (노트 + 찜 함께 삭제)", async () => {
      const { user, accessToken } = await createTestUser();
      const todo = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Cascade" },
      });
      await prisma.note.create({
        data: { teamId: TEAM_ID, userId: user.id, todoId: todo.id, title: "Note" },
      });
      await prisma.favorite.create({
        data: { teamId: TEAM_ID, userId: user.id, todoId: todo.id },
      });
      await request("DELETE", `/${TEAM_ID}/todos/${todo.id}`, { token: accessToken });
      const notes = await prisma.note.findMany({ where: { todoId: todo.id } });
      const favs = await prisma.favorite.findMany({ where: { todoId: todo.id } });
      expect(notes).toHaveLength(0);
      expect(favs).toHaveLength(0);
    });

    test("다른 유저 todo — 403", async () => {
      const owner = await createTestUser();
      const other = await createTestUser();
      const todo = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: owner.user.id, title: "Not Yours" },
      });
      const { status } = await request("DELETE", `/${TEAM_ID}/todos/${todo.id}`, {
        token: other.accessToken,
      });
      expect(status).toBe(403);
    });

    test("존재하지 않는 todoId — 404", async () => {
      const { accessToken } = await createTestUser();
      const { status } = await request("DELETE", `/${TEAM_ID}/todos/99999`, {
        token: accessToken,
      });
      expect(status).toBe(404);
    });
  });
});
