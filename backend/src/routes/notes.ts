import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { authMiddleware } from "../middlewares/auth.js";
import { TeamIdParamSchema, ErrorResponseSchema } from "../schemas/common.js";
import {
  NoteIdParamSchema,
  NoteListQuerySchema,
  CreateNoteBodySchema,
  UpdateNoteBodySchema,
  NoteDetailSchema,
  NoteListResponseSchema,
} from "../schemas/notes.js";
import * as notesService from "../services/notes.service.js";

type Env = { Variables: { userId: number; teamId: string } };

export const notes = new OpenAPIHono<Env>();

notes.use("*", authMiddleware);

// GET /{teamId}/notes
const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Notes"],
  summary: "노트 목록 조회",
  description:
    "커서 기반 페이지네이션으로 노트 목록을 조회합니다. " +
    "todoId/goalId로 필터링할 수 있고, " +
    "search로 제목 부분 검색이 가능하며, " +
    "sort로 최신순(latest) 또는 오래된 순(oldest) 정렬을 선택할 수 있습니다. " +
    "nextCursor가 null이면 마지막 페이지입니다.",
  request: {
    params: TeamIdParamSchema,
    query: NoteListQuerySchema,
  },
  responses: {
    200: {
      description: "노트 목록",
      content: {
        "application/json": {
          schema: NoteListResponseSchema,
          example: {
            notes: [
              {
                id: 7,
                teamId: "team-abc",
                userId: 1,
                todoId: 12,
                title: "API 설계 메모",
                content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "RESTful 원칙에 따라 설계할 것" }] }] },
                linkUrl: "https://docs.example.com",
                createdAt: "2026-02-16T09:00:00.000Z",
                updatedAt: "2026-02-16T09:00:00.000Z",
                todo: { id: 12, title: "API 문서 작성", done: false },
              },
            ],
            nextCursor: 6,
            totalCount: 15,
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

notes.openapi(listRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { cursor, limit, todoId, goalId, search, sort } = c.req.valid("query");
  const result = await notesService.listNotes(teamId, userId, cursor, limit, todoId, goalId, search, sort);
  return c.json(result, 200);
});

// GET /{teamId}/notes/{noteId}
const getRoute = createRoute({
  method: "get",
  path: "/{noteId}",
  tags: ["Notes"],
  summary: "노트 상세 조회",
  description:
    "노트의 상세 정보를 조회합니다. " +
    "연결된 할 일(todo)의 생성일/목표(goal)/태그(tags) 정보가 포함됩니다.",
  request: {
    params: TeamIdParamSchema.extend(NoteIdParamSchema.shape),
  },
  responses: {
    200: {
      description: "노트 상세",
      content: {
        "application/json": {
          schema: NoteDetailSchema,
          example: {
            id: 7,
            teamId: "team-abc",
            userId: 1,
            todoId: 12,
            title: "API 설계 메모",
            content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "RESTful 원칙에 따라 설계할 것" }] }] },
            linkUrl: "https://docs.example.com",
            createdAt: "2026-02-16T09:00:00.000Z",
            updatedAt: "2026-02-16T09:00:00.000Z",
            todo: {
              id: 12,
              title: "API 문서 작성",
              done: false,
              createdAt: "2026-02-15T12:00:00.000Z",
              goal: { id: 3, title: "백엔드 품질 개선" },
              tags: [
                { id: 1, name: "backend" },
                { id: 2, name: "urgent" },
              ],
            },
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
      description: "노트 없음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

notes.openapi(getRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { noteId } = c.req.valid("param");
  const result = await notesService.getNote(teamId, noteId, userId);
  return c.json(result, 200);
});

// POST /{teamId}/notes
const createNoteRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Notes"],
  summary: "노트 생성",
  description:
    "새 노트를 생성합니다. todoId와 title이 필수입니다. " +
    "하나의 할 일에 여러 노트를 연결할 수 있습니다 (1:N).",
  request: {
    params: TeamIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: CreateNoteBodySchema,
          example: {
            todoId: 12,
            title: "API 설계 메모",
            content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "RESTful 원칙에 따라 설계할 것" }] }] },
            linkUrl: "https://docs.example.com",
          },
        },
      },
    },
  },
  responses: {
    201: {
      description: "노트 생성 성공",
      content: {
        "application/json": {
          schema: NoteDetailSchema,
          example: {
            id: 7,
            teamId: "team-abc",
            userId: 1,
            todoId: 12,
            title: "API 설계 메모",
            content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "RESTful 원칙에 따라 설계할 것" }] }] },
            linkUrl: "https://docs.example.com",
            createdAt: "2026-02-16T09:00:00.000Z",
            updatedAt: "2026-02-16T09:00:00.000Z",
            todo: { id: 12, title: "API 문서 작성", done: false },
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
      description: "할 일 권한 없음 — todoId에 지정한 할 일이 본인 소유가 아님",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "할 일 없음 — todoId에 해당하는 할 일이 존재하지 않음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

notes.openapi(createNoteRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const body = c.req.valid("json");
  const result = await notesService.createNote(teamId, userId, body);
  return c.json(result, 201);
});

// PATCH /{teamId}/notes/{noteId}
const updateRoute = createRoute({
  method: "patch",
  path: "/{noteId}",
  tags: ["Notes"],
  summary: "노트 수정",
  description:
    "노트를 부분 수정합니다. 최소 1개 필드를 보내야 합니다. " +
    "content/linkUrl에 null을 보내면 값을 제거하고, " +
    "필드를 아예 보내지 않으면 기존 값이 유지됩니다. " +
    "todoId는 변경할 수 없습니다.",
  request: {
    params: TeamIdParamSchema.extend(NoteIdParamSchema.shape),
    body: {
      content: {
        "application/json": {
          schema: UpdateNoteBodySchema,
          example: {
            title: "수정된 메모 제목",
            content: null,
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "노트 수정 성공",
      content: {
        "application/json": {
          schema: NoteDetailSchema,
          example: {
            id: 7,
            teamId: "team-abc",
            userId: 1,
            todoId: 12,
            title: "수정된 메모 제목",
            content: null,
            linkUrl: "https://docs.example.com",
            createdAt: "2026-02-16T09:00:00.000Z",
            updatedAt: "2026-02-16T10:30:00.000Z",
            todo: { id: 12, title: "API 문서 작성", done: false },
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
      description: "노트 없음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

notes.openapi(updateRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { noteId } = c.req.valid("param");
  const body = c.req.valid("json");
  const result = await notesService.updateNote(teamId, noteId, userId, body);
  return c.json(result, 200);
});

// DELETE /{teamId}/notes/{noteId}
const deleteRoute = createRoute({
  method: "delete",
  path: "/{noteId}",
  tags: ["Notes"],
  summary: "노트 삭제",
  description: "노트를 삭제합니다.",
  request: {
    params: TeamIdParamSchema.extend(NoteIdParamSchema.shape),
  },
  responses: {
    204: {
      description: "노트 삭제 성공 — 응답 body 없음",
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
      description: "노트 없음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

notes.openapi(deleteRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { noteId } = c.req.valid("param");
  await notesService.deleteNote(teamId, noteId, userId);
  return c.body(null, 204);
});
