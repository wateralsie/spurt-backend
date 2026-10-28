import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../lib/api-error.js";
import { encodeCursor, decodeCursor, AllCursorSchema, BestCursorSchema, CommentCursorSchema } from "../lib/cursor.js";

async function findPostOrThrow(teamId: string, postId: number) {
  const post = await prisma.post.findFirst({
    where: { id: postId, teamId },
  });
  if (!post) {
    throw new ApiError(404, "Post not found", "NOT_FOUND");
  }
  return post;
}

async function assertPostOwner(teamId: string, postId: number, userId: number) {
  const post = await findPostOrThrow(teamId, postId);
  if (post.userId !== userId) {
    throw new ApiError(403, "Forbidden", "FORBIDDEN");
  }
  return post;
}

async function findCommentOrThrow(teamId: string, postId: number, commentId: number, userId: number) {
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, postId, teamId },
  });
  if (!comment) {
    throw new ApiError(404, "Comment not found", "NOT_FOUND");
  }
  if (comment.userId !== userId) {
    throw new ApiError(403, "Forbidden", "FORBIDDEN");
  }
  return comment;
}

async function findCommentByPostOrThrow(teamId: string, postId: number, commentId: number) {
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, postId, teamId },
  });
  if (!comment) {
    throw new ApiError(404, "Comment not found", "NOT_FOUND");
  }
  return comment;
}

const postBaseSelect = {
  id: true,
  teamId: true,
  userId: true,
  title: true,
  content: true,
  image: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true, image: true } },
} as const;

const postSelect = {
  ...postBaseSelect,
  _count: { select: { comments: true } },
} as const;

const commentSelect = (userId: number) =>
  ({
    id: true,
    teamId: true,
    userId: true,
    postId: true,
    parentId: true,
    content: true,
    createdAt: true,
    updatedAt: true,
    user: { select: { id: true, name: true, image: true } },
    _count: { select: { likes: true, replies: true } },
    likes: { where: { userId }, select: { id: true }, take: 1 },
  }) as const;

type PostWithRelations = {
  id: number;
  teamId: string;
  userId: number;
  title: string;
  content: string;
  image: string | null;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  user: { id: number; name: string; image: string | null };
  _count: { comments: number };
};

type CommentWithRelations = {
  id: number;
  teamId: string;
  userId: number;
  postId: number;
  parentId: number | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user: { id: number; name: string; image: string | null };
  _count: { likes: number; replies: number };
  likes: { id: number }[];
};

function formatPost(post: PostWithRelations) {
  const { user, _count, ...rest } = post;
  return { ...rest, writer: user, commentCount: _count.comments };
}

function formatComment(comment: CommentWithRelations) {
  const { user, _count, likes, ...rest } = comment;
  return {
    ...rest,
    writer: user,
    likeCount: _count.likes,
    ...(rest.parentId === null ? { replyCount: _count.replies } : {}),
    isLiked: likes.length > 0,
  };
}

export async function listPosts(
  teamId: string,
  cursor?: string,
  limit = 10,
  type: "all" | "best" = "all",
  search?: string,
) {
  const filterWhere: Prisma.PostWhereInput = { teamId };
  if (search) {
    filterWhere.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
    ];
  }

  const isBest = type === "best";

  const orderBy = isBest
    ? [{ viewCount: "desc" as const }, { id: "desc" as const }]
    : { id: "desc" as const };

  let cursorWhere: Prisma.PostWhereInput = filterWhere;

  if (cursor) {
    if (isBest) {
      const decoded = decodeCursor(cursor, BestCursorSchema);
      cursorWhere = {
        AND: [
          filterWhere,
          {
            OR: [
              { viewCount: { lt: decoded.viewCount } },
              { viewCount: decoded.viewCount, id: { lt: decoded.id } },
            ],
          },
        ],
      };
    } else {
      const decoded = decodeCursor(cursor, AllCursorSchema);
      cursorWhere = {
        AND: [filterWhere, { id: { lt: decoded.id } }],
      };
    }
  }

  const [posts, totalCount] = await Promise.all([
    prisma.post.findMany({
      where: cursorWhere,
      orderBy,
      take: limit + 1,
      select: postSelect,
    }),
    prisma.post.count({ where: filterWhere }),
  ]);

  const hasNext = posts.length > limit;
  const items = hasNext ? posts.slice(0, limit) : posts;

  let nextCursor: string | null = null;
  if (hasNext) {
    const last = items[items.length - 1];
    nextCursor = isBest
      ? encodeCursor({ v: 1, t: "best", viewCount: last.viewCount, id: last.id })
      : encodeCursor({ v: 1, t: "all", id: last.id });
  }

  return { posts: items.map(formatPost), nextCursor, totalCount };
}

export async function getPost(teamId: string, postId: number) {
  await findPostOrThrow(teamId, postId);
  const post = await prisma.post.update({
    where: { id: postId },
    data: { viewCount: { increment: 1 } },
    select: postSelect,
  });
  return formatPost(post);
}

