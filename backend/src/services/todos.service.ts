import { prisma } from "../lib/prisma.js";
import { ApiError } from "../lib/api-error.js";
import { kstDayStart, kstDayEnd } from "../lib/date.js";

async function findTodoOrThrow(teamId: string, todoId: number, userId: number) {
  const todo = await prisma.todo.findFirst({
    where: { id: todoId, teamId },
  });
  if (!todo) {
    throw new ApiError(404, "Todo not found", "NOT_FOUND");
  }
  if (todo.userId !== userId) {
    throw new ApiError(403, "Forbidden", "FORBIDDEN");
  }
  return todo;
}

async function validateGoalOwnership(teamId: string, goalId: number, userId: number) {
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, teamId },
  });
  if (!goal) {
    throw new ApiError(404, "Goal not found", "NOT_FOUND");
  }
  if (goal.userId !== userId) {
    throw new ApiError(403, "Forbidden", "FORBIDDEN");
  }
}

export const todoSelect = (userId: number) =>
  ({
    id: true,
    teamId: true,
    userId: true,
    goalId: true,
    title: true,
    done: true,
    fileUrl: true,
    linkUrl: true,
    dueDate: true,
    createdAt: true,
    updatedAt: true,
    goal: { select: { id: true, title: true } },
    notes: { select: { id: true } },
    tags: { select: { tag: { select: { id: true, name: true } } } },
    favorites: { where: { userId }, select: { id: true }, take: 1 },
  }) as const;

export type TodoWithRelations = {
  id: number;
  teamId: string;
  userId: number;
  goalId: number | null;
  title: string;
  done: boolean;
  fileUrl: string | null;
  linkUrl: string | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  goal: { id: number; title: string } | null;
  notes: { id: number }[];
  tags: { tag: { id: number; name: string } }[];
  favorites: { id: number }[];
};

export function formatTodo(todo: TodoWithRelations) {
  const { notes, tags, favorites, ...rest } = todo;
  return {
    ...rest,
    noteIds: notes.map((n) => n.id),
    tags: tags.map((t) => t.tag),
    isFavorite: favorites.length > 0,
  };
}

async function connectTags(teamId: string, userId: number, todoId: number, tagNames: string[]) {
  // Remove duplicates
  const unique = [...new Set(tagNames)];

  // Upsert tags and connect
  const tagIds: number[] = [];
  for (const name of unique) {
    const tag = await prisma.tag.upsert({
      where: { teamId_userId_name: { teamId, userId, name } },
      create: { teamId, userId, name },
      update: {},
    });
    tagIds.push(tag.id);
  }

  // Replace all tag connections: delete existing, create new
  await prisma.todoTag.deleteMany({ where: { todoId } });
  if (tagIds.length > 0) {
    await prisma.todoTag.createMany({
      data: tagIds.map((tagId) => ({ todoId, tagId })),
    });
  }
}

export async function listTodos(
  teamId: string,
  userId: number,
  cursor?: number,
  limit = 10,
  goalId?: number,
  done?: boolean,
  keyword?: string,
  sort: "latest" | "dueSoon" = "latest",
  date?: string,
  from?: string,
  to?: string,
) {
  // `date` is a single-KST-day shortcut and takes precedence over from/to.
  const dueDateFilter = date
    ? { gte: kstDayStart(date), lt: kstDayEnd(date) }
    : from || to
      ? {
          ...(from ? { gte: kstDayStart(from) } : {}),
          ...(to ? { lt: kstDayEnd(to) } : {}),
        }
      : undefined;

  const filterWhere = {
    teamId,
    userId,
    ...(goalId !== undefined ? { goalId } : {}),
    ...(done !== undefined ? { done } : {}),
    ...(keyword ? { title: { contains: keyword, mode: "insensitive" as const } } : {}),
    ...(dueDateFilter ? { dueDate: dueDateFilter } : {}),
  };

  const orderBy =
    sort === "dueSoon"
      ? [{ dueDate: "asc" as const }, { id: "desc" as const }]
      : [{ id: "desc" as const }];

  const [todos, totalCount] = await Promise.all([
    prisma.todo.findMany({
      where: filterWhere,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy,
      take: limit + 1,
      select: todoSelect(userId),
    }),
    prisma.todo.count({ where: filterWhere }),
  ]);

  const hasNext = todos.length > limit;
  const items = hasNext ? todos.slice(0, limit) : todos;
  const nextCursor = hasNext ? items[items.length - 1].id : null;

  return {
    todos: items.map(formatTodo),
    nextCursor,
    totalCount,
  };
}

