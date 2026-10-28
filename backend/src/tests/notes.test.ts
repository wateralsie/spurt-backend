import { describe, test, expect, beforeEach } from "bun:test";
import { request, cleanupDB, createTestUser, prisma, TEAM_ID } from "./helpers";

describe("Notes", () => {
  beforeEach(async () => {
    await cleanupDB();
  });

  // helper: create user + todo for note tests
  async function createUserWithTodo() {
    const { user, accessToken } = await createTestUser();
    const todo = await prisma.todo.create({
      data: { teamId: TEAM_ID, userId: user.id, title: "Parent Todo" },
    });
    return { user, accessToken, todo };
  }

  // ─── POST /{teamId}/notes ───

  describe("POST /notes", () => {
    test("생성 (title + todoId) — 201", async () => {
      const { accessToken, todo } = await createUserWithTodo();
      const { status, data } = await request("POST", `/${TEAM_ID}/notes`, {
        token: accessToken,
        json: { todoId: todo.id, title: "My Note" },
      });
      expect(status).toBe(201);
      expect(data.title).toBe("My Note");
      expect(data.todoId).toBe(todo.id);
      expect(data.todo).toEqual({ id: todo.id, title: "Parent Todo", done: false });
    });

    test("content + linkUrl 포함 — 201", async () => {
      const { accessToken, todo } = await createUserWithTodo();
      const { status, data } = await request("POST", `/${TEAM_ID}/notes`, {
        token: accessToken,
        json: {
          todoId: todo.id,
          title: "Rich",
          content: { type: "doc", text: "hello" },
          linkUrl: "https://example.com",
        },
      });
      expect(status).toBe(201);
      expect(data.content).not.toBeNull();
      expect(data.linkUrl).toBe("https://example.com");
    });

    test("다른 유저 소유 todoId — 403", async () => {
      const owner = await createTestUser();
      const other = await createTestUser();
      const todo = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: owner.user.id, title: "Owner Todo" },
      });
      const { status } = await request("POST", `/${TEAM_ID}/notes`, {
        token: other.accessToken,
        json: { todoId: todo.id, title: "Steal" },
      });
      expect(status).toBe(403);
    });

    test("존재하지 않는 todoId — 404", async () => {
      const { accessToken } = await createTestUser();
      const { status } = await request("POST", `/${TEAM_ID}/notes`, {
        token: accessToken,
        json: { todoId: 99999, title: "Bad" },
      });
      expect(status).toBe(404);
    });

    test("인증 없이 — 401", async () => {
      const { status } = await request("POST", `/${TEAM_ID}/notes`, {
        json: { todoId: 1, title: "No Auth" },
      });
      expect(status).toBe(401);
    });
  });

  // ─── GET /{teamId}/notes ───

  describe("GET /notes", () => {
    test("목록 조회 — todo 요약 포함", async () => {
      const { user, accessToken, todo } = await createUserWithTodo();
      await prisma.note.create({
        data: { teamId: TEAM_ID, userId: user.id, todoId: todo.id, title: "N1" },
      });
      const { status, data } = await request("GET", `/${TEAM_ID}/notes`, {
        token: accessToken,
      });
      expect(status).toBe(200);
      expect(data.notes).toHaveLength(1);
      expect(data.notes[0].todo).not.toBeNull();
      expect(data.notes[0].todo.id).toBe(todo.id);
    });

    test("todoId 필터", async () => {
      const { user, accessToken } = await createTestUser();
      const todo1 = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "T1" },
      });
      const todo2 = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "T2" },
      });
      await prisma.note.create({
        data: { teamId: TEAM_ID, userId: user.id, todoId: todo1.id, title: "N for T1" },
      });
      await prisma.note.create({
        data: { teamId: TEAM_ID, userId: user.id, todoId: todo2.id, title: "N for T2" },
      });
      const { data } = await request("GET", `/${TEAM_ID}/notes?todoId=${todo1.id}`, {
        token: accessToken,
      });
      expect(data.notes).toHaveLength(1);
      expect(data.notes[0].title).toBe("N for T1");
    });

    test("커서 페이지네이션", async () => {
      const { user, accessToken, todo } = await createUserWithTodo();
      for (let i = 1; i <= 3; i++) {
        await prisma.note.create({
          data: { teamId: TEAM_ID, userId: user.id, todoId: todo.id, title: `N${i}` },
        });
      }
      const page1 = await request("GET", `/${TEAM_ID}/notes?limit=2`, {
        token: accessToken,
      });
      expect(page1.data.notes).toHaveLength(2);
      expect(page1.data.nextCursor).not.toBeNull();
      expect(page1.data.totalCount).toBe(3);

      const page2 = await request(
        "GET",
        `/${TEAM_ID}/notes?limit=2&cursor=${page1.data.nextCursor}`,
        { token: accessToken },
      );
      expect(page2.data.notes).toHaveLength(1);
      expect(page2.data.nextCursor).toBeNull();
    });

    test("다른 유저 노트 미노출", async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const todo = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user1.user.id, title: "T" },
      });
      await prisma.note.create({
        data: { teamId: TEAM_ID, userId: user1.user.id, todoId: todo.id, title: "Hidden" },
      });
      const { data } = await request("GET", `/${TEAM_ID}/notes`, {
        token: user2.accessToken,
      });
      expect(data.notes).toHaveLength(0);
    });

    test("sort=oldest 정렬 (오래된 순)", async () => {
      const { user, accessToken, todo } = await createUserWithTodo();
      await prisma.note.create({
        data: { teamId: TEAM_ID, userId: user.id, todoId: todo.id, title: "First" },
      });
      await prisma.note.create({
        data: { teamId: TEAM_ID, userId: user.id, todoId: todo.id, title: "Second" },
      });
      await prisma.note.create({
        data: { teamId: TEAM_ID, userId: user.id, todoId: todo.id, title: "Third" },
      });

      const { status, data } = await request("GET", `/${TEAM_ID}/notes?sort=oldest`, {
        token: accessToken,
      });
      expect(status).toBe(200);
      expect(data.notes).toHaveLength(3);
      expect(data.notes.map((n: { title: string }) => n.title)).toEqual(["First", "Second", "Third"]);
    });

    test("search — 제목 부분 일치, 대소문자 무시", async () => {
      const { user, accessToken, todo } = await createUserWithTodo();
      await prisma.note.create({
        data: { teamId: TEAM_ID, userId: user.id, todoId: todo.id, title: "Alpha 회의록" },
      });
      await prisma.note.create({
        data: { teamId: TEAM_ID, userId: user.id, todoId: todo.id, title: "beta 정리" },
      });
      await prisma.note.create({
        data: { teamId: TEAM_ID, userId: user.id, todoId: todo.id, title: "다른 노트" },
      });

      const { status, data } = await request("GET", `/${TEAM_ID}/notes?search=ALPHA`, {
        token: accessToken,
      });
      expect(status).toBe(200);
      expect(data.notes).toHaveLength(1);
      expect(data.notes[0].title).toBe("Alpha 회의록");
      expect(data.totalCount).toBe(1);
    });

    test("search + 커서 페이지네이션", async () => {
      const { user, accessToken, todo } = await createUserWithTodo();
      await prisma.note.create({
        data: { teamId: TEAM_ID, userId: user.id, todoId: todo.id, title: "검색 대상 A" },
      });
      await prisma.note.create({
        data: { teamId: TEAM_ID, userId: user.id, todoId: todo.id, title: "검색 대상 B" },
      });

      const page1 = await request("GET", `/${TEAM_ID}/notes?search=검색 대상&limit=1`, {
        token: accessToken,
      });
      expect(page1.data.notes).toHaveLength(1);
      expect(page1.data.totalCount).toBe(2);
      expect(page1.data.nextCursor).not.toBeNull();

      const page2 = await request(
        "GET",
        `/${TEAM_ID}/notes?search=검색 대상&limit=1&cursor=${page1.data.nextCursor}`,
        { token: accessToken },
      );
      expect(page2.data.notes).toHaveLength(1);
      expect(page2.data.totalCount).toBe(2);
      expect(page2.data.nextCursor).toBeNull();
    });
  });

  // ─── GET /{teamId}/notes/{noteId} ───

  describe("GET /notes/:noteId", () => {
    test("상세 조회 — goal/todo createdAt/tags 포함", async () => {
      const { user, accessToken } = await createTestUser();
      const goal = await prisma.goal.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Parent Goal" },
      });
      const todo = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user.id, goalId: goal.id, title: "Parent Todo" },
      });
      const [tag1, tag2] = await Promise.all([
        prisma.tag.create({ data: { teamId: TEAM_ID, userId: user.id, name: "frontend" } }),
        prisma.tag.create({ data: { teamId: TEAM_ID, userId: user.id, name: "urgent" } }),
      ]);
      await prisma.todoTag.createMany({
        data: [
          { todoId: todo.id, tagId: tag1.id },
          { todoId: todo.id, tagId: tag2.id },
        ],
      });
      const note = await prisma.note.create({
        data: { teamId: TEAM_ID, userId: user.id, todoId: todo.id, title: "Detail" },
      });
      const { status, data } = await request("GET", `/${TEAM_ID}/notes/${note.id}`, {
        token: accessToken,
      });
      expect(status).toBe(200);
      expect(data.title).toBe("Detail");
      expect(data.todo.id).toBe(todo.id);
      expect(data.todo.goal).toEqual({ id: goal.id, title: "Parent Goal" });
      expect(typeof data.todo.createdAt).toBe("string");
      expect(data.todo.tags).toEqual(
        expect.arrayContaining([
          { id: tag1.id, name: "frontend" },
          { id: tag2.id, name: "urgent" },
        ]),
      );
    });

    test("존재하지 않는 noteId — 404", async () => {
      const { accessToken } = await createTestUser();
      const { status } = await request("GET", `/${TEAM_ID}/notes/99999`, {
        token: accessToken,
      });
      expect(status).toBe(404);
    });

    test("다른 유저 노트 — 403", async () => {
      const owner = await createTestUser();
      const other = await createTestUser();
      const todo = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: owner.user.id, title: "T" },
      });
      const note = await prisma.note.create({
        data: { teamId: TEAM_ID, userId: owner.user.id, todoId: todo.id, title: "Private" },
      });
      const { status } = await request("GET", `/${TEAM_ID}/notes/${note.id}`, {
        token: other.accessToken,
      });
      expect(status).toBe(403);
    });
  });

  // ─── PATCH /{teamId}/notes/{noteId} ───

  describe("PATCH /notes/:noteId", () => {
    test("제목 수정 — 200", async () => {
      const { user, accessToken, todo } = await createUserWithTodo();
      const note = await prisma.note.create({
        data: { teamId: TEAM_ID, userId: user.id, todoId: todo.id, title: "Old" },
      });
      const { status, data } = await request("PATCH", `/${TEAM_ID}/notes/${note.id}`, {
        token: accessToken,
        json: { title: "New" },
      });
      expect(status).toBe(200);
      expect(data.title).toBe("New");
      expect(data.todo).toEqual({ id: todo.id, title: "Parent Todo", done: false });
    });

    test("content null 제거 — 200", async () => {
      const { user, accessToken, todo } = await createUserWithTodo();
      const note = await prisma.note.create({
        data: {
          teamId: TEAM_ID,
          userId: user.id,
          todoId: todo.id,
          title: "Has Content",
          content: { text: "hello" },
        },
      });
      const { status, data } = await request("PATCH", `/${TEAM_ID}/notes/${note.id}`, {
        token: accessToken,
        json: { content: null },
      });
      expect(status).toBe(200);
      expect(data.content).toBeNull();
    });

    test("linkUrl null 제거 — 200", async () => {
      const { user, accessToken, todo } = await createUserWithTodo();
      const note = await prisma.note.create({
        data: {
          teamId: TEAM_ID,
          userId: user.id,
          todoId: todo.id,
          title: "Has Link",
          linkUrl: "https://example.com",
        },
      });
      const { status, data } = await request("PATCH", `/${TEAM_ID}/notes/${note.id}`, {
        token: accessToken,
        json: { linkUrl: null },
      });
      expect(status).toBe(200);
      expect(data.linkUrl).toBeNull();
    });

    test("다른 유저 노트 — 403", async () => {
      const owner = await createTestUser();
      const other = await createTestUser();
      const todo = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: owner.user.id, title: "T" },
      });
      const note = await prisma.note.create({
        data: { teamId: TEAM_ID, userId: owner.user.id, todoId: todo.id, title: "N" },
      });
      const { status } = await request("PATCH", `/${TEAM_ID}/notes/${note.id}`, {
        token: other.accessToken,
        json: { title: "Hacked" },
      });
      expect(status).toBe(403);
    });

    test("존재하지 않는 noteId — 404", async () => {
      const { accessToken } = await createTestUser();
      const { status } = await request("PATCH", `/${TEAM_ID}/notes/99999`, {
        token: accessToken,
        json: { title: "Nope" },
      });
      expect(status).toBe(404);
    });
  });

  // ─── DELETE /{teamId}/notes/{noteId} ───

  describe("DELETE /notes/:noteId", () => {
    test("삭제 — 204", async () => {
      const { user, accessToken, todo } = await createUserWithTodo();
      const note = await prisma.note.create({
        data: { teamId: TEAM_ID, userId: user.id, todoId: todo.id, title: "Del" },
      });
      const { status } = await request("DELETE", `/${TEAM_ID}/notes/${note.id}`, {
        token: accessToken,
      });
      expect(status).toBe(204);
    });

    test("다른 유저 노트 — 403", async () => {
      const owner = await createTestUser();
      const other = await createTestUser();
      const todo = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: owner.user.id, title: "T" },
      });
      const note = await prisma.note.create({
        data: { teamId: TEAM_ID, userId: owner.user.id, todoId: todo.id, title: "N" },
      });
      const { status } = await request("DELETE", `/${TEAM_ID}/notes/${note.id}`, {
        token: other.accessToken,
      });
      expect(status).toBe(403);
    });

    test("존재하지 않는 noteId — 404", async () => {
      const { accessToken } = await createTestUser();
      const { status } = await request("DELETE", `/${TEAM_ID}/notes/99999`, {
        token: accessToken,
      });
      expect(status).toBe(404);
    });
  });
});
