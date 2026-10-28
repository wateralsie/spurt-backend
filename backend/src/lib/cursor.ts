import { z, type ZodType } from "zod";
import { ApiError } from "./api-error.js";

const INVALID_CURSOR = new ApiError(400, "Invalid cursor", "INVALID_CURSOR");

export function encodeCursor(payload: object): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json).toString("base64url");
}

export function decodeCursor<T>(cursor: string, schema: ZodType<T>): T {
  let raw: unknown;
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    raw = JSON.parse(json);
  } catch {
    throw INVALID_CURSOR;
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw INVALID_CURSOR;
  }
  return result.data;
}

export const AllCursorSchema = z.object({
  v: z.literal(1),
  t: z.literal("all"),
  id: z.number().int().positive(),
});

export const BestCursorSchema = z.object({
  v: z.literal(1),
  t: z.literal("best"),
  viewCount: z.number().int().min(0),
  id: z.number().int().positive(),
});

export const CommentCursorSchema = z.object({
  v: z.literal(1),
  t: z.literal("comment"),
  id: z.number().int().positive(),
});