export async function createPost(
  teamId: string,
  userId: number,
  data: { title: string; content: string; image?: string },
) {
  const post = await prisma.post.create({
    data: { teamId, userId, ...data },
    select: postSelect,
  });
  return formatPost(post);
}

export async function updatePost(
  teamId: string,
  postId: number,
  userId: number,
  data: { title?: string; content?: string; image?: string | null },
) {
  await assertPostOwner(teamId, postId, userId);
  const post = await prisma.post.update({
    where: { id: postId },
    data,
    select: postSelect,
  });
  return formatPost(post);
}

export async function deletePost(teamId: string, postId: number, userId: number) {
  await assertPostOwner(teamId, postId, userId);
  await prisma.post.delete({ where: { id: postId } });
}

export async function listComments(
  teamId: string,
  postId: number,
  userId: number,
  cursor?: string,
  limit = 10,
  parentIdFilter?: "root" | number,
) {
  await findPostOrThrow(teamId, postId);

  if (parentIdFilter !== undefined && parentIdFilter !== "root") {
    await findCommentByPostOrThrow(teamId, postId, parentIdFilter);
  }

  const filterWhere: { postId: number; teamId: string; parentId?: number | null } = { postId, teamId };
  if (parentIdFilter === "root") {
    filterWhere.parentId = null;
  } else if (typeof parentIdFilter === "number") {
    filterWhere.parentId = parentIdFilter;
  }

  let cursorWhere: Record<string, unknown> = { ...filterWhere };
  if (cursor) {
    const decoded = decodeCursor(cursor, CommentCursorSchema);
    cursorWhere = { ...filterWhere, id: { lt: decoded.id } };
  }

  const [comments, totalCount] = await Promise.all([
    prisma.comment.findMany({
      where: cursorWhere,
      orderBy: { id: "desc" },
      take: limit + 1,
      select: commentSelect(userId),
    }),
    prisma.comment.count({ where: filterWhere }),
  ]);

  const hasNext = comments.length > limit;
  const items = hasNext ? comments.slice(0, limit) : comments;
  const nextCursor = hasNext
    ? encodeCursor({ v: 1, t: "comment", id: items[items.length - 1].id })
    : null;

  return {
    comments: items.map(formatComment),
    nextCursor,
    totalCount,
  };
}

export async function createComment(
  teamId: string,
  postId: number,
  userId: number,
  data: { content: string; parentId?: number },
) {
  const post = await findPostOrThrow(teamId, postId);
  if (data.parentId !== undefined) {
    const parent = await findCommentByPostOrThrow(teamId, postId, data.parentId);
    if (parent.parentId !== null) {
      throw new ApiError(400, "Nested replies beyond one level are not allowed", "INVALID_PARENT_COMMENT");
    }
  }
  const comment = await prisma.comment.create({
    data: { teamId, postId, userId, ...data },
    select: commentSelect(userId),
  });
  if (post.userId !== userId) {
    const commenter = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, image: true },
    });
    const { createNotification } = await import("./notifications.service.js");
    createNotification({
      teamId,
      userId: post.userId,
      type: "comment",
      message: "게시글에 새 댓글이 달렸습니다.",
      resourceId: postId,
      data: {
        postTitle: post.title,
        commentContent: data.content,
        commentAuthor: commenter?.name ?? "알 수 없는 사용자",
        userImage: commenter?.image ?? null,
      },
    }).catch(() => {});
  }
  return formatComment(comment);
}

export async function updateComment(
  teamId: string,
  postId: number,
  commentId: number,
  userId: number,
  data: { content: string },
) {
  await findCommentOrThrow(teamId, postId, commentId, userId);
  const comment = await prisma.comment.update({
    where: { id: commentId },
    data,
    select: commentSelect(userId),
  });
  return formatComment(comment);
}

export async function deleteComment(teamId: string, postId: number, commentId: number, userId: number) {
  await findCommentOrThrow(teamId, postId, commentId, userId);
  await prisma.$transaction([
    prisma.comment.deleteMany({ where: { parentId: commentId } }),
    prisma.comment.delete({ where: { id: commentId } }),
  ]);
}

export async function addCommentLike(
  teamId: string,
  postId: number,
  commentId: number,
  userId: number,
) {
  await findCommentByPostOrThrow(teamId, postId, commentId);

  await prisma.commentLike.upsert({
    where: { userId_commentId: { userId, commentId } },
    create: { teamId, userId, commentId },
    update: {},
  });

  const likeCount = await prisma.commentLike.count({ where: { commentId } });
  return { isLiked: true as const, likeCount };
}

export async function removeCommentLike(
  teamId: string,
  postId: number,
  commentId: number,
  userId: number,
) {
  await findCommentByPostOrThrow(teamId, postId, commentId);
  await prisma.commentLike.deleteMany({ where: { teamId, userId, commentId } });
  const likeCount = await prisma.commentLike.count({ where: { commentId } });
  return { isLiked: false as const, likeCount };
}
