import { z } from "zod";
import { TodoListItemSchema } from "./todos.js";

export const FavoriteListQuerySchema = z.object({
  cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const FavoriteSchema = z.object({
  id: z.number(),
  teamId: z.string(),
  userId: z.number(),
  todoId: z.number().describe("찜한 할 일 ID"),
  createdAt: z.iso.datetime(),
});

// 찜한 할 일의 todo는 일반 할 일 목록 항목과 동일한 형태다.
export const FavoriteWithTodoSchema = FavoriteSchema.extend({
  todo: TodoListItemSchema,
});

export const FavoriteListResponseSchema = z.object({
  favorites: z.array(FavoriteWithTodoSchema),
  nextCursor: z.number().nullable(),
  totalCount: z.number(),
});
