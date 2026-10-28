import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { ApiError } from "../lib/api-error.js";

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof ApiError) {
    return c.json({ message: err.message, code: err.code }, err.status as any);
  }

  if (err instanceof ZodError) {
    const message = err.issues.map((i) => i.message).join(", ");
    return c.json({ message, code: "VALIDATION_ERROR" }, 400);
  }

  if (err instanceof HTTPException) {
    return c.json(
      { message: err.message, code: "HTTP_ERROR" },
      err.status,
    );
  }

  // Prisma known request errors (e.g. unique constraint violation)
  if (err && typeof err === "object" && "code" in err) {
    const prismaErr = err as { code: string; meta?: { target?: string[] } };
    if (prismaErr.code === "P2002") {
      const fields = prismaErr.meta?.target?.join(", ") ?? "unknown";
      return c.json(
        { message: `Unique constraint failed on: ${fields}`, code: "DUPLICATE_ENTRY" },
        409,
      );
    }
    if (prismaErr.code === "P2025") {
      return c.json(
        { message: "Record not found", code: "NOT_FOUND" },
        404,
      );
    }
  }

  console.error("Unhandled error:", err);
  return c.json({ message: "Internal Server Error", code: "INTERNAL_ERROR" }, 500);
};
