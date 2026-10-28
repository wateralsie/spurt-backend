import { z } from "zod";

export const ErrorResponseSchema = z.object({
  message: z.string().describe("에러 상세 메시지"),
  code: z.string().describe("에러 코드 (예: NOT_FOUND, FORBIDDEN)"),
});

export const TeamIdParamSchema = z.object({
  teamId: z.string().min(1).describe("팀 고유 식별자"),
});

export const CursorPaginationSchema = z.object({
  cursor: z.coerce.number().int().positive().optional().describe("이전 응답의 nextCursor 값"),
  limit: z.coerce.number().int().min(1).max(100).default(10).describe("한 페이지에 가져올 항목 수 (1-100, 기본값 10)"),
});
