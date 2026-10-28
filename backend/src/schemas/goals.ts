import { z } from "zod";

export const GoalIdParamSchema = z.object({
  goalId: z.coerce.number().int().positive().describe("목표 ID"),
});

export const CreateGoalBodySchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100).describe("목표 제목 (1-100자)"),
});

export const UpdateGoalBodySchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(100).optional().describe("목표 제목 (1-100자)"),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const GoalSchema = z.object({
  id: z.number(),
  teamId: z.string(),
  userId: z.number(),
  title: z.string().describe("목표 제목 (1-100자)"),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const GoalWithProgressSchema = GoalSchema.extend({
  todoCount: z.number().describe("해당 목표의 전체 할 일 수"),
  completedCount: z.number().describe("해당 목표의 완료된 할 일 수"),
});

export const GoalListResponseSchema = z.object({
  goals: z.array(GoalWithProgressSchema),
  nextCursor: z.number().nullable().describe("다음 페이지 커서 (null이면 마지막 페이지)"),
  totalCount: z.number().describe("전체 항목 수"),
});

export const TodoInGoalSchema = z.object({
  id: z.number(),
  title: z.string(),
  done: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const GoalDetailResponseSchema = GoalSchema.extend({
  todos: z.array(TodoInGoalSchema),
});