export async function getTodo(teamId: string, todoId: number, userId: number) {
  const todo = await prisma.todo.findFirst({
    where: { id: todoId, teamId },
    select: todoSelect(userId),
  });
  if (!todo) throw new ApiError(404, "Todo not found", "NOT_FOUND");
  if (todo.userId !== userId) throw new ApiError(403, "Forbidden", "FORBIDDEN");
  return formatTodo(todo);
}

export async function createTodo(
  teamId: string,
  userId: number,
  data: {
    title: string;
    goalId?: number;
    fileUrl?: string;
    linkUrl?: string;
    dueDate?: string;
    tags?: string[];
  },
) {
  if (data.goalId !== undefined) {
    await validateGoalOwnership(teamId, data.goalId, userId);
  }
  const { tags: tagNames, ...todoData } = data;
  const todo = await prisma.todo.create({
    data: {
      teamId,
      userId,
      ...todoData,
      dueDate: todoData.dueDate ? new Date(todoData.dueDate) : undefined,
    },
    select: todoSelect(userId),
  });
  if (tagNames && tagNames.length > 0) {
    await connectTags(teamId, userId, todo.id, tagNames);
    const updated = await prisma.todo.findUniqueOrThrow({
      where: { id: todo.id },
      select: todoSelect(userId),
    });
    return formatTodo(updated);
  }
  return formatTodo(todo);
}

export async function updateTodo(
  teamId: string,
  todoId: number,
  userId: number,
  data: {
    title?: string;
    done?: boolean;
    goalId?: number | null;
    fileUrl?: string | null;
    linkUrl?: string | null;
    dueDate?: string | null;
    tags?: string[];
  },
) {
  const existing = await findTodoOrThrow(teamId, todoId, userId);
  if (data.goalId !== undefined && data.goalId !== null) {
    await validateGoalOwnership(teamId, data.goalId, userId);
  }
  const { tags: tagNames, dueDate, ...rest } = data;
  await prisma.todo.update({
    where: { id: todoId },
    data: {
      ...rest,
      ...(dueDate !== undefined
        ? { dueDate: dueDate === null ? null : new Date(dueDate) }
        : {}),
    },
  });
  if (tagNames !== undefined) {
    await connectTags(teamId, userId, todoId, tagNames);
  }
  const updated = await prisma.todo.findUniqueOrThrow({
    where: { id: todoId },
    select: todoSelect(userId),
  });
  if (data.done === true && !existing.done) {
    const { createNotification } = await import("./notifications.service.js");
    const [goalTitle, user] = await Promise.all([
      existing.goalId
        ? prisma.goal.findUnique({ where: { id: existing.goalId }, select: { title: true } }).then((g) => g?.title ?? null)
        : Promise.resolve(null),
      prisma.user.findUnique({ where: { id: userId }, select: { image: true } }),
    ]);
    createNotification({
      teamId,
      userId,
      type: "todo",
      message: `할 일 "${existing.title}"을(를) 완료했습니다.`,
      resourceId: todoId,
      data: {
        todoTitle: existing.title,
        goalTitle,
        userImage: user?.image ?? null,
      },
    }).catch(() => {});
    if (existing.goalId) {
      const goalId = existing.goalId;
      (async () => {
        const remaining = await prisma.todo.count({
          where: { goalId, done: false, id: { not: todoId }, teamId },
        });
        if (remaining === 0) {
          const [goal, totalTodos, goalUser] = await Promise.all([
            prisma.goal.findUnique({ where: { id: goalId } }),
            prisma.todo.count({ where: { goalId, teamId } }),
            prisma.user.findUnique({ where: { id: userId }, select: { image: true } }),
          ]);
          if (goal) {
            await createNotification({
              teamId,
              userId,
              type: "goal",
              message: `목표 "${goal.title}"의 모든 할 일을 완료했습니다.`,
              resourceId: goalId,
              data: {
                goalTitle: goal.title,
                totalTodos,
                userImage: goalUser?.image ?? null,
              },
            });
          }
        }
      })().catch(() => {});
    }
  }
  return formatTodo(updated);
}

export async function deleteTodo(teamId: string, todoId: number, userId: number) {
  await findTodoOrThrow(teamId, todoId, userId);
  await prisma.todo.delete({ where: { id: todoId } });
}
