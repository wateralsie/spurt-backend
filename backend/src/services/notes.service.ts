import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../lib/api-error.js";

async function findNoteOrThrow(teamId: string, noteId: number, userId: number) {
  const note = await prisma.note.findFirst({
    where: { id: noteId, teamId },
  });
  if (!note) {
    throw new ApiError(404, "Note not found", "NOT_FOUND");
  }
  if (note.userId !== userId) {
    throw new ApiError(403, "Forbidden", "FORBIDDEN");
  }
  return note;
}

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

const noteSelect = {
  id: true,
  teamId: true,
  userId: true,
  todoId: true,
  title: true,
  content: true,
  linkUrl: true,
  createdAt: true,
  updatedAt: true,
  todo: { select: { id: true, title: true, done: true } },
} as const;

export type NoteWithTodo = Prisma.NoteGetPayload<{ select: typeof noteSelect }>;
const noteDetailSelect = {
  id: true,
  teamId: true,
  userId: true,
  todoId: true,
  title: true,
  content: true,
  linkUrl: true,
  createdAt: true,
  updatedAt: true,
  todo: {
    select: {
      id: true,
      title: true,
      done: true,
      createdAt: true,
      goal: { select: { id: true, title: true } },
      tags: { select: { tag: { select: { id: true, name: true } } } },
    },
  },
} as const;

export type NoteWithTodoDetail = Omit<
  Prisma.NoteGetPayload<{ select: typeof noteDetailSelect }>,
  "todo"
> & {
  todo: {
    id: number;
    title: string;
    done: boolean;
    createdAt: Date;
    goal: { id: number; title: string } | null;
    tags: { id: number; name: string }[];
  };
};

export async function listNotes(
  teamId: string,
  userId: number,
  cursor?: number,
  limit = 10,
  todoId?: number,
  goalId?: number,
  search?: string,
  sort: "latest" | "oldest" = "latest",
) {
  const filterWhere: Prisma.NoteWhereInput = {
    teamId,
    userId,
    ...(todoId !== undefined ? { todoId } : {}),
    ...(goalId !== undefined ? { todo: { goalId } } : {}),
    ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
  };

  const orderBy = sort === "oldest" ? [{ id: "asc" as const }] : [{ id: "desc" as const }];

  const [notes, totalCount] = await Promise.all([
    prisma.note.findMany({
      where: filterWhere,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy,
      take: limit + 1,
      select: noteSelect,
    }),
    prisma.note.count({ where: filterWhere }),
  ]);

  const hasNext = notes.length > limit;
  const items = hasNext ? notes.slice(0, limit) : notes;
  const nextCursor = hasNext ? items[items.length - 1].id : null;

  return { notes: items, nextCursor, totalCount };
}

export async function getNote(
  teamId: string,
  noteId: number,
  userId: number,
): Promise<NoteWithTodoDetail> {
  const note = await prisma.note.findFirst({
    where: { id: noteId, teamId },
    select: noteDetailSelect,
  });
  if (!note) throw new ApiError(404, "Note not found", "NOT_FOUND");
  if (note.userId !== userId) throw new ApiError(403, "Forbidden", "FORBIDDEN");

  const { todo, ...rest } = note;
  return {
    ...rest,
    todo: {
      ...todo,
      tags: todo.tags.map((t) => t.tag),
    },
  };
}

export async function createNote(
  teamId: string,
  userId: number,
  data: {
    todoId: number;
    title: string;
    content?: Prisma.InputJsonValue;
    linkUrl?: string;
  },
): Promise<NoteWithTodo> {
  await validateTodoOwnership(teamId, data.todoId, userId);
  const { content, linkUrl, ...rest } = data;
  const note = await prisma.note.create({
    data: {
      teamId,
      userId,
      ...rest,
      ...(linkUrl !== undefined ? { linkUrl } : {}),
      ...(content !== undefined ? { content } : {}),
    },
    select: noteSelect,
  });
  return note as NoteWithTodo;
}

export async function updateNote(
  teamId: string,
  noteId: number,
  userId: number,
  data: {
    title?: string;
    content?: Prisma.InputJsonValue | null;
    linkUrl?: string | null;
  },
): Promise<NoteWithTodo> {
  await findNoteOrThrow(teamId, noteId, userId);
  const { content, ...rest } = data;
  const note = await prisma.note.update({
    where: { id: noteId },
    data: {
      ...rest,
      ...(content !== undefined
        ? { content: content === null ? Prisma.DbNull : content }
        : {}),
    },
    select: noteSelect,
  });
  return note as NoteWithTodo;
}

export async function deleteNote(teamId: string, noteId: number, userId: number) {
  await findNoteOrThrow(teamId, noteId, userId);
  await prisma.note.delete({ where: { id: noteId } });
}
