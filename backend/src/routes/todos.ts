import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { authMiddleware } from "../middlewares/auth.js";
import { TeamIdParamSchema, ErrorResponseSchema } from "../schemas/common.js";
import {
  TodoIdParamSchema,
  TodoListQuerySchema,
  CreateTodoBodySchema,
  UpdateTodoBodySchema,
  TodoListResponseSchema,
  TodoDetailResponseSchema,
} from "../schemas/todos.js";
import * as todosService from "../services/todos.service.js";

type Env = { Variables: { userId: number; teamId: string } };

export const todos = new OpenAPIHono<Env>();

todos.use("*", authMiddleware);

// GET /{teamId}/todos
const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Todos"],
  summary: "할 일 목록 조회",
  description:
    "커서 기반 페이지네이션으로 할 일 목록을 조회합니다. " +
    "goalId로 특정 목표의 할 일만, done으로 완료/미완료를 필터링할 수 있습니다. " +
    "date로 특정 날짜(KST), from/to로 마감일 범위(KST)를 필터링할 수 있습니다. " +
    "sort로 최신순(latest) 또는 마감일 임박순(dueSoon) 정렬을 선택할 수 있습니다. " +
    "nextCursor가 null이면 마지막 페이지입니다.",
  request: {
    params: TeamIdParamSchema,
    query: TodoListQuerySchema,
  },
  responses: {
    200: {
      description: "할 일 목록",
      content: {
        "application/json": {
          schema: TodoListResponseSchema,
          example: {
            todos: [
              {
                id: 12,
                teamId: "team-abc",
                userId: 1,
                goalId: 3,
                title: "API 문서 작성",
                done: false,
                fileUrl: null,
                linkUrl: "https://docs.example.com",
                dueDate: "2026-02-20T00:00:00.000Z",
                createdAt: "2026-02-16T09:00:00.000Z",
                updatedAt: "2026-02-16T09:00:00.000Z",
                goal: { id: 3, title: "프로젝트 완성" },
                noteIds: [5],
                tags: [{ id: 1, name: "urgent" }],
                isFavorite: false,
              },
            ],
            nextCursor: 11,
            totalCount: 25,
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

todos.openapi(listRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { cursor, limit, goalId, sort, done, keyword, date, from, to } = c.req.valid("query");
  const result = await todosService.listTodos(teamId, userId, cursor, limit, goalId, done, keyword, sort, date, from, to);
  return c.json(result, 200);
});

// GET /{teamId}/todos/{todoId}
const getRoute = createRoute({
  method: "get",
  path: "/{todoId}",
  tags: ["Todos"],
  summary: "할 일 상세 조회",
  description:
    "할 일의 상세 정보를 조회합니다. " +
    "연결된 목표(goal)와 노트 ID 목록(noteIds)이 포함됩니다.",
  request: {
    params: TeamIdParamSchema.extend(TodoIdParamSchema.shape),
  },
  responses: {
    200: {
      description: "할 일 상세",
      content: {
        "application/json": {
          schema: TodoDetailResponseSchema,
          example: {
            id: 12,
            teamId: "team-abc",
            userId: 1,
            goalId: 3,
            title: "API 문서 작성",
            done: false,
            fileUrl: null,
            linkUrl: "https://docs.example.com",
            dueDate: "2026-02-20T00:00:00.000Z",
            createdAt: "2026-02-16T09:00:00.000Z",
            updatedAt: "2026-02-16T09:00:00.000Z",
            goal: { id: 3, title: "프로젝트 완성" },
            noteIds: [5],
            tags: [{ id: 1, name: "urgent" }],
                isFavorite: false,
          },
        },
      },
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
      description: "할 일 없음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

todos.openapi(getRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { todoId } = c.req.valid("param");
  const result = await todosService.getTodo(teamId, todoId, userId);
  return c.json(result, 200);
});

// POST /{teamId}/todos
const createTodoRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Todos"],
  summary: "할 일 생성",
  description:
    "새 할 일을 생성합니다. title만 필수이며, " +
    "goalId를 지정하면 해당 목표에 연결됩니다 (본인 소유 목표만 가능).",
  request: {
    params: TeamIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: CreateTodoBodySchema,
          example: {
            title: "API 문서 작성",
            goalId: 3,
            linkUrl: "https://docs.example.com",
            dueDate: "2026-02-20T00:00:00.000Z",
            tags: ["urgent", "docs"],
          },
        },
      },
    },
  },
  responses: {
    201: {
      description: "할 일 생성 성공",
      content: {
        "application/json": {
          schema: TodoDetailResponseSchema,
          example: {
            id: 12,
            teamId: "team-abc",
            userId: 1,
            goalId: 3,
            title: "API 문서 작성",
            done: false,
            fileUrl: null,
            linkUrl: "https://docs.example.com",
            createdAt: "2026-02-16T09:00:00.000Z",
            updatedAt: "2026-02-16T09:00:00.000Z",
            goal: { id: 3, title: "프로젝트 완성" },
            noteIds: [],
            tags: [],
            isFavorite: false,
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
      description: "목표 권한 없음 — goalId에 지정한 목표가 본인 소유가 아님",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "목표 없음 — goalId에 해당하는 목표가 존재하지 않음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

todos.openapi(createTodoRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const body = c.req.valid("json");
  const result = await todosService.createTodo(teamId, userId, body);
  return c.json(result, 201);
});

// PATCH /{teamId}/todos/{todoId}
const updateRoute = createRoute({
  method: "patch",
  path: "/{todoId}",
  tags: ["Todos"],
  summary: "할 일 수정",
  description:
    "할 일을 부분 수정합니다. 최소 1개 필드를 보내야 합니다. " +
    "goalId/fileUrl/linkUrl에 null을 보내면 연결을 해제하고, " +
    "필드를 아예 보내지 않으면 기존 값이 유지됩니다.",
  request: {
    params: TeamIdParamSchema.extend(TodoIdParamSchema.shape),
    body: {
      content: {
        "application/json": {
          schema: UpdateTodoBodySchema,
          example: {
            done: true,
            goalId: null,
            tags: ["completed"],
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "할 일 수정 성공",
      content: {
        "application/json": {
          schema: TodoDetailResponseSchema,
          example: {
            id: 12,
            teamId: "team-abc",
            userId: 1,
            goalId: null,
            title: "API 문서 작성",
            done: true,
            fileUrl: null,
            linkUrl: "https://docs.example.com",
            dueDate: "2026-02-20T00:00:00.000Z",
            createdAt: "2026-02-16T09:00:00.000Z",
            updatedAt: "2026-02-16T10:30:00.000Z",
            goal: null,
            noteIds: [5],
            tags: [{ id: 2, name: "completed" }],
            isFavorite: true,
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
      description: "할 일 또는 목표 없음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

todos.openapi(updateRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { todoId } = c.req.valid("param");
  const body = c.req.valid("json");
  const result = await todosService.updateTodo(teamId, todoId, userId, body);
  return c.json(result, 200);
});

// DELETE /{teamId}/todos/{todoId}
const deleteRoute = createRoute({
  method: "delete",
  path: "/{todoId}",
  tags: ["Todos"],
  summary: "할 일 삭제",
  description:
    "할 일을 삭제합니다. 연결된 노트와 찜하기도 함께 삭제됩니다 (cascade).",
  request: {
    params: TeamIdParamSchema.extend(TodoIdParamSchema.shape),
  },
  responses: {
    204: {
      description: "할 일 삭제 성공 — 응답 body 없음",
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
      description: "할 일 없음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

todos.openapi(deleteRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { todoId } = c.req.valid("param");
  await todosService.deleteTodo(teamId, todoId, userId);
  return c.body(null, 204);
});
