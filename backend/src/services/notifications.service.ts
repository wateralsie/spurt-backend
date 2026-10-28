import { prisma } from "../lib/prisma.js";
import { ApiError } from "../lib/api-error.js";

export async function listNotifications(
  teamId: string,
  userId: number,
  cursor?: number,
  limit = 10,
) {
  const where = {
    teamId,
    userId,
    ...(cursor ? { id: { lt: cursor } } : {}),
  };

  const [notifications, totalCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { id: "desc" },
      take: limit + 1,
    }),
    prisma.notification.count({ where: { teamId, userId } }),
  ]);

  const hasNext = notifications.length > limit;
  const items = hasNext ? notifications.slice(0, limit) : notifications;
  const nextCursor = hasNext ? items[items.length - 1].id : null;

  return { notifications: items, nextCursor, totalCount };
}

export async function deleteNotification(
  teamId: string,
  notificationId: number,
  userId: number,
) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, teamId },
  });
  if (!notification) {
    throw new ApiError(404, "Notification not found", "NOT_FOUND");
  }
  if (notification.userId !== userId) {
    throw new ApiError(403, "Forbidden", "FORBIDDEN");
  }
  await prisma.notification.delete({ where: { id: notificationId } });
}

export async function deleteAllNotifications(teamId: string, userId: number) {
  await prisma.notification.deleteMany({ where: { teamId, userId } });
}

export async function markAsRead(
  teamId: string,
  notificationId: number,
  userId: number,
  isRead: boolean,
) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, teamId },
  });
  if (!notification) {
    throw new ApiError(404, "Notification not found", "NOT_FOUND");
  }
  if (notification.userId !== userId) {
    throw new ApiError(403, "Forbidden", "FORBIDDEN");
  }
  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead },
  });
}

export async function markAllAsRead(teamId: string, userId: number) {
  await prisma.notification.updateMany({
    where: { teamId, userId },
    data: { isRead: true },
  });
}

export async function createNotification(data: {
  teamId: string;
  userId: number;
  type: string;
  message: string;
  resourceId?: number;
  data?: any;
}) {
  return prisma.notification.create({ data });
}
