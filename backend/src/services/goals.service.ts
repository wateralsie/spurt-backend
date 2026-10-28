import { prisma } from "../lib/prisma.js";
import { ApiError } from "../lib/api-error.js";

async function findGoalOrThrow(teamId: string, goalId: number, userId: number) {
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, teamId },
  });
  if (!goal) {
    throw new ApiError(404, "Goal not found", "NOT_FOUND");
  }
  if (goal.userId !== userId) {
    throw new ApiError(403, "Forbidden", "FORBIDDEN");
  }
  return goal;
}

export async function listGoals(
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

  const [goals, totalCount] = await Promise.all([
    prisma.goal.findMany({
      where,
      orderBy: { id: "desc" },
      take: limit + 1,
      include: { _count: { select: { todos: true } } },
    }),
    prisma.goal.count({ where: { teamId, userId } }),
  ]);

  const hasNext = goals.length > limit;
  const items = hasNext ? goals.slice(0, limit) : goals;
  const nextCursor = hasNext ? items[items.length - 1].id : null;
  const goalIds = items.map((g) => g.id);

  const completedCounts = await prisma.todo.groupBy({
    by: ["goalId"],
    where: { goalId: { in: goalIds }, done: true },
    _count: true,
  });
  const completedMap = new Map(
    completedCounts.map((c) => [c.goalId, c._count]),
  );

  return {
    goals: items.map(({ _count, ...g }) => ({
      ...g,
      todoCount: _count.todos,
      completedCount: completedMap.get(g.id) ?? 0,
    })),
    nextCursor,
    totalCount,
  };
}

export async function getGoal(teamId: string, goalId: number, userId: number) {
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, teamId },
    include: {
      todos: {
        select: { id: true, title: true, done: true, createdAt: true, updatedAt: true },
        orderBy: { id: "desc" },
      },
    },
  });
  if (!goal) throw new ApiError(404, "Goal not found", "NOT_FOUND");
  if (goal.userId !== userId) throw new ApiError(403, "Forbidden", "FORBIDDEN");
  return goal;
}

export async function createGoal(teamId: string, userId: number, title: string) {
  return prisma.goal.create({
    data: { teamId, userId, title },
  });
}

export async function updateGoal(
  teamId: string,
  goalId: number,
  userId: number,
  data: { title?: string },
) {
  await findGoalOrThrow(teamId, goalId, userId);
  return prisma.goal.update({
    where: { id: goalId },
    data,
  });
}

export async function deleteGoal(teamId: string, goalId: number, userId: number) {
  await findGoalOrThrow(teamId, goalId, userId);
  await prisma.goal.delete({ where: { id: goalId } });
}
