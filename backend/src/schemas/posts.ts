import { z } from "zod";

export const PostIdParamSchema = z.object({
  postId: z.coerce.number().int().positive().describe("게시글 ID"),
});

export const CommentIdParamSchema = z.object({
  commentId: z.coerce.number().int().positive().describe("댓글 ID"),
});

export const CursorQuerySchema = z.object({
  cursor: z.string().optional().describe("이전 응답의 nextCursor 값 (인코딩된 문자열)"),
  limit: z.coerce.number().int().min(1).max(100).default(10).describe("한 페이지에 가져올 항목 수 (1-100, 기본값 10)"),
});

/** 쿼리스트링은 항상 문자열 — OpenAPI/Swagger 입력 가능하도록 string으로 받고 파싱한다. */
export const CommentListQuerySchema = CursorQuerySchema.extend({
  parentId: z
    .string()
    .optional()
    .describe(
      "댓글 범위. 생략·빈값: 전체(혼합). 문자열 `null`: 최상위만. 숫자 문자열(예: 12): 해당 댓글의 대댓글만.",
    )
    .refine(
      (val) => {
        if (val === undefined || val === "" || val === "null") return true;
        if (!/^\d+$/.test(val)) return false;
        return parseInt(val, 10) >= 1;
      },
      { message: "parentId는 생략, 빈 문자열, 'null', 또는 양의 정수 문자열이어야 합니다." },
    )
    .transform((val) => {
      if (val === undefined || val === "") return undefined;
      if (val === "null") return "null" as const;
      return parseInt(val, 10);
    }),
});

export const PostListQuerySchema = CursorQuerySchema.extend({
  type: z.enum(["all", "best"]).default("all").describe("정렬 기준 (all: 최신순, best: 조회수순)"),
  search: z
    .string()
    .max(200)
    .optional()
    .describe("제목 또는 본문에 대한 부분 일치 검색 (대소문자 무시, 생략 시 필터 없음)")
    .transform((s) => (s === undefined ? undefined : s.trim() || undefined)),
});

export const CreatePostBodySchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100).describe("게시글 제목 (1-100자)"),
  content: z.string().trim().min(1, "Content is required").max(10000).describe("게시글 본문 (1-10000자)"),
  image: z.url().optional().describe("이미지 URL"),
});

export const UpdatePostBodySchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(100).optional().describe("게시글 제목 (1-100자)"),
    content: z
      .string()
      .trim()
      .min(1, "Content is required")
      .max(10000)
      .optional()
      .describe("게시글 본문 (1-10000자)"),
    image: z.url().nullable().optional().describe("이미지 URL (null로 보내면 이미지 제거)"),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const CreateCommentBodySchema = z.object({
  content: z.string().trim().min(1, "Content is required").max(500).describe("댓글 내용 (1-500자)"),
  parentId: z.coerce.number().int().positive().optional().describe("부모 댓글 ID (대댓글 작성 시)"),
});

export const UpdateCommentBodySchema = z.object({
  content: z.string().trim().min(1, "Content is required").max(500).describe("댓글 내용 (1-500자)"),
});

const WriterSchema = z.object({
  id: z.number(),
  name: z.string(),
  image: z.string().nullable(),
});

export const PostSchema = z.object({
  id: z.number(),
  teamId: z.string(),
  userId: z.number(),
  title: z.string(),
  content: z.string(),
  image: z.string().nullable(),
  viewCount: z.number().describe("조회수 (상세 조회 시 자동 증가)"),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  writer: WriterSchema,
});

export const PostDetailSchema = PostSchema.extend({
  commentCount: z.number().describe("댓글 수"),
});

export const PostListResponseSchema = z.object({
  posts: z.array(PostDetailSchema),
  nextCursor: z.string().nullable().describe("다음 페이지 커서 (null이면 마지막 페이지, 그대로 cursor 파라미터에 전달)"),
  totalCount: z.number().describe("전체 항목 수"),
});

export const CommentSchema = z.object({
  id: z.number(),
  teamId: z.string(),
  userId: z.number(),
  postId: z.number(),
  parentId: z.number().nullable().describe("부모 댓글 ID (일반 댓글은 null)"),
  content: z.string(),
  likeCount: z.number().describe("댓글 좋아요 수"),
  replyCount: z.number().optional().describe("최상위 댓글의 대댓글 수"),
  isLiked: z.boolean().describe("현재 사용자의 좋아요 여부"),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  writer: WriterSchema,
});

export const CommentLikeResponseSchema = z.object({
  isLiked: z.boolean().describe("현재 사용자의 좋아요 여부"),
  likeCount: z.number().describe("댓글 좋아요 수"),
});

export const CommentListResponseSchema = z.object({
  comments: z.array(CommentSchema),
  nextCursor: z.string().nullable().describe("다음 페이지 커서 (null이면 마지막 페이지, 그대로 cursor 파라미터에 전달)"),
  totalCount: z.number().describe("전체 항목 수"),
});
