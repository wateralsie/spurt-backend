import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { authMiddleware } from "../middlewares/auth.js";
import {
  TeamIdParamSchema,
  ErrorResponseSchema,
  CursorPaginationSchema,
} from "../schemas/common.js";
import {
  NotificationIdParamSchema,
  NotificationListResponseSchema,
  NotificationSchema,
  UpdateNotificationBodySchema,
} from "../schemas/notifications.js";
import * as notificationsService from "../services/notifications.service.js";

type Env = { Variables: { userId: number; teamId: string } };

export const notifications = new OpenAPIHono<Env>();

notifications.use("*", authMiddleware);

// GET /{teamId}/notifications
const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Notifications"],
  summary: "알림 목록 조회",
  description:
    "커서 기반 페이지네이션으로 본인의 알림 목록을 조회합니다. 최신 알림이 먼저 표시됩니다. " +
    "알림은 댓글, 할 일 완료, 목표 달성 시 자동으로 생성됩니다. " +
    "nextCursor가 null이면 마지막 페이지입니다.",
  request: {
    params: TeamIdParamSchema,
    query: CursorPaginationSchema,
  },
  responses: {
    200: {
      description: "알림 목록",
      content: {
        "application/json": {
          schema: NotificationListResponseSchema,
          examples: {
            comment: {
              summary: "댓글 알림",
              value: {
                notifications: [
                  {
                    id: 42,
                    teamId: "team-abc",
                    userId: 1,
                    type: "comment",
                    message: "게시글에 새 댓글이 달렸습니다.",
                    data: {
                      postTitle: "프로젝트 진행 상황 공유",
                      commentContent: "좋은 아이디어네요!",
                      commentAuthor: "김철수",
                      userImage: "https://example.com/images/user2.jpg",
                    },
                    isRead: false,
                    resourceId: 7,
                    createdAt: "2026-02-17T14:30:00.000Z",
                  },
                ],
                nextCursor: 41,
                totalCount: 15,
              },
            },
            todo: {
              summary: "할 일 완료 알림",
              value: {
                notifications: [
                  {
                    id: 43,
                    teamId: "team-abc",
                    userId: 1,
                    type: "todo",
                    message: '할 일 "API 문서 작성"을(를) 완료했습니다.',
                    data: {
                      todoTitle: "API 문서 작성",
                      goalTitle: "백엔드 개발",
                      userImage: "https://example.com/images/user1.jpg",
                    },
                    isRead: false,
                    resourceId: 10,
                    createdAt: "2026-02-17T15:00:00.000Z",
                  },
                ],
                nextCursor: null,
                totalCount: 1,
              },
            },
            goal: {
              summary: "목표 달성 알림",
              value: {
                notifications: [
                  {
                    id: 44,
                    teamId: "team-abc",
                    userId: 1,
                    type: "goal",
                    message: '목표 "백엔드 개발"의 모든 할 일을 완료했습니다.',
                    data: {
                      goalTitle: "백엔드 개발",
                      totalTodos: 5,
                      userImage: "https://example.com/images/user1.jpg",
                    },
                    isRead: false,
                    resourceId: 3,
                    createdAt: "2026-02-17T15:01:00.000Z",
                  },
                ],
                nextCursor: null,
                totalCount: 1,
              },
            },
          },
        },
      },
    },
    401: {
      description: "인증 필요",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

notifications.openapi(listRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { cursor, limit } = c.req.valid("query");
  const result = await notificationsService.listNotifications(teamId, userId, cursor, limit);
  return c.json(result, 200);
});

// PATCH /{teamId}/notifications/{notificationId}
const updateRoute = createRoute({
  method: "patch",
  path: "/{notificationId}",
  tags: ["Notifications"],
  summary: "알림 읽음 상태 변경",
  description: "알림의 읽음 상태를 변경합니다. 본인의 알림만 수정 가능합니다.",
  request: {
    params: TeamIdParamSchema.extend(NotificationIdParamSchema.shape),
    body: {
      content: {
        "application/json": {
          schema: UpdateNotificationBodySchema,
          example: { isRead: true },
        },
      },
    },
  },
  responses: {
    200: {
      description: "알림 수정 성공",
      content: {
        "application/json": {
          schema: NotificationSchema,
          example: {
            id: 42,
            teamId: "team-abc",
            userId: 1,
            type: "comment",
            message: "게시글에 새 댓글이 달렸습니다.",
            data: {
              postTitle: "프로젝트 진행 상황 공유",
              commentContent: "좋은 아이디어네요!",
              commentAuthor: "김철수",
              userImage: "https://example.com/images/user2.jpg",
            },
            isRead: true,
            resourceId: 7,
            createdAt: "2026-02-17T14:30:00.000Z",
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
      description: "알림 없음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

notifications.openapi(updateRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { notificationId } = c.req.valid("param");
  const { isRead } = c.req.valid("json");
  const result = await notificationsService.markAsRead(teamId, notificationId, userId, isRead);
  return c.json(result, 200);
});

// PATCH /{teamId}/notifications
const markAllReadRoute = createRoute({
  method: "patch",
  path: "/",
  tags: ["Notifications"],
  summary: "전체 알림 읽음 처리",
  description: "본인의 모든 알림을 읽음 처리합니다.",
  request: {
    params: TeamIdParamSchema,
  },
  responses: {
    204: {
      description: "전체 읽음 처리 성공",
    },
    401: {
      description: "인증 필요",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

notifications.openapi(markAllReadRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  await notificationsService.markAllAsRead(teamId, userId);
  return c.body(null, 204);
});

// DELETE /{teamId}/notifications
const deleteAllRoute = createRoute({
  method: "delete",
  path: "/",
  tags: ["Notifications"],
  summary: "전체 알림 삭제",
  description: "본인의 알림을 전부 삭제합니다. 되돌릴 수 없습니다.",
  request: {
    params: TeamIdParamSchema,
  },
  responses: {
    204: {
      description: "전체 알림 삭제 성공",
    },
    401: {
      description: "인증 필요",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

notifications.openapi(deleteAllRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  await notificationsService.deleteAllNotifications(teamId, userId);
  return c.body(null, 204);
});

// DELETE /{teamId}/notifications/{notificationId}
const deleteRoute = createRoute({
  method: "delete",
  path: "/{notificationId}",
  tags: ["Notifications"],
  summary: "알림 단건 삭제",
  description: "알림 1건을 삭제합니다. 본인의 알림만 삭제 가능합니다.",
  request: {
    params: TeamIdParamSchema.extend(NotificationIdParamSchema.shape),
  },
  responses: {
    204: {
      description: "알림 삭제 성공",
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
      description: "알림 없음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

notifications.openapi(deleteRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { notificationId } = c.req.valid("param");
  await notificationsService.deleteNotification(teamId, notificationId, userId);
  return c.body(null, 204);
});
