import { z } from "zod";

export const TodoIdParamSchema = z.object({
  todoId: z.coerce.number().int().positive().describe("할 일 ID"),
});

export const TodoListQuerySchema = z.object({
  cursor: z.coerce.number().int().positive().optional().describe("이전 응답의 nextCursor 값"),
  limit: z.coerce.number().int().min(1).max(100).default(10).describe("한 페이지에 가져올 항목 수 (1-100, 기본값 10)"),
  goalId: z.coerce.number().int().positive().optional().describe("특정 목표의 할 일만 필터링"),
  sort: z
    .enum(["latest", "dueSoon"])
    .default("latest")
    .describe('정렬 기준 ("latest" | "dueSoon", 기본값 "latest")'),
  done: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional()
    .describe('완료 여부 필터 ("true" 또는 "false")'),
  keyword: z.string().trim().min(1).max(100).optional().describe("제목 키워드 검색 (부분 일치)"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional()
    .describe("특정 날짜(KST)의 마감 할 일만 필터링 (YYYY-MM-DD). from/to보다 우선합니다."),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional()
    .describe("마감일 범위 시작(KST, 해당일 포함, YYYY-MM-DD)"),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional()
    .describe("마감일 범위 끝(KST, 해당일 포함, YYYY-MM-DD)"),
});

export const CreateTodoBodySchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100).describe("할 일 제목 (1-100자)"),
  goalId: z.number().int().positive().optional().describe("연결할 목표 ID (본인 소유 목표만 가능)"),
  fileUrl: z.url().optional().describe("첨부 파일 URL"),
  linkUrl: z.url().optional().describe("참고 링크 URL"),
  dueDate: z.iso.datetime().optional().describe("마감기한 (ISO 8601)"),
  tags: z.array(z.string().trim().min(1).max(50)).max(10).optional().describe("태그 이름 목록 (최대 10개, 각 최대 50자)"),
});

export const UpdateTodoBodySchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(100).optional().describe("할 일 제목 (1-100자)"),
    done: z.boolean().optional().describe("완료 여부"),
    goalId: z.number().int().positive().nullable().optional().describe("연결할 목표 ID (본인 소유 목표만 가능)"),
    fileUrl: z.url().nullable().optional().describe("첨부 파일 URL"),
    linkUrl: z.url().nullable().optional().describe("참고 링크 URL"),
    dueDate: z.iso.datetime().nullable().optional().describe("마감기한 (ISO 8601, null로 해제)"),
    tags: z.array(z.string().trim().min(1).max(50)).max(10).optional().describe("태그 이름 목록 (전체 교체)"),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

const TagSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const TodoSchema = z.object({
  id: z.number(),
  teamId: z.string(),
  userId: z.number(),
  goalId: z.number().nullable(),
  title: z.string().describe("할 일 제목 (1-100자)"),
  done: z.boolean().describe("완료 여부"),
  fileUrl: z.string().nullable().describe("첨부 파일 URL"),
  linkUrl: z.string().nullable().describe("참고 링크 URL"),
  dueDate: z.iso.datetime().nullable().describe("마감기한"),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const GoalSummarySchema = z.object({
  id: z.number(),
  title: z.string(),
});

export const TodoListItemSchema = TodoSchema.extend({
  goal: GoalSummarySchema.nullable(),
  noteIds: z.array(z.number()).describe("연결된 노트 ID 목록"),
  tags: z.array(TagSchema).describe("태그 목록"),
  isFavorite: z.boolean().describe("현재 사용자의 찜 여부"),
});

export const TodoDetailResponseSchema = TodoListItemSchema;

export const TodoListResponseSchema = z.object({
  todos: z.array(TodoListItemSchema),
  nextCursor: z.number().nullable().describe("다음 페이지 커서 (null이면 마지막 페이지)"),
  totalCount: z.number().describe("전체 항목 수"),
});
