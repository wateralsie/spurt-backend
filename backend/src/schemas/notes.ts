import { z } from "zod";

export const NoteIdParamSchema = z.object({
  noteId: z.coerce.number().int().positive().describe("노트 ID"),
});

export const NoteListQuerySchema = z.object({
  cursor: z.coerce.number().int().positive().optional().describe("이전 응답의 nextCursor 값"),
  limit: z.coerce.number().int().min(1).max(100).default(10).describe("한 페이지에 가져올 항목 수 (1-100, 기본값 10)"),
  todoId: z.coerce.number().int().positive().optional().describe("특정 할 일의 노트만 필터링"),
  goalId: z.coerce.number().int().positive().optional().describe("특정 목표의 노트만 필터링 (목표에 속한 할 일의 노트)"),
  search: z
    .string()
    .max(200)
    .optional()
    .describe("노트 제목 부분 일치 검색 (대소문자 무시, 생략 시 필터 없음)")
    .transform((s) => (s === undefined ? undefined : s.trim() || undefined)),
  sort: z
    .enum(["latest", "oldest"])
    .default("latest")
    .describe('정렬 기준 ("latest" | "oldest", 기본값 "latest")'),
});

export const CreateNoteBodySchema = z.object({
  todoId: z.number().int().positive().describe("연결할 할 일 ID"),
  title: z.string().trim().min(1, "Title is required").max(100).describe("노트 제목 (1-100자)"),
  content: z.record(z.string(), z.any()).optional().describe("노트 본문 (JSON 객체)"),
  linkUrl: z.url().optional().describe("참고 링크 URL"),
});

export const UpdateNoteBodySchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(100).optional().describe("노트 제목 (1-100자)"),
    content: z.record(z.string(), z.any()).nullable().optional().describe("노트 본문 (JSON 객체)"),
    linkUrl: z.url().nullable().optional().describe("참고 링크 URL"),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const NoteSchema = z.object({
  id: z.number(),
  teamId: z.string(),
  userId: z.number(),
  todoId: z.number(),
  title: z.string().describe("노트 제목 (1-100자)"),
  content: z.any().nullable().describe("노트 본문 (JSON 객체)"),
  linkUrl: z.string().nullable().describe("참고 링크 URL"),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const TodoSummarySchema = z.object({
  id: z.number(),
  title: z.string(),
  done: z.boolean(),
});

const GoalSummarySchema = z.object({
  id: z.number(),
  title: z.string(),
});

const TagSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const NoteDetailSchema = NoteSchema.extend({
  todo: TodoSummarySchema.extend({
    createdAt: z.iso.datetime().optional(),
    goal: GoalSummarySchema.nullable().optional(),
    tags: z.array(TagSchema).optional(),
  }),
});

export const NoteListResponseSchema = z.object({
  notes: z.array(NoteDetailSchema),
  nextCursor: z.number().nullable(),
  totalCount: z.number(),
});
