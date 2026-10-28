import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { authMiddleware } from "../middlewares/auth.js";
import { TeamIdParamSchema, ErrorResponseSchema } from "../schemas/common.js";
import {
  PostIdParamSchema,
  CommentIdParamSchema,
  CursorQuerySchema,
  PostListQuerySchema,
  CreatePostBodySchema,
  UpdatePostBodySchema,
  CreateCommentBodySchema,
  UpdateCommentBodySchema,
  PostDetailSchema,
  PostListResponseSchema,
  CommentSchema,
  CommentLikeResponseSchema,
  CommentListQuerySchema,
  CommentListResponseSchema,
} from "../schemas/posts.js";
import * as postsService from "../services/posts.service.js";

type Env = { Variables: { userId: number; teamId: string } };

export const posts = new OpenAPIHono<Env>();

posts.use("*", authMiddleware);

// ─── Posts ───

// GET /{teamId}/posts
const listPostsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Posts"],
  summary: "게시글 목록 조회",
  description:
    "커서 기반 페이지네이션으로 게시글 목록을 조회합니다. " +
    "팀 전체 공개 게시판이므로 팀 내 모든 게시글이 조회됩니다. " +
    "type=all(기본)은 최신순, type=best는 조회수 높은 순으로 정렬합니다. " +
    "search로 제목·본문 부분 검색이 가능합니다. " +
    "nextCursor가 null이면 마지막 페이지입니다.",
  request: {
    params: TeamIdParamSchema,
    query: PostListQuerySchema,
  },
  responses: {
    200: {
      description: "게시글 목록",
      content: {
        "application/json": {
          schema: PostListResponseSchema,
          example: {
            posts: [
              {
                id: 5,
                teamId: "team-abc",
                userId: 1,
                title: "첫 번째 게시글",
                content: "안녕하세요, 첫 게시글입니다.",
                image: null,
                viewCount: 42,
                createdAt: "2026-02-16T09:00:00.000Z",
                updatedAt: "2026-02-16T09:00:00.000Z",
                writer: { id: 1, name: "홍길동", image: null },
                commentCount: 3,
              },
            ],
            nextCursor: "eyJ2IjoxLCJ0IjoiYWxsIiwiaWQiOjR9",
            totalCount: 12,
          },
        },
      },
    },
    400: {
      description: "잘못된 커서 또는 요청 파라미터",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "인증 필요",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

posts.openapi(listPostsRoute, async (c) => {
  const teamId = c.get("teamId");
  const { cursor, limit, type, search } = c.req.valid("query");
  const result = await postsService.listPosts(teamId, cursor, limit, type, search);
  return c.json(result, 200);
});

// GET /{teamId}/posts/{postId}
const getPostRoute = createRoute({
  method: "get",
  path: "/{postId}",
  tags: ["Posts"],
  summary: "게시글 상세 조회",
  description:
    "게시글의 상세 정보를 조회합니다. " +
    "조회 시 조회수(viewCount)가 자동으로 1 증가합니다. " +
    "작성자(writer) 정보와 댓글 수(commentCount)가 포함됩니다.",
  request: {
    params: TeamIdParamSchema.extend(PostIdParamSchema.shape),
  },
  responses: {
    200: {
      description: "게시글 상세",
      content: {
        "application/json": {
          schema: PostDetailSchema,
          example: {
            id: 5,
            teamId: "team-abc",
            userId: 1,
            title: "첫 번째 게시글",
            content: "안녕하세요, 첫 게시글입니다.",
            image: null,
            viewCount: 43,
            createdAt: "2026-02-16T09:00:00.000Z",
            updatedAt: "2026-02-16T09:00:00.000Z",
            writer: { id: 1, name: "홍길동", image: null },
            commentCount: 3,
          },
        },
      },
    },
    401: {
      description: "인증 필요",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "게시글 없음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

posts.openapi(getPostRoute, async (c) => {
  const teamId = c.get("teamId");
  const { postId } = c.req.valid("param");
  const result = await postsService.getPost(teamId, postId);
  return c.json(result, 200);
});

// POST /{teamId}/posts
const createPostRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Posts"],
  summary: "게시글 생성",
  description:
    "새 게시글을 생성합니다. title과 content가 필수이며, " +
    "image URL을 선택적으로 첨부할 수 있습니다.",
  request: {
    params: TeamIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: CreatePostBodySchema,
          example: {
            title: "첫 번째 게시글",
            content: "안녕하세요, 첫 게시글입니다.",
            image: "https://example.com/photo.jpg",
          },
        },
      },
    },
  },
  responses: {
    201: {
      description: "게시글 생성 성공",
      content: {
        "application/json": {
          schema: PostDetailSchema,
          example: {
            id: 5,
            teamId: "team-abc",
            userId: 1,
            title: "첫 번째 게시글",
            content: "안녕하세요, 첫 게시글입니다.",
            image: "https://example.com/photo.jpg",
            viewCount: 0,
            createdAt: "2026-02-16T09:00:00.000Z",
            updatedAt: "2026-02-16T09:00:00.000Z",
            writer: { id: 1, name: "홍길동", image: null },
            commentCount: 0,
          },
        },
      },
    },
    400: {
      description: "요청 데이터가 유효하지 않음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "인증 필요",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

posts.openapi(createPostRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const body = c.req.valid("json");
  const result = await postsService.createPost(teamId, userId, body);
  return c.json(result, 201);
});

// PATCH /{teamId}/posts/{postId}
const updatePostRoute = createRoute({
  method: "patch",
  path: "/{postId}",
  tags: ["Posts"],
  summary: "게시글 수정",
  description:
    "게시글을 부분 수정합니다. 본인 작성 게시글만 수정할 수 있습니다. " +
    "최소 1개 필드를 보내야 합니다. image에 null을 보내면 이미지를 제거합니다.",
  request: {
    params: TeamIdParamSchema.extend(PostIdParamSchema.shape),
    body: {
      content: {
        "application/json": {
          schema: UpdatePostBodySchema,
          example: {
            title: "수정된 게시글 제목",
            image: null,
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "게시글 수정 성공",
      content: {
        "application/json": {
          schema: PostDetailSchema,
          example: {
            id: 5,
            teamId: "team-abc",
            userId: 1,
            title: "수정된 게시글 제목",
            content: "안녕하세요, 첫 게시글입니다.",
            image: null,
            viewCount: 42,
            createdAt: "2026-02-16T09:00:00.000Z",
            updatedAt: "2026-02-16T10:30:00.000Z",
            writer: { id: 1, name: "홍길동", image: null },
            commentCount: 3,
          },
        },
      },
    },
    400: {
      description: "요청 데이터가 유효하지 않음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "인증 필요",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    403: {
      description: "권한 없음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "게시글 없음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

posts.openapi(updatePostRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { postId } = c.req.valid("param");
  const body = c.req.valid("json");
  const result = await postsService.updatePost(teamId, postId, userId, body);
  return c.json(result, 200);
});

// DELETE /{teamId}/posts/{postId}
const deletePostRoute = createRoute({
  method: "delete",
  path: "/{postId}",
  tags: ["Posts"],
  summary: "게시글 삭제",
  description:
    "게시글을 삭제합니다. 본인 작성 게시글만 삭제할 수 있습니다. " +
    "연결된 댓글도 함께 삭제됩니다 (cascade).",
  request: {
    params: TeamIdParamSchema.extend(PostIdParamSchema.shape),
  },
  responses: {
    204: {
      description: "게시글 삭제 성공 — 응답 body 없음",
    },
    401: {
      description: "인증 필요",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    403: {
      description: "권한 없음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "게시글 없음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

posts.openapi(deletePostRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { postId } = c.req.valid("param");
  await postsService.deletePost(teamId, postId, userId);
  return c.body(null, 204);
});

// ─── Comments ───

// GET /{teamId}/posts/{postId}/comments
const listCommentsRoute = createRoute({
  method: "get",
  path: "/{postId}/comments",
  tags: ["Comments"],
  summary: "댓글 목록 조회",
  description:
    "커서 기반 페이지네이션으로 게시글의 댓글 목록을 조회합니다. " +
    "nextCursor가 null이면 마지막 페이지입니다. " +
    "parentId를 생략하면 일반 댓글과 대댓글이 함께 반환됩니다. " +
    "parentId=null이면 최상위 댓글만, parentId=부모댓글ID이면 해당 댓글의 대댓글만 조회합니다(무한 스크롤 분리용).",
  request: {
    params: TeamIdParamSchema.extend(PostIdParamSchema.shape),
    query: CommentListQuerySchema,
  },
  responses: {
    200: {
      description: "댓글 목록",
      content: {
        "application/json": {
          schema: CommentListResponseSchema,
          example: {
            comments: [
              {
                id: 10,
                teamId: "team-abc",
                userId: 2,
                postId: 5,
                parentId: null,
                content: "좋은 글이네요!",
                likeCount: 2,
                replyCount: 1,
                isLiked: false,
                createdAt: "2026-02-16T10:00:00.000Z",
                updatedAt: "2026-02-16T10:00:00.000Z",
                writer: { id: 2, name: "김철수", image: null },
              },
            ],
            nextCursor: "eyJ2IjoxLCJ0IjoiY29tbWVudCIsImlkIjo5fQ",
            totalCount: 8,
          },
        },
      },
    },
    400: {
      description: "잘못된 커서 또는 요청 파라미터",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "인증 필요",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "게시글 없음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

posts.openapi(listCommentsRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { postId } = c.req.valid("param");
  const { cursor, limit, parentId } = c.req.valid("query");
  const parentIdFilter =
    parentId === undefined ? undefined : parentId === "null" ? ("root" as const) : parentId;
  const result = await postsService.listComments(teamId, postId, userId, cursor, limit, parentIdFilter);
  return c.json(result, 200);
});

// POST /{teamId}/posts/{postId}/comments
const createCommentRoute = createRoute({
  method: "post",
  path: "/{postId}/comments",
  tags: ["Comments"],
  summary: "댓글 생성",
  description: "게시글에 댓글 또는 대댓글을 작성합니다. parentId를 주면 해당 댓글의 대댓글로 생성됩니다.",
  request: {
    params: TeamIdParamSchema.extend(PostIdParamSchema.shape),
    body: {
      content: {
        "application/json": {
          schema: CreateCommentBodySchema,
          example: {
            content: "좋은 글이네요!",
            parentId: 10,
          },
        },
      },
    },
  },
  responses: {
    201: {
      description: "댓글 생성 성공",
      content: {
        "application/json": {
          schema: CommentSchema,
          example: {
            id: 10,
            teamId: "team-abc",
            userId: 2,
            postId: 5,
            parentId: null,
            content: "좋은 글이네요!",
            likeCount: 0,
            replyCount: 0,
            isLiked: false,
            createdAt: "2026-02-16T10:00:00.000Z",
            updatedAt: "2026-02-16T10:00:00.000Z",
            writer: { id: 2, name: "김철수", image: null },
          },
        },
      },
    },
    400: {
      description: "요청 데이터가 유효하지 않음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "인증 필요",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "게시글 없음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

posts.openapi(createCommentRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { postId } = c.req.valid("param");
  const body = c.req.valid("json");
  const result = await postsService.createComment(teamId, postId, userId, body);
  return c.json(result, 201);
});

// PATCH /{teamId}/posts/{postId}/comments/{commentId}
const updateCommentRoute = createRoute({
  method: "patch",
  path: "/{postId}/comments/{commentId}",
  tags: ["Comments"],
  summary: "댓글 수정",
  description: "댓글 내용을 수정합니다. 본인 작성 댓글만 수정할 수 있습니다.",
  request: {
    params: TeamIdParamSchema.extend(PostIdParamSchema.shape).extend(
      CommentIdParamSchema.shape,
    ),
    body: {
      content: {
        "application/json": {
          schema: UpdateCommentBodySchema,
          example: {
            content: "수정된 댓글입니다.",
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "댓글 수정 성공",
      content: {
        "application/json": {
          schema: CommentSchema,
          example: {
            id: 10,
            teamId: "team-abc",
            userId: 2,
            postId: 5,
            parentId: null,
            content: "수정된 댓글입니다.",
            likeCount: 1,
            replyCount: 2,
            isLiked: true,
            createdAt: "2026-02-16T10:00:00.000Z",
            updatedAt: "2026-02-16T11:00:00.000Z",
            writer: { id: 2, name: "김철수", image: null },
          },
        },
      },
    },
    400: {
      description: "요청 데이터가 유효하지 않음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "인증 필요",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    403: {
      description: "권한 없음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "댓글 없음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

posts.openapi(updateCommentRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { postId, commentId } = c.req.valid("param");
  const body = c.req.valid("json");
  const result = await postsService.updateComment(teamId, postId, commentId, userId, body);
  return c.json(result, 200);
});

// DELETE /{teamId}/posts/{postId}/comments/{commentId}
const deleteCommentRoute = createRoute({
  method: "delete",
  path: "/{postId}/comments/{commentId}",
  tags: ["Comments"],
  summary: "댓글 삭제",
  description: "댓글을 삭제합니다. 본인 작성 댓글만 삭제할 수 있습니다.",
  request: {
    params: TeamIdParamSchema.extend(PostIdParamSchema.shape).extend(
      CommentIdParamSchema.shape,
    ),
  },
  responses: {
    204: {
      description: "댓글 삭제 성공 — 응답 body 없음",
    },
    401: {
      description: "인증 필요",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    403: {
      description: "권한 없음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "댓글 없음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

posts.openapi(deleteCommentRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { postId, commentId } = c.req.valid("param");
  await postsService.deleteComment(teamId, postId, commentId, userId);
  return c.body(null, 204);
});

// POST /{teamId}/posts/{postId}/comments/{commentId}/likes
const addCommentLikeRoute = createRoute({
  method: "post",
  path: "/{postId}/comments/{commentId}/likes",
  tags: ["Comments"],
  summary: "댓글 좋아요",
  description: "댓글에 좋아요를 추가합니다. 이미 좋아요한 경우 멱등적으로 현재 상태를 반환합니다.",
  request: {
    params: TeamIdParamSchema.extend(PostIdParamSchema.shape).extend(
      CommentIdParamSchema.shape,
    ),
  },
  responses: {
    200: {
      description: "댓글 좋아요 상태",
      content: {
        "application/json": {
          schema: CommentLikeResponseSchema,
          example: { isLiked: true, likeCount: 3 },
        },
      },
    },
    401: {
      description: "인증 필요",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "댓글 없음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

posts.openapi(addCommentLikeRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { postId, commentId } = c.req.valid("param");
  const result = await postsService.addCommentLike(teamId, postId, commentId, userId);
  return c.json(result, 200);
});

// DELETE /{teamId}/posts/{postId}/comments/{commentId}/likes
const removeCommentLikeRoute = createRoute({
  method: "delete",
  path: "/{postId}/comments/{commentId}/likes",
  tags: ["Comments"],
  summary: "댓글 좋아요 취소",
  description:
    "댓글 좋아요를 취소합니다. 좋아요가 없어도 성공으로 처리하며, 현재 좋아요 수와 사용자 좋아요 여부를 반환합니다.",
  request: {
    params: TeamIdParamSchema.extend(PostIdParamSchema.shape).extend(
      CommentIdParamSchema.shape,
    ),
  },
  responses: {
    200: {
      description: "좋아요 취소 후 상태",
      content: {
        "application/json": {
          schema: CommentLikeResponseSchema,
          example: { isLiked: false, likeCount: 0 },
        },
      },
    },
    401: {
      description: "인증 필요",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "댓글 없음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

posts.openapi(removeCommentLikeRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { postId, commentId } = c.req.valid("param");
  const result = await postsService.removeCommentLike(teamId, postId, commentId, userId);
  return c.json(result, 200);
});
