import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { authMiddleware } from "../middlewares/auth.js";
import {
  TeamIdParamSchema,
  ErrorResponseSchema,
  CursorPaginationSchema,
} from "../schemas/common.js";
import {
  GoalIdParamSchema,
  CreateGoalBodySchema,
  UpdateGoalBodySchema,
  GoalSchema,
  GoalListResponseSchema,
  GoalDetailResponseSchema,
} from "../schemas/goals.js";
import * as goalsService from "../services/goals.service.js";

type Env = { Variables: { userId: number; teamId: string } };

export const goals = new OpenAPIHono<Env>();

goals.use("*", authMiddleware);

// GET /{teamId}/goals
const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Goals"],
  summary: "목표 목록 조회",
  description:
    "커서 기반 페이지네이션으로 본인의 목표 목록을 조회합니다. " +
    "각 목표에 todoCount(전체 할 일 수)와 completedCount(완료 수)가 포함됩니다. " +
    "nextCursor가 null이면 마지막 페이지입니다.",
  request: {
    params: TeamIdParamSchema,
    query: CursorPaginationSchema,
  },
  responses: {
    200: {
      description: "목표 목록",
      content: {
        "application/json": {
          schema: GoalListResponseSchema,
          example: {
            goals: [
              {
                id: 3,
                teamId: "team-abc",
                userId: 1,
                title: "프로젝트 완성",
                todoCount: 5,
                completedCount: 2,
                createdAt: "2026-02-15T09:00:00.000Z",
                updatedAt: "2026-02-15T09:00:00.000Z",
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

goals.openapi(listRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { cursor, limit } = c.req.valid("query");
  const result = await goalsService.listGoals(teamId, userId, cursor, limit);
  return c.json(result, 200);
});

// GET /{teamId}/goals/{goalId}
const getRoute = createRoute({
  method: "get",
  path: "/{goalId}",
  tags: ["Goals"],
  summary: "목표 상세 조회",
  description:
    "목표 상세 정보를 조회합니다. " +
    "해당 목표에 속한 할 일 목록(todos)이 함께 포함됩니다.",
  request: {
    params: TeamIdParamSchema.extend(GoalIdParamSchema.shape),
  },
  responses: {
    200: {
      description: "목표 상세",
      content: {
        "application/json": {
          schema: GoalDetailResponseSchema,
          example: {
            id: 3,
            teamId: "team-abc",
            userId: 1,
            title: "프로젝트 완성",
            createdAt: "2026-02-15T09:00:00.000Z",
            updatedAt: "2026-02-15T09:00:00.000Z",
            todos: [
              {
                id: 12,
                title: "API 문서 작성",
                done: false,
                createdAt: "2026-02-16T09:00:00.000Z",
                updatedAt: "2026-02-16T09:00:00.000Z",
              },
            ],
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
      description: "목표 없음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

goals.openapi(getRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { goalId } = c.req.valid("param");
  const result = await goalsService.getGoal(teamId, goalId, userId);
  return c.json(result, 200);
});

// POST /{teamId}/goals
const createGoalRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Goals"],
  summary: "목표 생성",
  description: "새 목표를 생성합니다. title은 1~100자입니다.",
  request: {
    params: TeamIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: CreateGoalBodySchema,
          example: {
            title: "프로젝트 완성",
          },
        },
      },
    },
  },
  responses: {
    201: {
      description: "목표 생성 성공",
      content: {
        "application/json": {
          schema: GoalSchema,
          example: {
            id: 3,
            teamId: "team-abc",
            userId: 1,
            title: "프로젝트 완성",
            createdAt: "2026-02-15T09:00:00.000Z",
            updatedAt: "2026-02-15T09:00:00.000Z",
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

goals.openapi(createGoalRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { title } = c.req.valid("json");
  const result = await goalsService.createGoal(teamId, userId, title);
  return c.json(result, 201);
});

// PATCH /{teamId}/goals/{goalId}
const updateRoute = createRoute({
  method: "patch",
  path: "/{goalId}",
  tags: ["Goals"],
  summary: "목표 수정",
  description: "목표 제목을 수정합니다. 본인 소유 목표만 수정 가능합니다.",
  request: {
    params: TeamIdParamSchema.extend(GoalIdParamSchema.shape),
    body: {
      content: {
        "application/json": {
          schema: UpdateGoalBodySchema,
          example: {
            title: "프로젝트 완성하기",
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "목표 수정 성공",
      content: {
        "application/json": {
          schema: GoalSchema,
          example: {
            id: 3,
            teamId: "team-abc",
            userId: 1,
            title: "프로젝트 완성하기",
            createdAt: "2026-02-15T09:00:00.000Z",
            updatedAt: "2026-02-15T10:30:00.000Z",
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
      description: "목표 없음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

goals.openapi(updateRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { goalId } = c.req.valid("param");
  const body = c.req.valid("json");
  const result = await goalsService.updateGoal(teamId, goalId, userId, body);
  return c.json(result, 200);
});

// DELETE /{teamId}/goals/{goalId}
const deleteRoute = createRoute({
  method: "delete",
  path: "/{goalId}",
  tags: ["Goals"],
  summary: "목표 삭제",
  description:
    "목표를 삭제합니다. " +
    "연결된 할 일의 goalId가 null로 변경됩니다 (할 일 자체는 삭제되지 않음).",
  request: {
    params: TeamIdParamSchema.extend(GoalIdParamSchema.shape),
  },
  responses: {
    204: {
      description: "목표 삭제 성공",
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
      description: "목표 없음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

goals.openapi(deleteRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { goalId } = c.req.valid("param");
  await goalsService.deleteGoal(teamId, goalId, userId);
  return c.body(null, 204);
});
