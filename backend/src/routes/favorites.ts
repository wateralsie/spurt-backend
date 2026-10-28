import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { authMiddleware } from "../middlewares/auth.js";
import { TeamIdParamSchema, ErrorResponseSchema } from "../schemas/common.js";
import { TodoIdParamSchema } from "../schemas/todos.js";
import {
  FavoriteListQuerySchema,
  FavoriteWithTodoSchema,
  FavoriteListResponseSchema,
} from "../schemas/favorites.js";
import * as favoritesService from "../services/favorites.service.js";

type Env = { Variables: { userId: number; teamId: string } };

export const favorites = new OpenAPIHono<Env>();

favorites.use("*", authMiddleware);

// POST /{teamId}/todos/{todoId}/favorites
const addRoute = createRoute({
  method: "post",
  path: "/{todoId}/favorites",
  tags: ["Favorites"],
  summary: "할 일 찜하기",
  description:
    "할 일을 찜합니다. 본인 소유의 할 일만 찜할 수 있습니다. " +
    "이미 찜한 할 일을 다시 찜하면 409 에러가 반환됩니다.",
  request: {
    params: TeamIdParamSchema.extend(TodoIdParamSchema.shape),
  },
  responses: {
    201: {
      description: "찜하기 성공",
      content: {
        "application/json": {
          schema: FavoriteWithTodoSchema,
          example: {
            id: 1,
            teamId: "team-abc",
            userId: 1,
            todoId: 5,
            createdAt: "2026-02-16T09:00:00.000Z",
            todo: {
              id: 5,
              teamId: "team-abc",
              userId: 1,
              goalId: 1,
              title: "API 문서 작성",
              done: false,
              fileUrl: null,
              linkUrl: "https://hono.dev/docs",
              dueDate: "2026-02-20T00:00:00.000Z",
              createdAt: "2026-02-16T09:00:00.000Z",
              updatedAt: "2026-02-16T09:00:00.000Z",
              goal: { id: 1, title: "프로젝트 완성" },
              noteIds: [10, 11],
              tags: [{ id: 1, name: "문서" }],
              isFavorite: true,
            },
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
      description: "할 일 권한 없음 — 본인 소유의 할 일이 아님",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "할 일 없음 — todoId에 해당하는 할 일이 존재하지 않음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    409: {
      description: "중복 — 이미 찜한 할 일",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

favorites.openapi(addRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { todoId } = c.req.valid("param");
  const result = await favoritesService.addFavorite(teamId, userId, todoId);
  return c.json(result, 201);
});

// DELETE /{teamId}/todos/{todoId}/favorites
const removeRoute = createRoute({
  method: "delete",
  path: "/{todoId}/favorites",
  tags: ["Favorites"],
  summary: "찜 해제",
  description: "할 일의 찜을 해제합니다.",
  request: {
    params: TeamIdParamSchema.extend(TodoIdParamSchema.shape),
  },
  responses: {
    204: {
      description: "찜 해제 성공 — 응답 body 없음",
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
      description: "찜 없음 — 해당 할 일을 찜하지 않았음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

favorites.openapi(removeRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { todoId } = c.req.valid("param");
  await favoritesService.removeFavorite(teamId, userId, todoId);
  return c.body(null, 204);
});

// GET /{teamId}/todos/favorites
const listRoute = createRoute({
  method: "get",
  path: "/favorites",
  tags: ["Favorites"],
  summary: "찜한 할 일 목록 조회",
  description:
    "커서 기반 페이지네이션으로 찜한 할 일 목록을 조회합니다. " +
    "각 항목에 연결된 할 일(todo)과 목표(goal) 정보가 포함됩니다. " +
    "nextCursor가 null이면 마지막 페이지입니다.",
  request: {
    params: TeamIdParamSchema,
    query: FavoriteListQuerySchema,
  },
  responses: {
    200: {
      description: "찜한 할 일 목록",
      content: {
        "application/json": {
          schema: FavoriteListResponseSchema,
          example: {
            favorites: [
              {
                id: 3,
                teamId: "team-abc",
                userId: 1,
                todoId: 5,
                createdAt: "2026-02-16T09:00:00.000Z",
                todo: {
                  id: 5,
                  teamId: "team-abc",
                  userId: 1,
                  goalId: 1,
                  title: "API 문서 작성",
                  done: false,
                  fileUrl: null,
                  linkUrl: "https://hono.dev/docs",
                  dueDate: "2026-02-20T00:00:00.000Z",
                  createdAt: "2026-02-16T09:00:00.000Z",
                  updatedAt: "2026-02-16T09:00:00.000Z",
                  goal: { id: 1, title: "프로젝트 완성" },
                  noteIds: [10, 11],
                  tags: [{ id: 1, name: "문서" }],
                  isFavorite: true,
                },
              },
            ],
            nextCursor: 2,
            totalCount: 8,
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

favorites.openapi(listRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { cursor, limit } = c.req.valid("query");
  const result = await favoritesService.listFavorites(teamId, userId, cursor, limit);
  return c.json(result, 200);
});
