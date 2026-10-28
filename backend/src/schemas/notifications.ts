import { z } from "zod";

export const NotificationIdParamSchema = z.object({
  notificationId: z.coerce.number().int().positive().describe("알림 ID"),
});

export const NotificationSchema = z.object({
  id: z.number(),
  teamId: z.string(),
  userId: z.number(),
  type: z.string().describe("알림 유형 (예: todo, comment)"),
  message: z.string().describe("알림 메시지"),
  data: z.any().nullable().describe(
    "알림 부가 데이터 (type별 구조가 다름). " +
    "comment: { postTitle: string, commentContent: string, commentAuthor: string, userImage: string | null }, " +
    "todo: { todoTitle: string, goalTitle: string | null, userImage: string | null }, " +
    "goal: { goalTitle: string, totalTodos: number, userImage: string | null }"
  ),
  isRead: z.boolean().describe("읽음 여부"),
  resourceId: z.number().nullable().describe("관련 리소스 ID (할 일 ID, 게시글 ID 등)"),
  createdAt: z.iso.datetime(),
});

export const UpdateNotificationBodySchema = z.object({
  isRead: z.boolean().describe("읽음 여부"),
});

export const NotificationListResponseSchema = z.object({
  notifications: z.array(NotificationSchema),
  nextCursor: z.number().nullable().describe("다음 페이지 커서 (null이면 마지막 페이지)"),
  totalCount: z.number().describe("전체 항목 수"),
});
