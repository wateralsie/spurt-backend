import { prisma } from "../lib/prisma.js";
import { ApiError } from "../lib/api-error.js";
import { todoSelect, formatTodo, type TodoWithRelations } from "./todos.service.js";

async function validateTodoOwnership(teamId: string, todoId: number, userId: number) {
  const todo = await prisma.todo.findFirst({
    where: { id: todoId, teamId },
  });
  if (!todo) {
    throw new ApiError(404, "Todo not found", "NOT_FOUND");
  }
  if (todo.userId !== userId) {
    throw new ApiError(403, "Forbidden", "FORBIDDEN");
  }
}

// 찜 목록의 todo는 일반 할 일 목록(GET /todos)과 동일한 형태로 내려준다.
const favoriteSelect = (userId: number) =>
  ({
    id: true,
    teamId: true,
    userId: true,
    todoId: true,
    createdAt: true,
    todo: { select: todoSelect(userId) },
  }) as const;

type FavoriteRow = {
  id: number;
  teamId: string;
  userId: number;
  todoId: number;
  createdAt: Date;
  todo: TodoWithRelations;
};

function serializeFavorite(favorite: FavoriteRow) {
  return { ...favorite, todo: formatTodo(favorite.todo) };
}

export async function addFavorite(teamId: string, userId: number, todoId: number) {
  await validateTodoOwnership(teamId, todoId, userId);
  const favorite = await prisma.favorite.create({
    data: { teamId, userId, todoId },
    select: favoriteSelect(userId),
  });
  return serializeFavorite(favorite);
}

export async function removeFavorite(teamId: string, userId: number, todoId: number) {
  const favorite = await prisma.favorite.findFirst({
    where: { userId, todoId, teamId },
  });
  if (!favorite) {
    throw new ApiError(404, "Favorite not found", "NOT_FOUND");
  }
  await prisma.favorite.delete({ where: { id: favorite.id } });
}

export async function listFavorites(
  teamId: string,
  userId: number,
  cursor?: number,
  limit = 10,
) {
  const filterWhere = { teamId, userId };

  const cursorWhere = {
    ...filterWhere,
    ...(cursor ? { id: { lt: cursor } } : {}),
  };

  const [favorites, totalCount] = await Promise.all([
    prisma.favorite.findMany({
      where: cursorWhere,
      orderBy: { id: "desc" },
      take: limit + 1,
      select: favoriteSelect(userId),
    }),
    prisma.favorite.count({ where: filterWhere }),
  ]);

  const hasNext = favorites.length > limit;
  const items = hasNext ? favorites.slice(0, limit) : favorites;
  const nextCursor = hasNext ? items[items.length - 1].id : null;

  return { favorites: items.map(serializeFavorite), nextCursor, totalCount };
}
