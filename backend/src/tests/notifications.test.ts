import { describe, test, expect, beforeEach } from "bun:test";
import { request, cleanupDB, createTestUser, prisma, TEAM_ID } from "./helpers";

describe("Notifications", () => {
  beforeEach(async () => {
    await cleanupDB();
  });

  // ─── GET /{teamId}/notifications ───

  describe("GET /notifications", () => {
    test("목록 조회 — type, message, isRead, resourceId 포함", async () => {
      const { user, accessToken } = await createTestUser();
      await prisma.notification.create({
        data: {
          teamId: TEAM_ID,
          userId: user.id,
          type: "todo",
          message: "할 일 완료",
          resourceId: 1,
        },
      });
      const { status, data } = await request("GET", `/${TEAM_ID}/notifications`, {
        token: accessToken,
      });
      expect(status).toBe(200);
      expect(data.notifications).toHaveLength(1);
      const n = data.notifications[0];
      expect(n.type).toBe("todo");
      expect(n.message).toBe("할 일 완료");
      expect(n.isRead).toBe(false);
      expect(n.resourceId).toBe(1);
    });

    test("커서 페이지네이션", async () => {
      const { user, accessToken } = await createTestUser();
      for (let i = 1; i <= 3; i++) {
        await prisma.notification.create({
          data: {
            teamId: TEAM_ID,
            userId: user.id,
            type: "todo",
            message: `N${i}`,
          },
        });
      }
      const page1 = await request("GET", `/${TEAM_ID}/notifications?limit=2`, {
        token: accessToken,
      });
      expect(page1.data.notifications).toHaveLength(2);
      expect(page1.data.nextCursor).not.toBeNull();
      expect(page1.data.totalCount).toBe(3);

      const page2 = await request(
        "GET",
        `/${TEAM_ID}/notifications?limit=2&cursor=${page1.data.nextCursor}`,
        { token: accessToken },
      );
      expect(page2.data.notifications).toHaveLength(1);
      expect(page2.data.nextCursor).toBeNull();
    });

    test("다른 유저 알림 미노출", async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      await prisma.notification.create({
        data: {
          teamId: TEAM_ID,
          userId: user1.user.id,
          type: "todo",
          message: "Hidden",
        },
      });
      const { data } = await request("GET", `/${TEAM_ID}/notifications`, {
        token: user2.accessToken,
      });
      expect(data.notifications).toHaveLength(0);
    });

    test("인증 없이 — 401", async () => {
      const { status } = await request("GET", `/${TEAM_ID}/notifications`);
      expect(status).toBe(401);
    });
  });

  // ─── PATCH /{teamId}/notifications/{notificationId} ───

  describe("PATCH /notifications/:id", () => {
    test("단건 읽음 처리 — 200, isRead: true", async () => {
      const { user, accessToken } = await createTestUser();
      const notif = await prisma.notification.create({
        data: {
          teamId: TEAM_ID,
          userId: user.id,
          type: "todo",
          message: "Read me",
        },
      });
      const { status, data } = await request(
        "PATCH",
        `/${TEAM_ID}/notifications/${notif.id}`,
        { token: accessToken, json: { isRead: true } },
      );
      expect(status).toBe(200);
      expect(data.isRead).toBe(true);
      expect(data.id).toBe(notif.id);
    });

    test("다른 유저 알림 — 403", async () => {
      const owner = await createTestUser();
      const other = await createTestUser();
      const notif = await prisma.notification.create({
        data: {
          teamId: TEAM_ID,
          userId: owner.user.id,
          type: "todo",
          message: "Private",
        },
      });
      const { status } = await request(
        "PATCH",
        `/${TEAM_ID}/notifications/${notif.id}`,
        { token: other.accessToken, json: { isRead: true } },
      );
      expect(status).toBe(403);
    });

    test("존재하지 않는 알림 — 404", async () => {
      const { accessToken } = await createTestUser();
      const { status } = await request("PATCH", `/${TEAM_ID}/notifications/99999`, {
        token: accessToken,
        json: { isRead: true },
      });
      expect(status).toBe(404);
    });
  });

  // ─── PATCH /{teamId}/notifications ───

  describe("PATCH /notifications (전체 읽음)", () => {
    test("전체 읽음 처리 — 204", async () => {
      const { user, accessToken } = await createTestUser();
      for (let i = 0; i < 3; i++) {
        await prisma.notification.create({
          data: {
            teamId: TEAM_ID,
            userId: user.id,
            type: "todo",
            message: `N${i}`,
          },
        });
      }
      const { status } = await request("PATCH", `/${TEAM_ID}/notifications`, {
        token: accessToken,
      });
      expect(status).toBe(204);
      const unread = await prisma.notification.count({
        where: { userId: user.id, isRead: false },
      });
      expect(unread).toBe(0);
    });

    test("다른 유저 알림은 영향 없음", async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      await prisma.notification.create({
        data: {
          teamId: TEAM_ID,
          userId: user1.user.id,
          type: "todo",
          message: "User1",
        },
      });
      await prisma.notification.create({
        data: {
          teamId: TEAM_ID,
          userId: user2.user.id,
          type: "todo",
          message: "User2",
        },
      });
      await request("PATCH", `/${TEAM_ID}/notifications`, {
        token: user1.accessToken,
      });
      const user2Unread = await prisma.notification.count({
        where: { userId: user2.user.id, isRead: false },
      });
      expect(user2Unread).toBe(1);
    });
  });

  // ─── DELETE /{teamId}/notifications/{notificationId} ───

  describe("DELETE /notifications/:id", () => {
    test("단건 삭제 — 204", async () => {
      const { user, accessToken } = await createTestUser();
      const notif = await prisma.notification.create({
        data: {
          teamId: TEAM_ID,
          userId: user.id,
          type: "todo",
          message: "Del",
        },
      });
      const { status } = await request(
        "DELETE",
        `/${TEAM_ID}/notifications/${notif.id}`,
        { token: accessToken },
      );
      expect(status).toBe(204);
    });

    test("다른 유저 알림 — 403", async () => {
      const owner = await createTestUser();
      const other = await createTestUser();
      const notif = await prisma.notification.create({
        data: {
          teamId: TEAM_ID,
          userId: owner.user.id,
          type: "todo",
          message: "Private",
        },
      });
      const { status } = await request(
        "DELETE",
        `/${TEAM_ID}/notifications/${notif.id}`,
        { token: other.accessToken },
      );
      expect(status).toBe(403);
    });

    test("존재하지 않는 알림 — 404", async () => {
      const { accessToken } = await createTestUser();
      const { status } = await request("DELETE", `/${TEAM_ID}/notifications/99999`, {
        token: accessToken,
      });
      expect(status).toBe(404);
    });
  });

  // ─── DELETE /{teamId}/notifications ───

  describe("DELETE /notifications (전체)", () => {
    test("전체 삭제 — 204", async () => {
      const { user, accessToken } = await createTestUser();
      for (let i = 0; i < 3; i++) {
        await prisma.notification.create({
          data: {
            teamId: TEAM_ID,
            userId: user.id,
            type: "todo",
            message: `N${i}`,
          },
        });
      }
      const { status } = await request("DELETE", `/${TEAM_ID}/notifications`, {
        token: accessToken,
      });
      expect(status).toBe(204);
      const remaining = await prisma.notification.count({ where: { userId: user.id } });
      expect(remaining).toBe(0);
    });

    test("다른 유저 알림은 유지", async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      await prisma.notification.create({
        data: {
          teamId: TEAM_ID,
          userId: user1.user.id,
          type: "todo",
          message: "User1",
        },
      });
      await prisma.notification.create({
        data: {
          teamId: TEAM_ID,
          userId: user2.user.id,
          type: "todo",
          message: "User2",
        },
      });
      await request("DELETE", `/${TEAM_ID}/notifications`, {
        token: user1.accessToken,
      });
      const remaining = await prisma.notification.count({
        where: { userId: user2.user.id },
      });
      expect(remaining).toBe(1);
    });
  });

  // ─── 자동 생성 (cross-domain) ───

  describe("자동 생성", () => {
    test("할 일 완료 → todo 알림", async () => {
      const { user, accessToken } = await createTestUser();
      const todo = await prisma.todo.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Complete" },
      });
      await request("PATCH", `/${TEAM_ID}/todos/${todo.id}`, {
        token: accessToken,
        json: { done: true },
      });
      await Bun.sleep(200);
      const notifs = await prisma.notification.findMany({
        where: { userId: user.id, type: "todo" },
      });
      expect(notifs).toHaveLength(1);
    });

    test("목표 전체 완료 → goal 알림", async () => {
      const { user, accessToken } = await createTestUser();
      const goal = await prisma.goal.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "All Done" },
      });
      await prisma.todo.create({
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
      await request("PATCH", `/${TEAM_ID}/todos/${todo2.id}`, {
        token: accessToken,
        json: { done: true },
      });
      await Bun.sleep(200);
      const notifs = await prisma.notification.findMany({
        where: { userId: user.id, type: "goal" },
      });
      expect(notifs).toHaveLength(1);
      expect(notifs[0].resourceId).toBe(goal.id);
    });

    test("댓글 → 게시글 작성자에게 comment 알림", async () => {
      const postAuthor = await createTestUser();
      const commenter = await createTestUser();
      const post = await prisma.post.create({
        data: {
          teamId: TEAM_ID,
          userId: postAuthor.user.id,
          title: "Post",
          content: "Content",
        },
      });
      await request("POST", `/${TEAM_ID}/posts/${post.id}/comments`, {
        token: commenter.accessToken,
        json: { content: "Nice post!" },
      });
      await Bun.sleep(200);
      const notifs = await prisma.notification.findMany({
        where: { userId: postAuthor.user.id, type: "comment" },
      });
      expect(notifs).toHaveLength(1);
      expect(notifs[0].resourceId).toBe(post.id);
    });
  });
});
