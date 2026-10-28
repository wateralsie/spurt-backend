import { describe, test, expect, beforeEach } from "bun:test";
import { request, cleanupDB, createTestUser, prisma, TEAM_ID } from "./helpers";

describe("Posts/Comments", () => {
  beforeEach(async () => {
    await cleanupDB();
  });

  // ─── POST /{teamId}/posts ───

  describe("POST /posts", () => {
    test("생성 — 201, viewCount: 0, writer 포함", async () => {
      const { user, accessToken } = await createTestUser();
      const { status, data } = await request("POST", `/${TEAM_ID}/posts`, {
        token: accessToken,
        json: { title: "First Post", content: "Hello world" },
      });
      expect(status).toBe(201);
      expect(data.title).toBe("First Post");
      expect(data.viewCount).toBe(0);
      expect(data.writer).not.toBeNull();
      expect(data.writer.id).toBe(user.id);
    });

    test("이미지 포함 — 201", async () => {
      const { accessToken } = await createTestUser();
      const { status, data } = await request("POST", `/${TEAM_ID}/posts`, {
        token: accessToken,
        json: {
          title: "With Image",
          content: "Content",
          image: "https://example.com/photo.jpg",
        },
      });
      expect(status).toBe(201);
      expect(data.image).toBe("https://example.com/photo.jpg");
    });

    test("인증 없이 — 401", async () => {
      const { status } = await request("POST", `/${TEAM_ID}/posts`, {
        json: { title: "No Auth", content: "Content" },
      });
      expect(status).toBe(401);
    });
  });

  // ─── GET /{teamId}/posts ───

  describe("GET /posts", () => {
    test("목록 조회 — writer + commentCount", async () => {
      const { user, accessToken } = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "P", content: "C" },
      });
      await prisma.comment.create({
        data: { teamId: TEAM_ID, userId: user.id, postId: post.id, content: "Comment" },
      });
      const { status, data } = await request("GET", `/${TEAM_ID}/posts`, {
        token: accessToken,
      });
      expect(status).toBe(200);
      expect(data.posts).toHaveLength(1);
      expect(data.posts[0].writer).not.toBeNull();
      expect(data.posts[0].commentCount).toBe(1);
    });

    test("팀 전체 게시글 조회 (다른 유저 포함)", async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user1.user.id, title: "U1", content: "C" },
      });
      await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user2.user.id, title: "U2", content: "C" },
      });
      const { data } = await request("GET", `/${TEAM_ID}/posts`, {
        token: user1.accessToken,
      });
      expect(data.posts).toHaveLength(2);
    });

    test("커서 페이지네이션", async () => {
      const { user, accessToken } = await createTestUser();
      for (let i = 1; i <= 3; i++) {
        await prisma.post.create({
          data: { teamId: TEAM_ID, userId: user.id, title: `P${i}`, content: "C" },
        });
      }
      const page1 = await request("GET", `/${TEAM_ID}/posts?limit=2`, {
        token: accessToken,
      });
      expect(page1.data.posts).toHaveLength(2);
      expect(page1.data.nextCursor).not.toBeNull();
      expect(typeof page1.data.nextCursor).toBe("string");
      expect(page1.data.totalCount).toBe(3);

      const page2 = await request(
        "GET",
        `/${TEAM_ID}/posts?limit=2&cursor=${page1.data.nextCursor}`,
        { token: accessToken },
      );
      expect(page2.data.posts).toHaveLength(1);
      expect(page2.data.nextCursor).toBeNull();
    });

    test("type=best — keyset 페이지네이션", async () => {
      const { user, accessToken } = await createTestUser();
      await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Low", content: "C", viewCount: 1 },
      });
      await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Mid", content: "C", viewCount: 50 },
      });
      await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "High", content: "C", viewCount: 100 },
      });

      const page1 = await request("GET", `/${TEAM_ID}/posts?type=best&limit=2`, {
        token: accessToken,
      });
      expect(page1.data.posts).toHaveLength(2);
      expect(page1.data.posts[0].title).toBe("High");
      expect(page1.data.posts[1].title).toBe("Mid");
      expect(page1.data.nextCursor).not.toBeNull();
      expect(typeof page1.data.nextCursor).toBe("string");

      const page2 = await request(
        "GET",
        `/${TEAM_ID}/posts?type=best&limit=2&cursor=${page1.data.nextCursor}`,
        { token: accessToken },
      );
      expect(page2.data.posts).toHaveLength(1);
      expect(page2.data.posts[0].title).toBe("Low");
      expect(page2.data.nextCursor).toBeNull();
    });

    test("잘못된 cursor (invalid base64) — 400 INVALID_CURSOR", async () => {
      const { accessToken } = await createTestUser();
      const { status, data } = await request(
        "GET",
        `/${TEAM_ID}/posts?cursor=not-valid-base64`,
        { token: accessToken },
      );
      expect(status).toBe(400);
      expect(data.code).toBe("INVALID_CURSOR");
    });

    test("잘못된 cursor (valid JSON, missing fields) — 400 INVALID_CURSOR", async () => {
      const { accessToken } = await createTestUser();
      const badCursor = Buffer.from(JSON.stringify({ v: 1, t: "all" })).toString("base64url");
      const { status, data } = await request(
        "GET",
        `/${TEAM_ID}/posts?cursor=${badCursor}`,
        { token: accessToken },
      );
      expect(status).toBe(400);
      expect(data.code).toBe("INVALID_CURSOR");
    });

    test("type=best에 type=all 커서 사용 — 400", async () => {
      const { accessToken } = await createTestUser();
      const allCursor = Buffer.from(JSON.stringify({ v: 1, t: "all", id: 1 })).toString("base64url");
      const { status, data } = await request(
        "GET",
        `/${TEAM_ID}/posts?type=best&cursor=${allCursor}`,
        { token: accessToken },
      );
      expect(status).toBe(400);
      expect(data.code).toBe("INVALID_CURSOR");
    });

    test("type=best — viewCount 높은 순 정렬", async () => {
      const { user, accessToken } = await createTestUser();
      const low = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Low", content: "C", viewCount: 1 },
      });
      const high = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "High", content: "C", viewCount: 100 },
      });
      const { data } = await request("GET", `/${TEAM_ID}/posts?type=best`, {
        token: accessToken,
      });
      expect(data.posts[0].viewCount).toBeGreaterThanOrEqual(data.posts[1].viewCount);
      expect(data.posts[0].id).toBe(high.id);
    });

    test("type=all (기본) — 최신순 정렬", async () => {
      const { user, accessToken } = await createTestUser();
      const older = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Old", content: "C", viewCount: 100 },
      });
      const newer = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "New", content: "C", viewCount: 0 },
      });
      const { data } = await request("GET", `/${TEAM_ID}/posts`, {
        token: accessToken,
      });
      // viewCount 무관, ID 내림차순
      expect(data.posts[0].id).toBe(newer.id);
    });

    test("search — 제목·본문 부분 일치, 대소문자 무시", async () => {
      const { user, accessToken } = await createTestUser();
      await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Alpha 고양이", content: "본문1" },
      });
      await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Beta", content: "내용에 KEYWORD 포함" },
      });
      await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Gamma", content: "매칭없음" },
      });

      const byTitle = await request("GET", `/${TEAM_ID}/posts?search=alpha`, {
        token: accessToken,
      });
      expect(byTitle.data.posts).toHaveLength(1);
      expect(byTitle.data.posts[0].title).toBe("Alpha 고양이");
      expect(byTitle.data.totalCount).toBe(1);

      const byContent = await request("GET", `/${TEAM_ID}/posts?search=keyword`, {
        token: accessToken,
      });
      expect(byContent.data.posts).toHaveLength(1);
      expect(byContent.data.posts[0].title).toBe("Beta");

      const allThree = await request("GET", `/${TEAM_ID}/posts`, { token: accessToken });
      expect(allThree.data.totalCount).toBe(3);
    });

    test("search + 커서 페이지네이션", async () => {
      const { user, accessToken } = await createTestUser();
      await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "검색어 A", content: "x" },
      });
      await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "검색어 B", content: "x" },
      });
      const page1 = await request("GET", `/${TEAM_ID}/posts?search=검색어&limit=1`, {
        token: accessToken,
      });
      expect(page1.data.posts).toHaveLength(1);
      expect(page1.data.totalCount).toBe(2);
      expect(page1.data.nextCursor).not.toBeNull();

      const page2 = await request(
        "GET",
        `/${TEAM_ID}/posts?search=검색어&limit=1&cursor=${page1.data.nextCursor}`,
        { token: accessToken },
      );
      expect(page2.data.posts).toHaveLength(1);
      expect(page2.data.totalCount).toBe(2);
      expect(page2.data.nextCursor).toBeNull();
    });
  });

  // ─── GET /{teamId}/posts/{postId} ───

  describe("GET /posts/:postId", () => {
    test("상세 조회 — viewCount 증가 확인 (2회 호출)", async () => {
      const { user, accessToken } = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "View", content: "C" },
      });
      const res1 = await request("GET", `/${TEAM_ID}/posts/${post.id}`, {
        token: accessToken,
      });
      expect(res1.status).toBe(200);
      expect(res1.data.viewCount).toBe(1);

      const res2 = await request("GET", `/${TEAM_ID}/posts/${post.id}`, {
        token: accessToken,
      });
      expect(res2.data.viewCount).toBe(2);
    });

    test("존재하지 않는 postId — 404", async () => {
      const { accessToken } = await createTestUser();
      const { status } = await request("GET", `/${TEAM_ID}/posts/99999`, {
        token: accessToken,
      });
      expect(status).toBe(404);
    });
  });

  // ─── PATCH /{teamId}/posts/{postId} ───

  describe("PATCH /posts/:postId", () => {
    test("제목 수정 — 200", async () => {
      const { user, accessToken } = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Old", content: "C" },
      });
      const { status, data } = await request("PATCH", `/${TEAM_ID}/posts/${post.id}`, {
        token: accessToken,
        json: { title: "New" },
      });
      expect(status).toBe(200);
      expect(data.title).toBe("New");
    });

    test("이미지 null로 제거 — 200", async () => {
      const { user, accessToken } = await createTestUser();
      const post = await prisma.post.create({
        data: {
          teamId: TEAM_ID,
          userId: user.id,
          title: "Img",
          content: "C",
          image: "https://example.com/old.jpg",
        },
      });
      const { status, data } = await request("PATCH", `/${TEAM_ID}/posts/${post.id}`, {
        token: accessToken,
        json: { image: null },
      });
      expect(status).toBe(200);
      expect(data.image).toBeNull();
    });

    test("다른 유저 게시글 — 403", async () => {
      const owner = await createTestUser();
      const other = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: owner.user.id, title: "Owner", content: "C" },
      });
      const { status } = await request("PATCH", `/${TEAM_ID}/posts/${post.id}`, {
        token: other.accessToken,
        json: { title: "Hacked" },
      });
      expect(status).toBe(403);
    });

    test("존재하지 않는 postId — 404", async () => {
      const { accessToken } = await createTestUser();
      const { status } = await request("PATCH", `/${TEAM_ID}/posts/99999`, {
        token: accessToken,
        json: { title: "Nope" },
      });
      expect(status).toBe(404);
    });
  });

  // ─── DELETE /{teamId}/posts/{postId} ───

  describe("DELETE /posts/:postId", () => {
    test("삭제 — 204", async () => {
      const { user, accessToken } = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Del", content: "C" },
      });
      const { status } = await request("DELETE", `/${TEAM_ID}/posts/${post.id}`, {
        token: accessToken,
      });
      expect(status).toBe(204);
    });

    test("cascade 확인 (댓글 함께 삭제)", async () => {
      const { user, accessToken } = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "Cascade", content: "C" },
      });
      await prisma.comment.create({
        data: { teamId: TEAM_ID, userId: user.id, postId: post.id, content: "Comment" },
      });
      await request("DELETE", `/${TEAM_ID}/posts/${post.id}`, { token: accessToken });
      const comments = await prisma.comment.findMany({ where: { postId: post.id } });
      expect(comments).toHaveLength(0);
    });

    test("다른 유저 게시글 — 403", async () => {
      const owner = await createTestUser();
      const other = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: owner.user.id, title: "Owner", content: "C" },
      });
      const { status } = await request("DELETE", `/${TEAM_ID}/posts/${post.id}`, {
        token: other.accessToken,
      });
      expect(status).toBe(403);
    });

    test("존재하지 않는 postId — 404", async () => {
      const { accessToken } = await createTestUser();
      const { status } = await request("DELETE", `/${TEAM_ID}/posts/99999`, {
        token: accessToken,
      });
      expect(status).toBe(404);
    });
  });

  // ─── POST /{teamId}/posts/{postId}/comments ───

  describe("POST /posts/:postId/comments", () => {
    test("댓글 생성 — 201, writer 포함", async () => {
      const { user, accessToken } = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "P", content: "C" },
      });
      const { status, data } = await request(
        "POST",
        `/${TEAM_ID}/posts/${post.id}/comments`,
        { token: accessToken, json: { content: "Nice!" } },
      );
      expect(status).toBe(201);
      expect(data.content).toBe("Nice!");
      expect(data.parentId).toBeNull();
      expect(data.writer).not.toBeNull();
      expect(data.writer.id).toBe(user.id);
      expect(data.likeCount).toBe(0);
      expect(data.isLiked).toBe(false);
    });

    test("다른 유저 댓글 → 게시글 작성자에게 알림", async () => {
      const postAuthor = await createTestUser();
      const commenter = await createTestUser();
      const post = await prisma.post.create({
        data: {
          teamId: TEAM_ID,
          userId: postAuthor.user.id,
          title: "P",
          content: "C",
        },
      });
      await request("POST", `/${TEAM_ID}/posts/${post.id}/comments`, {
        token: commenter.accessToken,
        json: { content: "Comment!" },
      });
      await Bun.sleep(200);
      const notifs = await prisma.notification.findMany({
        where: { userId: postAuthor.user.id, type: "comment" },
      });
      expect(notifs).toHaveLength(1);
      expect(notifs[0].resourceId).toBe(post.id);
    });

    test("본인 댓글 → 알림 미생성", async () => {
      const { user, accessToken } = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "P", content: "C" },
      });
      await request("POST", `/${TEAM_ID}/posts/${post.id}/comments`, {
        token: accessToken,
        json: { content: "Self comment" },
      });
      await Bun.sleep(200);
      const notifs = await prisma.notification.findMany({
        where: { userId: user.id, type: "comment" },
      });
      expect(notifs).toHaveLength(0);
    });

    test("존재하지 않는 postId — 404", async () => {
      const { accessToken } = await createTestUser();
      const { status } = await request("POST", `/${TEAM_ID}/posts/99999/comments`, {
        token: accessToken,
        json: { content: "No post" },
      });
      expect(status).toBe(404);
    });

    test("대댓글 생성 — 201, parentId 반영", async () => {
      const { user, accessToken } = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "P", content: "C" },
      });
      const parent = await prisma.comment.create({
        data: { teamId: TEAM_ID, userId: user.id, postId: post.id, content: "Parent" },
      });
      const { status, data } = await request("POST", `/${TEAM_ID}/posts/${post.id}/comments`, {
        token: accessToken,
        json: { content: "Reply", parentId: parent.id },
      });
      expect(status).toBe(201);
      expect(data.parentId).toBe(parent.id);
      expect(data.content).toBe("Reply");
    });

    test("대댓글의 대댓글 생성 시도 — 400", async () => {
      const { user, accessToken } = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "P", content: "C" },
      });
      const parent = await prisma.comment.create({
        data: { teamId: TEAM_ID, userId: user.id, postId: post.id, content: "Parent" },
      });
      const child = await prisma.comment.create({
        data: { teamId: TEAM_ID, userId: user.id, postId: post.id, parentId: parent.id, content: "Child" },
      });

      const { status, data } = await request("POST", `/${TEAM_ID}/posts/${post.id}/comments`, {
        token: accessToken,
        json: { content: "Nested", parentId: child.id },
      });
      expect(status).toBe(400);
      expect(data.code).toBe("INVALID_PARENT_COMMENT");
    });
  });

  // ─── GET /{teamId}/posts/{postId}/comments ───

  describe("GET /posts/:postId/comments", () => {
    test("목록 조회 — writer 포함", async () => {
      const { user, accessToken } = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "P", content: "C" },
      });
      await prisma.comment.create({
        data: { teamId: TEAM_ID, userId: user.id, postId: post.id, content: "Hello" },
      });
      const { status, data } = await request(
        "GET",
        `/${TEAM_ID}/posts/${post.id}/comments`,
        { token: accessToken },
      );
      expect(status).toBe(200);
      expect(data.comments).toHaveLength(1);
      expect(data.comments[0].writer).not.toBeNull();
      expect(data.comments[0].parentId).toBeNull();
      expect(data.comments[0].likeCount).toBe(0);
      expect(data.comments[0].replyCount).toBe(0);
      expect(data.comments[0].isLiked).toBe(false);
    });

    test("커서 페이지네이션", async () => {
      const { user, accessToken } = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "P", content: "C" },
      });
      for (let i = 1; i <= 3; i++) {
        await prisma.comment.create({
          data: { teamId: TEAM_ID, userId: user.id, postId: post.id, content: `C${i}` },
        });
      }
      const page1 = await request(
        "GET",
        `/${TEAM_ID}/posts/${post.id}/comments?limit=2`,
        { token: accessToken },
      );
      expect(page1.data.comments).toHaveLength(2);
      expect(page1.data.nextCursor).not.toBeNull();
      expect(typeof page1.data.nextCursor).toBe("string");

      const page2 = await request(
        "GET",
        `/${TEAM_ID}/posts/${post.id}/comments?limit=2&cursor=${page1.data.nextCursor}`,
        { token: accessToken },
      );
      expect(page2.data.comments).toHaveLength(1);
      expect(page2.data.nextCursor).toBeNull();
    });

    test("존재하지 않는 postId — 404", async () => {
      const { accessToken } = await createTestUser();
      const { status } = await request("GET", `/${TEAM_ID}/posts/99999/comments`, {
        token: accessToken,
      });
      expect(status).toBe(404);
    });

    test("목록 조회 — 대댓글 parentId 포함", async () => {
      const { user, accessToken } = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "P", content: "C" },
      });
      const parent = await prisma.comment.create({
        data: { teamId: TEAM_ID, userId: user.id, postId: post.id, content: "Parent" },
      });
      await prisma.comment.create({
        data: { teamId: TEAM_ID, userId: user.id, postId: post.id, parentId: parent.id, content: "Reply" },
      });
      const { status, data } = await request("GET", `/${TEAM_ID}/posts/${post.id}/comments`, {
        token: accessToken,
      });
      expect(status).toBe(200);
      const reply = data.comments.find((c: { content: string }) => c.content === "Reply");
      expect(reply.parentId).toBe(parent.id);
    });

    test("parentId=null — 최상위 댓글만, totalCount 일치", async () => {
      const { user, accessToken } = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "P", content: "C" },
      });
      const parent = await prisma.comment.create({
        data: { teamId: TEAM_ID, userId: user.id, postId: post.id, content: "Parent" },
      });
      await prisma.comment.create({
        data: { teamId: TEAM_ID, userId: user.id, postId: post.id, parentId: parent.id, content: "Reply" },
      });
      const { status, data } = await request(
        "GET",
        `/${TEAM_ID}/posts/${post.id}/comments?parentId=null`,
        { token: accessToken },
      );
      expect(status).toBe(200);
      expect(data.comments).toHaveLength(1);
      expect(data.comments[0].content).toBe("Parent");
      expect(data.comments[0].parentId).toBeNull();
      expect(data.comments[0].replyCount).toBe(1);
      expect(data.totalCount).toBe(1);
    });

    test("parentId=부모ID — 해당 대댓글만", async () => {
      const { user, accessToken } = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "P", content: "C" },
      });
      const parent = await prisma.comment.create({
        data: { teamId: TEAM_ID, userId: user.id, postId: post.id, content: "Parent" },
      });
      await prisma.comment.create({
        data: { teamId: TEAM_ID, userId: user.id, postId: post.id, parentId: parent.id, content: "Reply" },
      });
      const { status, data } = await request(
        "GET",
        `/${TEAM_ID}/posts/${post.id}/comments?parentId=${parent.id}`,
        { token: accessToken },
      );
      expect(status).toBe(200);
      expect(data.comments).toHaveLength(1);
      expect(data.comments[0].content).toBe("Reply");
      expect(data.comments[0].parentId).toBe(parent.id);
      expect(data.comments[0].replyCount).toBeUndefined();
      expect(data.totalCount).toBe(1);
    });

    test("parentId=존재하지 않는 댓글 — 404", async () => {
      const { user, accessToken } = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "P", content: "C" },
      });
      const { status } = await request(
        "GET",
        `/${TEAM_ID}/posts/${post.id}/comments?parentId=99999`,
        { token: accessToken },
      );
      expect(status).toBe(404);
    });
  });

  // ─── PATCH /{teamId}/posts/{postId}/comments/{commentId} ───

  describe("PATCH /posts/:postId/comments/:commentId", () => {
    test("수정 — 200, content 반영", async () => {
      const { user, accessToken } = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "P", content: "C" },
      });
      const comment = await prisma.comment.create({
        data: { teamId: TEAM_ID, userId: user.id, postId: post.id, content: "Old" },
      });
      const { status, data } = await request(
        "PATCH",
        `/${TEAM_ID}/posts/${post.id}/comments/${comment.id}`,
        { token: accessToken, json: { content: "New text" } },
      );
      expect(status).toBe(200);
      expect(data.content).toBe("New text");
      expect(data.writer.id).toBe(user.id);
      expect(data.likeCount).toBe(0);
      expect(data.isLiked).toBe(false);
    });

    test("다른 유저 댓글 — 403", async () => {
      const owner = await createTestUser();
      const other = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: owner.user.id, title: "P", content: "C" },
      });
      const comment = await prisma.comment.create({
        data: { teamId: TEAM_ID, userId: owner.user.id, postId: post.id, content: "Mine" },
      });
      const { status } = await request(
        "PATCH",
        `/${TEAM_ID}/posts/${post.id}/comments/${comment.id}`,
        { token: other.accessToken, json: { content: "Hacked" } },
      );
      expect(status).toBe(403);
    });

    test("존재하지 않는 commentId — 404", async () => {
      const { user, accessToken } = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "P", content: "C" },
      });
      const { status } = await request(
        "PATCH",
        `/${TEAM_ID}/posts/${post.id}/comments/99999`,
        { token: accessToken, json: { content: "Nope" } },
      );
      expect(status).toBe(404);
    });

    test("잘못된 postId로 댓글 수정 시도 — 404", async () => {
      const { user, accessToken } = await createTestUser();
      const post1 = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "P1", content: "C" },
      });
      const post2 = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "P2", content: "C" },
      });
      const comment = await prisma.comment.create({
        data: { teamId: TEAM_ID, userId: user.id, postId: post1.id, content: "On P1" },
      });
      const { status } = await request(
        "PATCH",
        `/${TEAM_ID}/posts/${post2.id}/comments/${comment.id}`,
        { token: accessToken, json: { content: "Wrong post" } },
      );
      expect(status).toBe(404);
      const still = await prisma.comment.findUnique({ where: { id: comment.id } });
      expect(still?.content).toBe("On P1");
    });
  });

  // ─── DELETE /{teamId}/posts/{postId}/comments/{commentId} ───

  describe("DELETE /posts/:postId/comments/:commentId", () => {
    test("삭제 — 204", async () => {
      const { user, accessToken } = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "P", content: "C" },
      });
      const comment = await prisma.comment.create({
        data: { teamId: TEAM_ID, userId: user.id, postId: post.id, content: "Del" },
      });
      const { status } = await request(
        "DELETE",
        `/${TEAM_ID}/posts/${post.id}/comments/${comment.id}`,
        { token: accessToken },
      );
      expect(status).toBe(204);
    });

    test("부모 댓글 삭제 시 대댓글도 함께 삭제", async () => {
      const { user, accessToken } = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "P", content: "C" },
      });
      const parent = await prisma.comment.create({
        data: { teamId: TEAM_ID, userId: user.id, postId: post.id, content: "Parent" },
      });
      const reply = await prisma.comment.create({
        data: { teamId: TEAM_ID, userId: user.id, postId: post.id, parentId: parent.id, content: "Reply" },
      });

      const { status } = await request(
        "DELETE",
        `/${TEAM_ID}/posts/${post.id}/comments/${parent.id}`,
        { token: accessToken },
      );
      expect(status).toBe(204);
      const remains = await prisma.comment.findMany({ where: { id: { in: [parent.id, reply.id] } } });
      expect(remains).toHaveLength(0);
    });

    test("다른 유저 댓글 — 403", async () => {
      const owner = await createTestUser();
      const other = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: owner.user.id, title: "P", content: "C" },
      });
      const comment = await prisma.comment.create({
        data: { teamId: TEAM_ID, userId: owner.user.id, postId: post.id, content: "Mine" },
      });
      const { status } = await request(
        "DELETE",
        `/${TEAM_ID}/posts/${post.id}/comments/${comment.id}`,
        { token: other.accessToken },
      );
      expect(status).toBe(403);
    });

    test("존재하지 않는 commentId — 404", async () => {
      const { user, accessToken } = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "P", content: "C" },
      });
      const { status } = await request(
        "DELETE",
        `/${TEAM_ID}/posts/${post.id}/comments/99999`,
        { token: accessToken },
      );
      expect(status).toBe(404);
    });

    test("잘못된 postId로 댓글 삭제 시도 — 404", async () => {
      const { user, accessToken } = await createTestUser();
      const post1 = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "P1", content: "C" },
      });
      const post2 = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "P2", content: "C" },
      });
      const comment = await prisma.comment.create({
        data: { teamId: TEAM_ID, userId: user.id, postId: post1.id, content: "On P1" },
      });
      // post2의 URL로 post1의 댓글 삭제 시도
      const { status } = await request(
        "DELETE",
        `/${TEAM_ID}/posts/${post2.id}/comments/${comment.id}`,
        { token: accessToken },
      );
      expect(status).toBe(404);
      // 댓글이 삭제되지 않았는지 확인
      const still = await prisma.comment.findUnique({ where: { id: comment.id } });
      expect(still).not.toBeNull();
    });
  });

  // ─── POST/DELETE /{teamId}/posts/{postId}/comments/{commentId}/likes ───

  describe("POST/DELETE /posts/:postId/comments/:commentId/likes", () => {
    test("좋아요 추가 — 200, isLiked: true", async () => {
      const { user, accessToken } = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "P", content: "C" },
      });
      const comment = await prisma.comment.create({
        data: { teamId: TEAM_ID, userId: user.id, postId: post.id, content: "Like me" },
      });

      const { status, data } = await request(
        "POST",
        `/${TEAM_ID}/posts/${post.id}/comments/${comment.id}/likes`,
        { token: accessToken },
      );
      expect(status).toBe(200);
      expect(data.likeCount).toBe(1);
      expect(data.isLiked).toBe(true);
    });

    test("좋아요 중복 추가 — 멱등 처리", async () => {
      const { user, accessToken } = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "P", content: "C" },
      });
      const comment = await prisma.comment.create({
        data: { teamId: TEAM_ID, userId: user.id, postId: post.id, content: "Like me" },
      });

      await request("POST", `/${TEAM_ID}/posts/${post.id}/comments/${comment.id}/likes`, {
        token: accessToken,
      });
      const second = await request(
        "POST",
        `/${TEAM_ID}/posts/${post.id}/comments/${comment.id}/likes`,
        { token: accessToken },
      );
      expect(second.status).toBe(200);
      expect(second.data.likeCount).toBe(1);
      expect(second.data.isLiked).toBe(true);
    });

    test("좋아요 취소 — 200, isLiked: false", async () => {
      const { user, accessToken } = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "P", content: "C" },
      });
      const comment = await prisma.comment.create({
        data: { teamId: TEAM_ID, userId: user.id, postId: post.id, content: "Like me" },
      });
      await request("POST", `/${TEAM_ID}/posts/${post.id}/comments/${comment.id}/likes`, {
        token: accessToken,
      });

      const { status, data } = await request(
        "DELETE",
        `/${TEAM_ID}/posts/${post.id}/comments/${comment.id}/likes`,
        { token: accessToken },
      );
      expect(status).toBe(200);
      expect(data.likeCount).toBe(0);
      expect(data.isLiked).toBe(false);
    });

    test("좋아요 취소 (없어도) — 200, 멱등", async () => {
      const { user, accessToken } = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: user.id, title: "P", content: "C" },
      });
      const comment = await prisma.comment.create({
        data: { teamId: TEAM_ID, userId: user.id, postId: post.id, content: "Like me" },
      });

      const { status, data } = await request(
        "DELETE",
        `/${TEAM_ID}/posts/${post.id}/comments/${comment.id}/likes`,
        { token: accessToken },
      );
      expect(status).toBe(200);
      expect(data.likeCount).toBe(0);
      expect(data.isLiked).toBe(false);
    });

    test("댓글 목록에 likeCount/isLiked 반영", async () => {
      const owner = await createTestUser();
      const liker = await createTestUser();
      const post = await prisma.post.create({
        data: { teamId: TEAM_ID, userId: owner.user.id, title: "P", content: "C" },
      });
      const comment = await prisma.comment.create({
        data: { teamId: TEAM_ID, userId: owner.user.id, postId: post.id, content: "Target" },
      });

      await request("POST", `/${TEAM_ID}/posts/${post.id}/comments/${comment.id}/likes`, {
        token: liker.accessToken,
      });

      const ownerView = await request("GET", `/${TEAM_ID}/posts/${post.id}/comments`, {
        token: owner.accessToken,
      });
      expect(ownerView.status).toBe(200);
      expect(ownerView.data.comments[0].likeCount).toBe(1);
      expect(ownerView.data.comments[0].isLiked).toBe(false);

      const likerView = await request("GET", `/${TEAM_ID}/posts/${post.id}/comments`, {
        token: liker.accessToken,
      });
      expect(likerView.status).toBe(200);
      expect(likerView.data.comments[0].likeCount).toBe(1);
      expect(likerView.data.comments[0].isLiked).toBe(true);
    });
  });
});
